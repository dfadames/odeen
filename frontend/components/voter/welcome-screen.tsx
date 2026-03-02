"use client"

import { motion } from "framer-motion"
import { ShieldCheck, ArrowRight, CheckCircle2, Fingerprint, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Input } from "@/components/ui/input"

interface WelcomeScreenProps {
  onSignIn: (token: string) => void
}

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

export function WelcomeScreen({ onSignIn }: WelcomeScreenProps) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [token, setToken] = useState("")

  const handleLogin = async () => {
    if (!email.includes("@")) return;
    setLoading(true);
    try {
      const res = await fetch('/api/voter/auth', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })
      if (res.ok) {
        const data = await res.json()
        setToken(data.token)

        // 1. Pre-flight check to see if they already voted
        const liveRes = await fetch('/api/voter/motions/live', {
          headers: { "Authorization": `Bearer ${data.token}` }
        })
        if (liveRes.ok) {
          const liveData = await liveRes.json()
          if (liveData.has_voted) {
            setAlreadyVoted(true)
            setLoading(false)
            return
          }
        }

        // 2. Otherwise authorized
        setAuthorized(true)
        setTimeout(() => {
          onSignIn(data.token)
        }, 4500)
      } else {
        alert("Error de inicio de sesión. Revisa tu dominio.")
      }
    } catch (e) { console.error(e) }
    setLoading(false);
  }

  if (alreadyVoted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="fixed inset-0 -z-10 bg-mesh bg-background" />
        <motion.div
          className="flex flex-col items-center justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-destructive/10 text-destructive shadow-lg border border-destructive/20 relative">
            <div className="absolute inset-0 size-full animate-ping rounded-full bg-destructive/20 opacity-20" style={{ animationDuration: "3s" }} />
            <ShieldCheck className="size-10 relative z-10" />
            <div className="absolute bottom-2 right-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground border-2 border-background z-20">
              <CheckCircle2 className="size-3" />
            </div>
          </div>
          <h2
            className="text-center text-3xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Voto Registrado
          </h2>
          <p className="mt-3 text-center text-muted-foreground max-w-sm">
            Ya has emitido tu voto para la moción actual en curso con el correo <strong>{email}</strong>. Sólo se permite un voto por persona.
          </p>
          <div className="mt-8">
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Volver a la pantalla principal
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (authorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="fixed inset-0 -z-10 bg-mesh bg-background" />
        <motion.div
          className="flex flex-col items-center justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "backOut" }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
            className="relative mb-8 flex items-center justify-center"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="absolute size-36 animate-ping rounded-full bg-success/20 opacity-75" style={{ animationDuration: "2s" }} />
              <span className="absolute size-52 animate-pulse rounded-full bg-success/10" style={{ animationDuration: "3s" }} />
            </div>
            <div className="relative flex size-28 items-center justify-center rounded-full bg-success text-success-foreground shadow-2xl glow-success" style={{ boxShadow: "0 0 50px oklch(0.6 0.18 155 / 0.45)" }}>
              <CheckCircle2 className="size-14" />
            </div>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-center text-3xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            ¡Estás autorizado!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-3 text-center text-muted-foreground max-w-xs"
          >
            Identidad verificada. Preparando tu boleta anónima...
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="mt-8"
          >
            <div className="animate-shimmer h-1.5 w-48 rounded-full" />
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10 bg-mesh bg-background" />

      <motion.div
        className="w-full max-w-md"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {/* Brand wordmark */}
        <motion.div variants={fadeUp} className="mb-10 flex flex-col items-center">
          <div className="relative mb-6">
            {/* Animated ambient rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="absolute size-24 animate-pulse-ring rounded-full bg-primary/8" />
              <span
                className="absolute size-32 animate-pulse-ring rounded-full bg-primary/4"
                style={{ animationDelay: "0.6s" }}
              />
            </div>
            <div className="relative flex size-18 items-center justify-center rounded-2xl bg-primary shadow-lg glow-primary">
              <ShieldCheck className="size-9 text-primary-foreground" />
            </div>
          </div>
          <h1
            className="brand-text text-4xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Odeen
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground tracking-wide uppercase">
            Votación en Asamblea
          </p>
        </motion.div>

        {/* Glass card */}
        <motion.div variants={fadeUp} className="glass-strong rounded-2xl p-7 shadow-xl">
          {/* Institutional message */}
          <div className="mb-6 rounded-xl bg-primary/5 border border-primary/10 px-5 py-4 text-center">
            <p className="text-sm leading-relaxed text-foreground/80">
              Valida tu correo institucional para participar en la votación.
            </p>
          </div>

          {/* Email input and sign in */}
          <div className="flex flex-col gap-3">
            <Input
              type="email"
              placeholder="tu-correo@unal.edu.co"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="h-12 rounded-xl text-center font-medium border-border/50 bg-background/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
            <Button
              onClick={handleLogin}
              disabled={loading || !email.includes("@")}
              size="lg"
              className="group relative w-full gap-3 overflow-hidden rounded-xl py-6 text-base font-semibold shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] glow-primary"
            >
              {loading ? "Validando..." : "Ingresar a la Asamblea"}
              <ArrowRight className="ml-auto size-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-5 text-muted-foreground/60">
            <div className="flex items-center gap-1.5 text-xs">
              <Fingerprint className="size-3.5 text-primary/50" />
              Cifrado E2E
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs">
              <EyeOff className="size-3.5 text-primary/50" />
              Voto anónimo
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs">
              <ShieldCheck className="size-3.5 text-primary/50" />
              Verificado
            </div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground/40">
            Solo correos @unal.edu.co
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
