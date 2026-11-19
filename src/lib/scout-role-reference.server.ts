import reference from "@/data/scout-role-reference.json";
import type { ScoutRole } from "@/lib/scout";

// CC0 release from dcaribou/transfermarkt-datasets, updated through July 6, 2026.
// Only names, birth dates, and last-known role are used. Clubs come from the live squad.
const roles: Readonly<Record<string, ScoutRole>> = reference as Record<string, ScoutRole>;
const playerAliases = new Map([
  // Full names as listed in the official FC Barcelona player archive.
  ["pedro gonzalez lopez", "pedri"], // https://players.fcbarcelona.com/en/player/2773-pedri-pedro-gonzalez-lopez
  ["pablo martin paez gavira", "gavi"], // https://players.fcbarcelona.com/en/player/2835-gavi-pablo-martin-paez-gavira
]);

export function lookupScoutRole(names: string[], dateOfBirth: string): ScoutRole | null {
  const matches = new Set<ScoutRole>();
  for (const name of names) {
    const normalized = name.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    for (const alias of [normalized, playerAliases.get(normalized)]) {
      if (!alias) continue;
      const key = `${alias}|${dateOfBirth}`;
      if (Object.hasOwn(roles, key)) matches.add(roles[key]);
    }
  }
  return matches.size === 1 ? [...matches][0] : null;
}
