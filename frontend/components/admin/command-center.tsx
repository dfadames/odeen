"use client"

import { motion } from "framer-motion"
import {
  Zap,
  StopCircle,
  Users,
  BarChart3,
  Projector,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Radio,
  QrCode,
} from "lucide-react"
import QRCode from "react-qr-code"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ThemeToggle } from "@/components/theme-toggle"
import type { AssemblyState, Motion } from "@/lib/assembly-types"

interface CommandCenterProps {
  assembly: AssemblyState
  activeMotion: Motion | undefined
  votesCast: number
  onLaunchMotion: (motionId: string) => void
  onEndMotion: () => void
  onViewResults: () => void
  onBackToAgenda: () => void
  onOpenProjection: () => void
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
}

export function CommandCenter({
  assembly,
  activeMotion,
  votesCast,
  onLaunchMotion,
  onEndMotion,
  onViewResults,
  onBackToAgenda,
  onOpenProjection,
}: CommandCenterProps) {
  const hasActiveMotion = !!activeMotion
  const progressPercent =
    assembly.totalEligible > 0
      ? Math.min((votesCast / assembly.totalEligible) * 100, 100)
      : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10 bg-mesh bg-background" />

      {/* Header */}
      <motion.header
        className="sticky top-0 z-50 glass-strong"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackToAgenda}
              aria-label="Volver a la agenda"
              className="transition-all hover:scale-110"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1
                className="text-base font-bold text-foreground flex items-center gap-2"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                <span className="brand-text">Odeen</span>
                <span className="text-muted-foreground/30 font-normal">|</span>
                <span className="text-sm font-medium text-muted-foreground">Comando</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={onOpenProjection}
            >
              <Projector className="size-3.5" />
              Proyector
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={onViewResults}
            >
              <BarChart3 className="size-3.5" />
              Resultados
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* ===== Left Column: Agenda ===== */}
          <motion.div {...fadeUp}>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
              Agenda
            </h2>
            <div className="flex flex-col gap-3">
              {assembly.motions.map((m, i) => {
                const isActive = m.id === assembly.activeMotionId
                const isCompleted = m.status === "completed"
                const isPending = m.status === "pending"

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                  >
                    <Card
                      className={`transition-all ${isActive
                        ? "glass border-primary/40 shadow-xl glow-primary"
                        : isCompleted
                          ? "border-success/15 bg-success/3 opacity-80"
                          : "glass border-border/40 shadow-lg"
                        }`}
                    >
                      <CardContent className="flex items-center gap-4 py-4">
                        {/* Status icon */}
                        <div className="shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="size-5 text-success" />
                          ) : isActive ? (
                            <Radio className="size-5 text-primary animate-heartbeat" />
                          ) : (
                            <Circle className="size-5 text-muted-foreground/25" />
                          )}
                        </div>

                        {/* Motion info */}
                        <div className="flex-1">
                          <p
                            className={`text-sm font-semibold ${isActive
                              ? "text-primary"
                              : isCompleted
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                              }`}
                            style={{ fontFamily: "var(--font-space-grotesk)" }}
                          >
                            {i + 1}. {m.title || "Moción sin título"}
                          </p>
                          {isActive && (
                            <p className="mt-0.5 text-xs text-primary/70 font-medium">
                              Votación en progreso...
                            </p>
                          )}
                          {isCompleted && m.totalVotes && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {m.totalVotes} votos registrados
                            </p>
                          )}
                        </div>

                        {/* Launch button */}
                        {isPending && !hasActiveMotion && (
                          <Button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/admin/motions/${m.id}/status`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'LIVE' })
                                })
                                if (res.ok) {
                                  onLaunchMotion(m.id)
                                } else {
                                  console.error("Failed to launch motion")
                                }
                              } catch (e) {
                                console.error(e)
                              }
                            }}
                            size="sm"
                            className="gap-1.5 rounded-lg font-semibold shadow-lg transition-all hover:scale-[1.05] hover:shadow-xl active:scale-[0.97] glow-primary"
                          >
                            <Zap className="size-3.5" />
                            INICIAR
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* ===== Right Column: Live Stats ===== */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45, ease: "easeOut" }}
          >
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
              Estadísticas en Vivo
            </h2>

            {!hasActiveMotion ? (
              <Card className="glass border-border/40 shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <div className="mb-5 flex size-18 items-center justify-center rounded-2xl bg-muted/50">
                    <Zap className="size-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                    Sin moción activa
                  </p>
                  <p className="mt-1.5 max-w-xs text-center text-xs text-muted-foreground/50">
                    Selecciona una moción de la agenda y haz clic en INICIAR para comenzar la votación
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Active motion title */}
                <Card className="glass border-primary/25 shadow-xl glow-primary">
                  <CardContent className="py-5">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-primary/80">
                      Votación Actual
                    </p>
                    <h3
                      className="text-xl font-bold text-foreground text-balance"
                      style={{ fontFamily: "var(--font-space-grotesk)" }}
                    >
                      {activeMotion?.title}
                    </h3>
                  </CardContent>
                </Card>

                {/* QR Code */}
                <Card className="glass flex items-center gap-6 border-border/40 py-5 px-6 shadow-lg">
                  <div className="shrink-0 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-border/20">
                    <QRCode
                      value={`${process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "")}/vote/${activeMotion?.id || ""}`}
                      size={80}
                      level="Q"
                    />
                  </div>
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <QrCode className="size-4 text-primary" />
                      Escanear para Votar
                    </h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      Los asambleístas escanean este QR para unirse a la votación desde sus dispositivos.
                    </p>
                  </div>
                </Card>

                {/* Connected users */}
                <Card className="glass border-border/40 shadow-lg">
                  <CardContent className="flex items-center gap-4 py-5">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary/8 border border-primary/12">
                      <Users className="size-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Conectados
                      </p>
                      <p className="text-3xl font-bold tabular-nums text-foreground" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                        {assembly.connectedUsers.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Votes progress */}
                <Card className="glass border-border/40 shadow-lg">
                  <CardContent className="flex flex-col gap-4 py-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Votos Emitidos
                      </p>
                      <p className="text-sm font-bold tabular-nums text-foreground" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                        {votesCast.toLocaleString()} /{" "}
                        {assembly.totalEligible.toLocaleString()}
                      </p>
                    </div>
                    <Progress
                      value={progressPercent}
                      className="h-3 rounded-full"
                    />
                    <p className="text-xs text-muted-foreground/50">
                      participación del {progressPercent.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>

                {/* END voting */}
                <Button
                  onClick={async () => {
                    if (!activeMotion) return;
                    try {
                      const res = await fetch(`/api/admin/motions/${activeMotion.id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'COMPLETED' })
                      })
                      if (res.ok) {
                        onEndMotion()
                      } else {
                        console.error("Failed to end motion")
                      }
                    } catch (e) {
                      console.error(e)
                    }
                  }}
                  size="lg"
                  variant="destructive"
                  className="group gap-2 rounded-xl py-7 text-lg font-bold shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  <StopCircle className="size-5 transition-transform group-hover:scale-110" />
                  FINALIZAR VOTACIÓN
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
