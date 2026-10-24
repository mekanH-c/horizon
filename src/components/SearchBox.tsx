import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import { prepareSearch, search, type SearchHit } from '../lib/search'

/**
 * A search box that queries the client-side index over all 508 chapters.
 * The index pulls in the code-split chapter content, so the first keystroke
 * shows a spinner while that loads; after that it is instant.
 */
export function SearchBox({
  className = '',
  initialQuery = '',
  onQueryChange,
  onNavigate,
}: {
  className?: string
  initialQuery?: string
  onQueryChange?: (q: string) => void
  onNavigate?: () => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const boxRef = useRef<HTMLDivElement>(null)

  // Warm the index on mount so typing feels instant.
  useEffect(() => {
    let alive = true
    void prepareSearch().then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])

  const hits: SearchHit[] = useMemo(
    () => (ready ? search(query, onQueryChange ? 200 : 8) : []),
    [ready, query, onQueryChange],
  )

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const go_ = (id: string) => {
    setOpen(false)
    setQuery('')
    onNavigate?.()
    navigate(`/chapter/${id}`)
  }

  const updateQuery = (q: string) => {
    setQuery(q)
    onQueryChange?.(q)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && hits[active] && !onQueryChange) {
      e.preventDefault()
      go_(hits[active].doc.id)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#111111]" />
      <input
        value={query}
        onChange={(e) => {
          updateQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search 508 chapters…"
        aria-label="Search chapters"
        className="w-full rounded-lg border-3 border-[#111111] bg-white py-2 pl-9 pr-8 text-sm font-bold text-[#111111] placeholder:text-[#111111]/50 shadow-[4px_4px_0px_#111111] focus:bg-[#FFFDE6] focus:outline-none"
      />
      {query && (
        <button
          onClick={() => {
            updateQuery('')
            setOpen(false)
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#111111] hover:text-[#FF6B9E]"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}

      {/* On the results page the box is just an input; the list lives below it. */}
      {open && query && !onQueryChange && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border-3 border-[#111111] bg-white shadow-[6px_6px_0px_#111111]">
          {!ready ? (
            <div className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-[#111111]">
              <Loader2 size={14} className="animate-spin text-[#111111]" />
              Building the index…
            </div>
          ) : hits.length === 0 ? (
            <div className="px-4 py-3 text-xs font-bold text-[#111111]">No chapters match “{query}”.</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y-2 divide-[#111111]/10">
              {hits.map((h, i) => (
                <li key={h.doc.id}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go_(h.doc.id)}
                    className={`block w-full px-4 py-2.5 text-left transition ${
                      i === active ? 'bg-[#FFE94A]' : 'hover:bg-[#FFFDE6]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-black text-[#111111]">{h.doc.title}</span>
                      {!h.doc.authored && (
                        <span className="shrink-0 rounded border border-[#111111] bg-[#FF6B9E] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#111111]">
                          soon
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] font-bold text-[#111111]/70">
                      L{h.doc.level} · {h.doc.subtitle || h.doc.levelTitle}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}