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
  