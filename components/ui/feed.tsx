"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { PostCard } from "@/components/ui/post-card"
import type { Post } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"
import { getUserVoteForPost, updateUserVote } from "@/lib/vote-persistence"
import { computeHotScore } from "@/lib/utils"

interface FeedProps {
  selectedCity: string
}

const POSTS_PER_PAGE = 20

export function Feed({ selectedCity }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null)

  const fetchPosts = useCallback(async (currentOffset: number, isInitial = false) => {
    try {
      // Map UI city to DB enum
      const dbCity = selectedCity === 'SF' ? 'SF' : selectedCity === 'NYC' ? 'NYC' : 'BOSTON'
      
      // First, get posts with upvotes > 0 ordered by upvotes desc
      const { data: upvotedData, error: upvotedError } = await supabase
        .from('report_ranked')
        .select('id, street_address, description, reported_time, images, city, upvotes, downvotes')
        .eq('city', dbCity)
        .gt('upvotes', 0)
        .order('upvotes', { ascending: false })
        .order('reported_time', { ascending: false })
        .limit(POSTS_PER_PAGE)
      
      if (upvotedError) throw upvotedError
      
      let data = upvotedData || []
      
      // If we don't have enough posts with upvotes, fill with recent posts
      if (data.length < POSTS_PER_PAGE) {
        const needed = POSTS_PER_PAGE - data.length
        const usedIds = data.map(p => p.id)
        
        let recentQuery = supabase
          .from('report_ranked')
          .select('id, street_address, description, reported_time, images, city, upvotes, downvotes')
          .eq('city', dbCity)
          .order('reported_time', { ascending: false })
          .limit(needed)
        
        // Only exclude used IDs if we have any
        if (usedIds.length > 0) {
          recentQuery = recentQuery.not('id', 'in', `(${usedIds.join(',')})`)
        }
        
        const { data: recentData, error: recentError } = await recentQuery
        
        if (recentError) throw recentError
        data = [...data, ...(recentData || [])]
      }

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

      // Sort by hotness with recency tiebreaker
      mapped.sort((a, b) => {
        const hb = computeHotScore(b.upvotes, b.downvotes, b.createdAt)
        const ha = computeHotScore(a.upvotes, a.downvotes, a.createdAt)
        if (hb !== ha) return hb - ha
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

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

      // Sort by hotness with recency tiebreaker
      mapped.sort((a, b) => {
        const hb = computeHotScore(b.upvotes, b.downvotes, b.createdAt)
        const ha = computeHotScore(a.upvotes, a.downvotes, a.createdAt)
        if (hb !== ha) return hb - ha
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      if (isInitial) {
        setPosts(mapped)
      } else {
        setPosts(prev => {
          const combined = [...prev, ...mapped]
          combined.sort((a, b) => {
            const hb = computeHotScore(b.upvotes, b.downvotes, b.createdAt)
            const ha = computeHotScore(a.upvotes, a.downvotes, a.createdAt)
            if (hb !== ha) return hb - ha
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })
          return combined
        })
      }

      // Check if we have more data
      setHasMore(mapped.length === POSTS_PER_PAGE)
      
      return mapped
    } catch (e) {
      console.error('Failed to load feed', e)
      if (isInitial) {
        setPosts([])
      }
      return []
    }
  }, [selectedCity])

  // Load more posts function
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return
    
    setLoadingMore(true)
    const newOffset = offset + POSTS_PER_PAGE
    await fetchPosts(newOffset, false)
    setOffset(newOffset)
    setLoadingMore(false)
  }, [offset, loadingMore, hasMore, fetchPosts])

  // Intersection observer setup
  useEffect(() => {
    if (loadMoreTriggerRef.current && hasMore && !loading) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMorePosts()
          }
        },
        { threshold: 0.1 }
      )
      
      observerRef.current.observe(loadMoreTriggerRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loading, loadMorePosts])

  // Initial load effect
  useEffect(() => {
    setLoading(true)
    setPosts([])
    setOffset(0)
    setHasMore(true)
    
    fetchPosts(0, true).finally(() => {
      setLoading(false)
    })
  }, [selectedCity, fetchPosts])

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
    } catch {
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

      {posts.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">No posts found for {selectedCity}</div>
      )}

      {/* Intersection observer trigger element */}
      {hasMore && posts.length > 0 && (
        <div ref={loadMoreTriggerRef} className="w-full py-4">
          {loadingMore && (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading more posts...</span>
            </div>
          )}
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          You&apos;ve reached the end of the feed
        </div>
      )}
    </div>
  )
}
