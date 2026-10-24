import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  CalendarDays,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Map,
  Zap,
  CalendarClock,
  Clock,
  Sliders,
  ChevronLeft,
  ChevronRight,
  PenTool,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { Progress } from '../lib/store'
import type { PlannerState, ScheduledTask } from '../types'
import {
  todayStr,
  addDays,
  nextTaskId,
  generateScheduleFromRoadmap,
} from '../lib/planner'
import { allChapters } from '../data/curriculum'

export function PlannerView({
  progress,
  planner,
  onCompleteTask,
  onUncompleteTask,
  onAddTask,
  onRemoveTask,
  onRescheduleTask,
  onSetDailyTasks,
  onUpdateStudyPlan,
  onSetDailyNote,
}: {
  progress: Progress
  planner: PlannerState
  onCompleteTask: (date: string, taskId: string) => void
  onUncompleteTask: (date: string, taskId: string) => void
  onAddTask: (date: string, task: ScheduledTask) => void
  onRemoveTask: (date: string, taskId: string) => void
  onRescheduleTask: (taskId: string, fromDate: string, toDate: string) => void
  onSetDailyTasks: (tasks: Record<string, ScheduledTask[]>) => void
  onUpdateStudyPlan: (patch: Partial<PlannerState['studyPlan']>) => void
  onSetDailyNote: (date: string, note: string) => void
}) {
  const navigate = useNavigate()
  const today = todayStr()
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskType, setNewTaskType] = useState<ScheduledTask['type']>('chapter')
  const [isAddingTask, setIsAddingTask] = useState(false)

  // Day strip: 3 days before today to 10 days ahead
  const dayStrip = useMemo(() => {
    const days: string[] = []
    for (let i = -3; i <= 10; i++) {
      days.push(addDays(today, i))
    }
    return days
  }, [today])

  const tasksForSelectedDate = useMemo(() => {
    return planner.dailyTasks[selectedDate] ?? []
  }, [planner.dailyTasks, selectedDate])

  const completedTodayCount = useMemo(() => {
    const todayTasks = planner.dailyTasks[today] ?? []
    return todayTasks.filter((t) => t.completed).length
  }, [planner.dailyTasks, today])

  const totalTodayCount = useMemo(() => {
    const todayTasks = planner.dailyTasks[today] ?? []
    return todayTasks.length
  }, [planner.dailyTasks, today])

  const missedCountToday = useMemo(() => {
    const todayTasks = planner.dailyTasks[today] ?? []
    return todayTasks.filter((t) => Boolean(t.rolledOverFrom) && !t.completed).length
  }, [planner.dailyTasks, today])

  // Formatted date string for header
  const formattedDate = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [selectedDate])

  const isToday = selectedDate === today

  const handleCreateTask = useCallback(() => {
    if (!newTaskTitle.trim()) return
    const task: ScheduledTask = {
      id: nextTaskId(),
      title: newTaskTitle.trim(),
      type: newTaskType,
      completed: false,
    }
    onAddTask(selectedDate, task)
    setNewTaskTitle('')
    setIsAddingTask(false)
  }, [newTaskTitle, newTaskType, onAddTask, selectedDate])

  const handleReschedule = useCallback(
    (taskId: string, targetDate: string) => {
      onRescheduleTask(taskId, selectedDate, targetDate)
    },
    [onRescheduleTask, selectedDate],
  )

  return (
    <div className="space-y-6">
      {/* ── Top Header & Stats ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
              <CalendarDays size={24} className="text-ink-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl tracking-tight text-white">Daily Tasks Planner</h1>
                <span className="rounded-full bg-brand-400/20 px-2.5 py-0.5 text-xs font-semibold text-brand-300 ring-1 ring-brand-400/30">
                  Notebook Mode
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-400">
                Study pace: {planner.studyPlan.dailyPace} chapters/day · Auto-rollover active for missed tasks
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/roadmap"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-ink-200 transition hover:border-brand-400/30 hover:bg-white/10 hover:text-white"
            >
              <Map size={14} className="text-brand-400" />
              Visual Roadmap
            </Link>
            <button
              onClick={() => setShowPlanModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-semibold text-ink-950 shadow-md shadow-brand-500/20 transition hover:bg-brand-400"
            >
              <Sliders size={14} />
              Adjust Schedule
            </button>
          </div>
        </div>

        {/* Today's Quick Metric Bar */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-ink-900/60 p-3">
            <div className="text-[11px] font-medium text-ink-400">Today's Progress</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white tabular-nums">
                {completedTodayCount}
              </span>
              <span className="text-xs text-ink-400">/ {totalTodayCount} done</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-ink-900/60 p-3">
            <div className="text-[11px] font-medium text-ink-400">Streak</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-amber-300 tabular-nums">
                🔥 {progress.streak}
              </span>
              <span className="text-xs text-ink-400">days</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-ink-900/60 p-3">
            <div className="text-[11px] font-medium text-ink-400">Rolled-over</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={`text-xl font-bold tabular-nums ${missedCountToday > 0 ? 'text-amber-400' : 'text-ink-400'}`}>
                {missedCountToday}
              </span>
              <span className="text-xs text-ink-400">auto-redirected</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-ink-900/60 p-3">
            <div className="text-[11px] font-medium text-ink-400">Overall Read</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-brand-300 tabular-nums">
                {progress.read.length}
              </span>
              <span className="text-xs text-ink-400">/ 508 chapters</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rollover Notice Banner ────────────────────────────────────── */}
      {isToday && missedCountToday > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200"
        >
          <CalendarClock size={16} className="shrink-0 text-amber-400" />
          <div className="flex-1">
            <span className="font-semibold text-amber-300">Automatic Missed-Task Rollover:</span>{' '}
            {missedCountToday} uncompleted {missedCountToday === 1 ? 'task was' : 'tasks were'} automatically moved to today from earlier dates so you don't miss a beat.
          </div>
        </motion.div>
      )}

      {/* ── Interactive Date Selector Strip ───────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-300 transition hover:bg-white/10 hover:text-white"
          title="Previous Day"
        >
          <ChevronLeft size={16} />
        </button>

        {dayStrip.map((date) => {
          const isDateToday = date === today
          const isSelected = date === selectedDate
          const [yr, mo, dy] = date.split('-').map(Number)
          const dObj = new Date(yr, mo - 1, dy)
          const dayName = dObj.toLocaleDateString('en-US', { weekday: 'short' })
          const dayNum = dy

          const dayTasks = planner.dailyTasks[date] ?? []
          const hasTasks = dayTasks.length > 0
          const allCompleted = hasTasks && dayTasks.every((t) => t.completed)
          const hasIncomplete = hasTasks && dayTasks.some((t) => !t.completed)

          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`relative flex min-w-[70px] flex-col items-center rounded-xl border px-3 py-2 text-center transition ${
                isSelected
                  ? 'border-brand-400/50 bg-brand-400/15 text-white shadow-lg shadow-brand-500/10'
                  : 'border-white/10 bg-white/5 text-ink-400 hover:border-white/20 hover:bg-white/10 hover:text-ink-200'
              }`}
            >
              <span className="text-[10px] font-semibold tracking-wider uppercase">
                {isDateToday ? 'Today' : dayName}
              </span>
              <span className="mt-0.5 font-display text-base font-bold tabular-nums">
                {dayNum}
              </span>
              {/* Status dot */}
              <div className="mt-1 flex items-center justify-center">
                {allCompleted ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
                ) : hasIncomplete ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 ring-2 ring-amber-400/30" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
                )}
              </div>
            </button>
          )
        })}

        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-300 transition hover:bg-white/10 hover:text-white"
          title="Next Day"
        >
          <ChevronRight size={16} />
        </button>

        {!isToday && (
          <button
            onClick={() => setSelectedDate(today)}
            className="ml-auto shrink-0 rounded-xl border border-brand-400/30 bg-brand-400/10 px-3 py-2 text-xs font-semibold text-brand-300 transition hover:bg-brand-400/20"
          >
            Jump to Today
          </button>
        )}
      </div>

      {/* ── Main Notebook Page ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/90 shadow-2xl backdrop-blur-md">
        {/* Notebook Spiral Accent on left */}
        <div className="absolute left-0 top-0 bottom-0 w-3 border-r border-white/10 bg-gradient-to-r from-ink-950 to-white/5 flex flex-col justify-around py-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-1.5 w-2 rounded-r-full bg-white/20 shadow-inner" />
          ))}
        </div>

        {/* Notebook Ruled Background Layer */}
        <div
          className="pointer-events-none absolute inset-0 left-3 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, transparent 35px, rgba(255,255,255,0.06) 36px)',
            backgroundSize: '100% 36px',
          }}
        />

        <div className="relative z-10 pl-7 pr-6 pt-7 pb-8 space-y-7">
          {/* Notebook Header Bar */}
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm italic text-brand-400">
                  {isToday ? 'Today’s Page' : 'Scheduled Page'}
                </span>
                <span className="text-ink-600">·</span>
                <span className="text-xs font-medium text-ink-400">{selectedDate}</span>
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">
                {formattedDate}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddingTask(true)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-ink-200 transition hover:border-brand-400/30 hover:bg-brand-400/10 hover:text-brand-300"
              >
                <Plus size={14} />
                Add Task
              </button>
            </div>
          </div>

          {/* Inline Add Task Form */}
          <AnimatePresence>
            {isAddingTask && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-2xl border border-brand-400/30 bg-ink-950/80 p-4"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-300">New Task for {selectedDate}</span>
                    <button
                      onClick={() => setIsAddingTask(false)}
                      className="text-xs text-ink-500 hover:text-ink-300"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g., Read L1-005 Budgeting Rules, or Check SIP accounts"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateTask()
                    }}
                    autoFocus
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder-ink-500 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-400">Type:</span>
                      {(['chapter', 'quiz', 'sim', 'custom'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setNewTaskType(type)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                            newTaskType === type
                              ? 'bg-brand-400/20 text-brand-300 ring-1 ring-brand-400/40'
                              : 'bg-white/5 text-ink-400 hover:text-ink-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleCreateTask}
                      disabled={!newTaskTitle.trim()}
                      className="rounded-xl bg-brand-500 px-4 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-brand-400 disabled:opacity-50"
                    >
                      Save to Notebook
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tasks List */}
          <div className="space-y-3">
            {tasksForSelectedDate.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <BookOpen size={28} className="mx-auto text-ink-600" />
                <p className="mt-2 text-sm font-medium text-ink-300">
                  No tasks scheduled for this day
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  Add a custom task or auto-schedule from the roadmap.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    onClick={() => setIsAddingTask(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    <Plus size={14} />
                    Add Custom Task
                  </button>
                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-semibold text-ink-950 transition hover:bg-brand-400"
                  >
                    <Zap size={14} />
                    Schedule From Roadmap
                  </button>
                </div>
              </div>
            ) : (
              tasksForSelectedDate.map((task) => {
                const chapter = task.chapterId
                  ? allChapters.find((c) => c.id === task.chapterId)
                  : null

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 transition ${
                      task.completed
                        ? 'border-emerald-500/20 bg-emerald-950/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    {/* Left: Checkbox & Title */}
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <button
                        onClick={() => {
                          if (task.completed) {
                            onUncompleteTask(selectedDate, task.id)
                          } else {
                            onCompleteTask(selectedDate, task.id)
                          }
                        }}
                        className="mt-0.5 shrink-0 transition transform active:scale-90"
                        title={task.completed ? 'Mark incomplete' : 'Mark completed (+5 XP)'}
                      >
                        {task.completed ? (
                          <CheckCircle2 size={20} className="text-emerald-400" />
                        ) : (
                          <Circle size={20} className="text-ink-500 hover:text-brand-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm font-medium transition ${
                              task.completed
                                ? 'text-ink-400 line-through decoration-ink-600'
                                : 'text-white'
                            }`}
                          >
                            {task.title}
                          </span>

                          {/* Rollover badge */}
                          {task.rolledOverFrom && (
                            <span className="flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-400/20">
                              <RotateCcw size={10} />
                              Redirected from {task.rolledOverFrom}
                            </span>
                          )}

                          {/* Task type badge */}
                          <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-ink-400 uppercase tracking-wide">
                            {task.type}
                          </span>
                        </div>

                        {chapter && (
                          <div className="mt-1 flex items-center gap-2 text-xs text-ink-400">
                            <span className="font-mono text-[11px] text-brand-300">{chapter.id.toUpperCase()}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1 text-[11px]">
                              <Clock size={11} />
                              ~4 min read
                            </span>
                            <span>·</span>
                            <span className="text-[11px]">Level {chapter.level}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {task.chapterId && (
                        <button
                          onClick={() => navigate(`/chapter/${task.chapterId}`)}
                          className="flex items-center gap-1 rounded-xl bg-brand-500/10 border border-brand-400/20 px-3 py-1.5 text-xs font-semibold text-brand-300 transition hover:bg-brand-500 hover:text-ink-950"
                        >
                          Read <ArrowRight size={12} />
                        </button>
                      )}

                      {/* Reschedule popup button */}
                      <button
                        onClick={() =>
                          handleReschedule(task.id, addDays(selectedDate, 1))
                        }
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-white/10 hover:text-amber-300 transition"
                        title="Move to Tomorrow"
                      >
                        <CalendarClock size={15} />
                      </button>

                      {/* Delete task */}
                      <button
                        onClick={() => onRemoveTask(selectedDate, task.id)}
                        className="rounded-lg p-1.5 text-ink-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                        title="Remove task"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>

          {/* ── Daily Notes Scratchpad ─────────────────────────────────── */}
          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center gap-2 mb-2">
              <PenTool size={14} className="text-brand-400" />
              <label htmlFor="daily-note" className="text-xs font-semibold tracking-wide uppercase text-ink-300">
                Daily Notes & Scratchpad ({selectedDate})
              </label>
            </div>
            <textarea
              id="daily-note"
              rows={4}
              value={planner.dailyNotes[selectedDate] ?? ''}
              onChange={(e) => onSetDailyNote(selectedDate, e.target.value)}
              placeholder="Jot down notes, reflections, formulas, or key financial takeaways for today..."
              className="w-full rounded-2xl border border-white/10 bg-ink-950/60 p-3.5 text-sm text-ink-100 placeholder-ink-600 outline-none transition focus:border-brand-400/50 focus:ring-1 focus:ring-brand-400/50"
            />
          </div>
        </div>
      </div>

      {/* ── Plan Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPlanModal && (
          <PlanModal
            progress={progress}
            planner={planner}
            onClose={() => setShowPlanModal(false)}
            onGenerate={(pace, selectedLevels) => {
              const tasks = generateScheduleFromRoadmap(
                pace,
                selectedLevels,
                progress,
                planner.dailyTasks,
              )
              onSetDailyTasks(tasks)
              onUpdateStudyPlan({
                active: true,
                startDate: today,
                dailyPace: pace,
                selectedLevels,
              })
              setShowPlanModal(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Plan Generation Modal ─────────────────────────────────────────────────

function PlanModal({
  progress,
  planner,
  onClose,
  onGenerate,
}: {
  progress: Progress
  planner: PlannerState
  onClose: () => void
  onGenerate: (pace: number, levels: number[]) => void
}) {
  const [pace, setPace] = useState(planner.studyPlan.dailyPace || 3)
  const [selectedLevels, setSelectedLevels] = useState<number[]>(
    planner.studyPlan.selectedLevels || [1, 2, 3, 4, 5],
  )

  const readSet = useMemo(() => new Set(progress.read), [progress.read])
  const unreadCount = useMemo(() => {
    return allChapters.filter(
      (c) => new Set(selectedLevels).has(c.level) && !readSet.has(c.id),
    ).length
  }, [selectedLevels, readSet])

  const daysNeeded = Math.ceil(unreadCount / pace)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Generate Study Plan</h3>
            <p className="text-xs text-ink-400">Schedule unread chapters across upcoming days</p>
          </div>
        </div>

        {/* Pace Selector */}
        <div className="mt-5">
          <label className="text-xs font-semibold text-ink-300">Daily Pace</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { val: 2, label: 'Gentle', sub: '2 chapters/day' },
              { val: 3, label: 'Standard', sub: '3 chapters/day' },
              { val: 5, label: 'Intensive', sub: '5 chapters/day' },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setPace(p.val)}
                className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition ${
                  pace === p.val
                    ? 'border-brand-400 bg-brand-400/10 text-white'
                    : 'border-white/10 bg-white/5 text-ink-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="font-bold text-sm">{p.label}</span>
                <span className="text-[10px] text-ink-400">{p.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Level Toggles */}
        <div className="mt-5">
          <label className="text-xs font-semibold text-ink-300">Include Levels</label>
          <div className="mt-2 flex gap-1.5">
            {[1, 2, 3, 4, 5].map((lvl) => {
              const active = selectedLevels.includes(lvl)
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() =>
                    setSelectedLevels((prev) =>
                      active ? prev.filter((l) => l !== lvl) : [...prev, lvl].sort(),
                    )
                  }
                  className={`flex h-9 flex-1 items-center justify-center rounded-lg border text-xs font-bold transition ${
                    active
                      ? 'border-brand-400 bg-brand-400/20 text-brand-300'
                      : 'border-white/10 bg-white/5 text-ink-500 hover:text-ink-200'
                  }`}
                >
                  L{lvl}
                </button>
              )
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-5 rounded-xl border border-white/5 bg-white/5 p-3 text-xs text-ink-300">
          <div className="flex justify-between">
            <span>Unread chapters:</span>
            <span className="font-bold text-white tabular-nums">{unreadCount}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Estimated completion:</span>
            <span className="font-bold text-brand-300 tabular-nums">
              {daysNeeded} days ({daysNeeded ? addDays(todayStr(), daysNeeded) : 'Complete'})
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-ink-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => onGenerate(pace, selectedLevels)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-ink-950 transition hover:bg-brand-400"
          >
            <Sparkles size={14} />
            Generate Schedule
          </button>
        </div>
      </motion.div>
    </div>
  )
}
