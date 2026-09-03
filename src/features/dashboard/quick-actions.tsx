import Link from 'next/link';
import { Dumbbell, Scale, Sparkles, UtensilsCrossed } from 'lucide-react';
import type { Dictionary } from '@/i18n';

export function QuickActions({ t }: { t: Dictionary }) {
  const q = t.dashboard.quick;
  const items = [
    { href: '/nutrition', icon: UtensilsCrossed, label: q.logMeal },
    { href: '/training', icon: Dumbbell, label: q.startWorkout },
    { href: '/progress', icon: Scale, label: q.logWeight },
    { href: '/coach', icon: Sparkles, label: q.askCoach },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center text-sm font-medium transition-colors hover:border-primary/50 hover:bg-accent"
        >
          <Icon className="size-5 text-primary" />
          {label}
        </Link>
      ))}
    </div>
  );
}
