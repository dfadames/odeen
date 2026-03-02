import { motion } from "framer-motion"
import { CalendarRange, PlayCircle, BarChart3, MonitorPlay, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface AdminDashboardProps {
    onNavigate: (view: "agenda" | "command" | "results" | "projection") => void
    onLogout: () => void
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
}

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
}

export function AdminDashboard({ onNavigate, onLogout }: AdminDashboardProps) {
    const cards = [
        {
            id: "agenda",
            title: "Crear Agenda",
            description: "Construye y edita las mociones y preguntas para la asamblea.",
            icon: <CalendarRange className="size-8 text-primary" />,
            action: () => onNavigate("agenda"),
            color: "bg-primary/10 border-primary/20 hover:border-primary/50 hover:bg-primary/15"
        },
        {
            id: "command",
            title: "Centro de Comando",
            description: "Inicia la asamblea, lanza mociones en vivo y controla el flujo.",
            icon: <PlayCircle className="size-8 text-cyan-400" />,
            action: () => onNavigate("command"),
            color: "bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-500/15"
        },
        {
            id: "results",
            title: "Resultados",
            description: "Visualiza los resultados históricos de las mociones completadas.",
            icon: <BarChart3 className="size-8 text-amber-400" />,
            action: () => onNavigate("results"),
            color: "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/15"
        },
        {
            id: "projection",
            title: "Proyector",
            description: "Abre la vista en pantalla gigante para la audiencia (códigos TOTP, QR y estado).",
            icon: <MonitorPlay className="size-8 text-indigo-400" />,
            action: () => onNavigate("projection"),
            color: "bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/15"
        }
    ]

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <div className="absolute inset-0 -z-10 bg-mesh opacity-40"></div>

            <motion.div
                className="w-full max-w-4xl"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                            Odeen <span className="text-primary">Admin</span>
                        </h1>
                        <p className="text-muted-foreground">Panel principal de control de la asamblea.</p>
                    </div>
                    <Button variant="outline" onClick={onLogout} className="gap-2 border-border/50 hover:bg-destructive/10 hover:text-destructive transition-colors rounded-xl">
                        <LogOut className="size-4" />
                        Cerrar Sesión
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cards.map((card) => (
                        <motion.div key={card.id} variants={itemVariants}>
                            <Card
                                className={`glass border transition-all duration-300 cursor-pointer h-full ${card.color}`}
                                onClick={card.action}
                            >
                                <CardContent className="p-8 flex flex-col items-start gap-4">
                                    <div className="p-3 rounded-2xl bg-background/50 backdrop-blur-sm border border-border/50 shadow-sm">
                                        {card.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground mb-2">{card.title}</h2>
                                        <p className="text-sm text-muted-foreground/80 leading-relaxed">
                                            {card.description}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    )
}
