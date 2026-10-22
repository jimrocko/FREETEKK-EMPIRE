import { useState } from 'react';
import { BarChart3, Coins, HandCoins, Landmark, Receipt, Repeat, TrendingDown, TrendingUp } from 'lucide-react';
import { useGameState } from '../../../app/store';
import { BANK_INTEREST_PER_DAY, LOAN_OFFERS } from '../../../game/content/finance';
import { describeCondition } from '../../../game/core/conditions';
import { deposit, repayLoan, takeLoan, withdraw } from '../../../game/systems/finance/actions';
import { ActionButton } from '../../components/ActionButton';
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
        <Stat label="Konto" icon={<Landmark size={13} />} value={fmtMoney(s.finance.bank)} sub={`+${fmtMoney(s.finance.bank * BANK_INTEREST_PER_DAY)} Zinsen/Tag`} />
        <Stat
          label="Kredite"
          icon={<HandCoins size={13} />}
          value={fmtMoney(s.finance.loans.reduce((sum, l) => sum + l.remaining, 0))}
          sub={s.finance.loans.length > 0 ? `${s.finance.loans.length} laufend` : 'schuldenfrei'}
          tone={s.finance.loans.length > 0 ? 'warning' : undefined}
        />
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
        <BankCard />
        <LoansCard />
      </div>

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

function BankCard() {
  const s = useGameState();
  const [amount, setAmount] = useState(100);
  const presets = [50, 100, 500, 1000, 5000];
  return (
    <Card testId="bank">
      <CardHead icon={<Landmark size={15} />} title="Konto" right={<span className="small num">{fmtMoney(s.finance.bank)}</span>} />
      <p className="tiny faint">
        Geld auf dem Konto bringt {(BANK_INTEREST_PER_DAY * 100).toFixed(2).replace('.', ',')} % Zinsen pro Spieltag und deckt Fixkosten, wenn das Bargeld nicht reicht. Kaufen kannst du nur mit
        Bargeld.
      </p>
      <div className="row row--wrap" style={{ marginTop: 10 }}>
        {presets.map((p) => (
          <button key={p} className={['chip', amount === p && 'is-active'].filter(Boolean).join(' ')} onClick={() => setAmount(p)}>
            {fmtMoney(p)}
          </button>
        ))}
        <input
          type="number"
          min={1}
          step={10}
          value={amount}
          onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          style={{ width: 110, minHeight: 38 }}
          aria-label="Betrag"
          data-testid="bank-amount"
        />
      </div>
      <div className="grid grid--2" style={{ marginTop: 10 }}>
        <ActionButton action={deposit} payload={{ amount }} block testId="bank-deposit">
          Einzahlen
        </ActionButton>
        <ActionButton action={withdraw} payload={{ amount }} block testId="bank-withdraw">
          Abheben
        </ActionButton>
      </div>
    </Card>
  );
}

function LoansCard() {
  const s = useGameState();
  return (
    <Card testId="loans">
      <CardHead icon={<HandCoins size={15} />} title="Kredite" />
      {s.finance.loans.length > 0 && (
        <div className="stack stack--s" style={{ marginBottom: 12 }}>
          {s.finance.loans.map((l) => (
            <div key={l.id} className="stack stack--s">
              <div className="row row--between small">
                <strong>{l.label}</strong>
                <span className="num">noch {fmtMoney(l.remaining)}</span>
              </div>
              <div className="tiny faint">
                {fmtMoney(l.perDay)} pro Spieltag · noch ca. {Math.ceil(l.remaining / l.perDay)} Tage
              </div>
              <ActionButton action={repayLoan} payload={{ loanId: l.id }} small testId={`repay-${l.id}`}>
                Jetzt komplett tilgen ({fmtMoney(l.remaining)})
              </ActionButton>
            </div>
          ))}
          <hr className="divider" />
        </div>
      )}
      <div className="stack stack--s">
        {LOAN_OFFERS.map((o) => (
          <div key={o.id} className="stack stack--s">
            <div className="row row--between small">
              <strong>{o.label}</strong>
              <span className="num">{fmtMoney(o.amount)}</span>
            </div>
            <div className="tiny faint">
              Zurück: {fmtMoney(o.total)} in {o.days} Tagen ({fmtMoney(o.total / o.days)}/Tag)
              {o.requires && o.requires.length > 0 && ` · braucht ${o.requires.map((c) => describeCondition(c)).join(', ')}`}
            </div>
            <ActionButton action={takeLoan} payload={{ offerId: o.id }} small testId={`loan-${o.id}`}>
              Aufnehmen
            </ActionButton>
          </div>
        ))}
      </div>
      <p className="tiny faint" style={{ marginTop: 10 }}>
        Raten werden wie Fixkosten jeden Spieltag abgebucht. Wer im Minus landet, kann nichts mehr kaufen.
      </p>
    </Card>
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
