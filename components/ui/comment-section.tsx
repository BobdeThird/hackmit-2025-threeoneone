"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDistanceToNow } from "date-fns"
import type { Comment } from "@/lib/types"

interface CommentSectionProps {
  postId: string
  comments: Comment[]
}

export function CommentSection({ comments }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("")
  const [localComments, setLocalComments] = useState(comments)

  const handleSubmitComment = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: Date.now().toString(),
      author: "Anonymous User",
      content: newComment,
      createdAt: new Date().toISOString(),
    }

    setLocalComments([...localComments, comment])
    setNewComment("")
  }

  return (
    <div className="border-t border-border/50 bg-card/30">
      <div className="px-4 py-3 space-y-4">
        {/* Existing comments */}
        {localComments.map((comment) => (
          <div key={comment.id} className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">{comment.author}</span>
              <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
            </div>
            <p className="text-base text-card-foreground leading-5">{comment.content}</p>
          </div>
        ))}

        {/* Comment input */}
        <div className="space-y-3 pt-2 border-t border-border/30">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="glass-card border-border/50 bg-input/50 text-foreground placeholder:text-muted-foreground resize-none"
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
              className="glass-button bg-primary hover:bg-primary/90"
              size="sm"
            >
              Post Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
