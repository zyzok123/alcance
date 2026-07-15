/**
 * Buscador de actualizaciones vía API pública de GitHub Releases.
 * Sin internet falla en silencio (retorna null).
 */

export const REPO = "zyzok123/alcance";

export const APP_VERSION: string =
  (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "v0.1.0-dev";

export interface ActualizacionDisponible {
  tag: string;
  url: string;
}

export async function buscarActualizacion(): Promise<ActualizacionDisponible | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: string; html_url?: string };
    if (!data.tag_name || !data.html_url) return null;
    if (data.tag_name === APP_VERSION) return null;
    return { tag: data.tag_name, url: data.html_url };
  } catch {
    return null;
  }
}
