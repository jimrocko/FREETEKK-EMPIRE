import { useRef, useState } from 'react';
import { Bug, Copy, Download, FileUp, HardDrive, RotateCcw, Save, Upload, UserRound, Volume2, VolumeX } from 'lucide-react';
import { setSoundEnabled, sfx, soundEnabled } from '../../fx/sound';
import { appStore, useApp, useGameState } from '../../../app/store';
import { debugAdvance, dispatch, importGame, resetGame, saveNow } from '../../../app/runtime';
import { debugMoney, debugNextMessage } from '../../../game/systems/messages/actions';
import { debugHappening } from '../../../game/systems/happenings/actions';
import { DEBUG_ENABLED, addDebugOffset, now } from '../../../app/clock';
import { pushToast } from '../../../app/toasts';
import { exportSave } from '../../../game/save/saveManager';
import { renamePlayer } from '../../../game/systems/progression/actions';
import { fmtDuration } from '../../../game/core/format';
import { MINUTE, HOUR } from '../../../game/core/time';
import { STATE_VERSION } from '../../../game/state';
import { ActionButton } from '../../components/ActionButton';
import { Banner, Button, Card, CardHead, Modal, PageHeader } from '../../components/ui';
import { timeAgo } from '../../components/FeedList';

export function SettingsScreen() {
  const s = useGameState();
  const lastSavedAt = useApp((a) => a.lastSavedAt);
  const saveError = useApp((a) => a.saveError);
  const volatile = useApp((a) => a.volatileStorage);
  const [name, setName] = useState(s.player.name);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const code = () => {
    const game = appStore.getState().game;
    return game ? exportSave(game, now()) : '';
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code());
      pushToast({ tone: 'success', title: 'Export-Code kopiert.' });
    } catch {
      setImportText(code());
      pushToast({ tone: 'info', title: 'Kopieren nicht erlaubt – Code steht im Textfeld unten.' });
    }
  };

  const download = () => {
    const blob = new Blob([code()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tekklife-${s.player.name.replace(/[^a-z0-9]+/gi, '_')}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const doImport = (text: string) => {
    const res = importGame(text);
    if (res.ok) {
      setImportText('');
      setImportError(null);
      pushToast({ tone: 'success', title: 'Spielstand importiert.' });
    } else {
      setImportError(res.reason);
    }
  };

  return (
    <div className="page" data-testid="screen-settings">
      <PageHeader title="Einstellungen" subtitle={`TEKK LIFE · Spielstand-Version ${STATE_VERSION}`} />

      <Card>
        <CardHead icon={<UserRound size={15} />} title="Spieler" />
        <div className="field">
          <label htmlFor="player-name">Dein Szene-Name</label>
          <input id="player-name" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        </div>
        <div style={{ marginTop: 12 }}>
          <ActionButton action={renamePlayer} payload={{ name }}>
            Name speichern
          </ActionButton>
        </div>
      </Card>

      <SoundCard />

      <Card>
        <CardHead icon={<HardDrive size={15} />} title="Spielstand" />
        <div className="stack">
          {volatile && <Banner tone="danger">Dein Browser erlaubt keinen dauerhaften Speicher (privater Modus?). Sichere deinen Fortschritt per Export.</Banner>}
          {saveError && <Banner tone="danger">{saveError}</Banner>}
          <p className="small dim">
            Das Spiel speichert automatisch alle 10 Sekunden und beim Schließen. Zuletzt gespeichert: {lastSavedAt ? timeAgo(now(), lastSavedAt) : 'noch nie'}. Gesamte Spielzeit: {fmtDuration(s.meta.playTimeMs)}.
          </p>
          <div className="row row--wrap">
            <Button
              onClick={() => {
                if (saveNow()) pushToast({ tone: 'success', title: 'Gespeichert.' });
              }}
              testId="save-now"
            >
              <Save size={16} /> Jetzt speichern
            </Button>
            <Button onClick={copyCode}>
              <Copy size={16} /> Export-Code kopieren
            </Button>
            <Button onClick={download}>
              <Download size={16} /> Als Datei sichern
            </Button>
          </div>
          <p className="tiny faint">Tipp: Browser auf dem iPhone löschen Website-Daten manchmal nach längerer Pause. Ein Export als Datei ist die sicherste Sicherung.</p>
        </div>
      </Card>

      <Card>
        <CardHead icon={<Upload size={15} />} title="Spielstand importieren" />
        <div className="stack">
          <textarea placeholder="Export-Code hier einfügen (beginnt mit TEKKLIFE1:)" value={importText} onChange={(e) => setImportText(e.target.value)} data-testid="import-text" />
          {importError && <Banner tone="danger">{importError}</Banner>}
          <div className="row row--wrap">
            <Button variant="primary" disabled={importText.trim().length === 0} onClick={() => doImport(importText)} title={importText.trim() ? undefined : 'Erst einen Code einfügen'}>
              <Upload size={16} /> Code importieren
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <FileUp size={16} /> Datei wählen
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.json,text/plain"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) doImport(await file.text());
                e.target.value = '';
              }}
            />
          </div>
          <p className="tiny faint">Der Import ersetzt deinen aktuellen Spielstand. Exportiere vorher, wenn du ihn behalten willst.</p>
        </div>
      </Card>

      <Card>
        <CardHead icon={<RotateCcw size={15} />} title="Neu anfangen" />
        <p className="small dim" style={{ marginBottom: 12 }}>
          Löscht den Spielstand auf diesem Gerät unwiderruflich (auch das Backup).
        </p>
        <Button variant="danger" onClick={() => setConfirmReset(true)} testId="reset-open">
          Spielstand löschen
        </Button>
      </Card>

      {DEBUG_ENABLED && (
        <Card>
          <CardHead icon={<Bug size={15} />} title="Entwickler: Zeit vorspulen" />
          <p className="tiny faint" style={{ marginBottom: 12 }}>
            Nur in Entwicklungs-Builds sichtbar. Spult die Spielzeit vor, um Timer und Offline-Fortschritt zu testen.
          </p>
          <div className="row row--wrap">
            {[
              ['+1 Min', MINUTE],
              ['+10 Min', 10 * MINUTE],
              ['+1 Std', HOUR],
              ['+8 Std', 8 * HOUR],
            ].map(([label, ms]) => (
              <Button key={label as string} small onClick={() => debugAdvance(ms as number, addDebugOffset)} testId={`debug-${label}`}>
                {label}
              </Button>
            ))}
            <Button small onClick={() => dispatch(debugNextMessage, {}, { silent: true })} testId="debug-message">
              Nachricht auslösen
            </Button>
            <Button small onClick={() => dispatch(debugMoney, { amount: 5000 }, { silent: true })} testId="debug-money">
              +5.000 €
            </Button>
            <Button small onClick={() => dispatch(debugHappening, {}, { silent: true })} testId="debug-happening">
              Ereignis auslösen
            </Button>
          </div>
        </Card>
      )}

      {confirmReset && (
        <Modal
          title="Wirklich neu anfangen?"
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <Button onClick={() => setConfirmReset(false)}>Abbrechen</Button>
              <Button
                variant="danger"
                testId="reset-confirm"
                onClick={() => {
                  setConfirmReset(false);
                  resetGame();
                }}
              >
                Löschen
              </Button>
            </>
          }
        >
          <p>Dein gesamter Fortschritt auf diesem Gerät geht verloren. Das lässt sich nicht rückgängig machen.</p>
        </Modal>
      )}
    </div>
  );
}

function SoundCard() {
  const [on, setOn] = useState(soundEnabled());
  return (
    <Card testId="sound-settings">
      <CardHead icon={on ? <Volume2 size={15} /> : <VolumeX size={15} />} title="Sound" />
      <p className="small dim">Kleine Klicks, Münzen und eine Acid-Fanfare bei großen Momenten – alles synthetisch erzeugt.</p>
      <div style={{ marginTop: 10 }}>
        <Button
          variant={on ? 'primary' : 'default'}
          onClick={() => {
            setSoundEnabled(!on);
            setOn(!on);
            if (!on) sfx.ok();
          }}
          testId="sound-toggle"
        >
          {on ? 'Sound an' : 'Sound aus'}
        </Button>
      </div>
    </Card>
  );
}
