import { useState } from 'react';
import { BarChart2, Gauge, Star, Target } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { fmtDuration, fmtMoney, fmtNumber } from '../../../game/core/format';
import { REP_TIERS } from '../../../game/content/reputation';
import { repTierFor } from '../../../game/content/registry';
import type { GoalSize } from '../../../game/content/types';
import { GOAL_SIZE_LABELS, activeGoals, completedGoals } from '../../../game/systems/goals/logic';
import { stat } from '../../../game/systems/progression/logic';
import { GoalCard } from '../../components/GoalCard';
import { SkillList } from '../../components/SkillList';
import { Badge, Card, CardHead, PageHeader, ProgressBar, Tabs } from '../../components/ui';
import { navigate, useRoute } from '../../router';
import { availableUnlocks } from '../../../game/systems/progression/tree';
import { TreeTab } from './TreeTab';
import { ProjectsTab } from './ProjectsTab';
import { LegacyTab } from './LegacyTab';

const SIZES: GoalSize[] = ['small', 'medium', 'large', 'long'];

type ProgressTab = 'ziele' | 'baum' | 'projekte' | 'vermaechtnis';
const TAB_PATHS: Record<string, ProgressTab> = { baum: 'baum', projekte: 'projekte', vermaechtnis: 'vermaechtnis' };

export function ProgressScreen() {
  const s = useGameState();
  const sub = useRoute().split('/')[2];
  const tab: ProgressTab = TAB_PATHS[sub ?? ''] ?? 'ziele';
  const available = availableUnlocks(s).length;
  return (
    <div className="page" data-testid="screen-progress">
      <PageHeader title="Fortschritt" subtitle="Fähigkeiten öffnen Wege, Reputation öffnet Türen, Ziele zeigen die nächsten Schritte." />
      <Tabs<ProgressTab>
        value={tab}
        onChange={(t) => navigate(t === 'ziele' ? '/fortschritt' : `/fortschritt/${t}`)}
        tabs={[
          { id: 'ziele', label: 'Ziele' },
          { id: 'baum', label: 'Freischaltungen', count: available || undefined },
          { id: 'projekte', label: 'Projekte' },
          { id: 'vermaechtnis', label: 'Vermächtnis' },
        ]}
      />
      {tab === 'ziele' && <GoalsTab />}
      {tab === 'baum' && <TreeTab />}
      {tab === 'projekte' && <ProjectsTab />}
      {tab === 'vermaechtnis' && <LegacyTab />}
    </div>
  );
}

function GoalsTab() {
  const s = useGameState();
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const rep = repTierFor(s.progression.reputation);
  const active = activeGoals(s);
  const done = completedGoals(s);

  return (
    <>
      <div className="dash">
        <div className="stack">
          <Card>
            <CardHead icon={<Target size={15} />} title="Ziele" />
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'active', label: 'Offen', count: active.length },
                { id: 'done', label: 'Erledigt', count: done.length },
              ]}
            />
            <div className="stack" style={{ marginTop: 16 }}>
              {tab === 'active' &&
                SIZES.map((size) => {
                  const list = active.filter((g) => g.size === size);
                  if (list.length === 0) return null;
                  return (
                    <div key={size} className="stack">
                      <div className="tiny upper faint">{GOAL_SIZE_LABELS[size]}</div>
                      {list.map((g) => (
                        <div key={g.id} className="card" style={{ background: 'var(--card-2)' }}>
                          <GoalCard goal={g} />
                        </div>
                      ))}
                    </div>
                  );
                })}
              {tab === 'active' && active.length === 0 && <p className="small dim">Keine offenen Ziele – neue tauchen mit deinem Fortschritt auf.</p>}
              {tab === 'done' && done.length === 0 && <p className="small dim">Noch keine Ziele erreicht.</p>}
              {tab === 'done' &&
                done.map((g) => (
                  <div key={g.id} className="card" style={{ background: 'var(--card-2)' }}>
                    <GoalCard goal={g} compact />
                  </div>
                ))}
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card>
            <CardHead icon={<Star size={15} />} title="Reputation" right={<Badge tone="accent">{fmtNumber(s.progression.reputation)}</Badge>} />
            <div className="stack stack--s">
              {REP_TIERS.map((t, i) => {
                const reached = i <= rep.index;
                const isNext = i === rep.index + 1;
                const hidden = i > rep.index + 2;
                return (
                  <div key={t.id} className="stack stack--s" style={{ opacity: reached ? 1 : 0.55 }}>
                    <div className="row row--between small">
                      <span style={{ fontWeight: i === rep.index ? 800 : 500 }} className={i === rep.index ? 'tone-accent' : undefined}>
                        {hidden ? '???' : t.name}
                      </span>
                      <span className="num faint">{fmtNumber(t.min)}</span>
                    </div>
                    {isNext && <ProgressBar value={rep.progress} thin label="Fortschritt zur nächsten Stufe" />}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHead icon={<Gauge size={15} />} title="Fähigkeiten" />
            <SkillList detailed />
          </Card>

          <Card>
            <CardHead icon={<BarChart2 size={15} />} title="Statistik" />
            <dl className="kv">
              <dt>Spielzeit</dt>
              <dd>{fmtDuration(s.meta.playTimeMs)}</dd>
              <dt>Jobs erledigt</dt>
              <dd>{fmtNumber(stat(s, 'jobsDone'))}</dd>
              <dt>Insgesamt verdient</dt>
              <dd>{fmtMoney(stat(s, 'moneyEarned'))}</dd>
              <dt>Insgesamt ausgegeben</dt>
              <dd>{fmtMoney(stat(s, 'moneySpent'))}</dd>
              <dt>Items gekauft / verkauft</dt>
              <dd>
                {fmtNumber(stat(s, 'itemsBought'))} / {fmtNumber(stat(s, 'itemsSold'))}
              </dd>
              <dt>Erfolgreich verhandelt</dt>
              <dd>{fmtNumber(stat(s, 'haggleWins'))}</dd>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
