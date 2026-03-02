"use client"

import { useState, useCallback, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { WelcomeScreen } from "@/components/voter/welcome-screen"
import { VoterView } from "@/components/voter/voter-view"
import { VoteSuccess } from "@/components/voter/vote-success"
import { ThemeToggle } from "@/components/theme-toggle"
import { ShieldAlert, CheckCircle2 } from "lucide-react"

function safeQuestions(q: any): any[] {
    if (Array.isArray(q)) return q
    if (typeof q === 'string') {
        try {
            let str = q
            if (!str.trim().startsWith('[') && !str.trim().startsWith('{')) {
                try { str = atob(q) } catch (e) { }
            }
            const p = JSON.parse(str);
            return Array.isArray(p) ? p : []
        } catch { return [] }
    }
    return []
}

export default function VotePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
    const [resolvedId, setResolvedId] = useState<string>("")
    const [voterState, setVoterState] = useState<"welcome" | "validating" | "ballot" | "receipt" | "error">("welcome")
    const [voterToken, setVoterToken] = useState("")
    const [receiptHash, setReceiptHash] = useState("")
    const [motionData, setMotionData] = useState<any>(null)

    useEffect(() => {
        Promise.resolve(params).then(p => setResolvedId(p.id))
    }, [params])

    const handleSignIn = useCallback((token: string) => {
        if (!resolvedId) return
        setVoterToken(token)
        setVoterState("validating")

        // Fetch live motion via proxy to verify it matches params.id
        fetch('/api/voter/motions/live', {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
            .then(res => {
                if (!res.ok) throw new Error("Motion closed or not found")
                return res.json()
            })
            .then(m => {
                if (m && m.id === resolvedId) {
                    setMotionData({
                        id: m.id,
                        title: m.title,
                        description: m.description || '',
                        status: 'live',
                        questions: safeQuestions(m.questions),
                        requires_totp: m.requires_totp !== false
                    })
                    setVoterState("ballot")
                } else {
                    setVoterState("error")
                }
            })
            .catch(() => {
                setVoterState("error")
            })
    }, [resolvedId])

    const handleVoteCast = useCallback((receipt: string) => {
        if (receipt) setReceiptHash(receipt)
        else {
            setReceiptHash("Tx-" + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(""))
        }
        setVoterState("receipt")
    }, [])

    return (
        <div className="relative min-h-screen">
            <div className="fixed inset-0 -z-10 bg-mesh bg-background" />

            {voterState !== "ballot" && (
                <div className="fixed right-4 top-4 z-[100]">
                    <ThemeToggle />
                </div>
            )}

            <AnimatePresence mode="wait">
                {voterState === "welcome" && (
                    <motion.div key="welcome" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                        <WelcomeScreen onSignIn={handleSignIn} />
                    </motion.div>
                )}

                {voterState === "validating" && (
                    <motion.div key="validating" className="flex min-h-screen items-center justify-center p-4">
                        <div className="flex flex-col items-center gap-6 rounded-3xl bg-card p-10 shadow-2xl glass border-border/60">
                            <div className="relative flex size-20 items-center justify-center">
                                <span className="absolute inset-0 animate-ping rounded-full border-4 border-primary opacity-20" />
                                <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            </div>
                            <p className="text-lg font-medium text-foreground">Sincronizando la boleta...</p>
                        </div>
                    </motion.div>
                )}

                {voterState === "error" && (
                    <motion.div key="error" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-screen items-center justify-center p-4">
                        <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl bg-card p-8 text-center shadow-2xl border border-destructive/20 glass">
                            <div className="rounded-full bg-destructive/10 p-5 text-destructive">
                                <ShieldAlert className="size-12" />
                            </div>
                            <h2 className="text-2xl font-bold">Votación Cerrada</h2>
                            <p className="text-muted-foreground mt-2">Esta moción ya no está activa, no existe, o no tienes permisos para acceder a ella.</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-6 rounded-xl bg-secondary px-6 py-3 font-semibold text-secondary-foreground transition-all hover:scale-105 active:scale-95"
                            >
                                Volver al inicio
                            </button>
                        </div>
                    </motion.div>
                )}

                {voterState === "ballot" && motionData && (
                    <motion.div key="ballot" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                        <VoterView
                            motion={motionData}
                            assemblyTitle="Votación Directa"
                            voterToken={voterToken}
                            onVoteCast={handleVoteCast}
                            onLogout={() => window.location.reload()}
                        />
                    </motion.div>
                )}

                {voterState === "receipt" && (
                    <motion.div key="receipt" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col items-center justify-center min-h-screen p-4">
                        <div className="flex max-w-md w-full flex-col items-center gap-6 rounded-3xl bg-card p-10 text-center shadow-2xl glass glow-success border-success/30">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', bounce: 0.5 }}
                                className="rounded-full bg-success/20 p-5 text-success shadow-lg"
                            >
                                <CheckCircle2 className="size-16" />
                            </motion.div>
                            <div>
                                <h2 className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Voto Registrado</h2>
                                <p className="mt-2 text-muted-foreground font-medium">Tu voto ha sido encriptado y depositado de forma 100% anónima en la bóveda criptográfica.</p>
                            </div>

                            <div className="w-full mt-4 rounded-2xl bg-muted/40 p-5 shadow-inner">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">HASH DE CONFIRMACIÓN DE ENTREGA</p>
                                <code className="block break-all text-sm font-bold text-foreground opacity-90">{receiptHash}</code>
                            </div>

                            <p className="text-xs text-muted-foreground mt-4 text-balance">
                                Ya puedes cerrar esta pestaña. Para la siguiente moción, deberás escanear el nuevo código QR.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
