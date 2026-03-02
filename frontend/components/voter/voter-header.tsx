"use client"

import { LogOut, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

interface VoterHeaderProps {
  onLogout: () => void
}

export function VoterHeader({ onLogout }: VoterHeaderProps) {
  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">
            student@university.edu
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-muted-foreground transition-all hover:text-foreground hover:scale-105"
            aria-label="Log out"
          >
            <LogOut className="mr-1.5 size-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </header>
  )
}
