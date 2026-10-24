import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, CalendarDays, CheckSquare, ChevronLeft, Map, Menu, Search, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { SearchBox } from './SearchBox'
import { AuthBar } from './AuthBar'
import { LogoMark } from './LogoMark'
import type { SyncState } from '../lib/sync'

/**
 * The header is deliberately small "mini navbars" rather than one full-width
 * bar: a brand pill on the left, a navigation pill with Roadmap & Daily Notebook,
 * and a menu pill on the right.
 */
export function Hud({
  level,
  sync,
  onSignedIn,
  todayPendingCount = 0,
}: {
  level: number
  sync: SyncState
  onSignedIn: () => void
  todayPendingCount?: number
}) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Any navigation closes the menu.
  useEffect(() => setOpen(false), [pathname])

  // Escape closes it and returns focus; clicking outside closes it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    /* No background, border or divider: the pills sit on the page itself so
       they read as separate floating bars rather than one navbar. The header
       is pointer-events-none so the gap between the pills stays click-through;
       each pill opts back in. */
    <header className="pointer-events-none sticky top-0 z-40">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        {/* ------------------------------------------ mini navbar 1: brand */}
        <div className="pointer-events-auto flex min-w-0 items-center rounded-lg border-3 border-[#111111] bg-white py-1.5 pr-4 pl-2 shadow-[6px_6px_0px_#111111] transition hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[7px_7px_0px_#111111]">
          {/* Back up a level when we are inside one. */}
          {level > 0 && (
            <Link
              to={`/level/${level}`}
              aria-label="Back to level"
              className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 border-[#111111] bg-[#FFE94A] text-[#111111] transition hover:bg-[#FF6B9E] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <ChevronLeft size={18} />
            </Link>
          )}

          <Link to="/" className="group flex min-w-0 items-center gap-2.5" aria-label="Paisa Playbook, home">
            <LogoMark className="h-8 w-8 shrink-0 rounded-md border-2 border-[#111111] shadow-[2px_2px_0px_#111111] transition group-hover:scale-105" />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate font-display text-base uppercase tracking-tight text-[#111111]">
                Paisa Playbook
              </span>
              <span className="mt-0.5 truncate font-sans text-[11px] font-bold uppercase text-[#111111]/70">
                {level > 0 ? `Level ${level}` : 'money, taught honestly'}
              </span>
            </span>
          </Link>
        </div>

        {/* ------------------------------------------- mini navbar 2: links + menu */}
        <div className="pointer-events-auto flex items-center gap-2.5 shrink-0">
          <Link
            to="/roadmap"
            className={`flex h-11 items-center gap-1.5 rounded-lg border-3 border-[#111111] px-3.5 text-xs font-bold shadow-[6px_6px_0px_#111111] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-[3px_3px_0px_#111111] ${
              pathname === '/roadmap'
                ? 'bg-[#00C48C] text-[#111111]'
                : 'bg-white text-[#111111] hover:bg-[#FFE94A]'
            }`}
            aria-label="Visual Roadmap"
          >
            <Map size={16} />
            <span className="hidden sm:inline uppercase">Roadmap</span>
          </Link>

          <Link
            to="/planner"
            className={`relative flex h-11 items-center gap-1.5 rounded-lg border-3 border-[#111111] px-3.5 text-xs font-bold shadow-[6px_6px_0px_#111111] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-[3px_3px_0px_#111111] ${
              pathname === '/planner'
                ? 'bg-[#FF6B9E] text-[#111111]'
                : 'bg-white text-[#111111] hover:bg-[#FFE94A]'
            }`}
            aria-label="Daily Notebook Planner"
          >
            <CheckSquare size={16} />
            <span className="hidden sm:inline uppercase">Notebook</span>
            {todayPendingCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-[#111111] bg-[#FFE94A] px-1 text-[10px] font-black text-[#111111]">
                {todayPendingCount}
              </span>
            )}
          </Link>

          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="flex h-11 items-center gap-2 rounded-lg border-3 border-[#111111] bg-white px-3.5 text-xs font-bold text-[#111111] shadow-[6px_6px_0px_#111111] transition-all hover:bg-[#FFE94A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[3px_3px_0px_#111111]"
            >
              <span className="hidden sm:inline uppercase">Menu</span>
              <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
                {open ? <X size={18} /> : <Menu size={18} />}
              </motion.span>
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-50 mt-3 w-[min(21rem,calc(100vw-2rem))] rounded-lg border-3 border-[#111111] bg-white p-3.5 shadow-[8px_8px_0px_#111111]"
                >
                  <SearchBox className="w-full" />

                  <div className="mt-3 grid gap-1.5">
                    <Link
                      to="/roadmap"
                      className="flex items-center gap-2.5 rounded-md border-2 border-transparent px-3 py-2 text-sm font-bold text-[#111111] transition hover:border-[#111111] hover:bg-[#00C48C] active:translate-x-[2px] active:translate-y-[2px]"
                    >
                      <Map size={16} />
                      Visual Roadmap
                    </Link>
                    <Link
                      to="/planner"
                      className="flex items-center gap-2.5 rounded-md border-2 border-transparent px-3 py-2 text-sm font-bold text-[#111111] transition hover:border-[#111111] hover:bg-[#FF6B9E] active:translate-x-[2px] active:translate-y-[2px]"
                    >
                      <CalendarDays size={16} />
                      Daily Tasks Notebook
                    </Link>
                    <Link
                      to="/search"
                      className="flex items-center gap-2.5 rounded-md border-2 border-transparent px-3 py-2 text-sm font-bold text-[#111111] transition hover:border-[#111111] hover:bg-[#FFE94A] active:translate-x-[2px] active:translate-y-[2px]"
                    >
                      <Search size={16} />
                      Search all 508 chapters
                    </Link>
                    <Link
                      to="/glossary"
                      className="flex items-center gap-2.5 rounded-md border-2 border-transparent px-3 py-2 text-sm font-bold text-[#111111] transition hover:border-[#111111] hover:bg-[#4D7CFE] hover:text-white active:translate-x-[2px] active:translate-y-[2px]"
                    >
                      <BookOpen size={16} />
                      Glossary
                    </Link>
                  </div>

                  <div className="mt-3 border-t-3 border-[#111111] pt-3">
                    <AuthBar sync={sync} onSignedIn={onSignedIn} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
