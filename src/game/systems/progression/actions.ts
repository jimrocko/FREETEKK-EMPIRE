import { defineAction } from '../../core/actions';

export const renamePlayer = defineAction<{ name: string }>({
  id: 'player.rename',
  check: (_s, p) => {
    const name = p.name.trim();
    if (name.length < 2) return 'Name muss mindestens 2 Zeichen haben.';
    if (name.length > 24) return 'Name darf höchstens 24 Zeichen haben.';
    return null;
  },
  run: (d, p) => {
    d.player.name = p.name.trim();
    return `Du heißt jetzt ${d.player.name}.`;
  },
});
