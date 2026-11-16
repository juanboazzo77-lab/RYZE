import { describe, expect, it } from 'vitest';
import { COACH_TOPICS, dayLabel, groupByDay, isCoachTopic, localDayKey, topicConversationFilter, topicOfTitle, topicPromptNote } from './topics';

describe('topicOfTitle', () => {
  it('reconoce los temas guardados', () => {
    for (const t of COACH_TOPICS) expect(topicOfTitle(t)).toBe(t);
  });
  it('las conversaciones viejas o raras quedan en "otras consultas"', () => {
    expect(topicOfTitle(null)).toBe('general');
    expect(topicOfTitle(undefined)).toBe('general');
    expect(topicOfTitle('cualquier cosa')).toBe('general');
  });
});

describe('isCoachTopic', () => {
  it('solo acepta los temas definidos', () => {
    expect(isCoachTopic('training')).toBe(true);
    expect(isCoachTopic('otro')).toBe(false);
    expect(isCoachTopic(3)).toBe(false);
  });
});

describe('topicConversationFilter', () => {
  it('el tema general incluye las conversaciones viejas sin título', () => {
    expect(topicConversationFilter('general').OR).toEqual([{ title: null }, { title: 'general' }]);
  });
  it('los otros temas buscan solo el suyo', () => {
    expect(topicConversationFilter('nutrition')).toEqual({ kind: 'COACH', OR: [{ title: 'nutrition' }] });
  });
});

describe('topicPromptNote', () => {
  it('el tema general no agrega nada y los demás sí', () => {
    expect(topicPromptNote('general')).toBe('');
    expect(topicPromptNote('health')).toContain('lesiones');
    expect(topicPromptNote('training')).toContain('entrenamiento');
  });
});

describe('días', () => {
  const now = new Date(2026, 10, 16, 15, 30); // 16/11/2026, hora local
  it('localDayKey usa el día local', () => {
    expect(localDayKey(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05');
  });
  it('hoy, ayer y fechas anteriores', () => {
    expect(dayLabel('2026-11-16', now)).toEqual({ kind: 'today' });
    expect(dayLabel('2026-11-15', now)).toEqual({ kind: 'yesterday' });
    expect(dayLabel('2026-11-10', now)).toEqual({ kind: 'date', key: '2026-11-10' });
  });
  it('ayer también anda a principio de mes', () => {
    expect(dayLabel('2026-10-31', new Date(2026, 10, 1, 9, 0))).toEqual({ kind: 'yesterday' });
  });
  it('groupByDay agrupa por día y conserva el orden', () => {
    const msgs = [
      { id: 'a', createdAt: new Date(2026, 10, 14, 10, 0).toISOString() },
      { id: 'b', createdAt: new Date(2026, 10, 14, 10, 5).toISOString() },
      { id: 'c', createdAt: new Date(2026, 10, 15, 21, 0).toISOString() },
      { id: 'd', createdAt: new Date(2026, 10, 16, 8, 0).toISOString() },
    ];
    const g = groupByDay(msgs, now);
    expect(g.map((x) => x.items.map((i) => i.id))).toEqual([['a', 'b'], ['c'], ['d']]);
    expect(g.map((x) => x.label.kind)).toEqual(['date', 'yesterday', 'today']);
  });
  it('una fecha rota no rompe el agrupado', () => {
    const g = groupByDay([{ createdAt: 'xx' }], now);
    expect(g).toHaveLength(1);
    expect(g[0]!.key).toBe('sin-fecha');
  });
});
