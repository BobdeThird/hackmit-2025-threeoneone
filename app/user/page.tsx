"use client"

import { useState } from "react"
import { Feed } from "@/components/ui/feed"
import { CityFilter } from "@/components/ui/city-filter"
import { PostModal } from "@/components/ui/post-modal"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import styles from "./page.module.css"

export default function HomePage() {
  const [selectedCity, setSelectedCity] = useState("SF")
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [feedReloadToken, setFeedReloadToken] = useState(0)

  return (
    <div className={`min-h-screen bg-background ${styles.userPage}`}>
      <div className={`${styles.userHeader} border-b border-border bg-background/80 backdrop-blur-md`}>
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className={`text-xl font-bold text-white ${styles.userTitle}`}>ThreeOneOne</h1>
          <CityFilter selectedCity={selectedCity} onCityChange={setSelectedCity} />
        </div>
      </div>

      {/* Main feed */}
      <Feed selectedCity={selectedCity} key={`${selectedCity}-${feedReloadToken}`} />
      
      {/* Fixed button positioned within feed boundaries */}
      <Button
        onClick={() => setIsPostModalOpen(true)}
        className="fixed bottom-6 z-50 h-14 w-14 rounded-full bg-primary hover:scale-90 shadow-lg border-0 transition-all duration-200"
        style={{
          right: `max(1rem, calc(50vw - 234px))` // Positions button 16px from right edge of 500px centered feed
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
