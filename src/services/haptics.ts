import { Haptics, ImpactStyle } from "@capacitor/haptics";

/** Vibración corta al guardar. En web (sin plugin) falla en silencio. */
export async function vibrarCorto(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // web o dispositivo sin vibración: no-op
  }
}
