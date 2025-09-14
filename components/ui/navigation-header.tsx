"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface NavigationHeaderProps {
  selectedCity: string
  onCityChange: (city: string) => void
}

const cities = [
  { value: "SF", label: "San Francisco" },
  { value: "NYC", label: "New York City" },
  { value: "Boston", label: "Boston" },
]

export function NavigationHeader({ selectedCity, onCityChange }: NavigationHeaderProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        // Scrolling up or at top
        setIsVisible(true)
      } else {
        // Scrolling down
        setIsVisible(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", controlNavbar)
    return () => window.removeEventListener("scroll", controlNavbar)
  }, [lastScrollY])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b border-border transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div className="container mx-auto px-4">
        {/* ThreeOneOne Title */}
        <div className="py-4">
          <h1 className="text-2xl font-bold text-white text-center">ThreeOneOne</h1>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex justify-center">
          <div className="w-full max-w-[500px] px-4">
            <nav className="flex">
              {cities.map((city) => (
                <button
                  key={city.value}
                  onClick={() => onCityChange(city.value)}
                  className={cn(
                    "flex-1 px-4 py-3 text-center font-medium text-base transition-colors duration-200 relative",
                    selectedCity === city.value
                      ? "text-white"
                      : "text-muted-foreground hover:text-white"
                  )}
                >
                  {city.label}
                  {selectedCity === city.value && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}
