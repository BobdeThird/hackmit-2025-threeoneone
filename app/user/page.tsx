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

  return (
    <div className={`min-h-screen bg-background ${styles.userPage}`}>
      <div className={`${styles.userHeader} border-b border-border bg-background/80 backdrop-blur-md`}>
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className={`text-xl font-bold text-white ${styles.userTitle}`}>ThreeOneOne</h1>
          <CityFilter selectedCity={selectedCity} onCityChange={setSelectedCity} />
        </div>
      </div>

      {/* Main feed */}
      <Feed selectedCity={selectedCity} />

      <Button
        onClick={() => setIsPostModalOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg border-0 ${styles.twitterButton}`}
        size="icon"
      >
        <Plus className="h-6 w-6 text-white" />
      </Button>

      {/* Post creation modal */}
      <PostModal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} selectedCity={selectedCity} />
    </div>
  )
}
