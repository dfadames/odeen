"use client"

import { useState, useCallback, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { VoterHeader } from "./voter-header"
import { PresenceCodeEntry } from "./presence-code-entry"
import { Vote, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import type { Motion } from "@/lib/assembly-types"

interface VoterViewProps {
  motion: Motion
  assemblyTitle: string
  voterToken: string
  onVoteCast: (receipt: string) => void
  onLogout: () => void
}

type BallotStep = "code-entry" | "questions"

const slideTransition = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: { opacity: 0, y: -16, transition: { duration: 0.25 } },
}

const INITIAL_TIME = 10 * 60

const cardVariants = {
  initial: { opacity: 0, y: 24 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.15 + i * 0.12,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
}

export function VoterView({
  motion: currentMotion,
  assemblyTitle,
  voterToken,
  onVoteCast,
  onLogout,
}: VoterViewProps) {
  const [step, setStep] = useState<BallotStep>("code-entry")
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [presenceCode, setPresenceCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize answers for all questions in this motion
  useEffect(() => {
    const initial: Record<string, string | string[]> = {}
    for (const q of currentMotion.questions) {
      initial[q.id] = q.type === "checkbox" ? [] : ""
    }
    setAnswers(initial)
    // Skip code-entry if TOTP is not required
    setStep(currentMotion.requires_totp === false ? "questions" : "code-entry")
    setTimeLeft(INITIAL_TIME)
  }, [currentMotion.id, currentMotion.questions, currentMotion.requires_totp])

  // Countdown timer
  useEffect(() => {
    if (step !== "questions") return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  const isUrgent = timeLeft < 60

  const handleRadioChange = useCallback((qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }))
  }, [])

  const handleCheckboxChange = useCallback(
    (qId: string, option: string, checked: boolean) => {
      setAnswers((prev) => {
        const current = (prev[qId] as string[]) || []
        if (checked) return { ...prev, [qId]: [...current, option] }
        return { ...prev, [qId]: current.filter((o) => o !== option) }
      })
    },
    []
  )

  const handleTextChange = useCallback((qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }))
  }, [])

  // At least one required question answered
  const isComplete = currentMotion.questions.some((q) => {
    const answer = answers[q.id]
    if (q.type === "text") return true // text is optional
    if (Array.isArray(answer)) return answer.length > 0
    return answer !== ""
  })

  const submitVote = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/voter/motions/${currentMotion.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${voterToken}`
        },
        body: JSON.stringify({
          code: currentMotion.requires_totp === false ? undefined : presenceCode,
          vote_data: answers
        })
      })

      const data = await res.json()

      if (res.ok) {
        onVoteCast(data.receipt_hash)
      } else {
        alert(data.error || "Error al enviar el voto")
      }
    } catch (err) {
      console.error(err)
      alert("Error de conexión al enviar voto")
    }
    setIsSubmitting(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <VoterHeader onLogout={onLogout} />
      <main className="flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          {step === "code-entry" && (
            <motion.div key="code-entry" {...slideTransition}>
              <PresenceCodeEntry
                motionTitle={currentMotion.title}
                onValidated={async (code) => {
                  try {
                    const res = await fetch(`/api/voter/motions/${currentMotion.id}/totp`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${voterToken}`
                      },
                      body: JSON.stringify({ code })
                    })
                    if (res.ok) {
                      setPresenceCode(code)
                      setStep("questions")
                      return true
                    }
                    return false
                  } catch (e) {
                    console.error("TOTP Verification Error:", e)
                    return false
                  }
                }}
              />
            </motion.div>
          )}

          {step === "questions" && (
            <motion.div key="questions" {...slideTransition}>
              <div className="flex flex-1 flex-col pb-24">
                <div className="mx-auto w-full max-w-lg px-4 py-6">
                  {/* Motion header */}
                  <motion.div
                    className="mb-6 flex items-center gap-3"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
                      <Vote className="size-5 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-foreground text-balance" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                        {currentMotion.title}
                      </h1>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        {assemblyTitle}
                      </p>
                    </div>
                  </motion.div>

                  {/* Motion description */}
                  {currentMotion.description && (
                    <motion.div
                      className="mb-5 rounded-xl border border-border/40 bg-accent/30 px-4 py-3"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <p className="text-sm leading-relaxed text-foreground/70">
                        {currentMotion.description}
                      </p>
                    </motion.div>
                  )}

                  {/* Questions */}
                  <div className="flex flex-col gap-5">
                    {currentMotion.questions.map((q, idx) => (
                      <motion.div
                        key={q.id}
                        variants={cardVariants}
                        initial="initial"
                        animate="animate"
                        custom={idx}
                      >
                        <Card className="glass card-emerald-accent border-border/50 shadow-lg transition-all hover:shadow-xl">
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <CardTitle className="text-base font-semibold leading-snug text-foreground">
                                  {q.title || `Pregunta ${idx + 1} (Sin título)`}
                                </CardTitle>
                              </div>
                            </div>
                          </CardHeader>
                          <Separator />
                          <CardContent className="pt-4">
                            {q.type === "radio" && (
                              <RadioGroup
                                value={answers[q.id] as string}
                                onValueChange={(val) =>
                                  handleRadioChange(q.id, val)
                                }
                                className="flex flex-col gap-3"
                                aria-label={q.title}
                              >
                                {q.options.map((option) => (
                                  <Label
                                    key={option}
                                    htmlFor={`${q.id}-${option}`}
                                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3.5 transition-all hover:scale-[1.01] hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:shadow-sm"
                                  >
                                    <RadioGroupItem
                                      value={option}
                                      id={`${q.id}-${option}`}
                                    />
                                    <span className="text-sm font-medium text-foreground">
                                      {option}
                                    </span>
                                  </Label>
                                ))}
                              </RadioGroup>
                            )}

                            {q.type === "checkbox" && (
                              <div
                                className="flex flex-col gap-3"
                                role="group"
                                aria-label={q.title}
                              >
                                {q.options.map((option) => {
                                  const isChecked = (
                                    (answers[q.id] as string[]) || []
                                  ).includes(option)
                                  return (
                                    <Label
                                      key={option}
                                      htmlFor={`${q.id}-${option}`}
                                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3.5 transition-all hover:scale-[1.01] hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:shadow-sm"
                                    >
                                      <Checkbox
                                        id={`${q.id}-${option}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) =>
                                          handleCheckboxChange(
                                            q.id,
                                            option,
                                            checked === true
                                          )
                                        }
                                      />
                                      <span className="text-sm font-medium text-foreground">
                                        {option}
                                      </span>
                                    </Label>
                                  )
                                })}
                              </div>
                            )}

                            {q.type === "text" && (
                              <Textarea
                                placeholder="Escribe tu respuesta aquí..."
                                value={answers[q.id] as string}
                                onChange={(e) =>
                                  handleTextChange(q.id, e.target.value)
                                }
                                rows={4}
                                className="resize-none rounded-xl border-border/60 bg-card/40 transition-all focus:bg-card/80 focus:shadow-sm"
                                aria-label={q.title}
                              />
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Sticky bottom bar */}
                <motion.div
                  className="fixed inset-x-0 bottom-0 z-50 glass-strong"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.6,
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                >
                  <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
                    <div
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${isUrgent ? "bg-destructive/10 text-destructive animate-pulse" : "text-muted-foreground"}`}
                    >
                      <Clock
                        className={`size-4 ${isUrgent ? "" : ""}`}
                      />
                      <span className="font-mono text-sm font-bold tabular-nums">
                        {timeString}
                      </span>
                      <span className="text-xs">restantes</span>
                    </div>
                    <Button
                      size="lg"
                      disabled={!isComplete || isSubmitting}
                      onClick={submitVote}
                      className="gap-2 rounded-xl font-semibold shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl active:scale-[0.98] glow-primary"
                    >
                      <CheckCircle2 className="size-4" />
                      {isSubmitting ? "Enviando..." : "Emitir Voto"}
                    </Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
