"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, MessageCircle, Share } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { CommentSection } from "@/components/ui/comment-section"
import type { Post } from "@/lib/types"

interface PostCardProps {
  post: Post
  onVote: (postId: string, voteType: "up" | "down") => void
}

export function PostCard({ post, onVote }: PostCardProps) {
  const router = useRouter()
  const [showComments, setShowComments] = useState(false)

  const handlePostClick = () => {
    router.push(`/post/${post.id}`)
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

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <Card 
      className="twitter-card border-0 rounded-none border-b border-border py-0 cursor-pointer hover:bg-muted/5 transition-colors"
      onClick={handlePostClick}
    >
      <div className="px-4 py-2">
        <div className="w-full">
          {/* Header info */}
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-bold text-white">{post.location}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="mb-3">
            <p className="text-white text-base">{post.description}</p>
          </div>

          {/* Image if present */}
          {post.imageUrl && (
            <div className="mb-3 rounded-2xl overflow-hidden border border-border relative h-64">
              <Image 
                src={post.imageUrl.startsWith('public/') ? post.imageUrl.replace('public/', '/') : post.imageUrl} 
                alt={`Image for ${post.location} - ${post.description.substring(0, 100)}...`}
                fill
                className="object-cover"
                onError={() => {
                  // Handle error with a fallback
                }}
              />
            </div>
          )}

          <div className="flex items-center justify-between w-full">
            {/* Upvote */}
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  stopPropagation(e)
                  onVote(post.id, "up")
                }}
                className={`twitter-button h-8 px-0 rounded-full ${
                  post.userVote === "up"
                    ? "text-green-500 hover:text-green-500 hover:bg-green-500/10"
                    : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                }`}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <span className={`text-sm font-medium ml-1 ${
                post.userVote === "up" ? "text-green-500" : "text-white"
              }`}>{post.upvotes}</span>
            </div>

            {/* Downvote */}
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  stopPropagation(e)
                  onVote(post.id, "down")
                }}
                className={`twitter-button h-8 px-0 rounded-full ${
                  post.userVote === "down"
                    ? "text-red-500 hover:text-red-500 hover:bg-red-500/10"
                    : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                }`}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <span className={`text-sm font-medium ml-1 ${
                post.userVote === "down" ? "text-red-500" : "text-white"
              }`}>{post.downvotes}</span>
            </div>

            {/* Comments */}
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  stopPropagation(e)
                  setShowComments(!showComments)
                }}
                className="twitter-button h-8 px-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-white ml-1">{post.comments.length}</span>
            </div>

            {/* Share */}
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  stopPropagation(e)
                  handleShare()
                }}
                className="twitter-button h-8 px-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
              >
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments section */}
      {showComments && <CommentSection postId={post.id} comments={post.comments} />}
    </Card>
  )
}
