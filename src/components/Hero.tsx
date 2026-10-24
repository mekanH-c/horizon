import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import TechText from './TechText'
import { releasedLevels, releasedChapterCount } from '../data/curriculum'
import { SIMS } from './sims'

const STATS = [
  { value: String(releasedChapterCount), label: 'Chapters Live', bg: 'bg-[#FF6B9E]' },
  { value: String(Object.keys(SIMS).length), label: 'Interactive Labs', bg: 'bg-[#4D7CFE]' },
  { value: String(releasedLevels.length), label: 'Levels Live', bg: 'bg-[#00C48C]' },
]

export function Hero({
  primaryLabel,
  onStart,
  onBrowse,
}: {
  primaryLabel: string
  onStart: () => void
  onBrowse: () => void
}) {
  const [compact, setCompact] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const mq = window.matchMedia('(max-width: 640px)')
    const apply = () => setCompact(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return (
    <section className="relative overflow-hidden rounded-lg border-3 border-[#111111] bg-white shadow-[8px_8px_0px_#111111]">
      {/* Tilted Circular Sticker Badge */}
      <motion.div
        whileHover={{ rotate: 0, scale: 1.08 }}
        className="absolute -top-3 -right-3 sm:top-5 sm:right-6 z-20 flex h-24 w-24 sm:h-28 sm:w-28 -rotate-12 cursor-pointer items-center justify-center rounded-full border-3 border-[#111111] bg-[#00C48C] p-2 text-center shadow-[4px_4px_0px_#111111] transition-transform"
      >
        <span className="font-display text-[10px] sm:text-xs font-black uppercase leading-tight text-[#111111]">
          ★ 100% FREE ★<br />508 CHAPS<br />INDIAN MONEY
        </span>
      </motion.div>

      <div className="p-6 sm:p-10 md:p-12">
        {/* Live levels pill */}
        <div className="inline-flex items-center gap-2 rounded-md border-2 border-[#111111] bg-[#FFE94A] px-3.5 py-1.5 text-xs font-black uppercase tracking-wide text-[#111111] shadow-[3px_3px_0px_#111111]">
          <Sparkles size={14} className="text-[#111111]" />
          Levels 1–{releasedLevels.length} Live · {releasedChapterCount} Chapters Written
        </div>

        {/* Huge uppercase Archivo Black headline with a boxed #FF6B9E highlight span */}
        <h1 className="mt-5 font-display text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-[#111111] leading-[1.05]">
          Learn money by{' '}
          <span className="inline-block rounded-lg border-3 border-[#111111] bg-[#FF6B9E] px-3 py-0.5 text-white shadow-[4px_4px_0px_#111111]">
            playing with it
          </span>
        </h1>

        {/* Interactive canvas TechText */}
        <div
          ref={stageRef}
          className={`mt-4 rounded-lg border-2 border-dashed border-[#111111]/30 bg-[#FFE94A]/20 p-2 ${
            compact ? 'h-24' : 'h-32 sm:h-40'
          }`}
        >
          <TechText
            text="PAISA PLAYBOOK"
            fontFamily="'Archivo Black', system-ui, sans-serif"
            fontWeight={900}
            fontSize={compact ? 36 : 64}
            letterSpacing={-0.02}
            color="#111111"
            accentColor="#FF6B9E"
            reach={compact ? 120 : 190}
            softness={0.65}
            dashLength={5}
            dashGap={3}
            strokeWidth={1.8}
            lineStyle="dashed"
            reveal="letter"
            draggable
            sweep={!reduceMotion}
            labels={!compact}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        <p className="mt-5 max-w-2xl font-sans text-base sm:text-lg font-bold text-[#111111]/85 leading-relaxed">
          Short chapters, interactive labs and quizzes — grounded in Indian reality (RBI, UPI, TDS, EPF, Nifty/Sensex). Start with ₹10 and finish able to craft a lifetime wealth plan.
        </p>

        {/* Action Buttons */}
        <div className="mt-7 flex flex-wrap items-center gap-3.5">
          <button
            onClick={onStart}
            className="group flex items-center gap-2 rounded-lg border-3 border-[#111111] bg-[#00C48C] px-6 py-3.5 font-display text-sm font-black uppercase text-[#111111] shadow-[6px_6px_0px_#111111] transition-all hover:bg-[#00e09e] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[3px_3px_0px_#111111]"
          >
            {primaryLabel}
            <ArrowRight size={18} className="transition group-hover:translate-x-1" />
          </button>
          <button
            onClick={onBrowse}
            className="flex items-center gap-2 rounded-lg border-3 border-[#111111] bg-[#FFE94A] px-6 py-3.5 font-display text-sm font-black uppercase text-[#111111] shadow-[6px_6px_0px_#111111] transition-all hover:bg-[#FFF07A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[3px_3px_0px_#111111]"
          >
            Browse Syllabus
          </button>
        </div>

        {/* Stats Strip */}
        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className={`rounded-lg border-3 border-[#111111] ${s.bg} p-3 sm:p-4 text-white shadow-[4px_4px_0px_#111111]`}
            >
              <div className="font-display text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-white drop-shadow-[1px_1px_0px_#111111]">
                {s.value}
              </div>
              <div className="mt-0.5 font-sans text-xs sm:text-sm font-bold uppercase tracking-wider text-[#111111]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom full-width black marquee ticker strip */}
      <div className="overflow-hidden border-t-3 border-[#111111] bg-[#111111] py-3 text-[#FFE94A] font-display font-black text-xs sm:text-sm tracking-widest uppercase select-none">
        <div className="animate-marquee whitespace-nowrap flex gap-10">
          <span>★ 508 CHAPTERS</span>
          <span>★ ZERO JARGON</span>
          <span>★ HANDS-ON SIMULATIONS</span>
          <span>★ REAL INDIAN TAX & SIP LABS</span>
          <span>★ INTERACTIVE ROADMAP</span>
          <span>★ DAILY NOTEBOOK PLANNER</span>
          <span>★ RBI & SEBI GROUNDED</span>
          <span>★ 100% FREE & OPEN</span>
          <span>★ 508 CHAPTERS</span>
          <span>★ ZERO JARGON</span>
          <span>★ HANDS-ON SIMULATIONS</span>
          <span>★ REAL INDIAN TAX & SIP LABS</span>
          <span>★ INTERACTIVE ROADMAP</span>
          <span>★ DAILY NOTEBOOK PLANNER</span>
          <span>★ RBI & SEBI GROUNDED</span>
          <span>★ 100% FREE & OPEN</span>
        </div>
      </div>
    </section>
  )
}