"use client"

import { useState, useCallback, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { WelcomeScreen } from "@/components/voter/welcome-screen"
import { WaitingRoom } from "@/components/voter/waiting-room"
import { VoterView } from "@/components/voter/voter-view"
import { VoteSuccess } from "@/components/voter/vote-success"
import { AgendaBuilder } from "@/components/admin/agenda-builder"
import { CommandCenter } from "@/components/admin/command-center"
import { ResultsVault } from "@/components/admin/results-vault"
import { ProjectionView } from "@/components/projection/projection-view"
import { ThemeToggle } from "@/components/theme-toggle"
import { AdminLogin } from "@/components/admin/admin-login"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { Code2, Projector, ShieldAlert, QrCode } from "lucide-react"
import type { AssemblyState, Motion, MotionQuestion } from "@/lib/assembly-types"

function safeQuestions(q: any): MotionQuestion[] {
  if (Array.isArray(q)) return q
  if (typeof q === 'string') {
    try {
      let str = q;
      // If it doesn't look like JSON, it might be base64-encoded by Go's json.RawMessage
      if (!str.trim().startsWith('[') && !str.trim().startsWith('{')) {
        try { str = atob(q) } catch (e) { }
      }
      const p = JSON.parse(str);
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }
  return []
}

type VoterState = "welcome" | "waiting" | "ballot" | "receipt"
type AdminState = "login" | "dashboard" | "agenda" | "command" | "results" | "projection"

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.35, ease: "easeOut" },
}

