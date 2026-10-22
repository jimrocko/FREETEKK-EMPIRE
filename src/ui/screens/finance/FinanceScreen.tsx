import { BarChart3, Coins, Receipt, Repeat, TrendingDown, TrendingUp } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { LEDGER_CATEGORIES } from '../../../game/core/types';
import { fmtMoney } from '../../../game/core/format';
import { gameDayAt } from '../../../game/core/time';
import { CATEGORY_LABELS } from '../../../game/systems/finance/logic';
import { dailyCostLines, economySummary } from '../../../game/selectors';
import { Card, CardHead, EmptyState, PageHeader, Stat } from '../../components/ui';
import { timeAgo } from '../../components/FeedList';

export function FinanceScreen() {
  const s = useGameState();
  const eco = economySummary(s);
  const today = gameDayAt(s.clock, s.clock.now);
  const todayRec = s.finance.days.find((d) => d.day === today);
  const days = s.finance.days.slice(-14);
  const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.income - d.expense)));
  const costs = dailyCostLines(s);
  const ledger = [...s.finance.ledger].reverse().slice(0, 40);
  const totals = LEDGER_CATEGORIES.map((c) => ({ c, t: s.finance.totals[c] })).filter((x) => x.t && (x.t.in > 0 || x.t.out > 0));

  return (
    <div className="page" data-testid="screen-finance">
      <PageHeader title="Finanzen" subtitle="Jede Buchung landet hier – nach Kategorie, pro Spieltag." />

      <div className="grid grid--stats">
        <Stat label="Bargeld" icon={<Coins size={13} />} value={fmtMoney(s.finance.cash)} tone={s.finance.cash < 0 ? 'danger' : 'accent'} />
        <Stat label="Heute rein" icon={<TrendingUp size={13} />} value={fmtMoney(todayRec?.income ?? 0)} sub={`Tag ${today}`} />
        <Stat label="Heute raus" icon={<TrendingDown size={13} />} value={fmtMoney(todayRec?.expense ?? 0)} sub={`Tag ${today}`} />
        <Stat label="Letzte Std" icon={<Receipt size={13} />} value={fmtMoney(eco.lastHourIncome)} sub={`Fixkosten ${fmtMoney(eco.fixedPerDay)}/Tag`} />
      </div>

      <Card>
        <CardHead icon={<BarChart3 size={15} />} title="Gewinn pro Spieltag" />
        {days.length === 0 ? (
          <p className="small dim">Noch keine Buchungen.</p>
        ) : (
          <div className="bars" aria-label="Gewinn pro Spieltag">
            {days.map((d) => {
              const net = d.income - d.expense;
              return (
                <div key={d.day} className="bars__col" title={`Tag ${d.day}: ${fmtMoney(net, { sign: true })}`}>
                  <div className={['bars__bar', net < 0 && 'bars__bar--neg'].filter(Boolean).join(' ')} style={{ height: `${(Math.abs(net) / maxAbs) * 100}%` }} />
                  <div className="bars__label">{d.day}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid--auto">
        <Card>
          <CardHead icon={<Repeat size={15} />} title="Laufende Kosten" right={<span className="small num">{fmtMoney(eco.fixedPerDay)}/Tag</span>} />
          <dl className="kv">
            {costs.map((c) => (
              <Line key={c.id} k={c.label} v={`${fmtMoney(c.perDay)}/Tag`} />
            ))}
          </dl>
          <p className="tiny faint" style={{ marginTop: 10 }}>
            Wird zu Beginn jedes Spieltags abgebucht (ein Spieltag = 24 echte Minuten). Während du weg bist, laufen Fixkosten und passive Einnahmen höchstens 12 Stunden.
          </p>
        </Card>

        <Card>
          <CardHead icon={<BarChart3 size={15} />} title="Summen nach Kategorie" />
          {totals.length === 0 ? (
            <p className="small dim">Noch keine Buchungen.</p>
          ) : (
            <dl className="kv">
              {totals.map(({ c, t }) => (
                <Line key={c} k={CATEGORY_LABELS[c]} v={`+${fmtMoney(t!.in)} / −${fmtMoney(t!.out)}`} />
              ))}
            </dl>
          )}
        </Card>
      </div>

      <Card className="card--flush">
        <div style={{ padding: '16px 16px 0' }}>
          <CardHead icon={<Receipt size={15} />} title="Buchungen" />
        </div>
        {ledger.length === 0 ? (
          <EmptyState title="Noch keine Buchungen" />
        ) : (
          <div className="list">
            {ledger.map((e, i) => (
              <div key={`${e.at}-${i}`} className="list__row">
                <div className="grow">
                  <div className="small" style={{ fontWeight: 600 }}>
                    {e.label}
                  </div>
                  <div className="tiny faint">
                    {CATEGORY_LABELS[e.category]} · {timeAgo(s.clock.now, e.at)}
                  </div>
                </div>
                <span className={`num ${e.amount >= 0 ? 'tone-success' : 'tone-danger'}`} style={{ fontWeight: 700 }}>
                  {fmtMoney(e.amount, { sign: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}
