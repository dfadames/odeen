import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  PlusCircle,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { MotionEditor } from "./motion-editor"
import type { AssemblyState, Motion } from "@/lib/assembly-types"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface AgendaBuilderProps {
  assembly: AssemblyState
  onUpdateMotions: (motions: Motion[]) => void
  onBack: () => void
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

export function AgendaBuilder({
  assembly,
  onUpdateMotions,
  onBack,
}: AgendaBuilderProps) {
  const [editingMotion, setEditingMotion] = useState<Motion | null>(null)

  // AlertDialog state
  const [motionToDelete, setMotionToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleAddNew = () => {
    const newId = `m${Date.now()}`
    setEditingMotion({
      id: newId,
      title: "",
      description: "",
      questions: [
        {
          id: `${newId}q1`,
          title: "",
          type: "radio",
          options: ["Aprobar", "Rechazar", "Abstenerse"],
        },
      ],
      requires_totp: true,
      status: "pending",
    })
  }

  const confirmDelete = async () => {
    if (!motionToDelete) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/admin/motions/${motionToDelete}`, { method: 'DELETE' })
      if (!res.ok) throw new Error("Error deleting motion from server")

      onUpdateMotions(assembly.motions.filter(m => m.id !== motionToDelete))
      toast.success("Moción eliminada", {
        description: "Se borraron permanentemente sus datos.",
      })
    } catch (e) {
      console.error(e)
      toast.error("Error al eliminar", {
        description: "No se pudo borrar la moción. Intenta de nuevo.",
      })
    } finally {
      setIsDeleting(false)
      setMotionToDelete(null)
    }
  }

  const handleEditorSave = async (savedMotion: Motion) => {
    onUpdateMotions(
      assembly.motions.some(m => m.id === savedMotion.id)
        ? assembly.motions.map(m => m.id === savedMotion.id ? savedMotion : m)
        : [...assembly.motions, savedMotion]
    )
    setEditingMotion(null)
  }

  if (editingMotion) {
    return (
      <MotionEditor
        initialMotion={editingMotion}
        onSave={handleEditorSave}
        onCancel={() => setEditingMotion(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="fixed inset-0 -z-10 bg-mesh bg-background" />

      <motion.header
        className="sticky top-0 z-50 glass-strong"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-base font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                <span className="text-sm font-medium text-muted-foreground/80">Agenda Programada</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={handleAddNew}
              size="sm"
              className="gap-1.5 rounded-lg font-semibold shadow-md transition-all hover:scale-[1.03] active:scale-[0.98] glow-primary"
            >
              <PlusCircle className="size-3.5" />
              Nueva Moción
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <motion.div {...fadeUp} className="mb-8">
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-sm backdrop-blur-md">
              <FileText className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                Motions Editor
              </h2>
              <p className="text-xs font-medium text-muted-foreground">
                Selecciona una para editar o crea una nueva.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div className="flex flex-col gap-4">
          <AnimatePresence>
            {assembly.motions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center gap-4"
              >
                <div className="p-4 rounded-full bg-muted/30">
                  <FileText className="size-8 text-muted-foreground/50" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-foreground">La agenda está vacía</h3>
                  <p className="text-sm text-muted-foreground mt-1">Has clic en "Nueva Moción" para comenzar a añadir votaciones.</p>
                </div>
              </motion.div>
            ) : (
              assembly.motions.map((m, idx) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="glass border-border/40 shadow-sm hover:border-primary/30 transition-all hover:shadow-md cursor-pointer overflow-hidden group">
                    <CardHeader className="p-4 pb-2" onClick={() => setEditingMotion(m)}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-3">
                          <span className="flex size-6 shrink-0 mt-0.5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {idx + 1}
                          </span>
                          <div>
                            <h3 className="text-base font-bold text-foreground line-clamp-1">{m.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {m.questions.length} Pregunta(s) • {m.requires_totp ? 'Requiere TOTP' : 'Abierta'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); setMotionToDelete(m.id); }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <AlertDialog open={!!motionToDelete} onOpenChange={(open) => !open && setMotionToDelete(null)}>
        <AlertDialogContent className="border-border/50 glass">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar moción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Se eliminarán permanentemente todas las preguntas, opciones y votos asociados a esta moción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar Moción"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
