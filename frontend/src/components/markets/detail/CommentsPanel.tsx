"use client"

import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { MessageCircle } from "lucide-react"
import {
  MarketComment,
  displayName,
  displayHandle,
  relativeTime,
} from "@/lib/verity"

interface CommentsPanelProps {
  commentDraft: string
  comments: MarketComment[]
  loading: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  onReplyClick: (comment: MarketComment) => void
}

export default function CommentsPanel({
  commentDraft,
  comments,
  loading,
  onChange,
  onSubmit,
  onReplyClick,
}: CommentsPanelProps) {
  // Group comments: find all root comments, and map child comments to their parentId
  const commentsTree = useMemo(() => {
    const rootComments: MarketComment[] = []
    const childrenMap = new Map<string, MarketComment[]>()

    comments.forEach((c) => {
      if (c.parentId || c.parent_id) {
        const pId = c.parentId || c.parent_id
        const list = childrenMap.get(pId!) || []
        list.push(c)
        childrenMap.set(pId!, list)
      } else {
        rootComments.push(c)
      }
    })

    // Default newest first sorting for detail page comments
    rootComments.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    return { rootComments, childrenMap }
  }, [comments])

  return (
    <section
      className="scroll-mt-24 border border-border bg-surface p-4 sm:p-5"
      id="comments"
    >
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-accent" />
          <h2 className="font-heading text-xl font-extrabold uppercase tracking-[0.04em] text-charcoal-primary">
            Comments ({comments.length})
          </h2>
        </div>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ash">
          Community
        </span>
      </div>

      <div className="mb-4 flex gap-2">
        <Input
          className="h-11 min-w-0 flex-1 rounded-none border border-border bg-background px-3 text-sm tracking-[-0.18px] text-charcoal-primary shadow-none focus-visible:border-accent focus-visible:ring-0"
          id="market-comment-input"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Add a comment..."
          value={commentDraft}
        />
        <button
          className="h-11 border border-accent bg-accent px-5 font-heading text-base font-extrabold uppercase tracking-[0.06em] text-black transition-colors hover:bg-charcoal-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          disabled={loading || !commentDraft.trim()}
          onClick={onSubmit}
          type="button"
        >
          Post
        </button>
      </div>

      <div className="grid gap-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
        {commentsTree.rootComments.length === 0 ? (
          <div className="border border-dashed border-border px-4 py-8 text-center">
            <p className="font-heading text-lg font-bold uppercase tracking-[0.05em] text-charcoal-primary">
              No comments yet
            </p>
            <p className="mt-1 text-xs text-ash">
              Start the market conversation.
            </p>
          </div>
        ) : (
          commentsTree.rootComments.map((comment) => {
            const replies = commentsTree.childrenMap.get(comment.id) || []
            const sortedReplies = replies.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            )

            return (
              <div key={comment.id} className="flex flex-col gap-2">
                <article className="border border-border bg-surface-muted p-3">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-ash">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-charcoal-primary">
                        {displayName(comment.author)}
                      </span>
                      <span>{displayHandle(comment.author)}</span>
                      <span>{"\u00B7"}</span>
                      <span>{relativeTime(comment.created_at)}</span>
                    </div>
                    <button
                      onClick={() => onReplyClick(comment)}
                      className="font-sans text-xs font-bold uppercase tracking-[0.06em] text-accent hover:underline"
                      type="button"
                    >
                      Reply
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed tracking-[-0.18px] text-graphite whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </article>

                {sortedReplies.map((reply) => (
                  <article
                    className="ml-4 border border-border border-l-4 border-l-accent bg-background p-2.5 sm:ml-8"
                    key={reply.id}
                  >
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-ash">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-charcoal-primary">
                          {displayName(reply.author)}
                        </span>
                        <span>{displayHandle(reply.author)}</span>
                        <span>{"\u00B7"}</span>
                        <span>{relativeTime(reply.created_at)}</span>
                      </div>
                      <button
                        onClick={() => onReplyClick(reply)}
                        className="font-sans text-[11px] font-bold uppercase tracking-[0.06em] text-accent hover:underline"
                        type="button"
                      >
                        Reply
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed tracking-[-0.18px] text-graphite whitespace-pre-wrap">
                      {reply.content}
                    </p>
                  </article>
                ))}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
