"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, MessageCircle, Share } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { CommentSection } from "@/components/ui/comment-section"
import type { Post } from "@/lib/types"

interface PostCardProps {
  post: Post
  onVote: (postId: string, voteType: "up" | "down") => void
}

export function PostCard({ post, onVote }: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const netVotes = post.upvotes - post.downvotes

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: post.title,
        text: post.description,
        url: window.location.href,
      })
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <Card className="twitter-card border-0 rounded-none border-b border-border">
      <div className="px-4 py-3">
        <div className="w-full">
          {/* Header info */}
          <div className="flex items-center space-x-2 text-sm mb-2">
            <span className="font-bold text-white">{post.location}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="mb-2">
            <h3 className="text-white text-sm leading-4 font-normal">{post.title}</h3>
            <p className="text-white text-sm leading-4 mt-1">{post.description}</p>
          </div>

          {/* Image if present */}
          {post.imageUrl && (
            <div className="mb-2 rounded-2xl overflow-hidden border border-border">
              <img 
                src={post.imageUrl.startsWith('public/') ? post.imageUrl.replace('public/', '/') : post.imageUrl} 
                alt={post.title} 
                className="w-full h-64 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
            </div>
          )}

          <div className="flex items-center justify-between w-full">
            {/* Left side: Vote buttons */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVote(post.id, "up")}
                className={`twitter-button h-8 px-2 rounded-full ${
                  post.userVote === "up"
                    ? "text-green-500 hover:text-green-500 hover:bg-green-500/10"
                    : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                }`}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              
              <span className="text-sm font-medium text-white min-w-[24px] text-center">{netVotes}</span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVote(post.id, "down")}
                className={`twitter-button h-8 px-2 rounded-full ${
                  post.userVote === "down"
                    ? "text-red-500 hover:text-red-500 hover:bg-red-500/10"
                    : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                }`}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Right side: Comment and Share buttons */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="twitter-button h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">{post.comments.length}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="twitter-button h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
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
