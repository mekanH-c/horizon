import { motion } from 'framer-motion'
import { ArrowRight, CalendarDays, Flame, Map, Sparkles, Trophy } from 'lucide-react'
import { Hero } from './Hero'
import { levels, isReleased, releasedChapterCount } from '../data/curriculum'
import type { Progress } from '../lib/store'
import { Link, useNavigate } from 'react-router-dom'
import type { LevelRef } from '../data/curriculum.generated'

export function Home({
  progress,
  stats,
}: {
  progress: Progress
  stats: { done: number; total: number; xp: number; streak: number; accuracy: number }
}) {
  const navigate = useNavigate()
  const nextUp = levels
    .flatMap((l) => l.chapters.map((c) => ({ ...c, level: l.level })))
    .find((c) => !progress.read.includes(c.id))

  return (
    <div className="space-y-10">
      {nextUp ? (
        <Hero
          primaryLabel={stats.done ? `Continue · ${nextUp.title}` : 'Start learning'}
          onStart={() => navigate(`/chapter/${nextUp.id}`)}
          onBrowse={() => navigate('/level/1')}
        />
      ) : (
        <>
          <Hero
            primaryLabel="Start learning"
            onStart={() => navigate('/level/1')}
            onBrowse={() => navigate('/level/1')}
          />
          <div className="rounded-lg border-3 border-[#111111] bg-[#00C48C] p-4 text-center font-display text-lg font-black uppercase text-[#111111] shadow-[6px_6px_0px_#111111]">
            🎉 Every single chapter complete. Outstanding!
          </div>
        </>
      )}

      {/* Stat Tiles in Neo-Brutalist cards */}
      <section className="grid gap-4 sm:grid-cols-4">
        <StatTile
          icon={<Trophy size={20} className="text-[#111111]" />}
          label="Chapters done"
          value={`${stats.done}`}
          sub={`of ${stats.total}`}
          color="bg-[#FFE94A]"
        />
        <StatTile
          icon={<Sparkles size={20} className="text-[#111111]" />}
          label="XP earned"
          value={`${stats.xp}`}
          sub="10 per quiz win"
          color="bg-[#FF6B9E]"
        />
        <StatTile
          icon={<Flame size={20} className="text-[#111111]" />}
          label="Day streak"
          value={`${stats.streak}`}
          sub="keep it rolling"
          color="bg-[#00C48C]"
        />
        <StatTile
          icon={<span className="text-base font-black">🎯</span>}
          label="Quiz accuracy"
          value={`${stats.accuracy}%`}
          sub="all attempts"
          color="bg-[#4D7CFE]"
          textWhite
        />
      </section>

      {/* Feature Spotlights */}
      <section className="grid gap-5 sm:grid-cols-2">
        <Link
          to="/roadmap"
          className="group relative overflow-hidden rounded-lg border-3 border-[#111111] bg-white p-6 shadow-[6px_6px_0px_#111111] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#111111] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[3px_3px_0px_#111111]"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-3 border-[#111111] bg-[#00C48C] text-[#111111] shadow-[3px_3px_0px_#111111]">
              <Map size={24} />
            </div>
            <span className="flex items-center gap-1 rounded-md border-2 border-[#111111] bg-[#FFE94A] px-2.5 py-1 text-xs font-black uppercase text-[#111111] shadow-[2px_2px_0px_#111111] group-hover:bg-[#FF6B9E] group-hover:text-white transition">
              Explore →
            </span>
          </div>
          <h3 className="mt-4 font-display text-xl font-black uppercase tracking-tight text-[#111111]">
            Visual Knowledge Roadmap
          </h3>
          <p className="mt-1 font-sans text-sm font-semibold text-[#111111]/80">
            Interactive roadmap.sh-style flowchart node tree mapping all 508 chapters across 5 progressive levels.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 font-sans text-xs font-black uppercase text-[#111111]">
            <span>Synced with Daily Notebook Planner</span>
            <ArrowRight size={14} />
          </div>
        </Link>

        <Link
          to="/planner"
          className="group relative overflow-hidden rounded-lg border-3 border-[#111111] bg-white p-6 shadow-[6px_6px_0px_#111111] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#111111] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[3px_3px_0px_#111111]"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-3 border-[#111111] bg-[#FF6B9E] text-white shadow-[3px_3px_0px_#111111]">
              <CalendarDays size={24} />
            </div>
            <span className="flex items-center gap-1 rounded-md border-2 border-[#111111] bg-[#FFE94A] px-2.5 py-1 text-xs font-black uppercase text-[#111111] shadow-[2px_2px_0px_#111111] group-hover:bg-[#00C48C] transition">
              Open Notebook →
            </span>
          </div>
          <h3 className="mt-4 font-display text-xl font-black uppercase tracking-tight text-[#111111]">
            Daily Tasks Notebook Planner
          </h3>
          <p className="mt-1 font-sans text-sm font-semibold text-[#111111]/80">
            Paced daily schedule with interactive tick boxes, ruled reflection scratchpad, and automatic missed-task rollover.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 font-sans text-xs font-black uppercase text-[#111111]">
            <span>Auto-scheduled from Roadmap syllabus</span>
            <ArrowRight size={14} />
          </div>
        </Link>
      </section>

      {/* The Five Levels Syllabus */}
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b-3 border-[#111111] pb-3">
          <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-[#111111]">
            The Five Levels
          </h2>
          <p className="font-sans text-xs sm:text-sm font-bold uppercase text-[#111111]">
            Levels 1–4 are live now · {releasedChapterCount} chapters written
          </p>
        </div>
        <div className="space-y-4">
          {levels.map((l, i) => (
            <LevelCard key={l.level} level={l} index={i} progress={progress} />
          ))}
        </div>
      </section>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  sub,
  color,
  textWhite = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color: string
  textWhite?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`rounded-lg border-3 border-[#111111] ${color} p-4 shadow-[6px_6px_0px_#111111] transition hover:translate-x-[-1px] hover:translate-y-[-1px]`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`font-sans text-xs font-black uppercase tracking-wider ${textWhite ? 'text-white' : 'text-[#111111]'}`}>
          {label}
        </span>
        <div className="rounded-md border-2 border-[#111111] bg-white p-1 shadow-[2px_2px_0px_#111111]">
          {icon}
        </div>
      </div>
      <div className={`font-display text-3xl font-black tabular-nums tracking-tight ${textWhite ? 'text-white' : 'text-[#111111]'}`}>
        {value}
      </div>
      <div className={`mt-0.5 font-sans text-xs font-bold uppercase ${textWhite ? 'text-white/80' : 'text-[#111111]/75'}`}>
        {sub}
      </div>
    </motion.div>
  )
}

function LevelCard({
  level,
  index,
  progress,
}: {
  level: LevelRef
  index: number
  progress: Progress
}) {
  const navigate = useNavigate()
  const released = isReleased(level.level)
  const done = level.chapters.filter((c) => progress.read.includes(c.id)).length
  const pct = Math.round((done / level.chapters.length) * 100)

  // Neo-brutalist level background accent colors
  const levelAccentBg = [
    'bg-[#FFE94A]',
    'bg-[#00C48C]',
    'bg-[#FF6B9E]',
    'bg-[#4D7CFE]',
    'bg-white',
  ][(level.level - 1) % 5]

  return (
    <motion.button
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      disabled={!released}
      onClick={() => navigate(`/level/${level.level}`)}
      className={`group flex w-full items-center gap-4 rounded-lg border-3 border-[#111111] bg-white p-5 text-left shadow-[6px_6px_0px_#111111] transition-all ${
        released
          ? 'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#111111] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[3px_3px_0px_#111111]'
          : 'cursor-not-allowed opacity-60'
      }`}
    >
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-3 border-[#111111] ${levelAccentBg} text-2xl font-display font-black text-[#111111] shadow-[3px_3px_0px_#111111]`}
      >
        {level.level}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="font-display text-lg sm:text-xl font-black uppercase text-[#111111]">
            {level.title}
          </h3>
          <span className="rounded-md border-2 border-[#111111] bg-[#FFE94A] px-2 py-0.5 text-xs font-black text-[#111111]">
            {level.chapters.length} ch
          </span>
          <span
            className={`rounded-md border-2 border-[#111111] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
              released ? 'bg-[#00C48C] text-[#111111]' : 'bg-[#111111] text-white'
            }`}
          >
            {released ? 'Live' : 'Coming soon'}
          </span>
        </div>

        <p className="mt-1 font-sans text-sm font-semibold text-[#111111]/80">
          {level.blurb}
        </p>

        {/* Progress Bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-[#111111] bg-white">
            <motion.div
              className="h-full bg-[#00C48C]"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <span className="font-display text-xs font-black tabular-nums text-[#111111]">
            {pct}%
          </span>
        </div>
      </div>

      {released && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-[#111111] bg-[#FFE94A] text-[#111111] shadow-[2px_2px_0px_#111111] transition group-hover:bg-[#FF6B9E] group-hover:text-white">
          <ArrowRight size={20} />
        </div>
      )}
    </motion.button>
  )
}
