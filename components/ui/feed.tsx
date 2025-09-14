"use client"

import { useState, useEffect } from "react"
import { PostCard } from "@/components/ui/post-card"
import { mockPosts } from "@/lib/mock-data"
import { calculatePostVoteData, handleVoteChange } from "@/lib/vote-persistence"
import type { Post } from "@/lib/types"

interface FeedProps {
  selectedCity: string
}

export function Feed({ selectedCity }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading and filter by city
    setLoading(true)
    setTimeout(() => {
      const filteredPosts = mockPosts.filter((post) => post.city === selectedCity)
      
      // Apply user's stored votes to each post
      const postsWithUserVotes = filteredPosts.map(post => {
        const voteData = calculatePostVoteData(
          post.id, 
          post.upvotes, 
          post.downvotes, 
          post.userVote
        )
        
        return {
          ...post,
          upvotes: voteData.upvotes,
          downvotes: voteData.downvotes,
          userVote: voteData.userVote
        }
      })
      
      setPosts(postsWithUserVotes)
      setLoading(false)
    }, 500)
  }, [selectedCity])

  const handleVote = (postId: string, voteType: "up" | "down") => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          // Handle the vote change and persistence
          handleVoteChange(postId, voteType, post.userVote)
          
          // Recalculate vote data based on the original mock data and new user vote
          const originalPost = mockPosts.find(p => p.id === postId)
          if (!originalPost) return post
          
          const voteData = calculatePostVoteData(
            postId,
            originalPost.upvotes,
            originalPost.downvotes,
            originalPost.userVote
          )

          return {
            ...post,
            upvotes: voteData.upvotes,
            downvotes: voteData.downvotes,
            userVote: voteData.userVote
          }
        }
        return post
      }),
    )
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
