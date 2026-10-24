import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search as SearchIcon } from 'lucide-react'
import { prepareSearch, search } from '../lib/search'
import { SearchBox } from './SearchBox'
import type { SearchHit } from '../lib/search'

/**
 * Full search results across all 508 chapters, with a level filter.
 * The header search box is reused here so results stay in sync with it.
 */
export function SearchPage({
  initialQuery = '',
  onQueryChange,
}: {
  initialQuery?: string
  onQueryChange?: (q: string) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  // The header SearchBox owns the live query and reports it here.
  const handleQuery = (q: string) => {
    setQuery(q)
    onQueryChange?.(q)
  }
  const [level, setLevel] = useState<number | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    void prepareSearch().then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])

  const hits: SearchHit[] = useMemo(
    () => (ready ? search(query, 200) : []),
    [ready, query],
  )

  const filtered = level ? hits.filter((h) => h.doc.level === level) : hits
  const levelCounts = useMemo(() => {
    const m = new Map<number, number>()
    for (const h of hits) m.set(h.doc.level, (m.get(h.doc.level) ?? 0) + 1)
    return m
  }, [hits])

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#111111]">
          <SearchIcon size={14} />
          All 508 chapters
        </div>
        <h1 className="mt-2 font-display text-3xl font-black uppercase text-[#111111] sm:text-4xl">
          Search
        </h1>
      </header>

      <SearchBox
        key={initialQuery}
        className="max-w-md"
        initialQuery={initialQuery}
        onQueryChange={handleQuery}
      />

      {ready && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setLevel(null)}
            className={`rounded-md border-2 border-[#111111] px-3 py-1 font-black uppercase transition active:translate-x-[1px] active:translate-y-[1px] ${
              level === null
                ? 'bg-[#00C48C] text-[#111111] shadow-[2px_2px_0px_#111111]'
                : 'bg-white text-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#FFE94A]'
            }`}
          >
            All ({hits.length})
          </button>
          {[...levelCounts.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([l, n]) => (
              <button
                key={l}
                onClick={() => setLevel(l === level ? null : l)}
                className={`rounded-md border-2 border-[#111111] px-3 py-1 font-black uppercase transition active:translate-x-[1px] active:translate-y-[1px] ${
                  level === l
                    ? 'bg-[#FF6B9E] text-[#111111] shadow-[2px_2px_0px_#111111]'
                    : 'bg-white text-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#FFE94A]'
                }`}
              >
                Level {l} ({n})
              </button>
            ))}
        </div>
      )}

      <div className="mt-6">
        {!ready ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-[#111111]">
            <Loader2 size={16} className="animate-spin text-[#111111]" />
            Building the index from all written chapters…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm font-bold text-[#111111]/70">
            {query ? `Nothing matched “${query}”.` : 'Type to search titles, topics and explanations.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((h) => (
              <li key={h.doc.id}>
                <Link
                  to={`/chapter/${h.doc.id}`}
                  className="block rounded-lg border-3 border-[#111111] bg-white p-4 shadow-[4px_4px_0px_#111111] transition hover:bg-[#FFFDE6] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#111111]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-black text-[#111111]">{h.doc.title}</span>
                    {!h.doc.authored && (
                      <span className="rounded border border-[#111111] bg-[#FF6B9E] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#111111]">
                        coming soon
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs font-black uppercase text-[#4D7CFE]">
                    Level {h.doc.level} · {h.doc.levelTitle}
                  </div>
                  {h.doc.subtitle && (
                    <p className="mt-1 text-sm font-medium text-[#111111]/80">{h.doc.subtitle}</p>
                  )}
                  {h.snippet && <p className="mt-1 text-xs font-medium text-[#111111]/60">{h.snippet}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}