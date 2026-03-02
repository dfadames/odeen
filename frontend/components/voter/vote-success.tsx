"use client"

import { ShieldCheck, Copy, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { motion } from "framer-motion"

interface VoteSuccessProps {
  hash: string
  onReturnToWaiting: () => void
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: "easeOut" },
  }),
}

export function VoteSuccess({ hash, onReturnToWaiting }: VoteSuccessProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-strong w-full max-w-sm rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col items-center gap-6">
          {/* Success icon with glow */}
          <motion.div
            className="relative"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            custom={0}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="absolute size-20 animate-pulse-ring rounded-full bg-success/10" />
              <span
                className="absolute size-28 animate-pulse-ring rounded-full bg-success/5"
                style={{ animationDelay: "0.5s" }}
              />
            </div>
            <div className="relative flex size-16 items-center justify-center rounded-2xl bg-success/15 glow-success">
              <ShieldCheck className="size-8 text-success" />
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            className="text-center"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            custom={1}
          >
            <h2 className="text-xl font-bold text-foreground">
              Voto Emitido con Éxito
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Tu voto ha sido registrado de forma segura y anónima. Nadie puede rastrear este voto hasta tu identidad.
            </p>
          </motion.div>

          {/* Receipt hash */}
          <motion.div
            className="w-full rounded-xl border border-border/60 bg-card/40 px-5 py-4"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            custom={2}
          >
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recibo Criptográfico
            </p>
            <div className="flex items-center justify-between gap-2">
              <code className="break-all font-mono text-sm font-bold text-foreground">
                {hash}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 transition-all hover:scale-110"
                onClick={handleCopy}
                aria-label="Copy receipt hash"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
            {copied && (
              <motion.p
                className="mt-1 text-xs text-success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Copiado al portapapeles
              </motion.p>
            )}
          </motion.div>

          <motion.p
            className="text-center text-xs text-muted-foreground/60"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            custom={3}
          >
            Guarda este recibo para verificar que tu voto fue incluido en el recuento final. Esta es la única prueba de participación.
          </motion.p>

          {/* Return to Waiting Room -- the loop */}
          <motion.div
            className="w-full"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            custom={4}
          >
            <Button
              onClick={onReturnToWaiting}
              size="lg"
              className="group w-full gap-2 rounded-xl py-6 text-base font-semibold shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] glow-primary"
            >
              <RotateCcw className="size-4 transition-transform group-hover:-rotate-45" />
              Volver a la Sala de Espera
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
