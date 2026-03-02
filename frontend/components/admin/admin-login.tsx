"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Code2, ArrowRight, ShieldCheck, AlertCircle, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

interface AdminLoginProps {
    onSuccess: () => void
    onCancel: () => void
}

export function AdminLogin({ onSuccess, onCancel }: AdminLoginProps) {
    const [token, setToken] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token.trim()) {
            toast.error("Por favor ingresa el token de aprovisionamiento")
            return
        }

        setIsLoading(true)

        try {
            const res = await fetch("/api/auth/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            })

            if (res.ok) {
                toast.success("Administrador aprovisionado con éxito")
                onSuccess()
            } else {
                const data = await res.json()
                toast.error(data.error || "Token de aprovisionamiento inválido")
            }
        } catch (err) {
            toast.error("Error de red al conectar con el servidor")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 -z-10 bg-mesh bg-background" />

            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-md"
            >
                {/* Brand wordmark */}
                <div className="mb-8 flex flex-col items-center">
                    <h1
                        className="brand-text text-3xl font-bold tracking-tight"
                        style={{ fontFamily: "var(--font-space-grotesk)" }}
                    >
                        Odeen
                    </h1>
                    <p className="mt-1 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                        Centro de Comando
                    </p>
                </div>

                <Card className="glass-strong overflow-hidden border-border/30 shadow-2xl">
                    <CardContent className="p-8">
                        <div className="mb-7 flex flex-col items-center text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/15">
                                <Terminal className="size-7 text-primary" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-foreground">
                                Aprovisionamiento
                            </h2>
                            <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
                                Ingresa el token de configuración para activar privilegios de administrador.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="relative">
                                <Code2 className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                                <input
                                    type="password"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="ADMIN_SETUP_TOKEN"
                                    className="w-full h-12 rounded-xl border border-border/40 bg-background/50 pl-10 pr-4 font-mono text-sm outline-none transition-all placeholder:text-muted-foreground/40 focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div className="mt-1 flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full rounded-xl"
                                    onClick={onCancel}
                                    disabled={isLoading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    className="w-full gap-2 rounded-xl glow-primary"
                                    disabled={isLoading || !token.trim()}
                                >
                                    {isLoading ? "Validando..." : "Aprovisionar"}
                                    {!isLoading && <ArrowRight className="size-4" />}
                                </Button>
                            </div>
                        </form>

                        <div className="mt-7 flex items-start gap-2.5 rounded-xl bg-primary/5 border border-primary/8 p-3.5 text-xs text-muted-foreground leading-relaxed">
                            <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary/60" />
                            <p>
                                Este token vincula esta sesión con privilegios administrativos mediante cookie segura HttpOnly. No lo compartas.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
