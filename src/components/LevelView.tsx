import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronRight, Lock } from 'lucide-react'
import { getChapter, isAuthored, isLevelLoaded, levels, loadLevel } from '../data/curriculum'
import { useNavigate } from 'react-router-dom'
import { isUnlocked, type Progress } from '../lib/store'

export function LevelView({ level, progress }: { level: number; progress: Progress }) {
  const navigate = useNavigate()

  // The "written / coming soon" labels come from code-split chapter content.
  const [loaded, setLoaded] = useState(() => isLevelLoaded(level))
  useEffect(() => {
    let alive = true
    if (isLevelLoaded(level)) {
      setLoaded(true)
      return
    }
    void loadLevel(level).then(() => alive && setLoaded(true))
    return () => {
      alive = false
    }
  }, [level])

  const meta = levels.find((l) => l.level === level)
  if (!meta) return <p className="font-bold text-[#111111]">Level not found.</p>

  const unlocked = isUnlocked(level)
  const done = meta.chapters.filter((c) => progress.read.includes(c.id)).length
  const authoredCount = loaded ? meta.chapters.filter((c) => isAuthored(c.id)).length : 0

  const levelAccentBg = [
    'bg-[#FFE94A]',
    'bg-[#00C48C]',
    'bg-[#FF6B9E]',
    'bg-[#4D7CFE]',
    'bg-white',
  ][(level - 1) % 5]

  return (
    <div className="space-y-6">
      {/* Level Header Box */}
      <div className="rounded-lg border-3 border-[#111111] bg-white p-6 shadow-[6px_6px_0px_#111111]">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-lg border-3 border-[#111111] ${levelAccentBg} text-2xl font-display font-black text-[#111111] shadow-[3px_3px_0px_#111111]`}
          >
            {level}
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-[#111111]">
              {meta.title}
            </h1>
            <p className="mt-0.5 font-sans text-sm font-bold text-[#111111]/80">
              {meta.blurb}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 flex items-center gap-3">
          <div className="h-3.5 flex-1 overflow-hidden rounded-full border-2 border-[#111111] bg-white">
            <motion.div
              className="h-full bg-[#00C48C]"
              initial={{ width: 0 }}
              animate={{ width: `${(done / meta.chapters.length) * 100}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <span className="font-display text-xs font-black tabular-nums text-[#111111]">
            {done}/{meta.chapters.length} DONE
          </span>
        </div>

        {authoredCount < meta.chapters.length && (
          <p className="mt-4 rounded-md border-2 border-[#111111] bg-[#FFE94A] p-2.5 text-xs font-bold text-[#111111]">
            {authoredCount} of {meta.chapters.length} chapters are live. The rest arrive as the course expands — the full syllabus is listed below.
          </p>
        )}
      </div>

      {!unlocked && (
        <p className="rounded-lg border-3 border-[#111111] bg-[#FF6B9E] p-3 text-sm font-bold text-white shadow-[4px_4px_0px_#111111]">
          This level is in progress — not released yet. The full syllabus is listed below so you can preview upcoming topics.
        </p>
      )}

      {/* Chapters Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {meta.chapters.map((c, i) => {
          const read = progress.read.includes(c.id)
          const score = progress.scores[c.id]
          const authored = isAuthored(c.id)
          const title = getChapter(c)?.title ?? c.title

          return (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 24) * 0.02 }}
              onClick={() => navigate(`/chapter/${c.id}`)}
              className={`group flex items-center gap-3 rounded-lg border-3 border-[#111111] p-3.5 text-left shadow-[4px_4px_0px_#111111] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#111111] ${
                read ? 'bg-[#00C48C]/20' : 'bg-white'
              } ${authored ? '' : 'opacity-70'}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 border-[#111111] font-display text-xs font-black shadow-[2px_2px_0px_#111111] ${
                  read
                    ? 'bg-[#00C48C] text-[#111111]'
                    : 'bg-[#FFE94A] text-[#111111]'
                }`}
              >
                {read ? <Check size={16} className="stroke-[3]" /> : i + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate font-sans text-sm font-bold text-[#111111]">
                  {title}
                </span>
                <span className="block text-[11px] font-bold text-[#111111]/70">
                  {authored
                    ? score
                      ? `Quiz ${score.correct}/${score.total} ✓`
                      : 'Ready to read'
                    : 'Coming soon'}
                  {!authored && <Lock size={11} className="ml-1 inline" />}
                </span>
              </span>

              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#111111] bg-white transition group-hover:bg-[#FF6B9E] group-hover:text-white">
                <ChevronRight size={16} />
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}