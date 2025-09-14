"use client"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { X } from "lucide-react"

interface ImagePreviewProps {
  src: string
  alt: string
  children: React.ReactNode
}

export function ImagePreview({ src, alt, children }: ImagePreviewProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] w-fit h-fit p-0 border-0 bg-transparent shadow-none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <Image
              src={src}
              alt={alt}
              width={1200}
              height={800}
              className="object-contain w-auto h-auto max-w-[90vw] max-h-[90vh] rounded-lg"
              priority
            />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
