import { motion } from 'framer-motion'
import { Lightbulb, TriangleAlert, Sparkles, Info } from 'lucide-react'
import type { Block } from '../types'
import { Scene } from './scenes'
import { SIMS } from './sims'

const TONES = {
  insight: {
    cls: 'border-3 border-[#111111] bg-[#4D7CFE] text-white shadow-[4px_4px_0px_#111111]',
    Icon: Lightbulb,
    label: 'Insight',
  },
  warning: {
    cls: 'border-3 border-[#111111] bg-[#FF6B9E] text-white shadow-[4px_4px_0px_#111111]',
    Icon: TriangleAlert,
    label: 'Watch Out',
  },
  tip: {
    cls: 'border-3 border-[#111111] bg-[#00C48C] text-[#111111] shadow-[4px_4px_0px_#111111]',
    Icon: Sparkles,
    label: 'Try This',
  },
  india: {
    cls: 'border-3 border-[#111111] bg-[#FFE94A] text-[#111111] shadow-[4px_4px_0px_#111111]',
    Icon: Info,
    label: 'In India',
  },
}

export function BlockRenderer({
  block,
  index = 0,
  chapterId,
}: {
  block: Block
  index?: number
  /** Passed to labs so they can render chapter-specific content. */
  chapterId?: string
}) {
  const fade = {
    initial: { opacity: 0, y: 12 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { delay: Math.min(index, 6) * 0.04 },
  }

  switch (block.kind) {
    case 'p':
      return (
        <motion.p {...fade} className="font-sans text-[16px] font-medium leading-relaxed text-[#111111]">
          {block.text}
        </motion.p>
      )

    case 'h':
      return (
        <motion.h3 {...fade} className="mt-5 font-display text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111]">
          {block.text}
        </motion.h3>
      )

    case 'callout': {
      const { cls, Icon, label } = TONES[block.tone]
      return (
        <motion.aside {...fade} className={`rounded-lg p-4 ${cls}`}>
          <div className="mb-1.5 flex items-center gap-2 font-display text-xs sm:text-sm font-black uppercase tracking-wider">
            <Icon size={18} className="stroke-[2.5]" />
            {block.title ?? label}
          </div>
          <p className="font-sans text-sm font-bold leading-relaxed">{block.text}</p>
        </motion.aside>
      )
    }

    case 'example':
      return (
        <motion.figure {...fade} className="rounded-lg border-3 border-[#111111] bg-white p-4 shadow-[4px_4px_0px_#111111]">
          <figcaption className="mb-1.5 inline-block rounded-md border-2 border-[#111111] bg-[#00C48C] px-2 py-0.5 font-display text-[11px] font-black uppercase text-[#111111]">
            Example · {block.title}
          </figcaption>
          <p className="font-sans text-sm font-bold leading-relaxed text-[#111111]">{block.text}</p>
        </motion.figure>
      )

    case 'list':
      return block.ordered ? (
        <motion.ol {...fade} className="space-y-3">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-3 font-sans text-sm sm:text-base font-semibold leading-relaxed text-[#111111]">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-[#111111] bg-[#FFE94A] font-display text-xs font-black text-[#111111] shadow-[2px_2px_0px_#111111]">
                {i + 1}
              </span>
              <span className="flex-1">{it}</span>
            </li>
          ))}
        </motion.ol>
      ) : (
        <motion.ul {...fade} className="space-y-3">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-3 font-sans text-sm sm:text-base font-semibold leading-relaxed text-[#111111]">
              <span className="mt-2 h-3 w-3 shrink-0 rounded-full border-2 border-[#111111] bg-[#FF6B9E]" />
              <span className="flex-1">{it}</span>
            </li>
          ))}
        </motion.ul>
      )

    case 'table':
      return (
        <motion.div {...fade} className="overflow-x-auto rounded-lg border-3 border-[#111111] bg-white shadow-[4px_4px_0px_#111111]">
          {block.caption && (
            <div className="border-b-3 border-[#111111] bg-[#FFE94A] px-4 py-2 font-display text-xs font-black uppercase text-[#111111]">
              {block.caption}
            </div>
          )}
          <table className="w-full text-left font-sans text-sm">
            <thead>
              <tr className="border-b-3 border-[#111111] bg-[#FFE94A]">
                {block.headers.map((h) => (
                  <th key={h} className="px-4 py-2.5 font-display text-xs font-black uppercase text-[#111111]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-t-2 border-[#111111]/20 transition hover:bg-[#FFE94A]/20">
                  {r.map((c, j) => (
                    <td key={j} className="px-4 py-2.5 font-bold text-[#111111]">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )

    case 'formula':
      return (
        <motion.div {...fade} className="rounded-lg border-3 border-[#111111] bg-white p-4 shadow-[4px_4px_0px_#111111]">
          <div className="mb-2 font-display text-xs font-black uppercase text-[#111111]">
            Formula: {block.label}
          </div>
          <code className="block rounded-md border-2 border-[#111111] bg-[#FFE94A] p-3 font-mono text-sm font-black text-[#111111] shadow-[2px_2px_0px_#111111]">
            {block.expr}
          </code>
          {block.note && <p className="mt-2 font-sans text-xs font-bold text-[#111111]/80">{block.note}</p>}
        </motion.div>
      )

    case 'terms':
      return (
        <motion.dl {...fade} className="grid gap-3 sm:grid-cols-2">
          {block.items.map((t) => (
            <div key={t.term} className="rounded-lg border-3 border-[#111111] bg-white p-4 shadow-[4px_4px_0px_#111111]">
              <dt className="font-display text-sm font-black uppercase text-[#111111]">{t.term}</dt>
              <dd className="mt-1 font-sans text-xs font-bold text-[#111111]/80">{t.meaning}</dd>
            </div>
          ))}
        </motion.dl>
      )

    case 'scene':
      return (
        <motion.div {...fade} className="overflow-hidden rounded-lg border-3 border-[#111111] bg-white p-3 shadow-[6px_6px_0px_#111111]">
          <Scene name={block.name} caption={block.caption} />
        </motion.div>
      )

    case 'sim': {
      const sim = SIMS[block.name]
      return (
        <motion.div {...fade} className="rounded-lg border-3 border-[#111111] bg-white p-5 sm:p-6 shadow-[6px_6px_0px_#111111]">
          <div className="mb-4 border-b-2 border-[#111111]/20 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border-2 border-[#111111] bg-[#00C48C] px-2.5 py-0.5 font-display text-[10px] font-black uppercase text-[#111111] shadow-[2px_2px_0px_#111111]">
                Interactive Lab
              </span>
              <h3 className="font-display text-lg sm:text-xl font-black uppercase text-[#111111]">{sim.title}</h3>
            </div>
            <p className="mt-1 font-sans text-xs sm:text-sm font-bold text-[#111111]/80">{block.caption ?? sim.blurb}</p>
          </div>
          <sim.C chapterId={chapterId} />
        </motion.div>
      )
    }
  }
}