"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, MessageCircle, Share } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { CommentSection } from "@/components/ui/comment-section"
import { calculatePostVoteData, handleVoteChange } from "@/lib/vote-persistence"
import { mockPosts } from "@/lib/mock-data"
import type { Post } from "@/lib/types"

interface PostDetailViewProps {
  post: Post
  onVote?: (postId: string, voteType: "up" | "down") => void // Made optional since we'll handle it internally
}

export function PostDetailView({ post: initialPost, onVote }: PostDetailViewProps) {
  const [showComments, setShowComments] = useState(true) // Default to showing comments on detail page
  const [post, setPost] = useState(initialPost)
  
  // Apply stored votes when component mounts or post changes
  useEffect(() => {
    const originalPost = mockPosts.find(p => p.id === initialPost.id)
    if (!originalPost) {
      setPost(initialPost)
      return
    }
    
    const voteData = calculatePostVoteData(
      initialPost.id,
      originalPost.upvotes,
      originalPost.downvotes,
      originalPost.userVote
    )
    
    setPost({
      ...initialPost,
      upvotes: voteData.upvotes,
      downvotes: voteData.downvotes,
      userVote: voteData.userVote
    })
  }, [initialPost])

  const handleVote = (voteType: "up" | "down") => {
    // Handle the vote change and persistence
    handleVoteChange(post.id, voteType, post.userVote)
    
    // Recalculate vote data based on the original mock data and new user vote
    const originalPost = mockPosts.find(p => p.id === post.id)
    if (!originalPost) return
    
    const voteData = calculatePostVoteData(
      post.id,
      originalPost.upvotes,
      originalPost.downvotes,
      originalPost.userVote
    )

    const updatedPost = {
      ...post,
      upvotes: voteData.upvotes,
      downvotes: voteData.downvotes,
      userVote: voteData.userVote
    }
    
    setPost(updatedPost)
    
    // Call parent callback if provided (for compatibility)
    onVote?.(post.id, voteType)
  }

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`
    
    if (navigator.share) {
      await navigator.share({
        title: `ThreeOneOne - ${post.location}`,
        text: post.description,
        url: postUrl,
      })
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(postUrl)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="twitter-card border border-border rounded-lg">
        <div className="px-6 py-4">
          <div className="w-full">
            {/* Header info */}
            <div className="flex items-center space-x-2 text-sm mb-3">
              <span className="font-bold text-lg" style={{ color: '#e1e1e1' }}>{post.location}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-lg leading-relaxed" style={{ color: '#e1e1e1' }}>{post.description}</p>
            </div>

            {/* Image if present */}
            {post.imageUrl && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-border relative max-h-96">
                <Image 
                  src={post.imageUrl.startsWith('public/') ? post.imageUrl.replace('public/', '/') : post.imageUrl} 
                  alt={`Image for ${post.location} - ${post.description.substring(0, 100)}...`}
                  width={600}
                  height={400}
                  className="w-full max-h-96 object-cover"
                  onError={() => {
                    // Handle error with a fallback
                  }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between w-full pt-2 border-t border-border/50">
              {/* Upvote */}
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote("up")}
                  className={`twitter-button h-10 px-3 rounded-full ${
                    post.userVote === "up"
                      ? "text-green-500 hover:text-green-500 hover:bg-green-500/10"
                      : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                  }`}
                >
                  <ArrowUp className="h-5 w-5 mr-1" />
                  <span className={`text-sm font-medium ${
                    post.userVote === "up" ? "text-green-500" : "text-muted-foreground"
                  }`}>{post.upvotes}</span>
                </Button>
              </div>

              {/* Downvote */}
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote("down")}
                  className={`twitter-button h-10 px-3 rounded-full ${
                    post.userVote === "down"
                      ? "text-red-500 hover:text-red-500 hover:bg-red-500/10"
                      : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  }`}
                >
                  <ArrowDown className="h-5 w-5 mr-1" />
                  <span className={`text-sm font-medium ${
                    post.userVote === "down" ? "text-red-500" : "text-muted-foreground"
                  }`}>{post.downvotes}</span>
                </Button>
              </div>

              {/* Comments */}
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="twitter-button h-10 px-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                >
                  <MessageCircle className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium text-muted-foreground">{post.comments.length}</span>
                </Button>
              </div>

              {/* Share */}
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="twitter-button h-10 px-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                >
                  <Share className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium text-muted-foreground">Share</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Comments section */}
      {showComments && (
        <Card className="border border-border rounded-lg">
          <div className="p-4">
            <h3 className="text-white text-lg font-semibold mb-4">Comments</h3>
            <CommentSection postId={post.id} comments={post.comments} />
          </div>
        </Card>
      )}
    </div>
  )
}

