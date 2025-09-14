"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MoreHorizontal } from "lucide-react"

interface TwitterHeaderProps {
  title: string
  showBackButton?: boolean
  showMenuButton?: boolean
  onBackClick?: () => void
}

export function TwitterHeader({ 
  title, 
  showBackButton = true, 
  showMenuButton = false,
  onBackClick 
}: TwitterHeaderProps) {
  const router = useRouter()

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      router.back()
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-black/75 backdrop-blur-md supports-[backdrop-filter]:bg-black/60 border-b border-[#2f3336]">
      <div className="flex items-center justify-between px-4 py-2 h-[53px]">
        <div className="flex items-center min-w-0 flex-1">
          {showBackButton && (
            <Button
              onClick={handleBackClick}
              variant="ghost"
              size="sm"
              className="mr-8 p-2 h-9 w-9 rounded-full hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Button>
          )}
          <h1 className="text-xl font-bold text-white truncate">{title}</h1>
        </div>
        
        <div className="flex items-center">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-9 w-9 rounded-full hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal className="h-5 w-5 text-white" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
