"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Wifi, LogOut } from "lucide-react"
import type { AssemblyState } from "@/lib/assembly-types"

interface WaitingRoomProps {
  assembly: AssemblyState
  onBack: () => void
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
}

export function WaitingRoom({ assembly, onBack }: WaitingRoomProps) {
  const [dotCount, setDotCount] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1))
    }, 600)
    return () => clearInterval(interval)
  }, [])

  const dots = ".".repeat(dotCount)
  const completedCount = assembly.motions.filter(
    (m) => m.status === "completed"
  ).length
  const totalCount = assembly.motions.length

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="fixed inset-0 -z-10 bg-mesh bg-background" />

      <motion.div
        className="w-full max-w-md"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {/* Odeen brand */}
        <motion.div variants={fadeUp} className="mb-8 flex flex-col items-center">
          <h1
            className="brand-text text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Odeen
          </h1>
        </motion.div>

        <motion.div variants={fadeUp} className="glass-strong rounded-2xl p-7 shadow-xl">
          {/* Authenticated status */}
          <div className="mb-7 flex flex-col items-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="absolute size-20 animate-pulse-ring rounded-full bg-success/12" />
                <span
                  className="absolute size-28 animate-pulse-ring rounded-full bg-success/6"
                  style={{ animationDelay: "0.5s" }}
                />
              </div>
              <div className="relative flex size-14 items-center justify-center rounded-2xl bg-success/12 border border-success/20">
                <CheckCircle2 className="size-7 text-success" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              Autenticado
            </h2>
            <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Sesión verificada
            </p>
          </div>

          {/* Waiting shimmer */}
          <div className="mb-6">
            <div className="animate-shimmer rounded-xl px-5 py-4 text-center">
              <p className="text-sm font-medium text-foreground/70">
                {"Esperando que el moderador inicie la siguiente moción"}
                {dots}
              </p>
            </div>
          </div>

          {/* Assembly info */}
          <div className="mb-6">
            <div className="rounded-xl border border-border/40 bg-card/50 px-5 py-4 card-emerald-accent">
              <h3
                className="text-base font-semibold text-foreground"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                {assembly.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(assembly.date).toLocaleDateString("es-CO", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <div className="mt-3 flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
                    <span className="relative inline-flex size-2 rounded-full bg-success" />
                  </span>
                  {assembly.connectedUsers} en línea
                </span>
                <span className="text-xs text-muted-foreground/60">
                  {completedCount}/{totalCount} mociones
                </span>
              </div>
            </div>
          </div>

          {/* Upcoming agenda */}
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
              Próximas Mociones
            </p>
            <div className="flex flex-col gap-2">
              {assembly.motions
                .filter((m) => m.status === "pending")
                .slice(0, 3)
                .map((m, i) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border border-border/30 bg-card/30 px-4 py-2.5 transition-colors hover:bg-card/50"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/8 text-xs font-bold text-primary">
                      {i + 1 + completedCount}
                    </span>
                    <span className="text-sm text-foreground/80 line-clamp-1">
                      {m.title}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Connection status */}
          <div className="flex items-center justify-center gap-2 rounded-xl bg-success/5 border border-success/10 px-4 py-3">
            <Wifi className="size-4 text-success" />
            <span className="text-xs font-medium text-success">
              Conexión establecida
            </span>
          </div>

          {/* Sign out */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground"
            >
              <LogOut className="size-3" />
              Cerrar sesión
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
