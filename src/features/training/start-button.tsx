'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Play } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { startWorkout } from './actions';

export function StartWorkoutButton({
  planDayId,
  label,
  variant = 'default',
  size = 'default',
  className,
  icon = true,
  ariaLabel,
}: {
  planDayId?: string;
  label: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  icon?: boolean;
  /** Para botones sin texto (solo el ícono). */
  ariaLabel?: string;
}) {
  const t = useT();
  const [pending, start] = useTransition();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      aria-label={ariaLabel}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await startWorkout({ planDayId: planDayId ?? null });
          if (res?.error) toast.error(t.training.toast.genericError);
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : icon ? (
        <Play className="size-4" />
      ) : null}
      {label}
    </Button>
  );
}
