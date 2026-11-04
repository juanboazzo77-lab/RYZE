'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Loader2, RotateCcw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { askTrainerAssistant } from './ai-actions';
import { AIC } from './copy';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

export function AssistantChat({
  clients,
  initialClientId,
}: {
  clients: Array<{ id: string; name: string }>;
  initialClientId: string | null;
}) {
  const [clientId, setClientId] = useState<string>(initialClientId ?? '');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  function send(text?: string) {
    const message = (text ?? draft).trim();
    if (!message || pending) return;
    setProblem(null);
    const history = messages.slice(-10);
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setDraft('');
    start(async () => {
      const res = await askTrainerAssistant({ message, history, clientId: clientId || null });
      if (res.ok && res.data) {
        const answer = res.data.text;
        setMessages((m) => [...m, { role: 'assistant', content: answer }]);
        return;
      }
      setMessages((m) => m.slice(0, -1));
      setDraft(message);
      setProblem(
        res.error === 'LIMIT'
          ? AIC.limit
          : res.error === 'NO_CLIENT'
            ? AIC.noClient
            : `${AIC.error}${res.detail ? ` (${res.detail})` : ''}`,
      );
    });
  }

  function reset() {
    setMessages([]);
    setProblem(null);
  }

  const examples = clientId ? AIC.exampleForClient : AIC.examples;

  return (
    <div className="flex min-h-[calc(100dvh-13rem)] flex-col">
      <div className="flex items-end gap-2 pb-3">
        <label className="min-w-0 flex-1 space-y-1">
          <span className="text-xs text-muted-foreground">{AIC.clientLabel}</span>
          <NativeSelect
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setMessages([]);
              setProblem(null);
            }}
            className="h-10"
          >
            <option value="">{AIC.allClients}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        {messages.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={reset} disabled={pending}>
            <RotateCcw className="size-4" />
            {AIC.reset}
          </Button>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <div className="space-y-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">{AIC.empty}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {examples.map((q) => (
                <Button key={q} variant="outline" size="sm" onClick={() => send(q)} disabled={pending}>
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm',
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
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
              {AIC.thinking}
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 space-y-1.5 border-t bg-background pt-3">
        {problem ? <p className="text-xs text-destructive">{problem}</p> : null}
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={AIC.placeholder}
            rows={2}
            maxLength={2000}
            disabled={pending}
            className="min-h-11 flex-1 resize-none"
          />
          <Button
            onClick={() => send()}
            disabled={pending || !draft.trim()}
            size="icon"
            aria-label={AIC.send}
            className="size-11 shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">{AIC.disclaimer}</p>
      </div>
    </div>
  );
}
