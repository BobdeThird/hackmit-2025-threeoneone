"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface PostModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCity: string
  onPosted?: () => void
}


export function PostModal({ isOpen, onClose, selectedCity, onPosted }: PostModalProps) {
  const [formData, setFormData] = useState({
    description: "",
    location: "",
    image: null as File | null,
  })

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }))
    }
  }

  const handleSubmit = async () => {
    try {
      let imageUrl: string | undefined
      if (formData.image) {
        const body = new FormData()
        body.append('file', formData.image)
        const resUp = await fetch('/api/storage/upload', { method: 'POST', body })
        const jsonUp = await resUp.json()
        if (!resUp.ok) throw new Error(jsonUp?.error || 'upload failed')
        imageUrl = jsonUp.url as string
      }

      const payload = {
        description: formData.description,
        street_address: formData.location,
        city: selectedCity.toUpperCase(),
        imageUrl,
      }
      const res = await fetch('/api/report/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'create failed')

      setFormData({ description: "", location: "", image: null })
      onPosted?.()
      onClose()
    } catch (e) {
      console.error('post create failed', e)
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border/50 max-w-md mx-4" showCloseButton={false} aria-describedby={undefined}>
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">Create New Post</DialogTitle>
        <DialogDescription className="sr-only">Fill out the form to create a new report.</DialogDescription>
        
        {/* Top header with cancel and post buttons */}
        <div className="flex justify-between items-center mb-4">
          <Button onClick={onClose} variant="ghost" className="glass-button rounded-full text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.location}
            className="glass-button rounded-full bg-primary hover:bg-primary/90 text-white"
          >
            Post
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location" className="text-foreground">
              Location
            </Label>
            <Input
              id="location"
              placeholder={`Address or intersection in ${selectedCity}`}
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              className="glass-card border-border/50 bg-input/50 text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Provide more details about the issue..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="glass-card border-border/50 bg-input/50 text-foreground resize-none"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Photo (Optional)</Label>
            {formData.image ? (
              <div className="relative h-32">
                <Image
                  src={URL.createObjectURL(formData.image)}
                  alt="Upload preview"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border/50 rounded-lg cursor-pointer glass-card hover:bg-card/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload photo</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
