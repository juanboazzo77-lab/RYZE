import { Dumbbell, Home, LineChart, Sparkles, UtensilsCrossed } from 'lucide-react';
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
