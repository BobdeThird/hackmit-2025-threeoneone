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

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface RunRow {
  id: string
  status: RunStatus
  city?: string | null
  tasks: string[]
  input_source?: string | null
  created_at: string
  updated_at: string
}

export type EventLevel =
  | 'started'
  | 'step'
  | 'info'
  | 'warn'
  | 'error'
  | 'token'
  | 'result'
  | 'artifact'
  | 'done'

export interface RunEventRow {
  id: number
  run_id: string
  ts: string
  agent: string
  level: EventLevel
  message?: string | null
  data?: unknown
}

export interface ArtifactRow {
  id: string
  run_id: string
  kind: string
  uri?: string | null
  meta?: unknown
  created_at: string
}

export type AgentInput = {
  table?: string
  reports?: Report[]
}

export type AgentRequest<TParams = undefined> = {
  runId: string
  city?: string
  input?: AgentInput
  params?: TParams
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
  
