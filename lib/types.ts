export type Department =
  | 'PublicWorks'
  | 'Transportation'
  | 'Sanitation'
  | 'ParksAndRecreation'
  | 'WaterAndSewer'
  | 'PublicSafety'
  | 'HealthAndHumanServices'
  | 'BuildingsAndInspections'
  | 'AnimalControl'
  | 'StreetLighting'
  | 'IT311'
  | 'GraffitiAbatement'
  | 'NoiseControl'
  | 'ParkingEnforcement'
  | 'HomelessServices'
  | 'EmergencyManagement'

export interface Report {
  street_address: string
  coordinates: [number, number]
  images?: string[]
  reported_time: string
  description: string
  native_id?: string
  status?: string
  source_scraper: string
}

export interface ReportRanked {
  report: Report
  ranking: number
  summary: string
  estimated_time_hours: number
  department: Department
}

export interface Comment {
    id: string
    author: string
    content: string
    createdAt: string
  }
  
  export interface Post {
    id: string
    description: string
    location: string
    city: string
    imageUrl?: string
    upvotes: number
    downvotes: number
    userVote: "up" | "down" | null
    comments: Comment[]
    commentsCount?: number
    createdAt: string
  }
  
