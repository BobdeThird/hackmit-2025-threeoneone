"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDistanceToNow } from "date-fns"
import type { Comment } from "@/lib/types"
// Using API routes to bypass RLS via server admin client

interface CommentSectionProps {
  postId: string
  comments: Comment[]
  onAdded?: (comment: Comment) => void
}

export function CommentSection({ postId, comments, onAdded }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("")
  const [localComments, setLocalComments] = useState(comments)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return
    setSubmitting(true)
    try {
      const content = newComment.trim()
      const author = "Anonymous User"

      const res = await fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ report_id: postId, content, author_name: author }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'comment failed')
      const item = json.item
      const saved: Comment = {
        id: String(item.id),
        author: (item.author_name as string) || author,
        content: item.content as string,
        createdAt: item.created_at as string,
      }

      setLocalComments([...localComments, saved])
      onAdded?.(saved)
      setNewComment("")
    } catch (err) {
      console.error('Failed to submit comment', err)
    } finally {
      setSubmitting(false)
    }
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
              disabled={!newComment.trim() || submitting}
              className="glass-button bg-primary hover:bg-primary/90"
              size="sm"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
