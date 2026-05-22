'use client'

import { Heart, MessageCircle, Repeat2, Share } from 'lucide-react'

export interface PostCardProps {
  name: string
  handle: string
  time: string
  content: string
  likes: number
  comments: number
  reshares: number
  liked?: boolean
  reshared?: boolean
  onComment?: () => void
  onLike?: () => void
  onReshare?: () => void
  onShare?: () => void
  avatarColor?: string
}

export default function PostCard({
  name,
  handle,
  time,
  content,
  likes,
  comments,
  reshares,
  liked = false,
  reshared = false,
  onComment,
  onLike,
  onReshare,
  onShare,
  avatarColor = 'bg-sunburst-yellow',
}: PostCardProps) {
  return (
    <article className="verity-card verity-card-hover flex cursor-pointer gap-4 p-5">
      <div className="shrink-0">
        <div className={`verity-blob h-10 w-10 ${avatarColor}`}>
          <span className="verity-blob-smile" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5 text-sm">
          <span className="truncate font-semibold tracking-[-0.18px] text-charcoal-primary hover:underline">
            {name}
          </span>
          <span className="truncate font-mono text-xs text-ash">
            {handle}
          </span>
          <span className="text-ash">{'\u00B7'}</span>
          <span className="font-mono text-xs text-ash hover:underline">
            {time}
          </span>
        </div>

        <p className="mb-4 whitespace-pre-wrap text-[15px] leading-[1.47] tracking-[-0.2px] text-graphite">
          {content}
        </p>

        <div className="flex max-w-[360px] items-center justify-between border-t border-dashed border-stone-surface pt-2 text-ash">
          <button
            aria-label="Comment"
            className="group flex items-center gap-2 transition-colors hover:text-foreground"
            onClick={onComment}
            type="button"
          >
            <span className="rounded-full p-2 transition-colors group-hover:bg-surface-hover">
              <MessageCircle className="h-4 w-4" />
            </span>
            <span className="text-xs">{comments}</span>
          </button>

          <button
            aria-label="Reshare"
            aria-pressed={reshared}
            className={`group flex items-center gap-2 transition-colors hover:text-foreground ${reshared ? 'text-meadow-green' : ''}`}
            onClick={onReshare}
            type="button"
          >
            <span className="rounded-full p-2 transition-colors group-hover:bg-surface-hover">
              <Repeat2 className="h-4 w-4" />
            </span>
            <span className="text-xs">{reshares}</span>
          </button>

          <button
            aria-label="Like"
            aria-pressed={liked}
            className={`group flex items-center gap-2 transition-colors hover:text-ember-orange ${liked ? 'text-ember-orange' : ''}`}
            onClick={onLike}
            type="button"
          >
            <span className="rounded-full p-2 transition-colors group-hover:bg-ember-orange/10">
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
            </span>
            <span className="text-xs">{likes}</span>
          </button>

          <button
            aria-label="Share"
            className="group flex items-center gap-2 transition-colors hover:text-foreground"
            onClick={onShare}
            type="button"
          >
            <span className="rounded-full p-2 transition-colors group-hover:bg-surface-hover">
              <Share className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </article>
  )
}
