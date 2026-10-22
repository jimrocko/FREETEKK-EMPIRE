import { SKILLS } from '../../game/core/types';
import { SKILL_DEFS } from '../../game/content/skills';
import { skillProgress } from '../../game/systems/progression/logic';
import { fmtNumber } from '../../game/core/format';
import { useGameState } from '../../app/store';
import { ProgressBar } from './ui';

export function SkillList({ detailed }: { detailed?: boolean }) {
  const s = useGameState();
  return (
    <div className="stack">
      {SKILLS.map((id) => {
        const p = skillProgress(s, id);
        const def = SKILL_DEFS[id];
        return (
          <div key={id} className={`skill skill--${id}`} data-testid={`skill-${id}`}>
            <div className="row row--between">
              <div>
                <strong>{def.name}</strong> <span className="tiny faint">· Weg: {def.path}</span>
              </div>
              <span className="skill__lvl">Lv. {p.level}</span>
            </div>
            <ProgressBar value={p.progress} thin label={def.name} />
            <div className="row row--between tiny faint">
              <span>{detailed ? def.description : ''}</span>
              <span className="num" style={{ whiteSpace: 'nowrap' }}>
                {fmtNumber(p.into)} / {fmtNumber(p.span)} XP
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
