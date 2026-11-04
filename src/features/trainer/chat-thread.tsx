'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ThreadMessage } from '@/server/trainer-chat';
import { loadChatThread, sendChatMessage } from './chat-actions';
import { CHAT } from './copy';

/** Cada cuánto se buscan mensajes nuevos mientras la pantalla está abierta. */
const POLL_MS = 8000;
const MAX_LEN = 1000;

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

export function ChatThread({ linkId }: { linkId: string }) {
  const [messages, setMessages] = useState<ThreadMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const refresh = useCallback(async () => {
    const res = await loadChatThread({ linkId });
    if (res.ok && res.messages) setMessages(res.messages);
    else if (res.error === 'NOT_LINKED') setGone(true);
  }, [linkId]);

  // Carga al abrir y busca mensajes nuevos cada tanto, sólo si la pantalla se está viendo.
  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const n = messages?.length ?? 0;
    if (n !== lastCount.current) {
      lastCount.current = n;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  function send() {
    const body = draft.trim();
    if (!body || pending) return;
    setProblem(null);
    start(async () => {
      const res = await sendChatMessage({ linkId, body });
      if (res.ok) {
        setDraft('');
        await refresh();
        return;
      }
      if (res.error === 'BLOCKED') setProblem(CHAT.blocked[res.reason ?? 'OFF_PLATFORM']);
      else if (res.error === 'RATE') setProblem(CHAT.rate);
      else if (res.error === 'NOT_LINKED') setGone(true);
      else if (res.error === 'INVALID') setProblem(CHAT.tooLong);
      else setProblem(CHAT.error);
    });
  }

  if (gone) return <p className="py-10 text-center text-sm text-muted-foreground">{CHAT.notLinked}</p>;

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col">
      <p className="rounded-lg bg-secondary/60 px-3 py-2 text-[11px] leading-snug text-muted-foreground">{CHAT.notice}</p>

      <div className="flex-1 space-y-2 overflow-y-auto py-3">
        {messages === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{CHAT.empty}</p>
        ) : (
          messages.map((m, i) => {
            const newDay = i === 0 || dayOf(messages[i - 1]!.createdAt) !== dayOf(m.createdAt);
            return (
              <div key={m.id} className="space-y-2">
                {newDay ? (
                  <p className="text-center text-[11px] uppercase tracking-wide text-muted-foreground">{dayOf(m.createdAt)}</p>
                ) : null}
                <div className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm',
                      m.mine ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
                    )}
                  >
                    {m.body}
                    <span className={cn('mt-0.5 block text-right text-[10px]', m.mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {timeOf(m.createdAt)}
                      {m.mine && m.seen ? ` · ${CHAT.seen}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 space-y-1.5 border-t bg-background pt-3">
        {problem ? <p className="text-xs text-destructive">{problem}</p> : null}
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (problem) setProblem(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={CHAT.placeholder}
            rows={2}
            maxLength={MAX_LEN}
            className="min-h-11 flex-1 resize-none"
          />
          <Button onClick={send} disabled={pending || !draft.trim()} size="icon" aria-label={CHAT.send} className="size-11 shrink-0">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
