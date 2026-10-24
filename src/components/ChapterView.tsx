import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import { BlockRenderer } from './BlockRenderer'
import { Quiz } from './Quiz'
import {
  findChapterRef,
  getChapter,
  isLevelLoaded,
  levelOf,
  levels,
  loadLevel,
  neighbours,
  releasedLevels,
} from '../data/curriculum'
import { useNavigate } from 'react-router-dom'

const TOTAL_CHAPTERS = levels.reduce((n, l) => n + l.chapters.length, 0)

export function ChapterView({
  id,
  onQuiz,
  onRead,
}: {
  id: string
  onQuiz: (chapterId: string, correct: number, total: number) => void
  onRead: (chapterId: string) => void
}) {
  const navigate = useNavigate()
  const ref = findChapterRef(id)

  const level = ref?.level ?? levelOf(id)
  const [loaded, setLoaded] = useState(() => isLevelLoaded(level))
  useEffect(() => {
    let alive = true
    if (isLevelLoaded(level)) {
      setLoaded(true)
      return
    }
    setLoaded(false)
    void loadLevel(level).then(() => alive && setLoaded(true))
    return () => {
      alive = false
    }
  }, [level])

  const chapter = ref ? getChapter(ref) : undefined
  const { prev, next } = neighbours(id)

  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el || !chapter) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && onRead(id)),
      { rootMargin: '0px 0px -80px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [id, chapter, onRead])

  if (!ref) return <p className="font-bold text-[#111111]">Chapter not found.</p>

  if (!loaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-lg border-3 border-[#111111] border-t-transparent bg-white shadow-neo-sm" />
      </div>
    )
  }

  if (!chapter) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border-3 border-[#111111] bg-white p-8 text-center shadow-[8px_8px_0px_#111111]">
        <div className="text-5xl">🚧</div>
        <h1 className="mt-3 font-display text-2xl sm:text-3xl font-black uppercase text-[#111111]">
          {ref.title}
        </h1>
        <p className="mt-2 font-sans font-semibold text-[#111111]/80">
          This chapter is queued for writing. Levels 1–{releasedLevels[releasedLevels.length - 1]?.level ?? 1} are live. The full {TOTAL_CHAPTERS}-chapter syllabus is outlined, and chapters appear here as they are published.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => navigate(`/level/${ref.level}`)}
            className="rounded-lg border-3 border-[#111111] bg-white px-5 py-2.5 font-display text-xs font-black uppercase text-[#111111] shadow-[4px_4px_0px_#111111] transition-all hover:bg-[#FFE94A] active:translate-x-[2px] active:translate-y-[2px]"
          >
            ← Back to Level
          </button>
          {next && (
            <button
              onClick={() => navigate(`/chapter/${next.id}`)}
              className="rounded-lg border-3 border-[#111111] bg-[#00C48C] px-5 py-2.5 font-display text-xs font-black uppercase text-[#111111] shadow-[4px_4px_0px_#111111] transition-all hover:bg-[#00e09e] active:translate-x-[2px] active:translate-y-[2px]"
            >
              Next Available Chapter →
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-2xl">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border-3 border-[#111111] bg-white p-6 shadow-[6px_6px_0px_#111111]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-block rounded-md border-2 border-[#111111] bg-[#FFE94A] px-2.5 py-1 font-display text-xs font-black uppercase text-[#111111] shadow-[2px_2px_0px_#111111]">
            Level {ref.level} · Chapter {ref.id.split('-')[1]}
          </span>
          <div className="inline-flex items-center gap-1.5 rounded-md border-2 border-[#111111] bg-white px-2.5 py-1 font-sans text-xs font-black uppercase text-[#111111] shadow-[2px_2px_0px_#111111]">
            <Clock size={13} />
            {chapter.minutes} min read
          </div>
        </div>

        <h1 className="mt-4 font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#111111]">
          {chapter.title}
        </h1>
        <p className="mt-2 font-sans text-base font-bold text-[#111111]/80">
          {chapter.subtitle}
        </p>
      </motion.header>

      {/* Chapter Prose & Content Blocks */}
      <div className="my-6 space-y-6">
        {chapter.blocks.map((b, i) => (
          <BlockRenderer key={i} block={b} index={i} chapterId={chapter.id} />
        ))}
      </div>

      {/* Key Takeaway Box */}
      <div className="rounded-lg border-3 border-[#111111] bg-[#00C48C] p-5 text-[#111111] shadow-[6px_6px_0px_#111111]">
        <div className="font-display text-xs font-black uppercase tracking-widest text-[#111111]">
          ★ Key Takeaway
        </div>
        <p className="mt-1 font-sans text-base font-bold text-[#111111] leading-snug">
          {chapter.takeaway}
        </p>
      </div>

      {/* Chapter Quiz */}
      <div className="mt-6">
        <Quiz
          questions={chapter.quiz}
          chapterId={chapter.id}
          onComplete={(c, t) => onQuiz(chapter.id, c, t)}
        />
      </div>

      <div ref={sentinel} className="h-px" />

      {/* Prev / Next Navigation Bar */}
      <nav className="mt-8 flex items-center justify-between gap-3 border-t-3 border-[#111111] pt-6">
        {prev ? (
          <button
            onClick={() => navigate(`/chapter/${prev.id}`)}
            className="group flex items-center gap-2 rounded-lg border-3 border-[#111111] bg-white px-4 py-2.5 font-display text-xs font-black uppercase text-[#111111] shadow-[4px_4px_0px_#111111] transition-all hover:bg-[#FFE94A] active:translate-x-[2px] active:translate-y-[2px]"
          >
            <ArrowLeft size={16} />
            <span className="max-w-[140px] truncate">{prev.title}</span>
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button
            onClick={() => navigate(`/chapter/${next.id}`)}
            className="group flex items-center gap-2 rounded-lg border-3 border-[#111111] bg-[#FF6B9E] px-4 py-2.5 font-display text-xs font-black uppercase text-white shadow-[4px_4px_0px_#111111] transition-all hover:bg-rose-400 active:translate-x-[2px] active:translate-y-[2px]"
          >
            <span className="max-w-[160px] truncate">Next: {next.title}</span>
            <ArrowRight size={16} />
          </button>
        )}
      </nav>
    </article>
  )
}
