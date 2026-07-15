import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Input de vidrio compartido por todos los forms (sheets de registro/ajustes). */
export const glassInput =
  "glass rounded-xl px-3 py-3 font-display text-texto w-full outline-none " +
  "focus:bg-white/15 placeholder:text-texto-sec";
