import { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { dispatch } from '../../../app/runtime';
import { markFeedRead } from '../../../game/core/notifyActions';
import { FeedList } from '../../components/FeedList';
import { Card, EmptyState, PageHeader } from '../../components/ui';

export function FeedScreen() {
  const s = useGameState();
  const entries = [...s.notifications.feed].reverse();
  const unread = s.notifications.feed.some((e) => e.id > s.notifications.lastReadId);
  // Opening the feed marks everything as read (after it was shown once).
  useEffect(() => {
    if (!unread) return;
    const t = setTimeout(() => dispatch(markFeedRead, {}, { silent: true }), 1500);
    return () => clearTimeout(t);
  }, [unread]);

  return (
    <div className="page" data-testid="screen-feed">
      <PageHeader title="Neuigkeiten" subtitle="Alles, was passiert ist – auch während du weg warst." />
      <Card className="card--flush">
        {entries.length === 0 ? (
          <EmptyState icon={<Bell size={28} />} title="Noch nichts passiert" />
        ) : (
          <FeedList entries={entries} now={s.clock.now} lastReadId={s.notifications.lastReadId} />
        )}
      </Card>
    </div>
  );
}
