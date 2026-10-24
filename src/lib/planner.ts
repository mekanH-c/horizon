/**
 * Planner engine — schedule generation, missed-task rollover, and manual
 * rescheduling.
 *
 * This module is pure logic with no React imports, so it can be tested by the
 * Node-based check scripts and used from both hooks and effects.
 */

import { allChapters } from '../data/curriculum'
import type { PlannerState, ScheduledTask } from '../types'
import type { Progress } from './store'

// ──────────────────────────────────────────────────────────── helpers

const toDate = (s: string) => new Date(s + 'T00:00:00')

/** YYYY-MM-DD for today in the local timezone. */
export const todayStr = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Add `n` calendar days to a YYYY-MM-DD string. */
export const addDays = (date: string, n: number): string => {
  const d = toDate(date)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Simple incrementing id. */
let _idCounter = 0
export const nextTaskId = (): string => `task-${Date.now()}-${++_idCounter}`

// ──────────────────────────────────────────── schedule generation

/**
 * Build a daily schedule by distributing unread chapters across upcoming days
 * starting from today.
 *
 * Chapters that the learner has already read (in `progress.read`) are skipped.
 * Only chapters from `selectedLevels` are included.
 *
 * Returns a new `dailyTasks` map that **replaces** the existing one (existing
 * custom tasks are preserved).
 */
export function generateScheduleFromRoadmap(
  pace: number,
  levels: number[],
  progress: Progress,
  existingTasks: Record<string, ScheduledTask[]> = {},
): Record<string, ScheduledTask[]> {
  const readSet = new Set(progress.read)
  const levelSet = new Set(levels)

  // Pick unread chapters in syllabus order, filtered by selected levels.
  const unread = allChapters.filter(
    (c) => levelSet.has(c.level) && !readSet.has(c.id),
  )

  const tasks: Record<string, ScheduledTask[]> = {}

  // Carry over any existing custom tasks (not auto-generated chapter tasks).
  for (const [date, list] of Object.entries(existingTasks)) {
    const custom = list.filter((t) => t.type === 'custom')
    if (custom.length) tasks[date] = [...custom]
  }

  const today = todayStr()
  let dayOffset = 0
  let bucket: ScheduledTask[] = []

  for (const ch of unread) {
    bucket.push({
      id: nextTaskId(),
      chapterId: ch.id,
      title: ch.title,
      type: 'chapter',
      completed: false,
    })
    if (bucket.length >= pace) {
      const date = addDays(today, dayOffset)
      tasks[date] = [...(tasks[date] ?? []), ...bucket]
      bucket = []
      dayOffset++
    }
  }
  // Flush remaining
  if (bucket.length) {
    const date = addDays(today, dayOffset)
    tasks[date] = [...(tasks[date] ?? []), ...bucket]
  }

  return tasks
}

// ──────────────────────────────────────────── missed-task rollover

/**
 * Automatically move incomplete tasks from past days to today (or cascade
 * across upcoming days when today already exceeds `dailyPace + 2`).
 *
 * This should run on every app load and whenever the date might have changed
 * (e.g. after a sleep/wake cycle).
 *
 * Sets `rolledOverFrom` on each moved task so the UI can badge it.
 *
 * Returns a **new** PlannerState (or the same reference if nothing changed).
 */
export function reconcileMissedTasks(state: PlannerState): PlannerState {
  const today = todayStr()
  const { dailyPace } = state.studyPlan
  const cap = dailyPace + 2 // max tasks allowed on one day before cascading

  let changed = false
  const updated = { ...state.dailyTasks }

  // Collect all incomplete tasks from strictly past dates.
  const missed: ScheduledTask[] = []
  const pastDates = Object.keys(updated)
    .filter((d) => d < today)
    .sort()

  for (const date of pastDates) {
    const tasks = updated[date] ?? []
    const incomplete = tasks.filter((t) => !t.completed)
    const complete = tasks.filter((t) => t.completed)

    if (incomplete.length) {
      changed = true
      // Tag each task with the date it was originally scheduled on.
      for (const t of incomplete) {
        missed.push({
          ...t,
          rolledOverFrom: t.rolledOverFrom ?? date,
        })
      }
      // Leave only completed tasks on the old date (or remove the date entirely).
      if (complete.length) {
        updated[date] = complete
      } else {
        delete updated[date]
      }
    }
  }

  if (!missed.length) return state

  // Distribute missed tasks starting from today, respecting the cap.
  let dayOffset = 0
  let remaining = [...missed]

  while (remaining.length) {
    const targetDate = addDays(today, dayOffset)
    const existing = updated[targetDate] ?? []
    const slots = Math.max(0, cap - existing.length)

    if (slots > 0) {
      const batch = remaining.splice(0, slots)
      updated[targetDate] = [...existing, ...batch]
    }

    dayOffset++

    // Safety valve: don't cascade more than 365 days into the future.
    if (dayOffset > 365) break
  }

  return changed ? { ...state, dailyTasks: updated } : state
}

// ──────────────────────────────────────────── manual reschedule

/**
 * Move a single task from one date to another. Used for one-click
 * "move to tomorrow" or a custom date picker.
 */
export function rescheduleTask(
  state: PlannerState,
  taskId: string,
  fromDate: string,
  toDate: string,
): PlannerState {
  const fromTasks = state.dailyTasks[fromDate] ?? []
  const taskIndex = fromTasks.findIndex((t) => t.id === taskId)
  if (taskIndex === -1) return state

  const task = fromTasks[taskIndex]
  const movedTask: ScheduledTask = {
    ...task,
    rolledOverFrom: task.rolledOverFrom ?? fromDate,
  }

  const updatedFrom = fromTasks.filter((_, i) => i !== taskIndex)
  const toTasks = state.dailyTasks[toDate] ?? []

  const updated = { ...state.dailyTasks }
  if (updatedFrom.length) {
    updated[fromDate] = updatedFrom
  } else {
    delete updated[fromDate]
  }
  updated[toDate] = [...toTasks, movedTask]

  return { ...state, dailyTasks: updated }
}
