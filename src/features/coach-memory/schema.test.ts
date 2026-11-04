import { describe, expect, it } from 'vitest';
import { isDuplicateMemory, MAX_LEARNED_PER_MESSAGE, normalizeMemory, planMemoryChanges } from './schema';

const existing = [
  { id: 'a', content: 'Le molesta la zona lumbar con cargas axiales', source: 'CHAT' },
  { id: 'b', content: 'Juega fútbol los viernes', source: 'USER' },
  { id: 'c', content: 'No le gusta el pescado', source: 'CHAT' },
];

describe('normalizeMemory', () => {
  it('ignora tildes, mayúsculas y signos', () => {
    expect(normalizeMemory('  ¡Juega FÚTBOL, los viernes! ')).toBe('juega futbol los viernes');
  });
});

describe('isDuplicateMemory', () => {
  const known = existing.map((e) => e.content);
  it('detecta lo mismo con otras mayúsculas o signos', () => {
    expect(isDuplicateMemory('juega futbol los viernes.', known)).toBe(true);
  });
  it('detecta cuando uno contiene al otro', () => {
    expect(isDuplicateMemory('No le gusta el pescado ni los mariscos', known)).toBe(true);
  });
  it('deja pasar algo distinto', () => {
    expect(isDuplicateMemory('Entrena a las 7 de la mañana', known)).toBe(false);
  });
});

describe('planMemoryChanges', () => {
  it('anota lo nuevo y descarta lo repetido, lo muy corto y lo muy largo', () => {
    const { add } = planMemoryChanges(
      {
        add: [
          { text: 'Entrena en casa con mancuernas', category: 'PREFERENCE' },
          { text: 'juega futbol los viernes', category: 'GOAL' },
          { text: 'ok', category: 'OTHER' },
          { text: 'x'.repeat(300), category: 'OTHER' },
        ],
        remove: [],
      },
      existing,
    );
    expect(add).toEqual([{ text: 'Entrena en casa con mancuernas', category: 'PREFERENCE' }]);
  });

  it('una categoría inventada pasa a OTHER', () => {
    const { add } = planMemoryChanges({ add: [{ text: 'Trabaja de noche', category: 'INVENTADA' }], remove: [] }, existing);
    expect(add[0]?.category).toBe('OTHER');
  });

  it('no anota más de lo permitido por mensaje', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ text: `Dato distinto número ${i} importante`, category: 'OTHER' }));
    expect(planMemoryChanges({ add: many, remove: [] }, existing).add).toHaveLength(MAX_LEARNED_PER_MESSAGE);
  });

  it('sólo borra lo que anotó el coach, no lo que escribió la persona', () => {
    // 1 = lumbar (CHAT), 2 = fútbol (USER), 3 = pescado (CHAT), 9 = no existe
    const { removeIds } = planMemoryChanges({ add: [], remove: [1, 2, 9] }, existing);
    expect(removeIds).toEqual(['a']);
  });
});
