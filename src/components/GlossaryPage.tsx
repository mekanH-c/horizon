import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Loader2 } from 'lucide-react'
import { glossaryCount, groupByLetter, prepareGlossary, searchGlossary } from '../lib/glossary'

/**
 * A searchable glossary. Terms come from the hand-authored seed list plus every
 * `terms` block in the written chapters, so a term taught in a lesson also
 * links back to the chapter that explains it.
 */
export function GlossaryPage() {
  const [query, setQuery] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    void prepareGlossary().then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])

  // Browsing shows every entry; a query is capped so results stay readable.
  const groups = useMemo(
    () => (ready ? groupByLetter(searchGlossary(query, query ? 300 : 1000)) : []),
    [ready, query],
  )
  const letters = groups.map((g) => g.letter)
  const total = ready ? glossaryCount() : 0
  const shown = groups.reduce((n, g) => n + g.entries.length, 0)

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#111111]">
          <BookOpen size={14} />
          Reference
        </div>
        <h1 className="mt-2 font-display text-3xl font-black uppercase text-[#111111] sm:text-4xl">
          Glossary
        </h1>
        <p className="mt-2 text-sm font-bold text-[#111111]/80">
          {total} money words, in plain Indian English. Every entry is written to be understood on first
          reading.
        </p>
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter terms…"
        aria-label="Filter glossary terms"
        className="w-full rounded-lg border-3 border-[#111111] bg-white px-4 py-2.5 text-sm font-bold text-[#111111] placeholder:text-[#111111]/50 shadow-[4px_4px_0px_#111111] focus:bg-[#FFFDE6] focus:outline-none"
      />

      {!ready ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm font-bold text-[#111111]">
          <Loader2 size={16} className="animate-spin text-[#111111]" />
          Loading the glossary…
        </div>
      ) : (
        <>
          {letters.length > 0 && (
            <nav className="mt-4 flex flex-wrap gap-1.5 text-xs" aria-label="Jump to letter">
              {letters.map((l) => (
                <a
                  key={l}
                  href={`#g-${l}`}
                  className="rounded-md border-2 border-[#111111] bg-white px-2 py-1 font-black text-[#111111] shadow-[2px_2px_0px_#111111] transition hover:bg-[#FFE94A] active:translate-x-[1px] active:translate-y-[1px]"
                >
                  {l}
                </a>
              ))}
            </nav>
          )}

          <p className="mt-4 text-xs font-bold text-[#111111]/70">
            {shown} {shown === 1 ? 'term' : 'terms'}
            {query ? ` matching “${query}”` : ''}
          </p>

          <div className="mt-4 space-y-6">
            {groups.map((g) => (
              <section key={g.letter} id={`g-${g.letter}`} className="scroll-mt-28">
                <h2 className="sticky top-20 z-10 mb-2 inline-block rounded-md border-2 border-[#111111] bg-[#FFE94A] px-3 py-1 font-display text-xl font-black uppercase text-[#111111] shadow-[3px_3px_0px_#111111]">
                  {g.letter}
                </h2>
                <dl className="grid gap-3">
                  {g.entries.map((e) => (
                    <div key={e.key} className="rounded-lg border-3 border-[#111111] bg-white p-4 shadow-[4px_4px_0px_#111111]">
                      <dt className="font-display text-lg font-black uppercase text-[#111111]">{e.term}</dt>
                      <dd className="mt-1 text-sm font-medium leading-relaxed text-[#111111]/85">{e.meaning}</dd>
                      {(e.chapters.length > 0 || e.see.length > 0) && (
                        <dd className="mt-3 flex flex-wrap gap-2 text-[11px]">
                          {e.chapters.map((id) => (
                            <Link
                              key={id}
                              to={`/chapter/${id}`}
                              className="rounded-md border border-[#111111] bg-[#00C48C] px-2 py-0.5 font-black uppercase text-[10px] text-[#111111] shadow-[1px_1px_0px_#111111] transition hover:bg-white"
                            >
                              read in {id.toUpperCase()}
                            </Link>
                          ))}
                          {e.see.slice(0, 4).map((s) => (
                            <button
                              key={s}
                              onClick={() => setQuery(s)}
                              className="rounded-md border border-[#111111] bg-[#FFE94A] px-2 py-0.5 font-bold text-[11px] text-[#111111] shadow-[1px_1px_0px_#111111] transition hover:bg-[#FF6B9E]"
                            >
                              {s}
                            </button>
                          ))}
                        </dd>
                      )}
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}