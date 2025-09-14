"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { PostDetailView } from "@/components/ui/post-detail-view"
import type { Post } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"
import { getUserVoteForPost } from "@/lib/vote-persistence"
// import { getClientId } from "@/lib/client-id"

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const postId = params.id as string
    ;(async () => {
      try {
        // 1) Fetch report from Supabase
        const { data: report, error: repErr } = await supabase
          .from('report_ranked')
          .select('id, street_address, city, description, reported_time, images, upvotes, downvotes')
          .eq('id', postId)
          .maybeSingle()

        if (repErr) throw repErr
        if (!report) {
          setPost(null)
          setLoading(false)
          return
        }

        // 2) Fetch comments via API (bypass RLS)
        const comRes = await fetch(`/api/comments?report_id=${encodeURIComponent(postId)}`, { cache: 'no-store' })
        const comJson = await comRes.json()
        if (!comRes.ok) throw new Error(comJson?.error || 'comments failed')
        const flatComments = comJson.items

        // 3) Build nested comment tree
        type CommentNode = {
          id: string
          author: string
          content: string
          createdAt: string
          children?: CommentNode[]
        }

        const byId = new Map<string, CommentNode>()
        const roots: CommentNode[] = []
        for (const c of flatComments || []) {
          byId.set(c.id as string, {
            id: c.id as string,
            author: (c.author_name as string) || 'Anonymous',
            content: c.content as string,
            createdAt: c.created_at as string,
            children: [],
          })
        }
        for (const c of flatComments || []) {
          const node = byId.get(c.id as string)!
          const parentId = c.parent_comment_id as string | null
          if (parentId && byId.has(parentId)) {
            byId.get(parentId)!.children!.push(node)
          } else {
            roots.push(node)
          }
        }

        // 4) Map report to Post shape expected by PostDetailView
        const mapped: Post = {
          id: report.id as string,
          description: (report.description as string) || '',
          location: (report.street_address as string) || '',
          city: (report.city as string) as Post['city'],
          imageUrl: Array.isArray(report.images) && report.images.length > 0 ? (report.images[0] as string) : undefined,
          upvotes: (report.upvotes as number) ?? 0,
          downvotes: (report.downvotes as number) ?? 0,
          userVote: getUserVoteForPost(report.id as string),
          createdAt: report.reported_time as string,
          comments: roots,
        }

        setPost(mapped)
      } catch (e) {
        console.error('Failed to load post', e)
        setPost(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [params.id])

  // Vote handling is now managed internally by PostDetailView component

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading post...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">Post not found</h1>
              <p className="text-muted-foreground">The post you&apos;re looking for doesn&apos;t exist.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header with back button */}
        <div className="mb-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        {/* Post detail view */}
        <PostDetailView post={post} />
      </div>
    </div>
  )
}

