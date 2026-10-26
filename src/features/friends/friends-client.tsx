'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, Flame, Loader2, Share2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n/interpolate';
import { cn } from '@/lib/utils';
import { redeemCodeAction, removeFriendAction } from './actions';
import type { FriendStats } from './logic';

const MEDALS = ['🥇', '🥈', '🥉'];
const SITE_URL = 'https://www.forzaai.app';

export function FriendsClient({
  code,
  invited,
  ranking,
  bonusDays,
}: {
  code: string;
  invited: number;
  ranking: FriendStats[];
  bonusDays: number;
}) {
  const t = useT();
  const f = t.friends;
  const router = useRouter();
  const [value, setValue] = useState('');
  const [adding, startAdd] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const shareText = interpolate(f.inviteText, { code, days: bonusDays });

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(f.copied);
    } catch {
      toast.error(f.errGeneric);
    }
  }

  async function share() {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ text: shareText, url: SITE_URL });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return; // la persona cerró el menú
    }
    await copyText(`${shareText} ${SITE_URL}`);
  }

  function add() {
    if (!value.trim()) return;
    startAdd(async () => {
      const res = await redeemCodeAction({ code: value }).catch(() => null);
      if (res?.ok) {
        const name = res.friendName || f.anonymous;
        toast.success(
          res.rewarded
            ? interpolate(f.addedReward, { name, days: res.days ?? bonusDays })
            : interpolate(f.added, { name }),
        );
        setValue('');
        router.refresh();
        return;
      }
      toast.error(
        res?.error === 'NOT_FOUND' || res?.error === 'INVALID'
          ? f.errNotFound
          : res?.error === 'SELF'
            ? f.errSelf
            : res?.error === 'ALREADY_FRIENDS'
              ? f.errAlready
              : f.errGeneric,
      );
    });
  }

  async function remove(row: FriendStats) {
    if (!confirm(interpolate(f.removeConfirm, { name: row.name || f.anonymous }))) return;
    setBusyId(row.id);
    const res = await removeFriendAction({ friendId: row.id }).catch(() => null);
    setBusyId(null);
    if (res?.ok) router.refresh();
    else toast.error(f.errGeneric);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{f.yourCode}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="rounded-lg border bg-secondary/50 py-3 text-center">
            <span className="select-all font-mono text-3xl font-extrabold tracking-[0.3em]">{code}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => void share()}>
              <Share2 />
              {f.share}
            </Button>
            <Button variant="outline" onClick={() => void copyText(code)}>
              <Copy />
              {f.copy}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{interpolate(f.rewardNote, { days: bonusDays })}</p>
          {invited > 0 ? (
            <p className="text-xs font-medium text-success">{interpolate(f.invited, { n: invited })}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{f.addTitle}</CardTitle>
          <p className="text-xs text-muted-foreground">{f.addHint}</p>
        </CardHeader>
        <CardContent className="pt-0">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value.toUpperCase())}
              placeholder={f.addPlaceholder}
              maxLength={16}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-label={f.addTitle}
              className="font-mono uppercase tracking-widest"
            />
            <Button type="submit" disabled={adding || !value.trim()}>
              {adding ? <Loader2 className="animate-spin" /> : <UserPlus />}
              {f.add}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{f.rankingTitle}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {ranking.length <= 1 ? (
            <EmptyState compact illustration="trophy" title={f.empty} />
          ) : (
            <ol className="divide-y">
              {ranking.map((r, i) => (
                <li key={r.id} className={cn('flex items-center gap-3 py-2.5', r.isMe && 'font-semibold')}>
                  <span className="w-7 shrink-0 text-center text-lg tabular-nums">
                    {MEDALS[i] ?? <span className="text-sm text-muted-foreground">{i + 1}</span>}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {r.name || f.anonymous}
                    {r.isMe ? (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                        {f.you}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">
                    {r.weekWorkouts}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">{f.workouts}</span>
                  </span>
                  <span className="flex w-10 shrink-0 items-center justify-end gap-0.5 text-xs tabular-nums text-muted-foreground">
                    <Flame className="size-3 text-warning" />
                    {r.streak}
                  </span>
                  {r.isMe ? (
                    <span className="size-6 shrink-0" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => void remove(r)}
                      disabled={busyId === r.id}
                      aria-label={f.remove}
                      className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
