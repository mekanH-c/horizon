import { Suspense, lazy, useCallback, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Hud } from './components/Hud'
import { useProgress } from './lib/store'
import type { Progress } from './lib/store'

/**
 * Route components are code-split, so the initial download is only the shell:
 * the HUD, the router and the Home page. Everything else — a level's chapter
 * prose, its simulations, the glossary — arrives on demand.
 */
const Home = lazy(() => import('./components/Home').then((m) => ({ default: m.Home })))
const LevelView = lazy(() => import('./components/LevelView').then((m) => ({ default: m.LevelView })))
const ChapterView = lazy(() => import('./components/ChapterView').then((m) => ({ default: m.ChapterView })))
const SearchPage = lazy(() => import('./components/SearchPage').then((m) => ({ default: m.SearchPage })))
const GlossaryPage = lazy(() =>
  import('./components/GlossaryPage').then((m) => ({ default: m.GlossaryPage })),
)
const RoadmapView = lazy(() =>
  import('./components/RoadmapView').then((m) => ({ default: m.RoadmapView })),
)
const NotebookPlanner = lazy(() =>
  import('./components/NotebookPlanner').then((m) => ({ default: m.NotebookPlanner })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-lg border-3 border-[#111111] border-t-transparent bg-white shadow-neo-sm" />
    </div>
  )
}

/** Scroll to top on navigation, as the old hash router did. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function LevelRoute({ progress }: { progress: Progress }) {
  const { level } = useParams()
  return <LevelView level={Number(level ?? 1)} progress={progress} />
}

function ChapterRoute({
  onQuiz,
  onRead,
}: {
  onQuiz: (id: string, correct: number, total: number) => void
  onRead: (id: string) => void
}) {
  const { id = '' } = useParams()
  return <ChapterView id={id} onQuiz={onQuiz} onRead={onRead} />
}

function SearchRoute() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  return (
    <SearchPage
      initialQuery={initialQuery}
      onQueryChange={(q: string) => setSearchParams(q ? { q } : {}, { replace: true })}
    />
  )
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <div className="text-5xl">🧭</div>
      <h1 className="mt-3 font-display text-2xl font-black uppercase text-[#111111]">This page does not exist</h1>
      <p className="mt-2 font-medium text-[#111111]/80">
        The link may be old. Try searching, or head back to the start.
      </p>
      <div className="mt-5 flex justify-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="neo-btn bg-white px-4 py-2 text-sm text-[#111111]"
        >
          ← Home
        </button>
        <button
          onClick={() => navigate('/search')}
          className="neo-btn bg-[#00C48C] px-4 py-2 text-sm font-black uppercase text-[#111111]"
        >
          Search chapters
        </button>
      </div>
    </div>
  )
}

/**
 * Sync problems used to surface as a few pixels of "sync failed" in the HUD,
 * which is useless when the real cause is a missing database table. This banner
 * says what actually went wrong and, where recognisable, what to do about it.
 */
function SyncErrorBanner({ message }: { message: string }) {
  const missingTable =
    /PGRST205|chapter_progress|does not exist|schema cache/i.test(message)
  const hint = missingTable
    ? 'The progress table has not been created in Supabase yet. Run supabase/schema.sql in the dashboard SQL editor.'
    : 'Your local progress is safe — only the cloud copy is behind.'

  return (
    <div className="mb-5 rounded-lg border-3 border-[#111111] bg-[#FF6B9E] p-4 text-sm text-[#111111] shadow-neo">
      <div className="font-display font-bold uppercase">Sync is not working</div>
      <p className="mt-1 break-words font-medium">{message}</p>
      <p className="mt-1.5 text-xs font-bold text-[#111111]/80">{hint}</p>
    </div>
  )
}

export default function App() {
  const {
    progress,
    stats,
    recordQuiz,
    markRead,
    reset,
    sync,
    pullAndMerge,
    planner,
    completePlannerTask,
    uncompletePlannerTask,
    addPlannerTask,
    removePlannerTask,
    reschedulePlannerTask,
    setDailyTasks,
    updateStudyPlan,
    setDailyNote,
  } = useProgress()
  const { pathname } = useLocation()

  // Chapter/level routes must wait for that level's content chunk to land,
  // otherwise ChapterView would render the "coming soon" stub.
  const level = /^\/level\/(\d+)/.exec(pathname)?.[1]
    ? Number(/^\/level\/(\d+)/.exec(pathname)![1])
    : /^\/chapter\/(l\d)-/.exec(pathname)
      ? Number(/^\/chapter\/(l\d)-/.exec(pathname)![1])
      : 0

  const onSignedIn = useCallback(() => {
    void pullAndMerge()
  }, [pullAndMerge])

  // Warm the current level's content when the route changes.
  useEffect(() => {
    if (level > 0) void import('./data/curriculum').then((m) => m.loadLevel(level))
  }, [level])

  // Today's pending tasks count for the HUD badge
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayTasks = planner.dailyTasks[todayKey] ?? []
  const todayPendingCount = todayTasks.filter((t) => !t.completed).length

  return (
    <div className="min-h-screen bg-[#FFE94A] text-[#111111]">
      <Hud
        level={level}
        sync={sync}
        onSignedIn={onSignedIn}
        todayPendingCount={todayPendingCount}
      />

      <ScrollToTop />

      <main className="relative mx-auto max-w-5xl px-4 py-8">
        {sync.status === 'error' && sync.error && <SyncErrorBanner message={sync.error} />}
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home progress={progress} stats={stats} />} />
            <Route path="/level/:level" element={<LevelRoute progress={progress} />} />
            <Route
              path="/chapter/:id"
              element={<ChapterRoute onQuiz={recordQuiz} onRead={markRead} />}
            />
            <Route
              path="/roadmap"
              element={
                <RoadmapView
                  progress={progress}
                  planner={planner}
                  onAddTask={addPlannerTask}
                  onMarkRead={markRead}
                  onSetDailyTasks={setDailyTasks}
                  onUpdateStudyPlan={updateStudyPlan}
                />
              }
            />
            <Route
              path="/planner"
              element={
                <NotebookPlanner
                  progress={progress}
                  planner={planner}
                  onCompleteTask={completePlannerTask}
                  onUncompleteTask={uncompletePlannerTask}
                  onAddTask={addPlannerTask}
                  onRemoveTask={removePlannerTask}
                  onRescheduleTask={reschedulePlannerTask}
                  onSetDailyTasks={setDailyTasks}
                  onUpdateStudyPlan={updateStudyPlan}
                  onSetDailyNote={setDailyNote}
                />
              }
            />
            <Route path="/notebook" element={<Navigate to="/planner" replace />} />
            <Route path="/search" element={<SearchRoute />} />
            <Route path="/glossary" element={<GlossaryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="relative mx-auto max-w-5xl px-4 pb-12 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-3 border-[#111111] pt-6 text-xs font-bold text-[#111111]">
          <span>
            Paisa Playbook — an educational app, not financial advice. Figures and rates are illustrative.
          </span>
          <div className="flex items-center gap-3">
            <span className="rounded-md border-2 border-[#111111] bg-white px-2 py-1 shadow-neo-sm">
              {stats.done} / {stats.total} completed
            </span>
            {stats.done > 0 && (
              <button
                onClick={() => {
                  if (confirm('Reset all your progress?')) reset()
                }}
                className="rounded-md border-2 border-[#111111] bg-[#FF6B9E] px-2 py-1 text-[#111111] transition hover:bg-rose-400 active:translate-x-[1px] active:translate-y-[1px]"
              >
                Reset Progress
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}