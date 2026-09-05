'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { deleteAccount } from './actions';

export function DeleteAccountDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [pending, start] = useTransition();
  const armed = confirm.trim().toUpperCase() === t.account.deleteConfirmWord;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Trash2 className="size-4" />
          {t.account.deleteButton}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.account.deleteConfirmTitle}</DialogTitle>
          <DialogDescription>{t.account.deleteConfirmDesc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="del-confirm">{t.account.deleteConfirmLabel}</Label>
          <Input
            id="del-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t.account.deleteConfirmPlaceholder}
            autoComplete="off"
          />
        </div>
        <Button
          variant="destructive"
          disabled={!armed || pending}
          onClick={() =>
            start(async () => {
              const res = await deleteAccount().catch(() => ({ error: 'FAIL' }));
              if (res && 'error' in res) toast.error(t.account.deleteError);
              // en éxito, deleteAccount() redirige a /login
            })
          }
        >
          {pending ? t.account.deletePending : t.account.deleteButton}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
