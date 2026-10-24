import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { levels } from '../data/curriculum.generated'
import type { LevelRef } from '../data/curriculum.generated'
import { AUTHORED_LEVELS } from '../data/curriculum'
import type { PlannerState, ScheduledTask } from '../types'
import { reconcileMissedTasks, rescheduleTask } from './planner'
import {
  loadRemote,
  mergeProgress,
  progressToRows,
  pushRemote,
  rowsToProgress,
  type SyncState,
} from './sync'
import { getClient, hasSupabase } from './sync'

const STORAGE_KEY = 'finance-adventure:progress:v1'
const PLANNER_KEY = 'finance-adventure:planner:v1'

export type QuizResult = { correct: number; total: number }

export type Progress = {
  /** chapterId -> best quiz score */
  scores: Record<string, QuizResult>
  /** chapterIds the learner has read through */
  read: string[]
  xp: number
  streak: number
  lastVisit: string
}

const empty: Progress = { scores: {}, read: [], xp: 0, streak: 0, lastVisit: '' }

const emptyPlanner: PlannerState = {
  studyPlan: {
    active: false,
    startDate: '',
    dailyPace: 3,
    selectedLevels: [1, 2, 3, 4, 5],
  },
  dailyTasks: {},
  dailyNotes: {},
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty
    const parsed = { ...empty, ...(JSON.parse(raw) as Partial<Progress>) }
    return { ...parsed, xp: computeXp(parsed) }
  } catch {
    return empty
  }
}

function save(p: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* private mode or quota — progress simply won't persist */
  }
}

function loadPlanner(): PlannerState {
  try {
    const raw = localStorage.getItem(PLANNER_KEY)
    if (!raw) return emptyPlanner
    const loaded = { ...emptyPlanner, ...(JSON.parse(raw) as Partial<PlannerState>) }
    return reconcileMissedTasks(loaded)
  } catch {
    return emptyPlanner
  }
}

function savePlanner(p: PlannerState) {
  try {
    localStorage.setItem(PLANNER_KEY, JSON.stringify(p))
  } catch {
    /* private mode or quota */
  }
}

/**
 * XP is always derived rather than incremented, so merging progress from another
 * device can never double-count. 5 XP per chapter read, 10 per best-correct answer.
 */
const computeXp = (p: Pick<Progress, 'read' | 'scores'>): number =>
  p.read.length * 5 + Object.values(p.scores).reduce((n, s) => n + s.correct * 10, 0)

const today = () => new Date().toISOString().slice(0, 10)

