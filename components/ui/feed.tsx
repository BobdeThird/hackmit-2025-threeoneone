"use client"

import { useState, useEffect } from "react"
import { PostCard } from "@/components/ui/post-card"
import type { Post } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"

interface FeedProps {
  selectedCity: string
}

export function Feed({ selectedCity }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    ;(async () => {
      try {
        // Map UI city to DB enum
        const dbCity = selectedCity === 'SF' ? 'SF' : selectedCity === 'NYC' ? 'NYC' : 'BOSTON'
        const { data, error } = await supabase
          .from('report_ranked')
          .select('id, street_address, description, reported_time, images, city')
          .eq('city', dbCity)
          .order('reported_time', { ascending: false })
          .limit(100)
        if (error) throw error

        const mapped: Post[] = (data || []).map((r) => ({
          id: r.id as string,
          description: (r.description as string) || '',
          location: (r.street_address as string) || '',
          city: (r.city as string) as Post['city'],
          imageUrl: Array.isArray(r.images) && r.images.length > 0 ? (r.images[0] as string) : undefined,
          createdAt: r.reported_time as string,
          upvotes: 0,
          downvotes: 0,
          userVote: null,
          comments: [],
        }))
        setPosts(mapped)
      } catch (e) {
        console.error('Failed to load feed', e)
        setPosts([])
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedCity])

  const handleVote = (postId: string, voteType: "up" | "down") => {
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p
      // Optimistic toggle
      let up = p.upvotes
      let down = p.downvotes
      let userVote = p.userVote
      if (userVote === voteType) {
        // undo
        if (voteType === 'up') up = Math.max(0, up - 1); else down = Math.max(0, down - 1)
        userVote = null
      } else {
        if (voteType === 'up') {
          up = up + 1
          if (userVote === 'down') down = Math.max(0, down - 1)
        } else {
          down = down + 1
          if (userVote === 'up') up = Math.max(0, up - 1)
        }
        userVote = voteType
      }
      return { ...p, upvotes: up, downvotes: down, userVote }
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onVote={handleVote} />
      ))}

      {posts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No posts found for {selectedCity}</div>
      )}
    </div>
  )
}
