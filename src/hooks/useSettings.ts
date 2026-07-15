import { useLiveQuery } from "dexie-react-hooks";
import { db, type Settings } from "@/db/schema";

export function useSettings(): Settings | undefined {
  return useLiveQuery(() => db.settings.get(1), []);
}

export async function actualizarSettings(cambios: Partial<Settings>): Promise<void> {
  await db.settings.update(1, cambios);
}
