"use client"

import { useState } from "react"
import { Feed } from "@/components/ui/feed"
import { NavigationHeader } from "@/components/ui/navigation-header"
import { PostModal } from "@/components/ui/post-modal"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function HomePage() {
  const [selectedCity, setSelectedCity] = useState("SF")
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [feedReloadToken, setFeedReloadToken] = useState(0)

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Header - Fixed at top */}
      <NavigationHeader selectedCity={selectedCity} onCityChange={setSelectedCity} />

      {/* Main content area with Twitter-style layout */}
      <div className="pt-32">
        <div className="max-w-xl mx-auto border-x border-[#2f3336] min-h-screen bg-black">
          {/* Main feed */}
          <Feed selectedCity={selectedCity} key={`${selectedCity}-${feedReloadToken}`} />
        </div>
      </div>
      
      {/* Fixed button positioned within feed boundaries */}
      <Button
        onClick={() => setIsPostModalOpen(true)}
        className="fixed bottom-6 z-50 h-14 w-14 rounded-full bg-primary hover:scale-90 shadow-lg border-0 transition-all duration-200"
        style={{
          right: `max(1rem, calc(50vw - 250px))` // Positions button 16px from right edge of Twitter-style feed
        }}
        size="icon"
      >
        <Plus className="size-icon text-white" />
      </Button>

      {/* Post creation modal */}
      <PostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        selectedCity={selectedCity}
        onPosted={() => setFeedReloadToken((t) => t + 1)}
      />
    </div>
  )
}
