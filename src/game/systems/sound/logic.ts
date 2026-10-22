import type { GameState } from '../../state';
import type { ItemDef } from '../../content/types';
import { ITEMS } from '../../content/registry';
import { fmtNumber } from '../../core/format';
import type { ItemInstance } from '../inventory/state';
import type { SoundSystem } from './state';

/** Item types that can be part of a sound system. */
export const SYSTEM_TYPES = ['top', 'sub', 'amp', 'controller', 'cables', 'case', 'generator', 'light', 'dj-mixer'] as const;

export function isSystemPart(def: ItemDef | undefined): boolean {
  return !!def && (SYSTEM_TYPES as readonly string[]).includes(def.type);
}

export interface SystemStats {
  /** Rated speaker power (W). */
  powerW: number;
  /** 0–100 */
  quality: number;
  /** People it can cover with good sound. */
  reach: number;
  /** 0–100: chance that nothing fails during a night. */
  reliability: number;
  setupMin: number;
  volumeL: number;
  weightKg: number;
  /** Electricity needed (kW). */
  powerKw: number;
  /** Generators in the system (kW). */
  generatorKw: number;
  lightFx: number;
  upkeepPerDay: number;
  speakers: number;
  warnings: string[];
}

interface Part {
  it: ItemInstance;
  def: ItemDef;
  cond: number;
}

function condFactor(c: number): number {
  return 0.55 + 0.45 * (c / 100);
}

