"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CityFilterProps {
  selectedCity: string
  onCityChange: (city: string) => void
}

const cities = [
  { value: "SF", label: "San Francisco" },
  { value: "NYC", label: "New York City" },
  { value: "Boston", label: "Boston" },
]

export function CityFilter({ selectedCity, onCityChange }: CityFilterProps) {
  return (
    <Select value={selectedCity} onValueChange={onCityChange}>
      <SelectTrigger className="w-40 bg-transparent border border-border text-white hover:bg-muted/10 rounded-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-background border border-border rounded-xl">
        {cities.map((city) => (
          <SelectItem key={city.value} value={city.value} className="text-white hover:bg-muted/10">
            {city.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
