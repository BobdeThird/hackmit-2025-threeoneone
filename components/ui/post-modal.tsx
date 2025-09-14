"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Camera, MapPin, X } from "lucide-react"

interface PostModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCity: string
}


export function PostModal({ isOpen, onClose, selectedCity }: PostModalProps) {
  const [formData, setFormData] = useState({
    description: "",
    location: "",
    image: null as File | null,
  })
  const [showLocationInput, setShowLocationInput] = useState(false)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }))
    }
  }

  const handleLocationClick = () => {
    setShowLocationInput(!showLocationInput)
  }

  const handlePhotoClick = () => {
    document.getElementById('photo-upload')?.click()
  }

  const removePhoto = () => {
    setFormData((prev) => ({ ...prev, image: null }))
  }

  const removeLocation = () => {
    setFormData((prev) => ({ ...prev, location: "" }))
    setShowLocationInput(false)
  }

  const handleSubmit = () => {
    // Here you would typically submit to your backend
    console.log("Submitting post:", formData)

    // Reset form and close modal
    setFormData({
      description: "",
      location: "",
      image: null,
    })
    setShowLocationInput(false)
    onClose()
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border/50 max-w-md mx-4 p-4" showCloseButton={false}>
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">Create New Post</DialogTitle>
        
        {/* Top header with cancel and post buttons */}
        <div className="flex justify-between items-center mb-4">
          <Button onClick={onClose} variant="ghost" className="glass-button rounded-full text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.description.trim()}
            className="glass-button rounded-full bg-primary hover:bg-primary/90 text-white disabled:opacity-50"
          >
            Post
          </Button>
        </div>

        <div className="space-y-3">
          {/* Main compose area */}
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center border border-border/30">
                <span className="text-sm font-medium text-primary">U</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="What's happening?"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="border-0 p-0 text-lg placeholder:text-muted-foreground bg-transparent resize-none focus-visible:ring-0 min-h-[120px]"
                rows={5}
              />

              {/* Selected photo display */}
              {formData.image && (
                <div className="relative">
                  <div className="relative h-48 rounded-2xl overflow-hidden border border-border/50">
                    <Image
                      src={URL.createObjectURL(formData.image)}
                      alt="Upload preview"
                      fill
                      className="object-cover"
                    />
                    <Button
                      onClick={removePhoto}
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Selected location display */}
              {formData.location && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">{formData.location}</span>
                  </div>
                  <Button
                    onClick={removeLocation}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 rounded-full p-0 hover:bg-destructive/20"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Location input (shows when location icon is clicked) */}
              {showLocationInput && (
                <div className="space-y-2">
                  <Input
                    placeholder={`Address or intersection in ${selectedCity}`}
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    className="glass-card border-border/50 bg-input/50 text-foreground"
                    autoFocus
                  />
                </div>
              )}

              {/* Bottom toolbar with icons */}
              <div className="flex items-center justify-between pt-3 border-t border-border/20">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={handlePhotoClick}
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0 hover:bg-primary/10 text-primary"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleLocationClick}
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0 hover:bg-primary/10 text-primary"
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formData.description.length}/280
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  )
}
