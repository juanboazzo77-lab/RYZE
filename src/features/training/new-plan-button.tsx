'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { createPlan } from './actions';

export function NewPlanButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          {t.training.newPlan}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.training.newPlan}</DialogTitle>
        </DialogHeader>

        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/coach/new-plan">
            <Sparkles className="size-4" />
            {t.training.newPlanAi}
          </Link>
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t.training.newPlanManual}
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-1.5">
          <Label>{t.auth.name}</Label>
          <Input
            autoFocus
            value={name}
            placeholder={t.training.planNamePh}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim().length >= 2 && submit()}
          />
        </div>
        <Button onClick={submit} disabled={pending || name.trim().length < 2}>
          {t.common.confirm}
        </Button>
      </DialogContent>
    </Dialog>
  );

  function submit() {
    start(async () => {
      const res = await createPlan({ name: name.trim() });
      if (res?.error) toast.error(t.training.toast.genericError);
      // createPlan redirige en éxito.
    });
  }
}
