"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Vote, ShieldCheck, ArrowLeft, QrCode } from "lucide-react"
import QRCode from "react-qr-code"

import type { AssemblyState, Motion } from "@/lib/assembly-types"

type ProjectionState = "code" | "results"

const CODE_REFRESH_SECONDS = 30

function CircularProgress({
  progress,
  size = 160,
  strokeWidth = 6,
}: {
  progress: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - progress * circumference

  return (
    <svg
      width={size}
      height={size}
      className="rotate-[-90deg]"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-[oklch(1_0_0/0.06)]"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-[oklch(0.5_0.14_165)] transition-[stroke-dashoffset] duration-1000 ease-linear"
        style={{ filter: "drop-shadow(0 0 10px oklch(0.55 0.14 165 / 0.5))" }}
      />
    </svg>
  )
}

function AnimatedBar({
  label,
  value,
  total,
  delay,
  color,
}: {
  label: string
  value: number
  total: number
  delay: number
  color: string
}) {
  const [width, setWidth] = useState(0)
  const percentage = total > 0 ? (value / total) * 100 : 0

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(percentage)
    }, delay)
    return () => clearTimeout(timer)
  }, [percentage, delay])

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay / 1000, duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xl font-semibold text-[oklch(0.90_0.006_165)]" style={{ fontFamily: "var(--font-space-grotesk)" }}>{label}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-[oklch(0.95_0.005_165)]" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            {percentage.toFixed(1)}%
          </span>
          <span className="text-sm text-[oklch(0.50_0.02_165)] tabular-nums">
            ({value})
          </span>
        </div>
      </div>
      <div className="h-5 w-full overflow-hidden rounded-full bg-[oklch(1_0_0/0.06)]">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{
            width: `${width}%`,
            background: color,
            boxShadow: `0 0 24px -2px ${color}`,
          }}
        />
      </div>
    </motion.div>
  )
}

interface ProjectionViewProps {
  assembly: AssemblyState
  activeMotion: Motion | undefined
  votesCast: number
  serverTotp?: string
  onBack?: () => void
}

