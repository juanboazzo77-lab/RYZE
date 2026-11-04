/**
 * Filtro de contactos del chat entre cliente y entrenador: detecta teléfonos, correos, enlaces,
 * usuarios de redes y pedidos de seguir la conversación por afuera. Es una primera barrera:
 * no puede ser perfecta (quien quiere esquivarlo con otras palabras lo logra), así que se combina
 * con registrar los intentos y con que al entrenador no le convenga irse (ver el documento del modo
 * entrenador). Tiene que dejar pasar los números normales de un entrenamiento: "3x10", "100 kg",
 * "2800 kcal", "semana 4".
 */

export type ContactReason = 'PHONE' | 'EMAIL' | 'LINK' | 'HANDLE' | 'APP' | 'OFF_PLATFORM';

export interface ContactCheck {
  blocked: boolean;
  reason?: ContactReason;
}

const SPELLED_DIGITS: Record<string, string> = {
  cero: '0',
  uno: '1',
  una: '1',
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
  siete: '7',
  ocho: '8',
  nueve: '9',
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
};

/** Minúsculas y sin tildes. */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** "w h a t s a p p" o "i.n.s.t.a" → "whatsapp" / "insta": junta letras sueltas separadas. */
function joinSpelledLetters(text: string): string {
  return text.replace(/\b(?:[a-z][\s.\-_*]+){3,}[a-z]\b/g, (m) => m.replace(/[\s.\-_*]+/g, ''));
}

/** Cambia los números escritos con letras ("cero nueve cuatro") por cifras. */
function spelledToDigits(text: string): string {
  return text.replace(
    /\b(cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|zero|one|two|three|four|five|six|seven|eight|nine)\b/g,
    (w) => SPELLED_DIGITS[w] ?? w,
  );
}

/**
 * Teléfono: una tira de 8 o más cifras (con separadores comunes, sin letras en el medio). Para no
 * confundirlo con listas de números de entrenamiento ("80 79 79 78", "2800 150 300 70"):
 * - todas las cifras juntas, o cifra por cifra: es un teléfono;
 * - con puntos, guiones, paréntesis o barras: es un teléfono con formato;
 * - sólo con espacios: lo es si el último grupo tiene 3 cifras o más (como en "11 2345 6789").
 */
function hasPhoneNumber(text: string): boolean {
  const runs = text.match(/\+?\d[\d\s().\-/_]{6,}\d/g) ?? [];
  return runs.some((run) => {
    if (run.replace(/\D/g, '').length < 8) return false;
    const groups = run.split(/\D+/).filter(Boolean);
    if (groups.length === 1) return true;
    if (groups.every((g) => g.length === 1)) return true;
    if (/[().\-/_+]/.test(run)) return true;
    return groups[groups.length - 1]!.length >= 3;
  });
}

const APP_NAMES =
  /\b(whats?app|whatsap|wasap|wsp|wpp|guasap|telegram|telegrama|instagram|insta|tiktok|snapchat|discord|messenger|skype|viber)\b/;

const OFF_PLATFORM_PHRASES: RegExp[] = [
  /\b(pasame|pasa|pasale|dame|dime|decime|mandame|envi?ame|dejame)\s+(tu|el|un)\s+(numero|cel|celu|celular|tel|telefono|whats|insta|mail|correo|contacto)\b/,
  /\b(te\s+paso|te\s+dejo|te\s+doy|te\s+mando)\s+(mi|el)\s+(numero|cel|celu|celular|tel|telefono|whats|insta|mail|correo|contacto|usuario)\b/,
  /\bmi\s+(numero|cel|celu|celular|telefono|whats|insta|mail|correo|usuario)\s+(es|:)/,
  /\b(llamame|llamanos|hablame\s+al|escribime\s+al|escribime\s+por\s+(fuera|afuera)|agregame\s+(a|en)|seguime\s+en|buscame\s+(en|como))\b/,
  /\b(por\s+fuera|por\s+afuera|fuera\s+de\s+(la\s+)?(app|forza|aplicacion)|afuera\s+de\s+(la\s+)?(app|forza))\b/,
];

const TLDS = 'com|ar|net|org|io|me|app|ly|gl|co|info|biz|xyz|link|bio';

/** Revisa un mensaje. Devuelve el motivo del bloqueo, o `blocked: false`. */
export function checkContactInfo(raw: string): ContactCheck {
  const lower = fold(raw);
  // La versión "compacta" junta letras sueltas y pasa números escritos a cifras.
  const compact = spelledToDigits(joinSpelledLetters(lower));

  // Correos: con arroba o "arroba/at ... punto com".
  if (/[a-z0-9._%+-]+\s?@\s?[a-z0-9-]+\s?\.\s?[a-z]{2,}/.test(compact)) return { blocked: true, reason: 'EMAIL' };
  if (/\b(arroba)\b/.test(compact) || /\b[a-z0-9._-]+\s+(at|arroba)\s+[a-z0-9-]+\s+(punto|dot)\s+(com|net|org|ar)\b/.test(compact)) {
    return { blocked: true, reason: 'EMAIL' };
  }

  // Enlaces.
  if (/\b(https?:\/\/|www\.)/.test(compact)) return { blocked: true, reason: 'LINK' };
  if (new RegExp(`\\b[a-z0-9-]{2,}\\.(${TLDS})(/|\\b)`).test(compact) && !/\b\d+\.\d+/.test(compact.replace(new RegExp(`[a-z0-9-]{2,}\\.(${TLDS})`), ''))) {
    return { blocked: true, reason: 'LINK' };
  }
  if (/\b(t\.me|wa\.me|bit\.ly|ig\.me|linktr\.ee)\b/.test(compact)) return { blocked: true, reason: 'LINK' };

  // Usuarios de redes: @usuario.
  if (/(^|[\s(\[])@[a-z0-9._]{3,}/.test(compact)) return { blocked: true, reason: 'HANDLE' };

  // Teléfonos.
  if (hasPhoneNumber(compact)) return { blocked: true, reason: 'PHONE' };

  // Redes y apps de mensajes por su nombre.
  if (APP_NAMES.test(compact)) return { blocked: true, reason: 'APP' };

  // Pedidos de seguir por afuera.
  if (OFF_PLATFORM_PHRASES.some((re) => re.test(compact))) return { blocked: true, reason: 'OFF_PLATFORM' };

  return { blocked: false };
}
