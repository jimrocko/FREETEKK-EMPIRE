/**
 * Save migrations. `MIGRATIONS[n]` upgrades raw save data from version n to n + 1.
 * Missing slices/fields are filled in afterwards by `hydrate`, so a migration is
 * only needed when existing data changes meaning or shape.
 */
type RawState = any;

export const MIGRATIONS: Record<number, (data: RawState) => RawState> = {};

export function migrate(data: RawState, fromVersion: number, toVersion: number): RawState {
  let current = data;
  for (let v = fromVersion; v < toVersion; v++) {
    const step = MIGRATIONS[v];
    if (step) current = step(current);
    if (current?.meta) current.meta.version = v + 1;
  }
  return current;
}
