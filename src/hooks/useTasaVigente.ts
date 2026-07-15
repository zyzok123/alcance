import { useLiveQuery } from "dexie-react-hooks";
import { getTasaVigente, type TasaResuelta } from "@/services/tasas";

/** Reactivo: se recalcula si cambian settings o la caché de tasas. */
export function useTasaVigente(): TasaResuelta | undefined {
  return useLiveQuery(() => getTasaVigente(), []);
}
