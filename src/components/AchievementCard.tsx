import { useObjectUrl } from '../hooks/useObjectUrl'
import { formatDate } from '../lib/dates'
import type { AchievementWithPhotos } from '../lib/types'

interface Props {
  row: AchievementWithPhotos
  onEdit: (row: AchievementWithPhotos) => void
  onDelete: (row: AchievementWithPhotos) => void
  onOpenPhoto: (row: AchievementWithPhotos, index: number) => void
}

export default function AchievementCard({ row, onEdit, onDelete, onOpenPhoto }: Props) {
  const { achievement, photos } = row
  const coverUrl = useObjectUrl(photos[0]?.blob)
  const subtitle = [achievement.organisation, achievement.result].filter(Boolean).join(' · ')

  return (
    <article className="overflow-hidden rounded-3xl bg-surface shadow-card ring-1 ring-ink/5" data-testid="achievement-card">
      {coverUrl && (
        <button
          type="button"
          onClick={() => onOpenPhoto(row, 0)}
          className="relative block w-full"
          aria-label={`Open photos for ${achievement.title}`}
        >
          <img src={coverUrl} alt="" className="aspect-[4/3] w-full object-cover" />
          {photos.length > 1 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              +{photos.length - 1}
            </span>
          )}
        </button>
      )}
      <div className="flex flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-snug tracking-tight">{achievement.title}</h2>
          <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent-ink">
            {achievement.category}
          </span>
        </div>
        <p className="text-sm text-ink/60">
          {formatDate(achievement.date)}
          {subtitle && ` · ${subtitle}`}
        </p>
        {achievement.note && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{achievement.note}</p>}
        <div className="mt-2 flex justify-end gap-1 border-t border-ink/5 pt-2">
          <button
            type="button"
            onClick={() => onEdit(row)}
            className="min-h-11 rounded-xl px-3.5 text-sm font-medium text-ink/70 transition-colors active:bg-ink/5"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(row)}
            className="min-h-11 rounded-xl px-3.5 text-sm font-medium text-red-600 transition-colors active:bg-red-600/10"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}
