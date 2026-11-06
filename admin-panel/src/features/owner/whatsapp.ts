/**
 * Aviso de cuota por WhatsApp: arma el mensaje y el enlace (wa.me) para abrirlo con un toque. El gimnasio lo
 * revisa y lo manda desde su propio WhatsApp: no sale nada solo. Pensado para números argentinos.
 */

/** Número en el formato de WhatsApp para Argentina (549 + área + número, sin 0 ni 15), o null si no se entiende. */
export function whatsappNumber(raw: string): string | null {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  // Con el 9 de celular de adelante (+54 9 ...).
  if (d.length === 11 && d.startsWith('9')) d = d.slice(1);
  // Con el 15 de celular después del área (011 15 5555-1234): se saca.
  if (d.length === 12) {
    for (const areaLen of [2, 3, 4]) {
      if (d.slice(areaLen, areaLen + 2) === '15') {
        d = d.slice(0, areaLen) + d.slice(areaLen + 2);
        break;
      }
    }
  }
  return d.length === 10 ? `549${d}` : null;
}

export function reminderMessage(args: { name: string; gymName: string; daysLeft: number | null }): string {
  const first = args.name.trim().split(/\s+/)[0] || '';
  const hello = first ? `Hola ${first}!` : 'Hola!';
  const d = args.daysLeft;
  const when = d === null || d === 0 ? 'hoy vence tu cuota' : d < 0 ? `tu cuota venció hace ${-d} ${-d === 1 ? 'día' : 'días'}` : `tu cuota vence en ${d} ${d === 1 ? 'día' : 'días'}`;
  return `${hello} Te escribo de ${args.gymName}: ${when}. Cuando puedas, avisame así te la dejo al día. ¡Gracias!`;
}

/** Enlace para abrir WhatsApp con el mensaje armado, o null si el teléfono no sirve. */
export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const num = whatsappNumber(phone);
  return num ? `https://wa.me/${num}?text=${encodeURIComponent(message)}` : null;
}
