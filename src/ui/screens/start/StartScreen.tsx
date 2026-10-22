import { useState } from 'react';
import { Play, Upload } from 'lucide-react';
import { useApp } from '../../../app/store';
import { importGame, startNewGame } from '../../../app/runtime';
import { Banner, Button } from '../../components/ui';
import { navigate } from '../../router';

export function StartScreen() {
  const loadError = useApp((a) => a.loadError);
  const [name, setName] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [code, setCode] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const trimmed = name.trim();
  const nameReason = trimmed.length < 2 ? 'Gib einen Namen mit mindestens 2 Zeichen ein.' : null;

  return (
    <div className="start" data-testid="screen-start">
      <div className="start__inner">
        <div>
          <div className="logo">
            TEKK<span>LIFE</span>
          </div>
          <p className="dim" style={{ marginTop: 16 }}>
            Eine Stadt, 500 € und ein altes Handy. Baue dir ein Netzwerk auf – Spots, Leute, Geräte, Soundsysteme, Partys. Welchen Weg du gehst, entscheidest du.
          </p>
        </div>

        {loadError && <Banner tone="danger">Spielstand konnte nicht geladen werden: {loadError}</Banner>}

        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (nameReason) return;
            navigate('/');
            startNewGame(trimmed);
          }}
        >
          <div className="field">
            <label htmlFor="start-name">Wie nennt man dich in der Szene?</label>
            <input id="start-name" autoComplete="off" maxLength={24} placeholder="z. B. Kalle, Acid Anne, DJ Rost" value={name} onChange={(e) => setName(e.target.value)} data-testid="start-name" />
          </div>
          <Button type="submit" variant="primary" block disabled={!!nameReason} title={nameReason ?? undefined} testId="start-game">
            <Play size={18} /> Neues Spiel starten
          </Button>
          {nameReason && trimmed.length > 0 && <p className="tiny tone-warning">{nameReason}</p>}
        </form>

        <div className="stack">
          {!showImport ? (
            <Button variant="ghost" onClick={() => setShowImport(true)}>
              <Upload size={16} /> Spielstand importieren
            </Button>
          ) : (
            <>
              <textarea placeholder="Export-Code einfügen (TEKKLIFE1:…)" value={code} onChange={(e) => setCode(e.target.value)} />
              {importError && <Banner tone="danger">{importError}</Banner>}
              <Button
                disabled={code.trim().length === 0}
                onClick={() => {
                  const r = importGame(code);
                  if (r.ok) navigate('/');
                  else setImportError(r.reason);
                }}
              >
                Importieren
              </Button>
            </>
          )}
        </div>
        <p className="tiny faint">Alle Namen, Marken und Orte sind frei erfunden.</p>
      </div>
    </div>
  );
}