export default function Page() {
  const [mode, setMode] = useState<"voter" | "admin">("voter")
  const [isProvisioned, setIsProvisioned] = useState(false)
  const [voterState, setVoterState] = useState<VoterState>("welcome")
  const [adminState, setAdminState] = useState<AdminState>("login")
  const [voterToken, setVoterToken] = useState("")
  const [assembly, setAssembly] = useState<AssemblyState>({
    title: "Asamblea General",
    date: new Date().toISOString(),
    motions: [],
    activeMotionId: null,
    connectedUsers: 0,
    totalEligible: 0,
  })
  const [receiptHash, setReceiptHash] = useState("")
  const [votesCastForActive, setVotesCastForActive] = useState(0)
  const [projectorCode, setProjectorCode] = useState("")

  const isAdmin = mode === "admin"
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  // 1. Fetch Agenda when Admin logs in
  useEffect(() => {
    if (isAdmin && isProvisioned) {
      fetch('/api/admin/motions')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const mapped = data.map((m: any) => {
              const baseId = m.id || m.ID || (m.Motion && (m.Motion.id || m.Motion.ID));
              return {
                id: baseId,
                title: m.title || m.Motion?.title || "Moción Sin Título",
                description: m.description || m.Motion?.description || "",
                status: (m.status || m.Motion?.status || 'pending').toLowerCase(),
                questions: safeQuestions(m.questions || m.Motion?.questions),
                requires_totp: m.requires_totp !== false,
                totalVotes: m.totalVotes || 0,
                results: m.results || []
              }
            })

            setAssembly(prev => {
              const live = mapped.find(m => m.status === 'live')
              return {
                ...prev,
                motions: mapped,
                activeMotionId: live ? live.id : prev.activeMotionId
              }
            })
          }
        })
        .catch(console.error)
    }
  }, [isAdmin, isProvisioned])

  // Poll vote count for the active motion
  useEffect(() => {
    if (!isAdmin || !isProvisioned || !assembly.activeMotionId) {
      setVotesCastForActive(0)
      return
    }
    const fetchCount = () => {
      fetch(`/api/admin/motions/${assembly.activeMotionId}/votes`)
        .then(r => r.json())
        .then(d => { if (typeof d.count === 'number') setVotesCastForActive(d.count) })
        .catch(() => { })
    }
    fetchCount()
    const interval = setInterval(fetchCount, 3000)
    return () => clearInterval(interval)
  }, [isAdmin, isProvisioned, assembly.activeMotionId])

  // 2. Setup SSE for Real-time state (Voter or Projector)
  useEffect(() => {
    let source: EventSource | null = null;

    if (isAdmin && isProvisioned) {
      // Connect to Projector SSE to track votes
      source = new EventSource(`${apiUrl}/api/events/projector`)
      source.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data)
          if (payload.event === "VOTE_COUNT") {
            setVotesCastForActive(payload.data.total_votes)
          } else if (payload.event === "TOTP_UPDATE") {
            setProjectorCode(payload.data.code)
          }
        } catch (err) { }
      }
    } else if (!isAdmin && voterState !== 'welcome') {
      // Connect to Voter SSE to track active motion
      source = new EventSource(`${apiUrl}/api/events/voter`)
      source.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data)
          if (payload.event === "MOTION_STARTED") {
            const m = payload.data;
            const baseId = m.id || m.ID;
            setAssembly(prev => ({
              ...prev,
              activeMotionId: baseId,
              motions: prev.motions.some(x => x.id === baseId)
                ? prev.motions.map(x => x.id === baseId ? { ...x, status: 'live' as const } : x)
                : [...prev.motions, {
                  id: baseId,
                  title: m.title || m.Title || "",
                  description: m.description || m.Description || '',
                  status: 'live' as const,
                  questions: safeQuestions(m.questions || m.Questions),
                  requires_totp: (m.requires_totp !== undefined ? m.requires_totp : m.RequiresTotp) !== false
                }]
            }))
            setVoterState(prev => prev === "waiting" ? "welcome" : prev)
          } else if (payload.event === "MOTION_ENDED") {
            const baseId = payload.data.id || payload.data.ID;
            setAssembly(prev => ({
              ...prev,
              activeMotionId: null,
              motions: prev.motions.map(x => x.id === baseId ? { ...x, status: 'completed' } : x)
            }))
            setVoterState("waiting")
          }
        } catch (err) { }
      }
    }

    return () => source?.close()
  }, [isAdmin, isProvisioned, voterState, apiUrl])

  const activeMotion = assembly.motions.find(
    (m) => m.id === assembly.activeMotionId
  )

  // -- Admin actions --
  const handleLaunchMotion = useCallback(async (motionId: string) => {
    try {
      await fetch(`/api/admin/motions/${motionId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "LIVE" })
      })
      setAssembly((prev) => ({
        ...prev,
        activeMotionId: motionId,
        motions: prev.motions.map((m) =>
          m.id === motionId ? { ...m, status: "live" as const } : m
        ),
      }))
      setVotesCastForActive(0)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const handleEndMotion = useCallback(async () => {
    if (!assembly.activeMotionId) return;
    try {
      await fetch(`/api/admin/motions/${assembly.activeMotionId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" })
      })

      // Fetch fresh agenda results immediately
      const refreshedRaw = await fetch('/api/admin/motions')
      const data = await refreshedRaw.json()

      if (Array.isArray(data)) {
        const mapped = data.map((m: any) => {
          const baseId = m.id || m.ID || (m.Motion && (m.Motion.id || m.Motion.ID));
          return {
            id: baseId,
            title: m.title || m.Motion?.title || m.Title || "",
            description: m.description || m.Motion?.description || m.Description || '',
            status: (m.status || m.Motion?.status || m.Status || 'pending').toLowerCase(),
            questions: safeQuestions(m.questions || m.Motion?.questions || m.Questions),
            requires_totp: (m.requires_totp !== undefined ? m.requires_totp : m.RequiresTotp) !== false,
            totalVotes: m.totalVotes || m.TotalVotes || 0,
            results: m.results || m.Results || []
          }
        })

        setAssembly((prev) => ({
          ...prev,
          activeMotionId: null,
          motions: mapped
        }))
      } else {
        // Fallback if fetch fails
        setAssembly((prev) => ({
          ...prev,
          activeMotionId: null,
          motions: prev.motions.map((m) =>
            m.status === "live" ? { ...m, status: "completed" as const } : m
          ),
        }))
      }
      setVotesCastForActive(0)
    } catch (err) {
      console.error(err)
    }
  }, [assembly.activeMotionId])

  const handleUpdateMotions = useCallback((motions: Motion[]) => {
    setAssembly((prev) => ({ ...prev, motions }))
  }, [])

  const handleUpdateTitle = useCallback((title: string) => {
    setAssembly((prev) => ({ ...prev, title }))
  }, [])

  // -- Voter actions --
  const handleSignIn = useCallback((token: string) => {
    setVoterToken(token)
    setVoterState("waiting")
    // Fetch live motion instantly on sign in
    fetch(`${apiUrl}/api/voter/motions/live`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(m => {
        if (m && m.id) {
          setAssembly(prev => ({
            ...prev,
            activeMotionId: m.id,
            motions: prev.motions.some(x => x.id === m.id)
              ? prev.motions.map(x => x.id === m.id ? { ...x, status: 'live' } : x)
              : [...prev.motions, { id: m.id, title: m.title, description: m.description || '', status: 'live' as const, questions: safeQuestions(m.questions), requires_totp: m.requires_totp !== false }]
          }))
          setVoterState("ballot")
        }
      }).catch(() => { })
  }, [apiUrl])

  const handleLogout = useCallback(() => setVoterState("welcome"), [])

  const handleVoteCast = useCallback((receipt: string) => {
    if (receipt) setReceiptHash(receipt)
    else {
      setReceiptHash("Tx-" + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(""))
    }
    setVoterState("receipt")
  }, [])

  const handleReturnToWaiting = useCallback(() => {
    setReceiptHash("")
    setVoterState("waiting")
  }, [])

  const handleAdminProvisioned = useCallback(() => {
    setIsProvisioned(true)
    setAdminState("dashboard")
  }, [])

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-mesh bg-background" />

      {/* Top-right theme toggle for voter views (non-ballot) */}
      {!isAdmin && voterState !== "ballot" && (
        <div className="fixed right-4 top-4 z-[100]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <ThemeToggle />
          </motion.div>
        </div>
      )}

      {/* =========== VOTER FLOW (Notice) =========== */}
      {!isAdmin && (
        <AnimatePresence mode="wait">
          {voterState === "welcome" && (
            <motion.div key="welcome" {...pageTransition} className="flex min-h-screen items-center justify-center p-6 text-center">
              <div className="flex max-w-sm flex-col items-center gap-6 rounded-3xl bg-card p-10 shadow-2xl glass border-border/60">
                <div className="rounded-full bg-primary/10 p-6 text-primary shadow-inner">
                  <QrCode className="size-16" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Bienvenido a Odeen</h1>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Por favor, utilice la cámara de su teléfono móvil para escanear el <strong>código QR</strong> proyectado en la pantalla de la sala. Esto lo dirigirá de manera automática y segura a su boleta de votación.</p>
                </div>
              </div>
            </motion.div>
          )}

          {voterState === "waiting" && (
            <motion.div key="waiting" {...pageTransition}>
              <WaitingRoom
                assembly={assembly}
                onBack={handleLogout}
              />
            </motion.div>
          )}

          {voterState === "ballot" && activeMotion && (
            <motion.div key="ballot" {...pageTransition}>
              <VoterView
                motion={activeMotion}
                assemblyTitle={assembly.title}
                voterToken={voterToken}
                onVoteCast={handleVoteCast}
                onLogout={handleLogout}
              />
            </motion.div>
          )}

          {voterState === "receipt" && (
            <motion.div key="receipt" {...pageTransition}>
              <VoteSuccess
                hash={receiptHash}
                onReturnToWaiting={handleReturnToWaiting}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* =========== ADMIN FLOW =========== */}
      {isAdmin && (
        <AnimatePresence mode="wait">
          {adminState === "login" && (
            <motion.div key="admin-login" {...pageTransition}>
              <AdminLogin
                onSuccess={handleAdminProvisioned}
                onCancel={() => {
                  setMode("voter")
                  setAdminState("login")
                }}
              />
            </motion.div>
          )}

          {adminState === "dashboard" && isProvisioned && (
            <motion.div key="admin-dashboard" {...pageTransition}>
              <AdminDashboard
                onNavigate={(view) => setAdminState(view)}
                onLogout={() => {
                  setIsProvisioned(false)
                  setAdminState("login")
                }}
              />
            </motion.div>
          )}

          {adminState === "agenda" && isProvisioned && (
            <motion.div key="admin-agenda" {...pageTransition}>
              <AgendaBuilder
                assembly={assembly}
                onUpdateMotions={handleUpdateMotions}
                onBack={() => setAdminState("dashboard")}
              />
            </motion.div>
          )}

          {adminState === "command" && isProvisioned && (
            <motion.div key="admin-command" {...pageTransition}>
              <CommandCenter
                assembly={assembly}
                activeMotion={activeMotion}
                votesCast={votesCastForActive}
                onLaunchMotion={handleLaunchMotion}
                onEndMotion={handleEndMotion}
                onViewResults={() => setAdminState("results")}
                onBackToAgenda={() => setAdminState("dashboard")}
                onOpenProjection={() => setAdminState("projection")}
              />
            </motion.div>
          )}

          {adminState === "results" && isProvisioned && (
            <motion.div key="admin-results" {...pageTransition}>
              <ResultsVault
                assembly={assembly}
                onBack={() => setAdminState("dashboard")}
              />
            </motion.div>
          )}

          {adminState === "projection" && isProvisioned && (
            <motion.div key="admin-projection" {...pageTransition}>
              <ProjectionView
                assembly={assembly}
                activeMotion={activeMotion}
                votesCast={votesCastForActive}
                serverTotp={projectorCode}
                onBack={() => setAdminState("dashboard")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* =========== MINIMIZED FOOTER =========== */}
      <motion.footer
        className="fixed inset-x-0 bottom-0 z-[100] flex items-center justify-center gap-2 py-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <div className="flex items-center gap-1.5 rounded-full border border-border/40 bg-card/80 px-2 py-1 shadow-lg backdrop-blur-md">
          <button
            onClick={() => {
              setMode((p) => (p === "voter" ? "admin" : "voter"))
              if (mode === "voter") {
                if (isProvisioned) {
                  setAdminState("dashboard")
                } else {
                  setAdminState("login")
                }
              }
            }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
          >
            {isAdmin ? (
              <Code2 className="size-3" />
            ) : (
              <ShieldAlert className="size-3 text-warning" />
            )}
            {isAdmin ? "Cambiar a Votante" : "Acceso Admin"}
          </button>

          <div className="h-4 w-px bg-border/60" />

          <button
            onClick={() => {
              setMode("admin")
              setAdminState("projection")
            }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
          >
            <Projector className="size-3" />
            Proyector
          </button>
        </div>
      </motion.footer>
    </div>
  )
}
