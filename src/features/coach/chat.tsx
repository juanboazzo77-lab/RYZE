'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n/interpolate';
import { cn } from '@/lib/utils';
import type { CoachMessage } from './queries';
import { resetCoachConversation, sendCoachMessage } from './actions';

interface Props {
  initialMessages: CoachMessage[];
  usage: { used: number; limit: number };
}

export function CoachChat({ initialMessages, usage }: Props) {
  const t = useT();
  const tc = t.coach;
  const [messages, setMessages] = useState<CoachMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [used, setUsed] = useState(usage.used);
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  const atLimit = used >= usage.limit;

  function submit() {
    const text = draft.trim();
    if (!text || pending || atLimit) return;
    const userMsg: CoachMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setDraft('');
    start(async () => {
      const res = await sendCoachMessage({ text });
      if (res.ok && res.data) {
        setMessages((m) => [
          ...m,
          {
            id: `reply-${Date.now()}`,
            role: 'assistant',
            content: res.data!.reply,
            createdAt: new Date().toISOString(),
          },
        ]);
        setUsed((n) => n + 1);
      } else {
        setMessages((m) => m.filter((x) => x.id !== userMsg.id));
        setDraft(text);
        toast.error(res.error || tc.error);
      }
    });
  }

  function reset() {
    if (!confirm(tc.resetConfirm)) return;
    start(async () => {
      await resetCoachConversation();
      setMessages([]);
    });
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <div className="flex items-center justify-between gap-2 pb-2">
        <p className="text-xs text-muted-foreground tabular-nums">
          {interpolate(tc.usageToday, { used, limit: usage.limit })}
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/coach/new-plan">
              <Sparkles className="size-4" />
              {tc.newPlanCta}
            </Link>
          </Button>
          {messages.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={reset} disabled={pending}>
              <RotateCcw className="size-4" />
              {tc.reset}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <p className="mx-auto max-w-md py-10 text-center text-sm text-muted-foreground">
            {tc.empty}
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground',
                )}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {pending ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-secondary px-3.5 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {tc.sending}
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 space-y-1.5 border-t bg-background pt-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={tc.inputPlaceholder}
            rows={2}
            maxLength={2000}
            disabled={pending || atLimit}
            className="min-h-11 flex-1 resize-none"
          />
          <Button
            onClick={submit}
            disabled={pending || atLimit || !draft.trim()}
            size="icon"
            aria-label={tc.send}
            className="size-11 shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">{tc.disclaimer}</p>
      </div>
    </div>
  );
}
