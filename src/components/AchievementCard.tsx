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
    <article className="overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-sm" data-testid="achievement-card">
      {coverUrl && (
        <button
          type="button"
          onClick={() => onOpenPhoto(row, 0)}
          className="relative block w-full"
          aria-label={`Open photos for ${achievement.title}`}
        >
          <img src={coverUrl} alt="" className="aspect-[4/3] w-full object-cover" />
          {photos.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
              +{photos.length - 1}
            </span>
          )}
        </button>
      )}
      <div className="flex flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-tight">{achievement.title}</h2>
          <span className="shrink-0 rounded-full bg-accent/15 px-2 py-1 text-xs font-medium">
            {achievement.category}
          </span>
        </div>
        <p className="text-sm opacity-70">
          {formatDate(achievement.date)}
          {subtitle && ` · ${subtitle}`}
        </p>
        {achievement.note && <p className="mt-1 whitespace-pre-wrap text-sm">{achievement.note}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => onEdit(row)} className="min-h-11 rounded-lg px-3 text-sm underline underline-offset-4">
            Edit
          </button>
          <button type="button" onClick={() => onDelete(row)} className="min-h-11 rounded-lg px-3 text-sm text-red-600 underline underline-offset-4">
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}
