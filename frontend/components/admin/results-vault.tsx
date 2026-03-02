"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Download, BarChart3, CheckCircle2 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import type { AssemblyState } from "@/lib/assembly-types"

interface ResultsVaultProps {
  assembly: AssemblyState
  onBack: () => void
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
}

export function ResultsVault({ assembly, onBack }: ResultsVaultProps) {
  const completedMotions = useMemo(
    () => assembly.motions.filter((m) => m.status === "completed"),
    [assembly.motions]
  )

  const handleExportPDF = () => {
    // In a real app, this would generate a PDF
    alert("Exportando PDF de la Asamblea...")
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10 bg-mesh bg-background" />
      {/* Header */}
      <motion.header
        className="sticky top-0 z-50 glass-strong"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label="Volver al centro de comando"
              className="transition-all hover:scale-110"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1
                className="text-base font-bold text-foreground flex items-center gap-2"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                <span className="brand-text">Odeen</span>
                <span className="text-muted-foreground/30 font-normal">|</span>
                <span className="text-sm font-medium text-muted-foreground">Bóveda de Resultados</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              size="sm"
              className="gap-1.5 rounded-lg font-semibold shadow-md transition-all hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] glow-primary"
              onClick={handleExportPDF}
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              <Download className="size-3.5" />
              Exportar
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <motion.div
          className="mb-8 flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Mociones Completadas
            </h2>
            <p className="text-sm text-muted-foreground">
              Resultados finales de {completedMotions.length} mociones
            </p>
          </div>
        </motion.div>

        {completedMotions.length === 0 ? (
          <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <Card className="glass border-border/60 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <CheckCircle2 className="mb-4 size-10 text-muted-foreground/30" />
                <p className="text-lg font-medium text-foreground">
                  Aún no hay mociones completadas
                </p>
                <p className="text-sm text-muted-foreground">
                  Las mociones aparecerán aquí una vez que finalice la votación.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-8">
            {completedMotions.map((m, index) => {
              const totalVotes = m.totalVotes || 0
              const results = m.results || []

              // Add a percentage field for the tooltip and labels
              const dataWithPercentages = results.map((r) => ({
                ...r,
                percentage:
                  totalVotes > 0
                    ? ((r.value / totalVotes) * 100).toFixed(1)
                    : "0.0",
              }))

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.1, duration: 0.4 }}
                >
                  <Card className="glass overflow-hidden border-border/60 shadow-lg">
                    <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                              {index + 1}
                            </span>
                            <CardTitle className="text-lg">
                              {m.title}
                            </CardTitle>
                          </div>
                          {m.description && (
                            <p className="pl-7 text-sm text-muted-foreground line-clamp-2">
                              {m.description}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-2xl font-bold text-foreground">
                            {totalVotes.toLocaleString()}
                          </p>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Votos Totales
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {results.length > 0 ? (
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={dataWithPercentages}
                              layout="vertical"
                              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                                stroke="hsl(var(--border))"
                                opacity={0.4}
                              />
                              <XAxis
                                type="number"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                dataKey="label"
                                type="category"
                                stroke="hsl(var(--foreground))"
                                fontSize={13}
                                fontWeight="500"
                                axisLine={false}
                                tickLine={false}
                                width={90}
                              />
                              <Tooltip
                                cursor={{ fill: "hsl(var(--accent))", opacity: 0.2 }}
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  borderColor: "hsl(var(--border))",
                                  borderRadius: "8px",
                                  color: "hsl(var(--foreground))",
                                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                }}
                                formatter={(value: number, name: string, props: any) => [
                                  `${value} votos (${props.payload.percentage}%)`,
                                  "Votos",
                                ]}
                              />
                              <Bar
                                dataKey="value"
                                radius={[0, 4, 4, 0]}
                                barSize={32}
                                animationDuration={1500}
                              >
                                {dataWithPercentages.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color || "hsl(var(--primary))"}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border p-4 text-center">
                          <p className="text-muted-foreground">
                            No hay datos de resultados disponibles para esta moción.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
