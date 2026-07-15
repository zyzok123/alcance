import { NativeBiometric } from "@capgo/capacitor-native-biometric";

/** true si el dispositivo tiene huella/PIN configurado y disponible. */
export async function biometriaDisponible(): Promise<boolean> {
  try {
    const r = await NativeBiometric.isAvailable({ useFallback: true });
    return r.isAvailable;
  } catch {
    return false;
  }
}

/** Pide huella/PIN. true si el usuario se autenticó, false si canceló o falló. */
export async function autenticar(): Promise<boolean> {
  try {
    await NativeBiometric.verifyIdentity({
      title: "Alcance",
      subtitle: "Desbloqueá para ver tus finanzas",
      reason: "Confirmá que sos vos",
      useFallback: true,
    });
    return true;
  } catch {
    return false;
  }
}