const daysBetween = (a: string, b: string) => {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.round(ms / 86_400_000)
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(load)
  const [planner, setPlanner] = useState<PlannerState>(loadPlanner)
  const [sync, setSync] = useState<SyncState>({
    status: hasSupabase ? 'signed-out' : 'disabled',
    userEmail: null,
    lastSyncedAt: null,
    error: null,
  })

  // Keep the latest progress in a ref so the sync effect can push without
  // re-subscribing on every quiz answer.
  const progressRef = useRef(progress)
  progressRef.current = progress
  const dirtyRef = useRef(false)

  useEffect(() => {
    save(progress)
  }, [progress])

  useEffect(() => {
    savePlanner(planner)
  }, [planner])

  // Streak: bumps once per calendar day the app is opened.
  useEffect(() => {
    setProgress((p) => {
      const t = today()
      if (p.lastVisit === t) return p
      const gap = p.lastVisit ? daysBetween(p.lastVisit, t) : 99
      return {
        ...p,
        streak: gap === 1 ? p.streak + 1 : 1,
        lastVisit: t,
      }
    })
  }, [])

  // Reconcile any missed tasks on app load
  useEffect(() => {
    setPlanner((pl) => reconcileMissedTasks(pl))
  }, [])

  const recordQuiz = useCallback((chapterId: string, correct: number, total: number) => {
    dirtyRef.current = true
    setProgress((p) => {
      const prev = p.scores[chapterId]
      const read = p.read.includes(chapterId) ? p.read : [...p.read, chapterId]
      const scores = {
        ...p.scores,
        [chapterId]: prev && prev.correct >= correct ? prev : { correct, total },
      }
      return { ...p, read, scores, xp: computeXp({ read, scores }) }
    })
    // Bidirectional: mark matching planner tasks as completed
    completePlannerTasksForChapter(chapterId)
  }, [])

  /**
   * Mark a chapter as read in progress, AND mark any matching planner tasks
   * as completed (bidirectional sync).
   */
  const markRead = useCallback((chapterId: string) => {
    dirtyRef.current = true
    setProgress((p) => {
      if (p.read.includes(chapterId)) return p
      const read = [...p.read, chapterId]
      return { ...p, read, xp: computeXp({ read, scores: p.scores }) }
    })
    // Bidirectional: mark matching planner tasks as completed
    completePlannerTasksForChapter(chapterId)
  }, [])

  /**
   * When a chapter is completed anywhere in the app, find any planner tasks
   * that reference it and mark them completed with a timestamp.
   */
  const completePlannerTasksForChapter = useCallback((chapterId: string) => {
    setPlanner((pl) => {
      let changed = false
      const updated = { ...pl.dailyTasks }
      for (const date of Object.keys(updated)) {
        updated[date] = updated[date].map((t) => {
          if (t.chapterId === chapterId && !t.completed) {
            changed = true
            return { ...t, completed: true, completedAt: new Date().toISOString() }
          }
          return t
        })
      }
      return changed ? { ...pl, dailyTasks: updated } : pl
    })
  }, [])

  /**
   * Mark a planner task as completed. If the task references a chapter,
   * also mark that chapter as read (bidirectional sync).
   */
  const completePlannerTask = useCallback((date: string, taskId: string) => {
    let linkedChapterId: string | undefined
    setPlanner((pl) => {
      const tasks = pl.dailyTasks[date] ?? []
      const updated = tasks.map((t) => {
        if (t.id === taskId && !t.completed) {
          linkedChapterId = t.chapterId
          return { ...t, completed: true, completedAt: new Date().toISOString() }
        }
        return t
      })
      return { ...pl, dailyTasks: { ...pl.dailyTasks, [date]: updated } }
    })
    // Bidirectional: if the task references a chapter, mark it as read
    if (linkedChapterId) {
      dirtyRef.current = true
      const cid = linkedChapterId
      setProgress((p) => {
        if (p.read.includes(cid)) return p
        const read = [...p.read, cid]
        return { ...p, read, xp: computeXp({ read, scores: p.scores }) }
      })
    }
  }, [])

  /** Uncheck a planner task (does NOT un-read the chapter). */
  const uncompletePlannerTask = useCallback((date: string, taskId: string) => {
    setPlanner((pl) => {
      const tasks = pl.dailyTasks[date] ?? []
      const updated = tasks.map((t) =>
        t.id === taskId ? { ...t, completed: false, completedAt: undefined } : t,
      )
      return { ...pl, dailyTasks: { ...pl.dailyTasks, [date]: updated } }
    })
  }, [])

  /** Add a custom task to a given date. */
  const addPlannerTask = useCallback((date: string, task: ScheduledTask) => {
    setPlanner((pl) => {
      const tasks = pl.dailyTasks[date] ?? []
      return { ...pl, dailyTasks: { ...pl.dailyTasks, [date]: [...tasks, task] } }
    })
  }, [])

  /** Remove a task from a given date. */
  const removePlannerTask = useCallback((date: string, taskId: string) => {
    setPlanner((pl) => {
      const tasks = (pl.dailyTasks[date] ?? []).filter((t) => t.id !== taskId)
      return { ...pl, dailyTasks: { ...pl.dailyTasks, [date]: tasks } }
    })
  }, [])

  /** Replace the full daily tasks map (used by the planner engine after schedule generation). */
  const setDailyTasks = useCallback((tasks: Record<string, ScheduledTask[]>) => {
    setPlanner((pl) => ({ ...pl, dailyTasks: tasks }))
  }, [])

  /** Update the study plan configuration. */
  const updateStudyPlan = useCallback((patch: Partial<PlannerState['studyPlan']>) => {
    setPlanner((pl) => ({ ...pl, studyPlan: { ...pl.studyPlan, ...patch } }))
  }, [])

  /** Reschedule a task from one date to another. */
  const reschedulePlannerTask = useCallback((taskId: string, fromDate: string, toDate: string) => {
    setPlanner((pl) => rescheduleTask(pl, taskId, fromDate, toDate))
  }, [])

  /** Set a daily note (freeform notebook scratchpad). */
  const setDailyNote = useCallback((date: string, note: string) => {
    setPlanner((pl) => ({ ...pl, dailyNotes: { ...pl.dailyNotes, [date]: note } }))
  }, [])

  const reset = useCallback(() => {
    dirtyRef.current = true
    setProgress({ ...empty, lastVisit: today() })
  }, [])

  const resetPlanner = useCallback(() => {
    setPlanner({ ...emptyPlanner })
  }, [])

  /** Push local progress up (called after a sign-in or a debounced change). */
  const pushNow = useCallback(async () => {
    const client = getClient()
    if (!client) return
    const { data } = await client.auth.getUser()
    const user = data?.user
    if (!user) return
    setSync((s) => ({ ...s, status: 'syncing', error: null }))
    try {
      await pushRemote(client, user.id, progressToRows(progressRef.current))
      dirtyRef.current = false
      setSync((s) => ({ ...s, status: 'synced', lastSyncedAt: Date.now(), error: null }))
    } catch (e) {
      setSync((s) => ({
        ...s,
        status: 'error',
        error: e instanceof Error ? e.message : 'Sync failed',
      }))
    }
  }, [])

  /** Pull remote progress and merge it in, then push the merged result back. */
  const pullAndMerge = useCallback(async () => {
    const client = getClient()
    if (!client) return
    const { data } = await client.auth.getUser()
    const user = data?.user
    if (!user) return
    setSync((s) => ({ ...s, status: 'syncing', userEmail: user.email ?? null, error: null }))
    try {
      const rows = await loadRemote(client, user.id)
      const remote = rowsToProgress(rows)

      // Merge once, then use the SAME merged value for both the local state and
      // the push. Merging inline in setState and pushing `progressRef` separately
      // would race, and spreading remote over local would drop chapters that
      // exist only on this device.
      const merged = mergeProgress(progressRef.current, remote)
      progressRef.current = merged
      save(merged)
      setProgress(merged)

      await pushRemote(client, user.id, progressToRows(merged))
      dirtyRef.current = false
      setSync((s) => ({ ...s, status: 'synced', lastSyncedAt: Date.now(), error: null }))
    } catch (e) {
      setSync((s) => ({
        ...s,
        status: 'error',
        error: e instanceof Error ? e.message : 'Sync failed',
      }))
    }
  }, [])

  /** Debounced auto-push so quiz answers sync without hammering the API. */
  useEffect(() => {
    if (sync.status !== 'synced' || !dirtyRef.current) return
    const t = setTimeout(() => {
      void pushNow()
    }, 4000)
    return () => clearTimeout(t)
  }, [progress, sync.status, pushNow])

  const stats = useMemo(() => {
    const done = progress.read.length
    const total = levels.reduce((n, l) => n + l.chapters.length, 0)
    const graded = Object.values(progress.scores)
    const correct = graded.reduce((n, s) => n + s.correct, 0)
    const asked = graded.reduce((n, s) => n + s.total, 0)
    return {
      done,
      total,
      xp: progress.xp,
      streak: progress.streak,
      accuracy: asked ? Math.round((correct / asked) * 100) : 0,
      perfect: graded.filter((s) => s.correct === s.total).length,
    }
  }, [progress])

  return {
    progress,
    stats,
    recordQuiz,
    markRead,
    reset,
    sync,
    pullAndMerge,
    pushNow,
    // Planner
    planner,
    setPlanner,
    completePlannerTask,
    uncompletePlannerTask,
    addPlannerTask,
    removePlannerTask,
    setDailyTasks,
    updateStudyPlan,
    reschedulePlannerTask,
    setDailyNote,
    resetPlanner,
  }
}

/**
 * Levels 1-4 are released, so every authored level is open to anyone — there is
 * no progress gate. Level 5 is still being written and is presented as
 * "coming soon" rather than locked behind a completion threshold.
 */
export function isUnlocked(level: number): boolean {
  return AUTHORED_LEVELS.includes(level)
}

export type { LevelRef }