"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, MessageCircle, Share } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { CommentSection } from "@/components/ui/comment-section"
import type { Post } from "@/lib/types"

interface PostDetailViewProps {
  post: Post
  onVote: (postId: string, voteType: "up" | "down") => void
}

export function PostDetailView({ post, onVote }: PostDetailViewProps) {
  const [showComments, setShowComments] = useState(true) // Default to showing comments on detail page

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
              <span className="font-bold text-white text-lg">{post.location}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-white text-lg leading-relaxed">{post.description}</p>
            </div>

            {/* Image if present */}
            {post.imageUrl && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-border">
                <img 
                  src={post.imageUrl.startsWith('public/') ? post.imageUrl.replace('public/', '/') : post.imageUrl} 
                  className="w-full max-h-96 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
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
                  onClick={() => onVote(post.id, "up")}
                  className={`twitter-button h-10 px-3 rounded-full ${
                    post.userVote === "up"
                      ? "text-green-500 hover:text-green-500 hover:bg-green-500/10"
                      : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                  }`}
                >
                  <ArrowUp className="h-5 w-5 mr-1" />
                  <span className={`text-sm font-medium ${
                    post.userVote === "up" ? "text-green-500" : "text-white"
                  }`}>{post.upvotes}</span>
                </Button>
              </div>

              {/* Downvote */}
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onVote(post.id, "down")}
                  className={`twitter-button h-10 px-3 rounded-full ${
                    post.userVote === "down"
                      ? "text-red-500 hover:text-red-500 hover:bg-red-500/10"
                      : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  }`}
                >
                  <ArrowDown className="h-5 w-5 mr-1" />
                  <span className={`text-sm font-medium ${
                    post.userVote === "down" ? "text-red-500" : "text-white"
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
                  <span className="text-sm font-medium text-white">{post.comments.length}</span>
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
                  <span className="text-sm font-medium text-white">Share</span>
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

