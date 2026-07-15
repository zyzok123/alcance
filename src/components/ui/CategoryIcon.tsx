import {
  ArrowLeftRight,
  Banknote,
  Bike,
  BookOpen,
  Bus,
  CircleEllipsis,
  Gamepad2,
  Gift,
  HeartPulse,
  Home,
  PawPrint,
  PlusCircle,
  Scale,
  Shirt,
  ShoppingCart,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONOS: Record<string, LucideIcon> = {
  utensils: Utensils,
  bus: Bus,
  bike: Bike,
  "shopping-cart": ShoppingCart,
  zap: Zap,
  "gamepad-2": Gamepad2,
  "heart-pulse": HeartPulse,
  home: Home,
  shirt: Shirt,
  "book-open": BookOpen,
  "paw-print": PawPrint,
  gift: Gift,
  "circle-ellipsis": CircleEllipsis,
  banknote: Banknote,
  "plus-circle": PlusCircle,
  "arrow-left-right": ArrowLeftRight,
  scale: Scale,
};

const COLORES: Record<string, string> = {
  primario: "text-primario",
  secundario: "text-secundario",
  exito: "text-exito",
  alerta: "text-alerta",
  peligro: "text-peligro",
};

export function CategoryIcon({
  icono,
  color,
  size = 22,
  className,
}: {
  icono: string;
  color: string;
  size?: number;
  className?: string;
}) {
  const Icono = ICONOS[icono] ?? CircleEllipsis;
  return <Icono size={size} className={cn(COLORES[color] ?? "text-primario", className)} />;
}
