"use client"

import React from "react"
import { Brain } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ClaudePolicyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClaudePolicyModal({ open, onOpenChange }: ClaudePolicyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6 bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="w-5 h-5 text-primary" />
            Claude Policy Analyst
          </DialogTitle>
        </DialogHeader>

        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground">
            AI-powered policy analysis and recommendations based on 311 data patterns will be available soon.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
