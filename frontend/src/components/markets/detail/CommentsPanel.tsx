"use client"

import { useMemo } from "react"
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
    <section className="verity-card p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-ash" />
        <h2 className="font-semibold tracking-[-0.18px] text-charcoal-primary">
          Comments ({comments.length})
        </h2>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          className="h-11 min-w-0 flex-1 rounded-[10px] bg-white-surface px-3 text-sm tracking-[-0.18px] text-charcoal-primary shadow-subtle outline-none placeholder:text-ash focus:ring-2 focus:ring-stone-surface"
          id="market-comment-input"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Add a comment..."
          value={commentDraft}
        />
        <button
          className="verity-pill h-11 bg-inverse px-4 text-sm font-semibold tracking-[-0.18px] text-inverse-text transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={loading || !commentDraft.trim()}
          onClick={onSubmit}
          type="button"
        >
          Post
        </button>
      </div>

      <div className="grid gap-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
        {commentsTree.rootComments.length === 0 ? (
          <p className="text-sm text-ash">No comments yet.</p>
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
                <article className="rounded-[10px] bg-parchment-card p-3 shadow-subtle">
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
                      className="text-sky-blue hover:underline font-semibold font-sans text-xs"
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
                    className="ml-6 rounded-[10px] bg-parchment-card/60 p-2.5 shadow-subtle border-l-2 border-sky-blue/35"
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
                        className="text-sky-blue hover:underline font-semibold font-sans text-[11px]"
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