export function ProjectionView({ assembly, activeMotion, votesCast, serverTotp, onBack }: ProjectionViewProps) {
  const [state, setState] = useState<ProjectionState>("code")
  const [code, setCode] = useState(serverTotp || "------")
  const [countdown, setCountdown] = useState(CODE_REFRESH_SECONDS)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (serverTotp) {
      setCode(serverTotp)
      setCountdown(CODE_REFRESH_SECONDS)
    }
  }, [serverTotp])

  useEffect(() => {
    if (state !== "code") return
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 0 // Wait at 0 until server pushes new code
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [state])

  const toggleState = useCallback(() => {
    setState((prev) => (prev === "code" ? "results" : "code"))
  }, [])

  const codeFormatted = `${code.slice(0, 3)} ${code.slice(3)}`
  const progress = countdown / CODE_REFRESH_SECONDS

  const results = [
    { label: "Aprobar", value: 245, color: "oklch(0.6 0.18 155)" },
    { label: "Rechazar", value: 98, color: "oklch(0.55 0.2 25)" },
    { label: "Abstenerse", value: 77, color: "oklch(0.65 0.14 80)" },
  ]
  const totalVotes = results.reduce((acc, r) => acc + r.value, 0)

  return (
    <div className="flex min-h-screen flex-col bg-[oklch(0.09_0.025_165)] text-[oklch(0.94_0.006_165)]">
      {/* Ambient bg gradients — emerald + amber */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute left-1/4 top-1/4 size-[600px] rounded-full opacity-25 blur-[120px]"
          style={{ background: "radial-gradient(circle, oklch(0.45 0.14 165 / 0.35), transparent 70%)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 size-[400px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "radial-gradient(circle, oklch(0.65 0.12 80 / 0.3), transparent 70%)" }}
        />
        <div
          className="absolute bottom-1/3 left-1/2 size-[300px] rounded-full opacity-10 blur-[80px]"
          style={{ background: "radial-gradient(circle, oklch(0.6 0.15 155 / 0.25), transparent 70%)" }}
        />
      </div>

      {/* Header */}
      <motion.header
        className="flex items-center justify-between px-8 py-5"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-2 flex size-9 items-center justify-center rounded-xl border border-[oklch(1_0_0/0.08)] bg-[oklch(1_0_0/0.04)] text-[oklch(0.65_0.02_165)] transition-all hover:bg-[oklch(1_0_0/0.08)] hover:text-[oklch(0.9_0_0)] hover:scale-105"
              aria-label="Volver"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[oklch(0.5_0.14_165/0.2)]" style={{ boxShadow: "0 0 20px oklch(0.5 0.14 165 / 0.2)" }}>
              <ShieldCheck className="size-5 text-[oklch(0.65_0.18_165)]" />
            </div>
            <div>
              <h1
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: "var(--font-space-grotesk)", background: "linear-gradient(135deg, oklch(0.65 0.18 165), oklch(0.72 0.14 155))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                Odeen
              </h1>
              <p className="text-xs text-[oklch(0.45_0.02_165)] uppercase tracking-wider font-medium">
                {assembly.title || "Asamblea General"}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={toggleState}
          className="rounded-xl border border-[oklch(0.5_0.14_165/0.2)] bg-[oklch(0.5_0.14_165/0.08)] px-5 py-2.5 text-sm font-medium text-[oklch(0.75_0.08_165)] transition-all hover:bg-[oklch(0.5_0.14_165/0.15)] hover:scale-[1.03] active:scale-[0.98]"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          {state === "code" ? "Resultados" : "Código"}
        </button>
      </motion.header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          {!activeMotion ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center text-center"
            >
              <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-[oklch(0.5_0.14_165/0.1)]" style={{ boxShadow: "0 0 40px oklch(0.5 0.14 165 / 0.1)" }}>
                <QrCode className="size-10 text-[oklch(0.5_0.14_165/0.5)]" />
              </div>
              <h2
                className="text-2xl font-bold tracking-tight text-[oklch(0.95_0.005_165)]"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                Asamblea en Espera
              </h2>
              <p className="mt-3 max-w-sm text-[oklch(0.6_0.02_165)]">
                Actualmente no hay ninguna votación presencial en curso.
              </p>
            </motion.div>
          ) : state === "code" ? (
            <motion.div
              key="code"
              className="flex flex-col items-center gap-10"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="flex w-full max-w-4xl items-center justify-center gap-16">
                {/* QR Code */}
                <motion.div
                  className="flex flex-col items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[oklch(0.45_0.02_165)]" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                    Escanear para Votar
                  </p>
                  <div className="rounded-3xl bg-white p-6 shadow-2xl" style={{ boxShadow: "0 0 50px oklch(0.5 0.14 165 / 0.2)" }}>
                    <QRCode
                      value={`${process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "")}/vote/${activeMotion?.id || ""}`}
                      size={240}
                      level="Q"
                    />
                  </div>
                </motion.div>

                {activeMotion?.requires_totp && (
                  <>
                    <div className="h-64 w-px bg-[oklch(1_0_0/0.06)]" />

                    {/* 6-Digit Code */}
                    <motion.div
                      className="flex flex-col items-center gap-4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[oklch(0.45_0.02_165)]" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                        Código de Presencia
                      </p>
                      <div className="relative flex items-center justify-center mt-4">
                        <CircularProgress progress={progress} size={280} strokeWidth={4} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <motion.span
                            key={code}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="font-mono text-7xl font-bold whitespace-nowrap text-[oklch(0.95_0.005_165)] leading-none"
                            style={{ textShadow: "0 0 40px oklch(0.5 0.14 165 / 0.35)", letterSpacing: "2px" }}
                            aria-label={`Código: ${codeFormatted}`}
                            aria-live="polite"
                          >
                            {codeFormatted}
                          </motion.span>
                          <span className="mt-3 text-xs tabular-nums text-[oklch(0.40_0.02_165)]">
                            Actualiza en {countdown}s
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>

              {/* Live Metrics */}
              <div className="flex items-center gap-12">
                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex size-12 items-center justify-center rounded-xl bg-[oklch(0.6_0.18_155/0.12)]" style={{ boxShadow: "0 0 20px oklch(0.6 0.18 155 / 0.15)" }}>
                    <Vote className="size-6 text-[oklch(0.65_0.20_155)]" />
                  </div>
                  <div>
                    <p className="text-xs text-[oklch(0.45_0.02_165)] uppercase tracking-wider font-medium">Votos Emitidos</p>
                    <p className="text-3xl font-bold tabular-nums text-[oklch(0.94_0.006_165)]" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                      {votesCast.toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : state === "results" ? (
            <motion.div
              key="results"
              className="flex w-full max-w-2xl flex-col gap-10"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="text-center">
                <motion.p
                  className="text-xs font-semibold uppercase tracking-[0.3em] text-[oklch(0.45_0.02_165)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  Resultados
                </motion.p>
                <motion.h2
                  className="mt-3 text-3xl font-bold text-[oklch(0.94_0.006_165)]"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  {activeMotion?.title || "Moción de Asamblea"}
                </motion.h2>
                <motion.p
                  className="mt-2 text-sm text-[oklch(0.45_0.02_165)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {totalVotes} votos registrados
                </motion.p>
              </div>
              <div className="flex flex-col gap-8">
                {results.map((result, idx) => (
                  <AnimatedBar
                    key={result.label}
                    label={result.label}
                    value={result.value}
                    total={totalVotes}
                    delay={400 + idx * 250}
                    color={result.color}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-center px-8 py-4">
        <p className="text-xs text-[oklch(0.30_0.02_165)]" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          Votación segura y anónima — Odeen
        </p>
      </footer>
    </div>
  )
}
