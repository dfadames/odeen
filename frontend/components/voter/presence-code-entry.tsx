"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { KeyRound, ArrowRight } from "lucide-react"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button"

interface PresenceCodeEntryProps {
  motionTitle: string
  onValidated: (code: string) => Promise<boolean | void> | void
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: "easeOut" },
  }),
}

export function PresenceCodeEntry({
  motionTitle,
  onValidated,
}: PresenceCodeEntryProps) {
  const [value, setValue] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (value.length !== 6) return
    setIsValidating(true)
    setError("")

    try {
      const isOk = await onValidated(value)
      if (isOk === false) {
        setError("Código de presencia inválido o expirado.")
      }
    } catch (e) {
      setError("Error de conexión al validar el código.")
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="glass-strong w-full max-w-sm rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col items-center gap-6">
          <motion.div
            className="flex size-14 items-center justify-center rounded-2xl bg-primary/10"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            custom={0}
          >
            <KeyRound className="size-7 text-primary" />
          </motion.div>

          <motion.div
            className="text-center"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            custom={1}
          >
            <h2 className="text-xl font-bold text-foreground">
              Verificación de Asistencia
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-balance">
              Ingresa el código de 6 dígitos del proyector para votar en:{" "}
              <span className="font-semibold text-foreground">
                {motionTitle}
              </span>
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            custom={2}
          >
            <InputOTP
              maxLength={6}
              value={value}
              onChange={(val) => {
                setValue(val)
                setError("")
              }}
              aria-label="Presence verification code"
            >
              <InputOTPGroup>
                <InputOTPSlot
                  index={0}
                  className="size-12 rounded-lg border-border bg-card/80 text-lg font-semibold shadow-sm transition-all focus:ring-2 focus:ring-primary/30"
                />
                <InputOTPSlot
                  index={1}
                  className="size-12 rounded-lg border-border bg-card/80 text-lg font-semibold shadow-sm transition-all focus:ring-2 focus:ring-primary/30"
                />
                <InputOTPSlot
                  index={2}
                  className="size-12 rounded-lg border-border bg-card/80 text-lg font-semibold shadow-sm transition-all focus:ring-2 focus:ring-primary/30"
                />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot
                  index={3}
                  className="size-12 rounded-lg border-border bg-card/80 text-lg font-semibold shadow-sm transition-all focus:ring-2 focus:ring-primary/30"
                />
                <InputOTPSlot
                  index={4}
                  className="size-12 rounded-lg border-border bg-card/80 text-lg font-semibold shadow-sm transition-all focus:ring-2 focus:ring-primary/30"
                />
                <InputOTPSlot
                  index={5}
                  className="size-12 rounded-lg border-border bg-card/80 text-lg font-semibold shadow-sm transition-all focus:ring-2 focus:ring-primary/30"
                />
              </InputOTPGroup>
            </InputOTP>
          </motion.div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <motion.div
            className="w-full"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            custom={3}
          >
            <Button
              className="group w-full rounded-xl py-6 text-base font-semibold shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] glow-primary"
              size="lg"
              disabled={value.length !== 6 || isValidating}
              onClick={handleSubmit}
            >
              {isValidating ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Verificando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Verificar Asistencia
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </motion.div>

          <motion.p
            className="text-center text-xs text-muted-foreground/60"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            custom={4}
          >
            El código se actualiza cada 30 segundos. Ingresa el código que se muestra actualmente.
          </motion.p>
        </div>
      </div>
    </div>
  )
}