/** Computes everything about a system from its working components. */
export function systemStats(s: GameState, sys: SoundSystem): SystemStats {
  const parts: Part[] = [];
  let brokenCount = 0;
  for (const uid of sys.components) {
    const it = s.inventory.items[uid];
    const def = it ? ITEMS.get(it.defId) : undefined;
    if (!it || !def) continue;
    if (it.broken) {
      brokenCount++;
      continue;
    }
    parts.push({ it, def, cond: it.condition });
  }
  const byType = (t: string) => parts.filter((p) => p.def.type === t);
  const tops = byType('top');
  const subs = byType('sub');
  const speakers = [...tops, ...subs];
  const amps = byType('amp');
  const stat = (p: Part, k: string) => p.def.stats?.[k] ?? 0;

  const passiveW = speakers.filter((p) => !stat(p, 'active')).reduce((sum, p) => sum + stat(p, 'powerW'), 0);
  const ampW = amps.reduce((sum, p) => sum + stat(p, 'ampW') * condFactor(p.cond), 0);
  const ampCoverage = passiveW > 0 ? Math.min(1, ampW / passiveW) : 1;
  const cableSlots = byType('cables').reduce((sum, p) => sum + stat(p, 'cableSlots'), 0);
  const wiring = speakers.length > 0 ? Math.min(1, cableSlots / speakers.length) : 1;

  const warnings: string[] = [];
  if (speakers.length === 0) warnings.push('Keine Boxen im System.');
  if (subs.length === 0 && tops.length > 0) warnings.push('Keine Subs – ohne Bass keine Party.');
  if (tops.length === 0 && subs.length > 0) warnings.push('Keine Tops – nur Bass, keine Mitten.');
  if (passiveW > 0 && ampCoverage < 1) warnings.push(`Endstufen zu schwach: ${fmtNumber(ampW)} W für ${fmtNumber(passiveW)} W passive Boxen.`);
  if (speakers.length > 0 && wiring < 1) warnings.push(`Zu wenig Kabel: ${cableSlots} Anschlüsse für ${speakers.length} Boxen.`);
  if (speakers.length > 0 && byType('dj-mixer').length === 0) warnings.push('Kein Mixer – woran sollen die DJs auflegen?');
  if (brokenCount > 0) warnings.push(`${brokenCount} defekte Komponente${brokenCount === 1 ? '' : 'n'} – zählt nicht mit.`);

  let acoustic = 0;
  let qualitySum = 0;
  let qualityWeight = 0;
  for (const p of speakers) {
    const powered = stat(p, 'active') ? 1 : ampCoverage;
    const out = stat(p, 'powerW') * (stat(p, 'spl') / 100) * powered * wiring * condFactor(p.cond);
    acoustic += out;
    qualitySum += p.def.quality * condFactor(p.cond) * stat(p, 'powerW');
    qualityWeight += stat(p, 'powerW');
  }
  const topW = tops.reduce((sum, p) => sum + stat(p, 'powerW'), 0);
  const subW = subs.reduce((sum, p) => sum + stat(p, 'powerW'), 0);
  const ratio = topW > 0 ? subW / topW : 0;
  const balance = topW === 0 || subW === 0 ? 0.6 : ratio < 0.8 ? 0.8 + ratio / 4 : ratio > 3 ? Math.max(0.75, 1 - (ratio - 3) / 8) : 1;
  const mixer = byType('dj-mixer').reduce((best, p) => Math.max(best, p.def.quality * condFactor(p.cond)), 0);
  const controller = byType('controller').length > 0;

  let quality = qualityWeight > 0 ? qualitySum / qualityWeight : 0;
  quality *= balance * (controller ? 1.08 : 0.94) * (mixer > 0 ? 0.85 + 0.15 * (mixer / 100) : 0.8);
  quality *= Math.sqrt(ampCoverage) * wiring;
  quality = Math.max(0, Math.min(100, Math.round(quality)));

  let reach = acoustic / 6;
  if (tops.length === 0) reach *= 0.4;
  if (subs.length === 0) reach *= 0.7;
  reach = Math.round(reach);

  const avgCond = parts.length > 0 ? parts.reduce((sum, p) => sum + p.cond, 0) / parts.length : 0;
  let reliability = avgCond * 0.85 + (ampW >= passiveW * 1.2 && passiveW > 0 ? 10 : 0) + (controller ? 5 : 0);
  reliability -= brokenCount * 10 + (wiring < 1 ? 15 : 0);
  reliability = Math.max(0, Math.min(100, Math.round(reliability)));

  const caseBonus = byType('case').reduce((best, p) => Math.max(best, stat(p, 'setupBonus')), 0);
  const setupRaw = parts.reduce((sum, p) => sum + (stat(p, 'setupMin') || 1), 0);
  const setupMin = Math.max(1, Math.round(setupRaw * (1 - caseBonus / 100)));

  const all = sys.components.map((uid) => s.inventory.items[uid]).filter((x): x is ItemInstance => !!x);
  const volumeL = all.reduce((sum, it) => sum + (ITEMS.get(it.defId)?.volumeL ?? 0), 0);
  const weightKg = all.reduce((sum, it) => sum + (ITEMS.get(it.defId)?.weightKg ?? 0), 0);
  const activeW = speakers.filter((p) => stat(p, 'active')).reduce((sum, p) => sum + stat(p, 'powerW'), 0);
  const lightCount = byType('light').length;
  const powerKw = Math.round(((ampW + activeW) * 0.45 + lightCount * 250) / 100) / 10;
  const generatorKw = byType('generator').reduce((sum, p) => sum + stat(p, 'kw'), 0);
  const lightFx = Math.min(100, byType('light').reduce((sum, p) => sum + stat(p, 'lightFx'), 0));
  const upkeepPerDay = all.reduce((sum, it) => sum + (ITEMS.get(it.defId)?.upkeepPerDay ?? 0), 0);
  if (generatorKw > 0 && generatorKw < powerKw) warnings.push(`Generator zu klein: ${generatorKw} kW für ${powerKw} kW Bedarf.`);

  return {
    powerW: topW + subW,
    quality,
    reach,
    reliability,
    setupMin,
    volumeL,
    weightKg,
    powerKw,
    generatorKw,
    lightFx,
    upkeepPerDay,
    speakers: speakers.length,
    warnings,
  };
}

export function findSystem(s: GameState, id: string): SoundSystem | undefined {
  return s.sound.systems.find((x) => x.id === id);
}

/** Items that could be added to a system (owned, not in any system, not bound). */
export function availableParts(s: GameState): ItemInstance[] {
  const used = new Set(s.sound.systems.flatMap((x) => x.components));
  return Object.values(s.inventory.items).filter((it) => !used.has(it.uid) && !it.locked && isSystemPart(ITEMS.get(it.defId)));
}
