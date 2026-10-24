import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, RotateCcw, X } from 'lucide-react'
import type { Question } from '../types'

type Answers = (number | null)[]

export function Quiz({
  questions,
  chapterId: _chapterId,
  onComplete,
}: {
  questions: Question[]
  chapterId: string
  onComplete: (correct: number, total: number) => void
}) {
  const [answers, setAnswers] = useState<Answers>(questions.map(() => null))
  const [submitted, setSubmitted] = useState(false)
  const [_rewarded, setRewarded] = useState<string | null>(null)

  const score = useMemo(
    () => answers.filter((a, i) => a !== null && questions[i].options[a]?.correct).length,
    [answers, questions],
  )
  const answered = answers.filter((a) => a !== null).length
  const allAnswered = answered === questions.length

  const submit = () => {
    setSubmitted(true)
    onComplete(score, questions.length)
    setRewarded(`${score}/${questions.length}`)
  }

  const reset = () => {
    setAnswers(questions.map(() => null))
    setSubmitted(false)
  }

  if (!questions.length) return null

  return (
    <section className="rounded-lg border-3 border-[#111111] bg-white p-6 shadow-[6px_6px_0px_#111111]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b-3 border-[#111111] pb-3">
        <h3 className="font-display text-xl sm:text-2xl font-black uppercase text-[#111111]">
          Quick Check Quiz
        </h3>
        <span className="rounded-md border-2 border-[#111111] bg-[#FFE94A] px-2.5 py-0.5 font-display text-xs font-black text-[#111111]">
          {answered}/{questions.length} ANSWERED
        </span>
      </div>

      <div className="space-y-6">
        {questions.map((q, qi) => {
          const picked = answers[qi]
          return (
            <div key={qi} className="rounded-lg border-2 border-[#111111]/30 bg-[#FFE94A]/10 p-4">
              <p className="mb-3 font-sans text-base font-bold text-[#111111]">
                <span className="mr-2 inline-block rounded-md border-2 border-[#111111] bg-[#FFE94A] px-2 py-0.5 font-display text-xs font-black">
                  Q{qi + 1}
                </span>
                {q.q}
              </p>
              <div className="space-y-2.5">
                {q.options.map((o, oi) => {
                  const isPicked = picked === oi
                  const showRight = submitted && o.correct
                  const showWrong = submitted && isPicked && !o.correct

                  let optionBg = 'bg-white hover:bg-[#FFE94A]'
                  let textColor = 'text-[#111111]'

                  if (showRight) {
                    optionBg = 'bg-[#00C48C]'
                    textColor = 'text-[#111111]'
                  } else if (showWrong) {
                    optionBg = 'bg-[#FF6B9E]'
                    textColor = 'text-white'
                  } else if (isPicked) {
                    optionBg = 'bg-[#FFE94A]'
                  }

                  return (
                    <motion.button
                      key={oi}
                      type="button"
                      disabled={submitted}
                      onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                      className={`flex w-full items-start gap-3 rounded-lg border-3 border-[#111111] p-3.5 text-left text-sm shadow-[4px_4px_0px_#111111] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#111111] ${optionBg}`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-[#111111] font-display text-xs font-black ${
                          showRight
                            ? 'bg-[#111111] text-[#00C48C]'
                            : showWrong
                              ? 'bg-[#111111] text-[#FF6B9E]'
                              : 'bg-white text-[#111111]'
                        }`}
                      >
                        {showRight ? (
                          <Check size={14} className="stroke-[3]" />
                        ) : showWrong ? (
                          <X size={14} className="stroke-[3]" />
                        ) : (
                          String.fromCharCode(65 + oi)
                        )}
                      </span>
                      <span className="flex-1">
                        <span className={`block font-sans font-bold ${textColor}`}>
                          {o.text}
                        </span>
                        {submitted && (showRight || showWrong) && (
                          <motion.span
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-2 block rounded-md border-2 border-[#111111] bg-white p-2 font-sans text-xs font-semibold text-[#111111] shadow-[2px_2px_0px_#111111]"
                          >
                            {o.why}
                          </motion.span>
                        )}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!submitted ? (
          <button
            onClick={submit}
            disabled={!allAnswered}
            className="rounded-lg border-3 border-[#111111] bg-[#00C48C] px-6 py-3 font-display text-xs font-black uppercase text-[#111111] shadow-[6px_6px_0px_#111111] transition-all hover:bg-[#00e09e] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[3px_3px_0px_#111111] disabled:opacity-40"
          >
            Check Answers
          </button>
        ) : (
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border-3 border-[#111111] bg-white px-5 py-2.5 font-display text-xs font-black uppercase text-[#111111] shadow-[4px_4px_0px_#111111] transition-all hover:bg-[#FFE94A] active:translate-x-[2px] active:translate-y-[2px]"
          >
            <RotateCcw size={16} />
            Try Again
          </button>
        )}

        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <span
                className={`rounded-lg border-3 border-[#111111] px-4 py-2 font-display text-xs font-black uppercase shadow-[4px_4px_0px_#111111] ${
                  score === questions.length
                    ? 'bg-[#00C48C] text-[#111111]'
                    : 'bg-[#FF6B9E] text-white'
                }`}
              >
                {score === questions.length
                  ? `★ PERFECT! ${score}/${questions.length} (+${score * 10} XP)`
                  : `${score}/${questions.length} CORRECT (+${score * 10} XP)`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}