import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import {
    ArrowLeft,
    Save,
    PlusCircle,
    AlertCircle,
    Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ThemeToggle } from "@/components/theme-toggle"
import type { Motion, MotionQuestion } from "@/lib/assembly-types"

interface MotionEditorProps {
    initialMotion: Motion
    onSave: (motion: Motion) => Promise<void>
    onCancel: () => void
}

const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

export function MotionEditor({ initialMotion, onSave, onCancel }: MotionEditorProps) {
    const [motionState, setMotionState] = useState<Motion>(initialMotion)
    const [isSaving, setIsSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")

    const updateMotion = (updates: Partial<Motion>) => {
        setMotionState(prev => ({ ...prev, ...updates }))
    }

    const updateQuestion = (qId: string, updates: Partial<MotionQuestion>) => {
        setMotionState(prev => ({
            ...prev,
            questions: prev.questions.map(q => q.id === qId ? { ...q, ...updates } : q)
        }))
    }

    const addQuestion = () => {
        const newQId = `${motionState.id}q${Date.now()}`
        setMotionState(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    id: newQId,
                    title: "",
                    type: "radio",
                    options: ["Opción 1", "Opción 2"],
                }
            ]
        }))
    }

    const removeQuestion = (qId: string) => {
        setMotionState(prev => ({
            ...prev,
            questions: prev.questions.filter(q => q.id !== qId)
        }))
    }

    const addOption = (qId: string) => {
        setMotionState(prev => ({
            ...prev,
            questions: prev.questions.map(q =>
                q.id === qId
                    ? { ...q, options: [...q.options, `Opción ${q.options.length + 1}`] }
                    : q
            )
        }))
    }

    const removeOption = (qId: string, optIndex: number) => {
        setMotionState(prev => ({
            ...prev,
            questions: prev.questions.map(q =>
                q.id === qId
                    ? { ...q, options: q.options.filter((_, i) => i !== optIndex) }
                    : q
            )
        }))
    }

    const updateOptionValue = (qId: string, optIndex: number, val: string) => {
        setMotionState(prev => ({
            ...prev,
            questions: prev.questions.map(q =>
                q.id === qId
                    ? { ...q, options: q.options.map((opt, i) => i === optIndex ? val : opt) }
                    : q
            )
        }))
    }

    const handleSave = async () => {
        setErrorMsg("")
        if (!motionState.title || motionState.title.trim() === "") {
            setErrorMsg("La moción debe tener un título.")
            return
        }
        for (const q of motionState.questions) {
            if (!q.title || q.title.trim() === "") {
                setErrorMsg(`La pregunta no tiene título.`)
                return
            }
        }

        setIsSaving(true)
        try {
            const isNew = !motionState.id.includes('-')
            const res = await fetch(isNew ? '/api/admin/motions' : `/api/admin/motions/${motionState.id}`, {
                method: isNew ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: motionState.title.trim(),
                    description: (motionState.description || "").trim(),
                    questions: motionState.questions,
                    requires_totp: motionState.requires_totp !== false
                })
            })

            if (!res.ok) throw new Error("Error al guardar en el servidor.")

            const saved = await res.json()
            await onSave({
                ...motionState,
                id: saved.id,
                status: (saved.status || 'PENDING').toLowerCase()
            })
        } catch (e: any) {
            console.error(e)
            setErrorMsg(e.message || "Error al conectar con el servidor.")
        } finally {
            setIsSaving(false)
        }
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
                        <Button variant="ghost" size="icon" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="size-5" />
                        </Button>
                        <h1 className="text-base font-bold text-foreground" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                            <span className="text-sm font-medium text-muted-foreground/80">
                                {initialMotion.title ? "Editar Moción" : "Nueva Moción"}
                            </span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Button
                            disabled={isSaving}
                            onClick={handleSave}
                            size="sm"
                            className="gap-1.5 rounded-lg font-semibold shadow-md transition-all hover:scale-[1.03] active:scale-[0.98] glow-primary"
                        >
                            {isSaving ? "Guardando..." : "Guardar Moción"}
                            {!isSaving && <Save className="size-3.5" />}
                        </Button>
                    </div>
                </div>
                {errorMsg && (
                    <div className="bg-destructive/10 text-destructive px-6 py-2 text-xs font-medium flex justify-center items-center gap-2">
                        <AlertCircle className="size-3.5" />
                        {errorMsg}
                    </div>
                )}
            </motion.header>

            <main className="mx-auto max-w-2xl px-6 py-8">
                <motion.div {...fadeUp} className="flex flex-col gap-6">
                    <div className="glass card-emerald-accent rounded-2xl border border-border/50 p-6 flex flex-col gap-5 shadow-sm">
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-medium text-muted-foreground">Título de la Moción</Label>
                            <Input
                                value={motionState.title}
                                onChange={(e) => updateMotion({ title: e.target.value })}
                                placeholder="Ej. Aprobación del Presupuesto 2026"
                                className="text-lg font-semibold rounded-xl"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="text-xs font-medium text-muted-foreground">Descripción (opcional)</Label>
                            <Textarea
                                value={motionState.description}
                                onChange={(e) => updateMotion({ description: e.target.value })}
                                placeholder="Explica qué es lo que deciden los votantes..."
                                rows={3}
                                className="resize-none rounded-xl"
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border/40 bg-card/30 px-4 py-3">
                            <div className="flex flex-col">
                                <Label className="text-xs font-medium text-muted-foreground">Requerir Código TOTP</Label>
                                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Seguridad adicional para proyectar en la sala.</p>
                            </div>
                            <Switch
                                checked={motionState.requires_totp !== false}
                                onCheckedChange={(checked) => updateMotion({ requires_totp: checked })}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">Preguntas</h3>
                        </div>

                        {motionState.questions.map((q, qIdx) => (
                            <div key={q.id} className="rounded-2xl border border-border/40 bg-card/40 p-5 shadow-sm glass">
                                <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                        P{qIdx + 1}
                                    </span>
                                    <Input
                                        value={q.title}
                                        onChange={(e) => updateQuestion(q.id, { title: e.target.value })}
                                        placeholder="Escribe la pregunta aquí..."
                                        className="flex-1 rounded-xl font-medium"
                                    />
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={q.type}
                                            onValueChange={(val) => updateQuestion(q.id, { type: val as MotionQuestion["type"] })}
                                        >
                                            <SelectTrigger className="w-36 rounded-xl border-border/50 text-xs bg-background/50">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="radio">Opción Única</SelectItem>
                                                <SelectItem value="checkbox">Múltiples</SelectItem>
                                                <SelectItem value="text">Texto Libre</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {motionState.questions.length > 1 && (
                                            <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} className="text-muted-foreground hover:text-destructive">
                                                <Trash2 className="size-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {q.type !== "text" && (
                                    <div className="flex flex-col gap-2 pl-[40px] sm:pl-10">
                                        {q.options.map((opt, optIdx) => (
                                            <div key={optIdx} className="flex items-center gap-2 group">
                                                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground">
                                                    {String.fromCharCode(65 + optIdx)}
                                                </span>
                                                <Input
                                                    value={opt}
                                                    onChange={(e) => updateOptionValue(q.id, optIdx, e.target.value)}
                                                    placeholder={`Opción ${optIdx + 1}`}
                                                    className="flex-1 rounded-lg text-sm bg-background/50 border-border/40"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                    onClick={() => removeOption(q.id, optIdx)}
                                                    disabled={q.options.length <= 2}
                                                >
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addOption(q.id)}
                                            className="w-fit mt-2 gap-1.5 text-xs text-muted-foreground rounded-lg border-dashed hover:border-primary/50 hover:text-primary transition-colors"
                                        >
                                            <PlusCircle className="size-3.5" />
                                            Añadir opción
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}

                        <Button
                            variant="outline"
                            onClick={addQuestion}
                            className="w-full gap-2 rounded-2xl border-dashed border-border/60 py-6 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors glass"
                        >
                            <PlusCircle className="size-4 text-primary" />
                            <span className="font-medium">Agregar Nueva Pregunta</span>
                        </Button>
                    </div>
                </motion.div>
            </main>
        </div>
    )
}
