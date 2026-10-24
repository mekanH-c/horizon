import { useCallback, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  Clock,
  Filter,
  Lock,
  Map,
  Plus,
  Sparkles,
  X,
  Zap,
  CalendarPlus,
  BookOpen,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { levels } from '../data/curriculum.generated'
import { allChapters, isAuthored } from '../data/curriculum'
import type { Progress } from '../lib/store'
import type { PlannerState, ScheduledTask } from '../types'
import { generateScheduleFromRoadmap, todayStr, nextTaskId } from '../lib/planner'

// ─── Topic Cluster Definitions ─────────────────────────────────────────────

type TopicCluster = { label: string; from: number; to: number }

const LEVEL_CLUSTERS: Record<number, TopicCluster[]> = {
  1: [
    { label: 'What Is Money?', from: 1, to: 10 },
    { label: 'Earning', from: 11, to: 16 },
    { label: 'Spending', from: 17, to: 21 },
    { label: 'Budgeting', from: 22, to: 26 },
    { label: 'Banking', from: 27, to: 36 },
    { label: 'Goals & Planning', from: 37, to: 38 },
    { label: 'Digital Payments', from: 39, to: 47 },
    { label: 'Vocabulary', from: 48, to: 50 },
    { label: 'Scams & Safety', from: 51, to: 56 },
    { label: 'Tools & Tricks', from: 57, to: 64 },
  ],
  2: [
    { label: 'Net Worth', from: 1, to: 5 },
    { label: 'Salary & Income', from: 6, to: 12 },
    { label: 'Emergency Fund', from: 13, to: 20 },
    { label: 'Cards & Banking', from: 21, to: 33 },
    { label: 'Loans & Debt', from: 34, to: 50 },
    { label: 'Insurance', from: 51, to: 60 },
    { label: 'Fraud & Scams', from: 61, to: 67 },
    { label: 'Psychology', from: 68, to: 74 },
    { label: 'Tips & Projects', from: 75, to: 81 },
  ],
  3: [
    { label: 'Foundations', from: 1, to: 7 },
    { label: 'Fixed-Income', from: 8, to: 22 },
    { label: 'Equity Basics', from: 23, to: 37 },
    { label: 'Analysis', from: 38, to: 48 },
    { label: 'Mutual Funds', from: 49, to: 67 },
    { label: 'Indices & ETFs', from: 68, to: 78 },
    { label: 'Alt Assets', from: 79, to: 90 },
    { label: 'Portfolio', from: 91, to: 100 },
    { label: 'Tricks', from: 101, to: 108 },
  ],
  4: [
    { label: 'Tax System', from: 1, to: 16 },
    { label: 'Insurance Deep Dive', from: 17, to: 36 },
    { label: 'Derivatives', from: 37, to: 54 },
    { label: 'Advanced Tax', from: 55, to: 64 },
    { label: 'Retirement', from: 65, to: 73 },
    { label: 'Business Forms', from: 74, to: 83 },
    { label: 'Real Estate', from: 84, to: 96 },
  ],
  5: [
    { label: 'First Salary', from: 1, to: 4 },
    { label: 'Benefits & PF', from: 5, to: 14 },
    { label: 'Automation', from: 15, to: 19 },
    { label: 'Portfolio Build', from: 20, to: 29 },
    { label: 'Alt & Retirement', from: 30, to: 39 },
    { label: 'Regulators', from: 40, to: 49 },
    { label: 'Infrastructure', from: 50, to: 59 },
    { label: 'Contracts', from: 60, to: 70 },
    { label: 'Estate & Family', from: 71, to: 80 },
    { label: 'Big Decisions', from: 81, to: 90 },
    { label: 'Crisis & Fraud', from: 91, to: 113 },
    { label: 'AI Tools', from: 114, to: 122 },
  ],
}

function clusterChapters(levelNum: number) {
  const levelData = levels.find((l) => l.level === levelNum)
  if (!levelData) return []
  const clusters = LEVEL_CLUSTERS[levelNum] ?? [
    { label: 'All', from: 1, to: levelData.chapters.length },
  ]
  return clusters.map((cl) => ({
    label: cl.label,
    chapters: levelData.chapters.slice(cl.from - 1, cl.to),
  }))
}

// ─── Filter Types ──────────────────────────────────────────────────────────

type FilterMode = 'all' | 'completed' | 'planner' | 'sims' | number

// ─── Main Component ────────────────────────────────────────────────────────

export function RoadmapView({
  progress,
  planner,
  onAddTask,
  onMarkRead,
  onSetDailyTasks,
  onUpdateStudyPlan,
}: {
  progress: Progress
  planner: PlannerState
  onAddTask: (date: string, task: ScheduledTask) => void
  onMarkRead: (id: string) => void
  onSetDailyTasks: (tasks: Record<string, ScheduledTask[]>) => void
  onUpdateStudyPlan: (patch: Partial<PlannerState['studyPlan']>) => void
}) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterMode>('all')
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const roadmapRef = useRef<HTMLDivElement>(null)

  // Flat set for quick lookups
  const readSet = useMemo(() => new Set(progress.read), [progress.read])
  const today = todayStr()
  const todayTasks = useMemo(() => {
    const tasks = planner.dailyTasks[today] ?? []
    return new Set(tasks.map((t) => t.chapterId).filter(Boolean))
  }, [planner.dailyTasks, today])

  // All levels with clusters
  const levelClusters = useMemo(
    () => levels.map((l) => ({ level: l, clusters: clusterChapters(l.level) })),
    [],
  )

  // Stats
  const totalChapters = useMemo(() => levels.reduce((n, l) => n + l.chapters.length, 0), [])
  const completedCount = progress.read.length
  const pct = totalChapters ? Math.round((completedCount / totalChapters) * 100) : 0

  // Filtering
  const shouldShowChapter = useCallback(
    (id: string, levelNum: number) => {
      if (filter === 'all') return true
      if (filter === 'completed') return readSet.has(id)
      if (filter === 'planner') return todayTasks.has(id)
      if (filter === 'sims') {
        return isAuthored(id)
      }
      if (typeof filter === 'number') return levelNum === filter
      return true
    },
    [filter, readSet, todayTasks],
  )

  // Selected chapter details
  const selectedRef = useMemo(() => {
    if (!selectedChapter) return null
    return allChapters.find((c) => c.id === selectedChapter)
  }, [selectedChapter])

  const addToToday = useCallback(
    (chapterId: string, title: string) => {
      onAddTask(today, {
        id: nextTaskId(),
        chapterId,
        title,
        type: 'chapter',
        completed: false,
      })
    },
    [onAddTask, today],
  )

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="rounded-lg border-3 border-[#111111] bg-white p-5 shadow-[6px_6px_0px_#111111]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-2 border-[#111111] bg-[#FFE94A] text-[#111111] shadow-[2px_2px_0px_#111111]">
            <Map size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-black uppercase tracking-tight text-[#111111]">
              Learning Roadmap
            </h1>
            <p className="text-xs font-bold text-[#111111]/80">
              508 chapters · 5 levels · Your interactive visual path through finance
            </p>
          </div>
          <button
            onClick={() => setShowPlanModal(true)}
            className="neo-btn flex items-center gap-2 bg-[#00C48C] px-4 py-2.5 text-sm font-black uppercase text-[#111111]"
          >
            <Zap size={16} />
            Generate Daily Plan →
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-md border-2 border-[#111111] bg-white shadow-[2px_2px_0px_#111111]">
            <motion.div
              className="h-full bg-[#00C48C] border-r-2 border-[#111111]"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <span className="shrink-0 text-xs font-black tabular-nums text-[#111111]">
            {completedCount}/{totalChapters} ({pct}%)
          </span>
        </div>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={16} className="text-[#111111]" />
        {(
          [
            { key: 'all' as const, label: 'All' },
            { key: 'completed' as const, label: 'Completed' },
            { key: 'planner' as const, label: 'In Planner' },
            { key: 'sims' as const, label: 'With Sims' },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md border-2 border-[#111111] px-3 py-1.5 text-xs font-black uppercase transition active:translate-x-[1px] active:translate-y-[1px] ${
              filter === f.key
                ? 'bg-[#00C48C] text-[#111111] shadow-[2px_2px_0px_#111111]'
                : 'bg-white text-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#FFE94A]'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="mx-1 h-5 w-[2px] bg-[#111111]" />
        {levels.map((l) => (
          <button
            key={l.level}
            onClick={() => setFilter(filter === l.level ? 'all' : l.level)}
            className={`flex h-7 w-7 items-center justify-center rounded-md border-2 border-[#111111] text-xs font-black tabular-nums transition active:translate-x-[1px] active:translate-y-[1px] ${
              filter === l.level
                ? 'bg-[#FF6B9E] text-[#111111] shadow-[2px_2px_0px_#111111]'
                : 'bg-white text-[#111111] shadow-[1px_1px_0px_#111111] hover:bg-[#FFE94A]'
            }`}
          >
            {l.level}
          </button>
        ))}
      </div>

      {/* ── Roadmap Spine ──────────────────────────────────────────────── */}
      <div ref={roadmapRef} className="relative">
        {/* Central spine line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 bg-[#111111]" />

        <div className="space-y-4">
          {levelClusters.map(({ level: levelMeta, clusters }, levelIdx) => {
            const levelDone = levelMeta.chapters.filter((c) => readSet.has(c.id)).length
            const levelPct = Math.round((levelDone / levelMeta.chapters.length) * 100)

            // Check if any chapters in this level pass the filter
            const hasVisibleChapters =
              filter === 'all' ||
              typeof filter === 'number'
                ? true
                : levelMeta.chapters.some((c) => shouldShowChapter(c.id, levelMeta.level))

            if (!hasVisibleChapters && filter !== 'all' && typeof filter !== 'number') return null
            if (typeof filter === 'number' && filter !== levelMeta.level) return null

            return (
              <motion.div
                key={levelMeta.level}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: levelIdx * 0.08 }}
              >
                {/* Level milestone node */}
                <div className="relative mx-auto mb-6 flex max-w-md items-center justify-center">
                  <div className="relative z-10 flex items-center gap-3 rounded-lg border-3 border-[#111111] bg-white px-5 py-3 shadow-[6px_6px_0px_#111111]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-[#111111] bg-[#FFE94A] text-base font-black tabular-nums text-[#111111] shadow-[2px_2px_0px_#111111]">
                      {levelMeta.level}
                    </div>
                    <div>
                      <div className="font-display text-base font-black uppercase text-[#111111]">
                        {levelMeta.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#111111]/70">
                        <span>{levelMeta.chapters.length} chapters</span>
                        <span>•</span>
                        <span className="tabular-nums">{levelPct}% done</span>
                      </div>
                    </div>
                    {/* Mini progress ring */}
                    <svg width="36" height="36" className="shrink-0 -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#111111"
                        strokeWidth="3"
                        opacity="0.15"
                      />
                      <motion.circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#00C48C"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 14}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 14 }}
                        animate={{
                          strokeDashoffset: 2 * Math.PI * 14 * (1 - levelPct / 100),
                        }}
                        transition={{ duration: 0.8, delay: levelIdx * 0.1 }}
                      />
                    </svg>
                  </div>
                </div>

                {/* Clusters */}
                <div className="space-y-3 pb-8">
                  {clusters.map((cluster, clusterIdx) => {
                    const visibleChapters = cluster.chapters.filter((c) =>
                      shouldShowChapter(c.id, levelMeta.level),
                    )
                    if (visibleChapters.length === 0) return null

                    // Alternate sides: even clusters left, odd clusters right
                    const side = clusterIdx % 2 === 0 ? 'left' : 'right'

                    return (
                      <div
                        key={cluster.label}
                        className={`relative flex ${side === 'left' ? 'justify-start' : 'justify-end'}`}
                      >
                        {/* SVG connector from spine to cluster */}
                        <svg
                          className="absolute top-5 left-1/2 z-0 -translate-x-1/2"
                          width="120"
                          height="2"
                          style={{
                            [side === 'left' ? 'right' : 'left']: '50%',
                            [side === 'left' ? 'left' : 'right']: 'auto',
                            transform:
                              side === 'left'
                                ? 'translateX(-100%)'
                                : 'translateX(0)',
                          }}
                        >
                          <line
                            x1="0"
                            y1="1"
                            x2="120"
                            y2="1"
                            stroke="#111111"
                            strokeWidth="2"
                            strokeDasharray="6 4"
                          />
                        </svg>

                        {/* Cluster card */}
                        <motion.div
                          initial={{
                            opacity: 0,
                            x: side === 'left' ? -20 : 20,
                          }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: levelIdx * 0.08 + clusterIdx * 0.04,
                          }}
                          className={`relative z-10 w-[calc(50%-2rem)] min-w-[200px] ${side === 'left' ? 'mr-auto' : 'ml-auto'}`}
                        >
                          {/* Cluster header */}
                          <div className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#111111]">
                            <div className="h-2 w-2 rounded-full border border-[#111111] bg-[#FF6B9E]" />
                            {cluster.label}
                            <span className="font-bold text-[#111111]/60 normal-case tracking-normal">
                              · {visibleChapters.length}
                            </span>
                          </div>

                          {/* Chapter nodes */}
                          <div className="grid gap-1.5">
                            {visibleChapters.map((ch) => {
                              const done = readSet.has(ch.id)
                              const inPlanner = todayTasks.has(ch.id)
                              const authored = isAuthored(ch.id)
                              const isSelected = selectedChapter === ch.id

                              return (
                                <button
                                  key={ch.id}
                                  onClick={() =>
                                    setSelectedChapter(isSelected ? null : ch.id)
                                  }
                                  className={`group flex items-center gap-2 rounded-md border-2 border-[#111111] px-2.5 py-1.5 text-left text-xs font-bold transition-all active:translate-x-[1px] active:translate-y-[1px] ${
                                    done
                                      ? 'bg-[#00C48C] text-[#111111] shadow-[2px_2px_0px_#111111]'
                                      : inPlanner
                                        ? 'bg-[#FFE94A] text-[#111111] shadow-[2px_2px_0px_#111111]'
                                        : authored
                                          ? 'bg-white text-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#FFFDE6]'
                                          : 'border-dashed bg-white/70 text-[#111111]/60 opacity-60'
                                  } ${isSelected ? 'ring-2 ring-[#111111]' : ''}`}
                                >
                                  {/* Status icon */}
                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#111111] text-[10px] font-black ${
                                      done
                                        ? 'bg-white text-[#111111]'
                                        : inPlanner
                                          ? 'bg-white text-[#111111]'
                                          : authored
                                            ? 'bg-[#FFE94A] text-[#111111]'
                                            : 'bg-neutral-100 text-[#111111]/50'
                                    }`}
                                  >
                                    {done ? (
                                      <Check size={11} strokeWidth={3} />
                                    ) : !authored ? (
                                      <Lock size={9} />
                                    ) : inPlanner ? (
                                      <CalendarPlus size={10} />
                                    ) : (
                                      <span className="tabular-nums">
                                        {ch.id.split('-')[1]}
                                      </span>
                                    )}
                                  </span>

                                  <span className="min-w-0 flex-1 truncate text-[#111111]">
                                    {ch.title}
                                  </span>

                                  {/* Badges */}
                                  {inPlanner && !done && (
                                    <span className="shrink-0 rounded border border-[#111111] bg-white px-1.5 py-0.5 text-[9px] font-black uppercase text-[#111111]">
                                      Today
                                    </span>
                                  )}
                                  {done && (
                                    <Check
                                      size={13}
                                      strokeWidth={3}
                                      className="shrink-0 text-[#111111]"
                                    />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </motion.div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Chapter Drawer ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedRef && (
          <>
            {/* Backdrop */}
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedChapter(null)}
              className="fixed inset-0 z-50 bg-black/60"
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l-3 border-[#111111] bg-white shadow-[-8px_0px_0px_#111111]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b-3 border-[#111111] bg-[#FFE94A] px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-[#111111] bg-white text-xs font-black text-[#111111] shadow-[2px_2px_0px_#111111]">
                    {selectedRef.level}
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#111111]">
                    {selectedRef.levelTitle}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedChapter(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-[#111111] bg-white text-[#111111] shadow-[2px_2px_0px_#111111] transition hover:bg-[#FF6B9E] active:translate-x-[1px] active:translate-y-[1px]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div>
                  <h2 className="font-display text-xl font-black uppercase text-[#111111]">
                    {selectedRef.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md border-2 border-[#111111] bg-[#FF6B9E] px-2 py-0.5 text-[10px] font-black uppercase text-[#111111] shadow-[1px_1px_0px_#111111]">
                      Level {selectedRef.level}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-[#111111]/70">
                      <Clock size={11} />
                      ~5 min read
                    </span>
                    <span className="text-xs font-bold text-[#111111]/60">
                      {selectedRef.id}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="rounded-lg border-2 border-[#111111] bg-[#FFFDE6] p-4 shadow-[3px_3px_0px_#111111]">
                  <div className="text-xs font-black uppercase tracking-wider text-[#111111]">
                    Status
                  </div>
                  <div className="mt-2 font-bold text-sm text-[#111111]">
                    {readSet.has(selectedRef.id) ? (
                      <div className="flex items-center gap-2 text-[#00C48C]">
                        <Check size={18} strokeWidth={3} />
                        <span className="font-black text-[#111111]">Completed</span>
                      </div>
                    ) : todayTasks.has(selectedRef.id) ? (
                      <div className="flex items-center gap-2 text-[#111111]">
                        <CalendarPlus size={18} />
                        <span className="font-black">In today&apos;s plan</span>
                      </div>
                    ) : !isAuthored(selectedRef.id) ? (
                      <div className="flex items-center gap-2 text-[#111111]/60">
                        <Lock size={18} />
                        <span>Coming soon</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[#111111]">
                        <BookOpen size={18} />
                        <span>Not started</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quiz score if available */}
                {progress.scores[selectedRef.id] && (
                  <div className="rounded-lg border-2 border-[#111111] bg-[#00C48C]/20 p-4 shadow-[3px_3px_0px_#111111]">
                    <div className="text-xs font-black uppercase tracking-wider text-[#111111]">
                      Quiz Score
                    </div>
                    <div className="mt-1 text-lg font-black tabular-nums text-[#111111]">
                      {progress.scores[selectedRef.id].correct}/
                      {progress.scores[selectedRef.id].total} correct
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="border-t-3 border-[#111111] bg-white p-5 space-y-2">
                {isAuthored(selectedRef.id) && (
                  <button
                    onClick={() => {
                      setSelectedChapter(null)
                      navigate(`/chapter/${selectedRef.id}`)
                    }}
                    className="neo-btn flex w-full items-center justify-center gap-2 bg-[#00C48C] px-4 py-3 text-sm font-black uppercase text-[#111111]"
                  >
                    <BookOpen size={16} />
                    Read Chapter →
                  </button>
                )}
                {!readSet.has(selectedRef.id) && isAuthored(selectedRef.id) && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        addToToday(selectedRef.id, selectedRef.title)
                        setSelectedChapter(null)
                      }}
                      disabled={todayTasks.has(selectedRef.id)}
                      className="neo-btn flex items-center justify-center gap-1.5 bg-[#FFE94A] px-3 py-2.5 text-xs font-black uppercase text-[#111111] disabled:opacity-40"
                    >
                      <Plus size={14} />
                      Add to Today
                    </button>
                    <button
                      onClick={() => {
                        onMarkRead(selectedRef.id)
                        setSelectedChapter(null)
                      }}
                      className="neo-btn flex items-center justify-center gap-1.5 bg-[#FF6B9E] px-3 py-2.5 text-xs font-black uppercase text-[#111111]"
                    >
                      <Check size={14} />
                      Mark Done
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                startDate: todayStr(),
                dailyPace: pace,
                selectedLevels,
              })
              setShowPlanModal(false)
              navigate('/planner')
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
  onClose,
  onGenerate,
}: {
  progress: Progress
  planner: PlannerState
  onClose: () => void
  onGenerate: (pace: number, levels: number[]) => void
}) {
  const [pace, setPace] = useState(3)
  const [selectedLevels, setSelectedLevels] = useState([1, 2, 3, 4, 5])

  const readSet = new Set(progress.read)
  const unreadCount = allChapters.filter(
    (c) => new Set(selectedLevels).has(c.level) && !readSet.has(c.id),
  ).length
  const estimatedDays = Math.ceil(unreadCount / pace)

  const toggleLevel = (n: number) => {
    setSelectedLevels((prev) =>
      prev.includes(n) ? prev.filter((l) => l !== n) : [...prev, n].sort(),
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border-3 border-[#111111] bg-white p-6 shadow-[8px_8px_0px_#111111]"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-black uppercase text-[#111111]">
            Generate Study Plan
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-[#111111] bg-white text-[#111111] shadow-[2px_2px_0px_#111111] transition hover:bg-[#FF6B9E] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-2 text-xs font-bold text-[#111111]/75">
          Pick your daily pace and which levels to include. Unread chapters will be
          distributed across upcoming days.
        </p>

        {/* Pace selector */}
        <div className="mt-5">
          <label className="text-xs font-black uppercase text-[#111111]">
            Daily pace
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[2, 3, 5].map((n) => (
              <button
                key={n}
                onClick={() => setPace(n)}
                className={`rounded-lg border-2 border-[#111111] px-4 py-3 text-center transition active:translate-x-[1px] active:translate-y-[1px] ${
                  pace === n
                    ? 'bg-[#00C48C] text-[#111111] shadow-[3px_3px_0px_#111111]'
                    : 'bg-white text-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#FFE94A]'
                }`}
              >
                <div className="text-lg font-black tabular-nums">{n}</div>
                <div className="text-[10px] font-bold text-[#111111]/70">ch/day</div>
              </button>
            ))}
          </div>
        </div>

        {/* Level selector */}
        <div className="mt-5">
          <label className="text-xs font-black uppercase text-[#111111]">
            Include levels
          </label>
          <div className="mt-2 flex gap-2">
            {levels.map((l) => (
              <button
                key={l.level}
                onClick={() => toggleLevel(l.level)}
                className={`flex h-10 w-10 items-center justify-center rounded-md border-2 border-[#111111] text-sm font-black tabular-nums transition active:translate-x-[1px] active:translate-y-[1px] ${
                  selectedLevels.includes(l.level)
                    ? 'bg-[#FF6B9E] text-[#111111] shadow-[2px_2px_0px_#111111]'
                    : 'bg-white text-[#111111] shadow-[1px_1px_0px_#111111] hover:bg-[#FFE94A]'
                }`}
              >
                {l.level}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-5 rounded-lg border-2 border-[#111111] bg-[#FFE94A] p-4 shadow-[3px_3px_0px_#111111]">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-xl font-black tabular-nums text-[#111111]">
                {unreadCount}
              </div>
              <div className="text-[10px] font-bold uppercase text-[#111111]/75">
                chapters remaining
              </div>
            </div>
            <div>
              <div className="text-xl font-black tabular-nums text-[#111111]">
                {estimatedDays}
              </div>
              <div className="text-[10px] font-bold uppercase text-[#111111]/75">
                days to complete
              </div>
            </div>
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={() => onGenerate(pace, selectedLevels)}
          disabled={unreadCount === 0 || selectedLevels.length === 0}
          className="neo-btn mt-5 flex w-full items-center justify-center gap-2 bg-[#00C48C] px-4 py-3 text-sm font-black uppercase text-[#111111] disabled:opacity-40"
        >
          <Sparkles size={16} />
          Generate {unreadCount} Tasks →
        </button>
      </motion.div>
    </>
  )
}
