"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { mockPosts } from "@/lib/mock-data"
import { PostDetailView } from "@/components/ui/post-detail-view"
import type { Post } from "@/lib/types"

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const postId = params.id as string
    
    // Find the post in mock data (in a real app, this would be an API call)
    const foundPost = mockPosts.find(p => p.id === postId)
    
    setPost(foundPost || null)
    setLoading(false)
  }, [params.id])

  // Vote handling is now managed internally by PostDetailView component

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading post...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">Post not found</h1>
              <p className="text-muted-foreground">The post you're looking for doesn't exist.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header with back button */}
        <div className="mb-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        {/* Post detail view */}
        <PostDetailView post={post} />
      </div>
    </div>
  )
}

