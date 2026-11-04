import { Dumbbell, Home, LineChart, Settings, Sparkles, UserCheck, UtensilsCrossed } from 'lucide-react';
import type { Dictionary } from '@/i18n';

export interface NavItem {
  href: string;
  labelKey: keyof Dictionary['nav'];
  icon: typeof Home;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'home', icon: Home },
  { href: '/nutrition', labelKey: 'nutrition', icon: UtensilsCrossed },
  { href: '/training', labelKey: 'train', icon: Dumbbell },
  { href: '/progress', labelKey: 'progress', icon: LineChart },
  { href: '/coach', labelKey: 'coach', icon: Sparkles },
];

/** Menú de una cuenta de entrenador: sólo sus clientes y los ajustes (piloto, en español). */
export const TRAINER_NAV_ITEMS: Array<{ href: string; label: string; icon: typeof Home }> = [
  { href: '/trainer', label: 'Clientes', icon: UserCheck },
  { href: '/trainer/assistant', label: 'Asistente', icon: Sparkles },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];
