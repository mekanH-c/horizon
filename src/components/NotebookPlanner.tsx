import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Map,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { Progress } from '../lib/store'
import type { PlannerState, ScheduledTask } from '../types'
import {
  todayStr,
  addDays,
  nextTaskId,
  generateScheduleFromRoadmap,
  reconcileMissedTasks,
} from '../lib/planner'
import { allChapters } from '../data/curriculum'

export function NotebookPlanner({
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
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null)

  // Reconcile missed tasks on mount
  useEffect(() => {
    const reconciled = reconcileMissedTasks(planner)
    if (reconciled !== planner) {
      onSetDailyTasks(reconciled.dailyTasks)
    }
  }, [])

  // 7-day strip centered around the selected date
  const dayStrip = useMemo(() => {
    const days: string[] = []
    for (let i = -3; i <= 3; i++) {
      days.push(addDays(selectedDate, i))
    }
    return days
  }, [selectedDate])

  const tasksForSelectedDate = useMemo(() => {
    return planner.dailyTasks[selectedDate] ?? []
  }, [planner.dailyTasks, selectedDate])

  const redirectedTasksToday = useMemo(() => {
    const todayTasks = planner.dailyTasks[today] ?? []
    return todayTasks.filter((t) => Boolean(t.rolledOverFrom) && !t.completed)
  }, [planner.dailyTasks, today])

  const isToday = selectedDate === today

  const completedCount = useMemo(
    () => tasksForSelectedDate.filter((t) => t.completed).length,
    [tasksForSelectedDate],
  )
  const totalCount = tasksForSelectedDate.length

  // Formatted date string for the notebook tab
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

  // Spread redirected / uncompleted tasks evenly across this week
  const handleSpreadEvenly = useCallback(() => {
    const todayTasks = planner.dailyTasks[today] ?? []
    const uncompleted = todayTasks.filter((t) => !t.completed)
    if (uncompleted.length <= 1) return

    const updated = { ...planner.dailyTasks }
    // Keep 2 tasks on today
    const keepToday = [
      ...todayTasks.filter((t) => t.completed),
      ...uncompleted.slice(0, 2),
    ]
    updated[today] = keepToday

    // Spread the rest across the next 4 days
    const toSpread = uncompleted.slice(2)
    toSpread.forEach((task, idx) => {
      const targetDay = addDays(today, (idx % 4) + 1)
      const existing = updated[targetDay] ?? []
      updated[targetDay] = [
        ...existing,
        { ...task, rolledOverFrom: task.rolledOverFrom ?? today },
      ]
    })

    onSetDailyTasks(updated)
  }, [onSetDailyTasks, planner.dailyTasks, today])

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

  const handleToggleTask = useCallback(
    (task: ScheduledTask) => {
      if (task.completed) {
        onUncompleteTask(selectedDate, task.id)
      } else {
        setJustCompletedId(task.id)
        setTimeout(() => setJustCompletedId(null), 1200)
        onCompleteTask(selectedDate, task.id)
      }
    },
    [onCompleteTask, onUncompleteTask, selectedDate],
  )

  return (
    <div className="space-y-6">
      {/* ── Top Navigation & Controls Bar ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-black uppercase tracking-tight text-[#111111]">
              Daily Tasks Notebook
            </h1>
            <span className="rounded-md border-2 border-[#111111] bg-[#4D7CFE] px-2.5 py-0.5 text-xs font-black uppercase text-white shadow-[2px_2px_0px_#111111]">
              Planner
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-[#111111]/80">
            Pace: {planner.studyPlan.dailyPace} chapters/day · Auto-rollover redirects missed tasks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/roadmap"
            className="neo-btn flex items-center gap-1.5 bg-white px-3.5 py-2 text-xs font-black uppercase text-[#111111]"
          >
            <Map size={14} className="text-[#111111]" />
            Visual Roadmap
          </Link>
          <button
            onClick={() => setShowPlanModal(true)}
            className="neo-btn flex items-center gap-1.5 bg-[#FF6B9E] px-3.5 py-2 text-xs font-black uppercase text-[#111111]"
          >
            <Sliders size={14} />
            Adjust Schedule
          </button>
        </div>
      </div>

      {/* ── 7-Day Navigation Strip ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 rounded-lg border-3 border-[#111111] bg-white p-2 shadow-[6px_6px_0px_#111111]">
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-[#111111] bg-white text-[#111111] shadow-[2px_2px_0px_#111111] transition hover:bg-[#FFE94A] active:translate-x-[1px] active:translate-y-[1px]"
          title="Previous Day"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {dayStrip.map((date) => {
            const isDateToday = date === today
            const isSelected = date === selectedDate
            const [yr, mo, dy] = date.split('-').map(Number)
            const dObj = new Date(yr, mo - 1, dy)
            const dayName = dObj.toLocaleDateString('en-US', { weekday: 'short' })

            const dayTasks = planner.dailyTasks[date] ?? []
            const hasTasks = dayTasks.length > 0
            const allDone = hasTasks && dayTasks.every((t) => t.completed)
            const hasPending = hasTasks && dayTasks.some((t) => !t.completed)

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`relative flex flex-col items-center justify-center rounded-md border-2 border-[#111111] py-2 px-1 text-center transition active:translate-x-[1px] active:translate-y-[1px] ${
                  isSelected
                    ? 'bg-[#00C48C] text-[#111111] shadow-[3px_3px_0px_#111111]'
                    : 'bg-white text-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#FFE94A]'
                }`}
              >
                <span className="text-[10px] font-black tracking-wider uppercase">
                  {isDateToday ? 'Today' : dayName}
                </span>
                <span className="mt-0.5 font-display text-sm font-black tabular-nums">
                  {dy}
                </span>

                {/* Completion indicator dot */}
                <div className="mt-1 flex items-center justify-center">
                  {allDone ? (
                    <span className="h-2 w-2 rounded-full border border-[#111111] bg-[#00C48C]" />
                  ) : hasPending ? (
                    <span className="h-2 w-2 rounded-full border border-[#111111] bg-[#FFE94A]" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#111111]/20" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-[#111111] bg-white text-[#111111] shadow-[2px_2px_0px_#111111] transition hover:bg-[#FFE94A] active:translate-x-[1px] active:translate-y-[1px]"
          title="Next Day"
        >
          <ChevronRight size={18} />
        </button>

        {!isToday && (
          <button
            onClick={() => setSelectedDate(today)}
            className="shrink-0 rounded-md border-2 border-[#111111] bg-[#FFE94A] px-3 py-2 text-xs font-black uppercase text-[#111111] shadow-[2px_2px_0px_#111111] transition hover:bg-[#00C48C] active:translate-x-[1px] active:translate-y-[1px]"
          >
            Today
          </button>
        )}
      </div>

      {/* ── Missed Task Redirection Banner ────────────────────────────── */}
      {isToday && redirectedTasksToday.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-3 border-[#111111] bg-[#FFE94A] p-4 text-xs font-bold text-[#111111] shadow-[4px_4px_0px_#111111]"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border-2 border-[#111111] bg-white text-[#111111] shadow-[1px_1px_0px_#111111]">
              <RotateCcw size={15} />
            </div>
            <div>
              <span className="font-black text-[#111111]">
                ↻ {redirectedTasksToday.length} missed task(s)
              </span>{' '}
              from earlier days were automatically redirected to your plan.
            </div>
          </div>

          {redirectedTasksToday.length > 2 && (
            <button
              onClick={handleSpreadEvenly}
              className="rounded-md border-2 border-[#111111] bg-[#00C48C] px-3 py-1.5 text-xs font-black uppercase text-[#111111] shadow-[2px_2px_0px_#111111] transition hover:bg-white active:translate-x-[1px] active:translate-y-[1px]"
            >
              Spread evenly across this week →
            </button>
          )}
        </motion.div>
      )}

      {/* ── Digital Notebook Page Container ───────────────────────────── */}
      <div className="relative overflow-hidden rounded-lg border-3 border-[#111111] bg-white shadow-[6px_6px_0px_#111111]">
        {/* Notebook Binder Margin Line on left */}
        <div className="pointer-events-none absolute left-14 top-0 bottom-0 w-[3px] bg-[#FF6B9E] z-20" />

        {/* Notebook Left Spine Accent & Binder Holes */}
        <div className="absolute left-0 top-0 bottom-0 w-8 border-r-3 border-[#111111] bg-[#FFF8D6] flex flex-col justify-around items-center py-6 z-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-full border-2 border-[#111111] bg-white shadow-[1px_1px_0px_#111111]"
            />
          ))}
        </div>

        {/* Notebook Horizontal Ruled-line Background */}
        <div
          className="pointer-events-none absolute inset-0 left-8 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, transparent 39px, rgba(17,17,17,0.12) 40px)',
            backgroundSize: '100% 40px',
          }}
        />

        {/* Content Area */}
        <div className="relative z-10 pl-20 pr-7 pt-8 pb-8 space-y-7">
          {/* Notebook Header Tab */}
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-[#111111] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-[#FF6B9E] uppercase">
                  {isToday ? "Today's Agenda" : 'Daily Study Page'}
                </span>
                <span className="font-bold text-[#111111]">•</span>
                <span className="text-xs font-bold text-[#111111]/70">{selectedDate}</span>
              </div>
              <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-[#111111]">
                {formattedDate}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-black text-[#111111] tabular-nums">
                  {completedCount} of {totalCount} completed
                </div>
                <div className="text-[11px] font-bold text-[#111111]/70">
                  {totalCount > 0
                    ? Math.round((completedCount / totalCount) * 100)
                    : 0}
                  % progress
                </div>
              </div>
              <button
                onClick={() => setIsAddingTask(true)}
                className="neo-btn flex items-center gap-1.5 bg-[#00C48C] px-3.5 py-2 text-xs font-black uppercase text-[#111111]"
              >
                <Plus size={14} />
                Add Study Task
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
                className="overflow-hidden rounded-lg border-3 border-[#111111] bg-[#FFE94A] p-4 shadow-[4px_4px_0px_#111111]"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-[#111111]">
                      Add Custom Study Task ({selectedDate})
                    </span>
                    <button
                      onClick={() => setIsAddingTask(false)}
                      className="text-xs font-black text-[#111111] underline hover:text-[#FF6B9E]"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. Master L1-008 The Banking Spread, or Review term insurance quotes"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateTask()
                    }}
                    autoFocus
                    className="w-full rounded-md border-2 border-[#111111] bg-white px-3.5 py-2 text-sm font-bold text-[#111111] placeholder-[#111111]/50 outline-none shadow-[2px_2px_0px_#111111] focus:bg-[#FFFDE6]"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase text-[#111111]">Type:</span>
                      {(['chapter', 'quiz', 'sim', 'custom'] as const).map(
                        (type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setNewTaskType(type)}
                            className={`rounded-md border-2 border-[#111111] px-2.5 py-1 text-xs font-black uppercase transition active:translate-x-[1px] active:translate-y-[1px] ${
                              newTaskType === type
                                ? 'bg-[#00C48C] text-[#111111] shadow-[2px_2px_0px_#111111]'
                                : 'bg-white text-[#111111] hover:bg-[#FFE94A]'
                            }`}
                          >
                            {type}
                          </button>
                        ),
                      )}
                    </div>
                    <button
                      onClick={handleCreateTask}
                      disabled={!newTaskTitle.trim()}
                      className="neo-btn bg-[#4D7CFE] px-4 py-1.5 text-xs font-black uppercase text-white disabled:opacity-50"
                    >
                      Save Task
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Checklist on Notebook Lines */}
          <div className="space-y-3">
            {tasksForSelectedDate.length === 0 ? (
              <div className="rounded-lg border-3 border-dashed border-[#111111] bg-white p-8 text-center shadow-[4px_4px_0px_#111111]">
                <BookOpen size={28} className="mx-auto text-[#111111]" />
                <p className="mt-2 text-base font-black text-[#111111]">
                  No tasks scheduled for this day
                </p>
                <p className="mt-1 text-xs font-bold text-[#111111]/70">
                  Add a custom study task or auto-schedule chapters from the roadmap.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    onClick={() => setIsAddingTask(true)}
                    className="neo-btn flex items-center gap-1.5 bg-white px-3.5 py-2 text-xs font-black uppercase text-[#111111]"
                  >
                    <Plus size={14} />
                    Add Custom Task
                  </button>
                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="neo-btn flex items-center gap-1.5 bg-[#00C48C] px-3.5 py-2 text-xs font-black uppercase text-[#111111]"
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
                const isJustDone = justCompletedId === task.id

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group relative flex flex-wrap items-center justify-between gap-3 rounded-lg border-3 border-[#111111] p-3.5 transition ${
                      task.completed
                        ? 'bg-[#00C48C]/20 shadow-[3px_3px_0px_#111111]'
                        : 'bg-white shadow-[4px_4px_0px_#111111] hover:bg-[#FFFDE6]'
                    }`}
                  >
                    {/* Left: Custom Checkbox + Title */}
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task)}
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-3 border-[#111111] shadow-[2px_2px_0px_#111111] transition active:translate-x-[1px] active:translate-y-[1px] ${
                          task.completed
                            ? 'bg-[#00C48C] text-[#111111]'
                            : 'bg-white text-transparent hover:bg-[#FFE94A]'
                        }`}
                        title={
                          task.completed
                            ? 'Mark incomplete'
                            : 'Mark completed (+5 XP)'
                        }
                      >
                        <motion.svg
                          className="h-4 w-4 stroke-current stroke-[3]"
                          viewBox="0 0 24 24"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <motion.path
                            d="M20 6L9 17l-5-5"
                            initial={false}
                            animate={{
                              pathLength: task.completed ? 1 : 0,
                              opacity: task.completed ? 1 : 0,
                            }}
                            transition={{ duration: 0.2 }}
                          />
                        </motion.svg>
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm font-bold text-[#111111] transition ${
                              task.completed
                                ? 'line-through opacity-60 decoration-[#111111]'
                                : ''
                            }`}
                          >
                            {task.title}
                          </span>

                          {/* Just completed XP bubble */}
                          <AnimatePresence>
                            {isJustDone && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.8, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -4 }}
                                className="rounded-md border-2 border-[#111111] bg-[#FFE94A] px-2 py-0.5 text-[10px] font-black text-[#111111] shadow-[2px_2px_0px_#111111]"
                              >
                                +5 XP ✨
                              </motion.span>
                            )}
                          </AnimatePresence>

                          {/* Redirected Badge */}
                          {task.rolledOverFrom && (
                            <span className="flex items-center gap-1 rounded-md border-2 border-[#111111] bg-[#FF6B9E] px-2 py-0.5 text-[10px] font-bold text-[#111111] shadow-[1px_1px_0px_#111111]">
                              <RotateCcw size={10} />
                              ↪ Redirected from {task.rolledOverFrom}
                            </span>
                          )}

                          {/* Task Type Badge */}
                          <span className="rounded-md border border-[#111111] bg-[#FFE94A] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#111111]">
                            {task.type}
                          </span>
                        </div>

                        {chapter && (
                          <div className="mt-1 flex items-center gap-2 text-xs font-bold text-[#111111]/70">
                            <span className="rounded bg-[#111111] px-1 text-[10px] text-white">
                              {chapter.id.toUpperCase()}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[11px]">
                              <Clock size={11} />
                              ~4 min read
                            </span>
                            <span>•</span>
                            <span className="text-[11px]">
                              Level {chapter.level}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {task.chapterId && (
                        <button
                          onClick={() => navigate(`/chapter/${task.chapterId}`)}
                          className="neo-btn flex items-center gap-1 bg-[#00C48C] px-3 py-1.5 text-xs font-black uppercase text-[#111111]"
                        >
                          Open <ExternalLink size={12} />
                        </button>
                      )}

                      {/* Move to Tomorrow */}
                      <button
                        onClick={() =>
                          onRescheduleTask(
                            task.id,
                            selectedDate,
                            addDays(selectedDate, 1),
                          )
                        }
                        className="flex items-center gap-1 rounded-md border-2 border-[#111111] bg-white px-2 py-1 text-[11px] font-bold text-[#111111] shadow-[2px_2px_0px_#111111] transition hover:bg-[#FFE94A] active:translate-x-[1px] active:translate-y-[1px]"
                        title="Move to Tomorrow"
                      >
                        <CalendarClock size={13} />
                        <span className="hidden sm:inline">↪ Tomorrow</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onRemoveTask(selectedDate, task.id)}
                        className="rounded-md border-2 border-[#111111] bg-white p-1.5 text-[#111111] shadow-[2px_2px_0px_#111111] transition hover:bg-[#FF6B9E] active:translate-x-[1px] active:translate-y-[1px]"
                        title="Remove task"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                )
              })
            )}

            {/* Quick add prompt line at the bottom of the checklist */}
            {!isAddingTask && (
              <button
                onClick={() => setIsAddingTask(true)}
                className="flex w-full items-center gap-2 rounded-lg border-2 border-dashed border-[#111111] bg-white px-4 py-3 text-left text-xs font-bold text-[#111111] transition hover:bg-[#FFFDE6] shadow-[2px_2px_0px_#111111]"
              >
                <Plus size={14} className="text-[#111111]" />
                + Add custom study task...
              </button>
            )}
          </div>

          {/* ── Daily Scratchpad & Reflections Area ────────────────────── */}
          <div className="mt-8 border-t-2 border-[#111111] pt-6">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="notebook-scratchpad"
                className="flex items-center gap-2 text-xs font-black tracking-wide uppercase text-[#111111]"
              >
                <BookOpen size={14} className="text-[#111111]" />
                Daily Money Notes & Reflections ({selectedDate})
              </label>
              <span className="text-[11px] font-bold text-[#111111]/70">Auto-saved to notebook</span>
            </div>
            <textarea
              id="notebook-scratchpad"
              rows={4}
              value={planner.dailyNotes[selectedDate] ?? ''}
              onChange={(e) => onSetDailyNote(selectedDate, e.target.value)}
              placeholder="Reflect on today's study: key learnings, portfolio adjustments, SIP dates, or unanswered questions..."
              className="w-full rounded-lg border-3 border-[#111111] bg-white p-4 text-sm font-medium text-[#111111] placeholder-[#111111]/50 shadow-[4px_4px_0px_#111111] outline-none transition focus:bg-[#FFFDE6]"
            />
          </div>
        </div>
      </div>

      {/* ── Plan Generation Modal ─────────────────────────────────────── */}
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
        className="absolute inset-0 bg-black/60"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="relative z-10 w-full max-w-md rounded-lg border-3 border-[#111111] bg-white p-6 shadow-[8px_8px_0px_#111111]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#111111] bg-[#00C48C] text-[#111111] shadow-[2px_2px_0px_#111111]">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="font-display text-lg font-black uppercase text-[#111111]">
              Generate Study Plan
            </h3>
            <p className="text-xs font-bold text-[#111111]/70">
              Schedule unread chapters across upcoming days
            </p>
          </div>
        </div>

        {/* Pace Selector */}
        <div className="mt-5">
          <label className="text-xs font-black uppercase text-[#111111]">
            Daily Study Pace
          </label>
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
                className={`flex flex-col items-center rounded-lg border-2 border-[#111111] p-2.5 text-center transition active:translate-x-[1px] active:translate-y-[1px] ${
                  pace === p.val
                    ? 'bg-[#00C48C] text-[#111111] shadow-[3px_3px_0px_#111111]'
                    : 'bg-white text-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#FFE94A]'
                }`}
              >
                <span className="font-black text-sm">{p.label}</span>
                <span className="text-[10px] font-bold text-[#111111]/70">{p.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Level Toggles */}
        <div className="mt-5">
          <label className="text-xs font-black uppercase text-[#111111]">
            Include Levels
          </label>
          <div className="mt-2 flex gap-1.5">
            {[1, 2, 3, 4, 5].map((lvl) => {
              const active = selectedLevels.includes(lvl)
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() =>
                    setSelectedLevels((prev) =>
                      active
                        ? prev.filter((l) => l !== lvl)
                        : [...prev, lvl].sort(),
                    )
                  }
                  className={`flex h-9 flex-1 items-center justify-center rounded-md border-2 border-[#111111] text-xs font-black uppercase transition active:translate-x-[1px] active:translate-y-[1px] ${
                    active
                      ? 'bg-[#FF6B9E] text-[#111111] shadow-[2px_2px_0px_#111111]'
                      : 'bg-white text-[#111111] shadow-[1px_1px_0px_#111111] hover:bg-[#FFE94A]'
                  }`}
                >
                  L{lvl}
                </button>
              )
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-5 rounded-lg border-2 border-[#111111] bg-[#FFE94A] p-3 text-xs font-bold text-[#111111] shadow-[2px_2px_0px_#111111]">
          <div className="flex justify-between">
            <span>Unread chapters:</span>
            <span className="font-black text-[#111111] tabular-nums">
              {unreadCount}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Estimated completion:</span>
            <span className="font-black text-[#111111] tabular-nums">
              {daysNeeded} days ({daysNeeded ? addDays(todayStr(), daysNeeded) : 'Complete'})
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="neo-btn bg-white px-4 py-2 text-xs font-black uppercase text-[#111111]"
          >
            Cancel
          </button>
          <button
            onClick={() => onGenerate(pace, selectedLevels)}
            className="neo-btn flex items-center gap-1.5 bg-[#00C48C] px-4 py-2 text-xs font-black uppercase text-[#111111]"
          >
            <Sparkles size={14} />
            Generate Schedule
          </button>
        </div>
      </motion.div>
    </div>
  )
}
