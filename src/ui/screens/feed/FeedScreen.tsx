import { useEffect } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { dispatch } from '../../../app/runtime';
import { markFeedRead } from '../../../game/core/notifyActions';
import { FeedList } from '../../components/FeedList';
import { Card, CardHead, EmptyState, PageHeader } from '../../components/ui';
import { HappeningCard, ModifierList } from '../../components/HappeningCard';
import { timeAgo } from '../../components/FeedList';

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
      {s.happenings.open.map((h) => (
        <HappeningCard key={h.id} h={h} />
      ))}
      <ModifierList />
      <Card className="card--flush">
        {entries.length === 0 ? (
          <EmptyState icon={<Bell size={28} />} title="Noch nichts passiert" />
        ) : (
          <FeedList entries={entries} now={s.clock.now} lastReadId={s.notifications.lastReadId} />
        )}
      </Card>
      {s.happenings.log.length > 0 && (
        <Card className="card--flush" testId="happening-log">
          <div style={{ padding: '16px 16px 0' }}>
            <CardHead icon={<Sparkles size={15} />} title="Ereignisse" />
          </div>
          <div className="list">
            {[...s.happenings.log].reverse().slice(0, 20).map((l) => (
              <div key={l.id} className="list__row">
                <div className="grow">
                  <div className="small" style={{ fontWeight: 600 }}>
                    {l.title}
                  </div>
                  <div className="tiny dim">{l.text}</div>
                  {(l.choice || l.result) && (
                    <div className="tiny faint">
                      {l.choice === 'expired' ? 'Keine Reaktion' : l.choice ? `→ ${l.choice}` : ''}
                      {l.result ? ` · ${l.result}` : ''}
                    </div>
                  )}
                </div>
                <span className="tiny faint">{timeAgo(s.clock.now, l.at)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
