import { Moon } from 'lucide-react';
import { useApp } from '../../app/store';
import { dismissReport } from '../../app/runtime';
import { fmtDuration, fmtMoney } from '../../game/core/format';
import { FeedList } from '../components/FeedList';
import { Button, Modal, Stat } from '../components/ui';

export function OfflineReportModal() {
  const report = useApp((a) => a.report);
  if (!report) return null;
  const delta = report.cashAfter - report.cashBefore;
  const capped = report.economyMs < report.awayMs;
  const entries = [...report.entries].reverse();
  return (
    <Modal
      title="Willkommen zurück"
      onClose={dismissReport}
      testId="offline-report"
      footer={
        <Button variant="primary" onClick={dismissReport} testId="offline-continue">
          Weiter
        </Button>
      }
    >
      <div className="row">
        <Moon size={22} className="tone-discovery" />
        <strong>Du warst {fmtDuration(report.awayMs)} nicht da.</strong>
      </div>
      <div className="grid grid--2">
        <Stat label="Geld" value={fmtMoney(delta, { sign: true })} tone={delta < 0 ? 'danger' : 'success'} sub={`jetzt ${fmtMoney(report.cashAfter)}`} />
        <Stat label="Spieltage" value={`+${report.daysPassed}`} sub="vergangen" />
      </div>
      {capped && (
        <p className="tiny faint">
          Passive Einnahmen und Fixkosten zählen höchstens {fmtDuration(report.economyMs)}. Laufende Timer sind trotzdem fertig geworden.
        </p>
      )}
      {entries.length > 0 ? (
        <div className="card card--flush" style={{ background: 'var(--card)' }}>
          <FeedList entries={entries} now={report.to} />
        </div>
      ) : (
        <p className="small dim">In der Zwischenzeit ist nichts Besonderes passiert.</p>
      )}
      {report.scene.length > 0 && (
        <div className="stack stack--s" data-testid="offline-scene">
          <strong className="small">In der Szene</strong>
          {report.scene.slice(-5).map((n) => (
            <div key={n.id} className="tiny dim">
              {n.text}
            </div>
          ))}
          {report.scene.length > 5 && <div className="tiny faint">… und {report.scene.length - 5} weitere Meldungen im Szene-Ticker.</div>}
        </div>
      )}
    </Modal>
  );
}
