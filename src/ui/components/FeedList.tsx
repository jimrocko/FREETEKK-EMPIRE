import type { FeedEntry } from '../../game/core/notify';
import { fmtDuration } from '../../game/core/format';
import { navigate } from '../router';

export function timeAgo(now: number, at: number): string {
  const diff = now - at;
  if (diff < 45_000) return 'gerade eben';
  return `vor ${fmtDuration(diff)}`;
}

export function FeedList({ entries, now, lastReadId = Number.POSITIVE_INFINITY }: { entries: FeedEntry[]; now: number; lastReadId?: number }) {
  return (
    <div className="list">
      {entries.map((e) => (
        <div
          key={e.id}
          className={['feed-item', e.id > lastReadId && 'is-unread'].filter(Boolean).join(' ')}
          onClick={e.link ? () => navigate(e.link!) : undefined}
          style={e.link ? { cursor: 'pointer' } : undefined}
        >
          <span className={`feed-item__dot feed-item__dot--${e.tone}`} />
          <div className="grow">
            <div className="feed-item__title">{e.title}</div>
            {e.text && <div className="feed-item__text">{e.text}</div>}
            <div className="feed-item__time">{timeAgo(now, e.at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
