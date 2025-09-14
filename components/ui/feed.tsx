"use client"

import { useState, useEffect } from "react"
import { PostCard } from "@/components/ui/post-card"
import { mockPosts } from "@/lib/mock-data"
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
      setPosts(filteredPosts)
      setLoading(false)
    }, 500)
  }, [selectedCity])

  const handleVote = (postId: string, voteType: "up" | "down") => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const newPost = { ...post }

          if (voteType === "up") {
            if (post.userVote === "up") {
              // Remove upvote
              newPost.upvotes -= 1
              newPost.userVote = null
            } else {
              // Add upvote, remove downvote if exists
              newPost.upvotes += 1
              if (post.userVote === "down") {
                newPost.downvotes -= 1
              }
              newPost.userVote = "up"
            }
          } else {
            if (post.userVote === "down") {
              // Remove downvote
              newPost.downvotes -= 1
              newPost.userVote = null
            } else {
              // Add downvote, remove upvote if exists
              newPost.downvotes += 1
              if (post.userVote === "up") {
                newPost.upvotes -= 1
              }
              newPost.userVote = "down"
            }
          }

          return newPost
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
