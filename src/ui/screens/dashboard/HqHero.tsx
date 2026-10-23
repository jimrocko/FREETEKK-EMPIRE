import { Briefcase, Compass, Gem, MapPin, PartyPopper, Sparkles, Users } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { cityDef, repTierFor } from '../../../game/content/registry';
import { fmtCountdown, fmtMoney, fmtNumber } from '../../../game/core/format';
import { gameTimeAt } from '../../../game/core/time';
import { upcomingEvents } from '../../../game/systems/events/plan';
import { jobListings, jobPay, jobPayPerHour } from '../../../game/systems/jobs/logic';
import { cityDistricts, districtState } from '../../../game/systems/map/logic';
import { metPeople } from '../../../game/systems/people/logic';
import { knownSpots } from '../../../game/systems/spots/logic';
import { activitiesByChannel } from '../../../game/systems/activities/logic';
import { collectionCount, flairTier } from '../../../game/systems/lifestyle/logic';
import { LIFESTYLE } from '../../../game/content/lifestyle';
import { CrewEmblem } from '../../components/CrewEmblem';
import { Equalizer } from '../../components/Equalizer';
import { Badge } from '../../components/ui';
import { navigate } from '../../router';

/** The headquarters banner: who you are, where you stand, what's next. */
export function HqHero() {
  const s = useGameState();
  const time = gameTimeAt(s.clock, s.clock.now);
  const rep = repTierFor(s.progression.reputation);
  const name = s.crew.founded ? s.crew.name : s.player.name;
  const city = cityDef(s.map.cityId);
  const next = upcomingEvents(s)[0];
  const running = next?.status === 'running';
  return (
    <section className="hero" data-testid="hq-hero">
      <div className="hero__eq">
        <Equalizer bars={40} speed={running ? 1.6 : 0.5} />
      </div>
      <div className="hero__content">
        <CrewEmblem seed={name} size={86} progress={rep.next ? rep.progress : 1} />
        <div className="grow">
          <div className="hero__kicker">
            Hey {s.player.name} · Tag {time.day} · {time.weekdayName}
          </div>
          <div className="hero__title">{name}</div>
          <div className="hud__tier">
            {rep.tier.name} · {fmtNumber(s.progression.reputation)} Rep{rep.next ? ` / ${fmtNumber(rep.next.min)}` : ''}
          </div>
        </div>
      </div>
      <div className="hero__meta">
        {next ? (
          <Badge tone={running ? 'danger' : 'accent'}>
            {running ? (
              <>
                <span className="pulse-dot" style={{ width: 7, height: 7 }} /> Live: {next.name}
              </>
            ) : (
              <>
                <PartyPopper size={11} /> {next.name} in {fmtCountdown(next.startsAt - s.clock.now)}
              </>
            )}
          </Badge>
        ) : (
          <Badge>
            <PartyPopper size={11} /> Keine Party geplant
          </Badge>
        )}
        <Badge tone="info">
          <MapPin size={11} /> {city.name}
        </Badge>
        {flairTier(s).index > 0 && (
          <Badge tone="discovery">
            <Sparkles size={11} /> {flairTier(s).name}
          </Badge>
        )}
        {s.crew.founded && s.crew.members.length > 0 && (
          <Badge tone="discovery">
            <Users size={11} /> {s.crew.members.length + 1} in der Crew
          </Badge>
        )}
      </div>
    </section>
  );
}

/** Big game-menu tiles for the main things to do. */
export function ActionTiles() {
  const s = useGameState();
  const city = cityDef(s.map.cityId);
  const districts = cityDistricts(s);
  const explored = Math.round(districts.reduce((sum, d) => sum + districtState(s, d.id).explored, 0) / Math.max(1, districts.length));
  const job = activitiesByChannel(s, 'job')[0];
  const best = jobListings(s)
    .filter((l) => l.available)
    .sort((a, b) => jobPayPerHour(b.job) - jobPayPerHour(a.job))[0];
  const exploring = activitiesByChannel(s, 'explore')[0];
  const next = upcomingEvents(s)[0];
  const trip = activitiesByChannel(s, 'leisure')[0];
  const tiles = [
    {
      id: 'jobs',
      label: 'Arbeiten',
      sub: job ? `läuft: ${job.label}` : best ? `${best.job.name} · ${fmtMoney(jobPay(s, best.job))}` : 'Jobs ansehen',
      icon: Briefcase,
      color: 'var(--accent)',
      to: '/jobs',
    },
    {
      id: 'map',
      label: 'Erkunden',
      sub: exploring ? `unterwegs: ${exploring.label}` : `${explored} % von ${city.name} · ${knownSpots(s).length} Spots`,
      icon: Compass,
      color: 'var(--laser)',
      to: '/karte',
    },
    {
      id: 'network',
      label: 'Szene',
      sub: `${metPeople(s).length} Kontakte`,
      icon: Users,
      color: 'var(--accent-2)',
      to: '/netzwerk',
    },
    {
      id: 'party',
      label: 'Party',
      sub: next ? (next.status === 'running' ? 'läuft gerade!' : `${next.name} in ${fmtCountdown(next.startsAt - s.clock.now)}`) : 'Eine Nacht planen',
      icon: PartyPopper,
      color: 'var(--uv)',
      to: '/events',
    },
    {
      id: 'lifestyle',
      label: 'Lifestyle',
      sub: trip ? `unterwegs: ${trip.label}` : `${flairTier(s).name} · ${collectionCount(s)} / ${LIFESTYLE.length} gesammelt`,
      icon: Gem,
      color: '#ffc93d',
      to: '/lifestyle',
      wide: true,
    },
  ];
  return (
    <div className="tiles" data-testid="action-tiles">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <button key={t.id} className={t.wide ? 'tile tile--wide' : 'tile'} style={{ ['--tile' as string]: t.color }} onClick={() => navigate(t.to)} data-testid={`tile-${t.id}`}>
            <span className="tile__icon">
              <Icon size={20} />
            </span>
            <span className="tile__label">{t.label}</span>
            <span className="tile__sub">{t.sub}</span>
            <Icon size={78} className="tile__big" />
          </button>
        );
      })}
    </div>
  );
}
