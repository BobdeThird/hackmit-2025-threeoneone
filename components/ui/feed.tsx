"use client"

import { useState, useEffect } from "react"
import { PostCard } from "@/components/ui/post-card"
import type { Post } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"
import { getUserVoteForPost, updateUserVote } from "@/lib/vote-persistence"

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
          .select('id, street_address, description, reported_time, images, city, upvotes, downvotes')
          .eq('city', dbCity)
          .order('reported_time', { ascending: false })
          .limit(100)
        if (error) throw error

        let mapped: Post[] = (data || []).map((r) => ({
          id: r.id as string,
          description: (r.description as string) || '',
          location: (r.street_address as string) || '',
          city: (r.city as string) as Post['city'],
          imageUrl: Array.isArray(r.images) && r.images.length > 0 ? (r.images[0] as string) : undefined,
          createdAt: r.reported_time as string,
          upvotes: (r.upvotes as number) ?? 0,
          downvotes: (r.downvotes as number) ?? 0,
          userVote: getUserVoteForPost(r.id as string),
          comments: [],
        }))
        // Fetch comments count in batch
        try {
          const ids = mapped.map(m => m.id)
          if (ids.length > 0) {
            const res = await fetch('/api/comments/count', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ ids }),
            })
            const json = await res.json()
            if (res.ok && json?.counts) {
              mapped = mapped.map(m => ({ ...m, commentsCount: (json.counts[m.id] as number) ?? 0 }))
            }
          }
        } catch {}
        setPosts(mapped)
      } catch (e) {
        console.error('Failed to load feed', e)
        setPosts([])
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedCity])

  const handleVote = async (postId: string, voteType: "up" | "down") => {
    const current = posts.find(p => p.id === postId)
    const previousVote = current?.userVote ?? null
    const nextVote: "up" | "down" | null = previousVote === voteType ? null : voteType

    // Update vote persistence
    updateUserVote(postId, nextVote)

    // Optimistic UI update
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p
      let up = p.upvotes
      let down = p.downvotes
      if (nextVote === null) {
        if (previousVote === 'up') up = Math.max(0, up - 1)
        if (previousVote === 'down') down = Math.max(0, down - 1)
      } else if (nextVote === 'up') {
        up = up + 1
        if (previousVote === 'down') down = Math.max(0, down - 1)
      } else {
        down = down + 1
        if (previousVote === 'up') up = Math.max(0, up - 1)
      }
      return { ...p, upvotes: up, downvotes: down, userVote: nextVote }
    }))

    try {
      const res = await fetch('/api/report/vote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ report_id: postId, action: nextVote === null ? 'remove' : nextVote, previous: previousVote })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'vote failed')
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: (json.upvotes ?? p.upvotes) as number, downvotes: (json.downvotes ?? p.downvotes) as number } : p))
    } catch (e) {
      // On failure, refetch just this post's counts
      try {
        const { data } = await supabase
          .from('report_ranked')
          .select('id, upvotes, downvotes')
          .eq('id', postId)
          .single()
        if (data) setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: (data.upvotes as number) ?? 0, downvotes: (data.downvotes as number) ?? 0 } : p))
      } catch {}
    }
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
