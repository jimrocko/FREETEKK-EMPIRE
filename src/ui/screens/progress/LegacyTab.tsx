import { useState } from 'react';
import { Crown, History, Sparkles } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { PERKS, SCENARIOS } from '../../../game/content/legacy';
import { fmtNumber } from '../../../game/core/format';
import { buyPerk, retire } from '../../../game/systems/legacy/actions';
import { legacyGain, nextScenarios, perkLevel, retireReason } from '../../../game/systems/legacy/logic';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Banner, Button, Card, CardHead, Modal } from '../../components/ui';
import { navigate } from '../../router';

export function LegacyTab() {
  const s = useGameState();
  const options = nextScenarios(s);
  const [scenarioId, setScenarioId] = useState(options[options.length > 1 ? 1 : 0]?.id ?? 'sc.classic');
  const [name, setName] = useState(s.player.name);
  const [confirm, setConfirm] = useState(false);
  const reason = retireReason(s);
  const gain = legacyGain(s);
  const scenario = SCENARIOS.find((x) => x.id === scenarioId);

  return (
    <div className="dash">
      <div className="stack">
        <Card accent testId="legacy-retire">
          <CardHead icon={<Crown size={15} />} title="Vermächtnis antreten" />
          <p className="small dim">
            Wenn deine Crew groß genug ist, kannst du sie übergeben und ein neues Kapitel beginnen: neuer Start, neue Wege – mit Vermächtnis-Punkten für dauerhafte Vorteile.
            Dein jetziger Spielstand endet dabei.
          </p>
          {reason ? (
            <Banner tone="info">{reason}</Banner>
          ) : (
            <>
              <p className="small" style={{ marginTop: 8 }}>
                Du bekommst <strong className="tone-accent">{gain} Vermächtnis-Punkte</strong>.
              </p>
              <div className="chips" style={{ flexWrap: 'wrap', marginTop: 8 }}>
                {options.map((sc) => (
                  <button key={sc.id} className={['chip', sc.id === scenarioId && 'is-active'].filter(Boolean).join(' ')} onClick={() => setScenarioId(sc.id)} data-testid={`scenario-${sc.id}`}>
                    {sc.name}
                  </button>
                ))}
              </div>
              {scenario && <p className="tiny dim" style={{ marginTop: 6 }}>{scenario.description}</p>}
              <div className="field" style={{ marginTop: 8 }}>
                <label htmlFor="legacy-name">Name im neuen Kapitel</label>
                <input id="legacy-name" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} data-testid="legacy-name" />
              </div>
              <div style={{ marginTop: 10 }}>
                <Button variant="danger" block onClick={() => setConfirm(true)} testId="legacy-open">
                  Crew übergeben …
                </Button>
              </div>
            </>
          )}
        </Card>

        <Card testId="legacy-perks">
          <CardHead icon={<Sparkles size={15} />} title="Dauerhafte Vorteile" right={<Badge tone="accent">{s.legacy.points} Punkte</Badge>} />
          <p className="tiny faint">Gekaufte Vorteile wirken ab dem nächsten Start – in jedem weiteren Kapitel.</p>
          <div className="stack stack--s" style={{ marginTop: 8 }}>
            {PERKS.map((p) => (
              <div key={p.id} className="row row--between" style={{ gap: 12 }}>
                <div className="grow">
                  <div className="small" style={{ fontWeight: 600 }}>
                    {p.name}{' '}
                    <span className="tiny faint">
                      {perkLevel(s, p.id)} / {p.maxLevel}
                    </span>
                  </div>
                  <div className="tiny dim">{p.description}</div>
                </div>
                <ActionButton action={buyPerk} payload={{ perkId: p.id }} small showReason={false} testId={`perk-${p.id}`}>
                  {p.cost} P
                </ActionButton>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="stack">
        <Card>
          <CardHead icon={<History size={15} />} title="Frühere Kapitel" right={<span className="tiny faint">{s.legacy.runs}</span>} />
          {s.legacy.history.length === 0 ? (
            <p className="small dim">Das hier ist dein erstes Kapitel.</p>
          ) : (
            <div className="stack stack--s">
              {[...s.legacy.history].reverse().map((r, i) => (
                <div key={i} className="small">
                  <strong>{r.crew ?? r.name}</strong>{' '}
                  <span className="tiny faint">
                    · {fmtNumber(r.reputation)} Reputation · {r.days} Tage · {r.festivals} Festivals · +{r.gained} Punkte
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      {confirm && (
        <Modal title="Wirklich übergeben?" onClose={() => setConfirm(false)} testId="legacy-confirm">
          <p className="small">
            Dein jetziges Spiel endet. Du startest als <strong>{name.trim() || '…'}</strong> mit „{scenario?.name}“ neu und bekommst {gain} Vermächtnis-Punkte.
          </p>
          <ActionButton
            action={retire}
            payload={{ scenarioId, name }}
            variant="danger"
            block
            onDone={() => {
              setConfirm(false);
              navigate('/');
            }}
            testId="legacy-confirm-button"
          >
            Ja, neues Kapitel beginnen
          </ActionButton>
        </Modal>
      )}
    </div>
  );
}
