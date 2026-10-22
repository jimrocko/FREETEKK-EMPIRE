import { useEffect } from 'react';
import { Clock, UserRound } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { dispatch } from '../../../app/runtime';
import { personDef, templateDef } from '../../../game/content/registry';
import { fmtCountdown } from '../../../game/core/format';
import { answer, markThreadRead } from '../../../game/systems/messages/actions';
import { choiceReason } from '../../../game/systems/messages/logic';
import { displayName } from '../../../game/systems/people/logic';
import { ActionButton } from '../../components/ActionButton';
import { Button, Modal } from '../../components/ui';
import { timeAgo } from '../../components/FeedList';
import { navigate } from '../../router';
import { Avatar } from './Avatar';

export function ChatView({ personId, onClose }: { personId: string; onClose: () => void }) {
  const s = useGameState();
  const def = personDef(personId);
  const msgs = s.messages.list.filter((m) => m.from === personId);
  const unread = msgs.some((m) => !m.read && !m.mine);

  useEffect(() => {
    if (unread) dispatch(markThreadRead, { personId }, { silent: true });
  }, [unread, personId]);

  return (
    <Modal
      title={
        <span className="row">
          <Avatar def={def} /> {displayName(def)}
        </span>
      }
      onClose={onClose}
      testId="chat"
      footer={
        <Button
          onClick={() => {
            onClose();
            navigate(`/netzwerk/person/${personId}`);
          }}
        >
          <UserRound size={16} /> Profil
        </Button>
      }
    >
      {msgs.length === 0 && <p className="dim small">Noch keine Nachrichten.</p>}
      <div className="chat">
        {msgs.map((m) => {
          const t = m.templateId ? templateDef(m.templateId) : null;
          return (
            <div key={m.id} className="stack stack--s">
              <div className={['bubble', m.mine && 'bubble--mine', m.open && 'bubble--open'].filter(Boolean).join(' ')}>
                {m.text}
                <span className="bubble__time">
                  {timeAgo(s.clock.now, m.at)}
                  {m.resolved === 'expired' && ' · nicht beantwortet'}
                </span>
              </div>
              {m.open && t?.choices && (
                <div className="choices" data-testid="choices">
                  {m.expiresAt !== undefined && (
                    <div className="tiny tone-warning row">
                      <Clock size={12} /> Antwort erwartet in {fmtCountdown(m.expiresAt - s.clock.now)}
                    </div>
                  )}
                  {t.choices.map((c) => (
                    <ActionButton key={c.id} action={answer} payload={{ messageId: m.id, choiceId: c.id }} block variant={c === t.choices![0] ? 'primary' : 'default'} testId={`choice-${c.id}`}>
                      {c.label}
                    </ActionButton>
                  ))}
                  <Button variant="ghost" block onClick={onClose}>
                    Später antworten
                  </Button>
                  {t.choices.every((c) => choiceReason(s, m, c.id)) && <p className="tiny faint">Gerade kannst du keine Antwort geben.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
