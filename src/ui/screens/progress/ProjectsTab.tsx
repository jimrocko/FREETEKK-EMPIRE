import { Check, Disc3, Hammer, Timer } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { PROJECTS, type ProjectDef } from '../../../game/content/projects';
import { describeCondition } from '../../../game/core/conditions';
import { fmtCountdown, fmtDuration, fmtMoney, fmtNumber } from '../../../game/core/format';
import { hasFlag } from '../../../game/systems/progression/logic';
import { needsUnlock } from '../../../game/systems/progression/tree';
import { projectState, stageCost } from '../../../game/systems/projects/logic';
import { RELEASE_COST, RELEASE_MINUTES, releaseCandidates, releaseEP, startProjectStage } from '../../../game/systems/projects/actions';
import { ActionButton } from '../../components/ActionButton';
import { Badge, Banner, Card, CardHead, ProgressBar } from '../../components/ui';

function ProjectCard({ def }: { def: ProjectDef }) {
  const s = useGameState();
  const st = projectState(s, def.id);
  const locked = needsUnlock(s, def.unlock);
  const finished = !def.repeatable && st.completed > 0;
  return (
    <Card accent={!locked && !finished} testId={`project-${def.id}`}>
      <CardHead
        icon={<Hammer size={15} />}
        title={def.name}
        right={finished ? <Badge tone="success">Fertig</Badge> : def.repeatable && st.completed > 0 ? <Badge tone="accent">{st.completed}. Ausgabe vorbei</Badge> : undefined}
      />
      <p className="small dim">{def.description}</p>
      <p className="tiny" style={{ marginTop: 6 }}>
        <strong>Ergebnis:</strong> {def.reward}
      </p>
      {locked ? (
        <Banner tone="info">{locked}</Banner>
      ) : (
        <div className="stack stack--s" style={{ marginTop: 10 }}>
          {def.stages.map((stage, i) => {
            const done = finished || i < st.stage;
            const running = st.running?.stage === i ? st.running : undefined;
            const next = !finished && !st.running && i === st.stage;
            return (
              <div key={stage.id} className="stack stack--s" style={{ opacity: done || running || next ? 1 : 0.55 }}>
                <div className="row row--between small">
                  <span className="row">
                    {done ? <Check size={14} className="tone-success" /> : running ? <Timer size={14} className="tone-accent" /> : <span style={{ width: 14 }} />}
                    <strong>{stage.name}</strong>
                  </span>
                  <span className="tiny faint num">
                    {stageCost(s, def, i) > 0 ? fmtMoney(stageCost(s, def, i)) : 'kostenlos'} · {fmtDuration(stage.minutes * 60_000)}
                  </span>
                </div>
                {(running || next) && <div className="tiny dim">{stage.description}</div>}
                {next && stage.requires?.length ? <div className="tiny faint">Braucht: {stage.requires.map((c) => describeCondition(c)).join(', ')}</div> : null}
                {running && (
                  <>
                    <ProgressBar value={(s.clock.now - running.startedAt) / (running.endsAt - running.startedAt)} running label={stage.name} />
                    <div className="tiny faint">noch {fmtCountdown(Math.max(0, running.endsAt - s.clock.now))} – läuft auch, wenn du etwas anderes machst</div>
                  </>
                )}
                {next && (
                  <ActionButton action={startProjectStage} payload={{ projectId: def.id }} small testId={`stage-${def.id}`}>
                    {stage.name} starten
                  </ActionButton>
                )}
              </div>
            );
          })}
        </div>
      )}
      {st.lastResult && (
        <p className="small" style={{ marginTop: 10 }}>
          Letzte Ausgabe: {fmtNumber(st.lastResult.visitors)} Leute · Stimmung {st.lastResult.mood} · {fmtMoney(st.lastResult.revenue - st.lastResult.costs, { sign: true })} · +
          {fmtNumber(st.lastResult.rep)} Reputation
        </p>
      )}
    </Card>
  );
}

function LabelCard() {
  const s = useGameState();
  if (!hasFlag(s, 'label')) return null;
  const tracks = releaseCandidates(s);
  return (
    <Card testId="label">
      <CardHead icon={<Disc3 size={15} />} title="Dein Label" right={<Badge>{s.progression.stats.releases ?? 0} EPs</Badge>} />
      <p className="small dim">Drei unveröffentlichte Tracks werden eine EP: Verkäufe, Reputation und mehr Streams. Jede EP bringt laufende Katalog-Einnahmen.</p>
      {tracks.length > 0 && <p className="tiny faint">Nächste EP: {tracks.map((t) => `${t.name} (${t.score})`).join(', ')}</p>}
      <div style={{ marginTop: 10 }}>
        <ActionButton action={releaseEP} payload={{}} testId="release-ep">
          EP veröffentlichen ({fmtMoney(RELEASE_COST)}, {RELEASE_MINUTES} Min)
        </ActionButton>
      </div>
    </Card>
  );
}

export function ProjectsTab() {
  return (
    <div className="stack">
      <p className="small dim">Großprojekte laufen in Etappen über Stunden im Hintergrund – du machst derweil alles andere weiter.</p>
      <LabelCard />
      <div className="grid grid--auto">
        {PROJECTS.map((p) => (
          <ProjectCard key={p.id} def={p} />
        ))}
      </div>
    </div>
  );
}
