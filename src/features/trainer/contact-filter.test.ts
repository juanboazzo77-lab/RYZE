import { describe, expect, it } from 'vitest';
import { checkContactInfo } from './contact-filter';

const blocked = (text: string) => checkContactInfo(text).blocked;

describe('filtro de contactos: lo que tiene que bloquear', () => {
  it('teléfonos en distintos formatos', () => {
    expect(blocked('mi cel es 11 2345 6789')).toBe(true);
    expect(blocked('anotá 1123456789')).toBe(true);
    expect(blocked('+54 9 11 2345-6789')).toBe(true);
    expect(blocked('(011) 4567-8901')).toBe(true);
    expect(blocked('15.2345.6789')).toBe(true);
  });

  it('teléfonos escritos con letras', () => {
    expect(blocked('once cuarenta y cinco')).toBe(false); // sin cifras suficientes
    expect(blocked('uno uno dos tres cuatro cinco seis siete ocho nueve')).toBe(true);
    expect(blocked('cero uno uno 2 3 4 5 6 7 8')).toBe(true);
  });

  it('correos', () => {
    expect(blocked('escribime a juan@gmail.com')).toBe(true);
    expect(blocked('juan arroba gmail punto com')).toBe(true);
    expect(blocked('juan @ gmail . com')).toBe(true);
  });

  it('enlaces', () => {
    expect(blocked('mirá https://wa.me/5491123456789')).toBe(true);
    expect(blocked('entrá a www.misitio.com')).toBe(true);
    expect(blocked('mi web: entrenadorjuan.com.ar')).toBe(true);
    expect(blocked('linktr.ee/juan')).toBe(true);
  });

  it('usuarios de redes', () => {
    expect(blocked('seguime en @juan.entrena')).toBe(true);
    expect(blocked('mi usuario es @entrenador_juan')).toBe(true);
  });

  it('nombres de apps de mensajes', () => {
    expect(blocked('pasame tu whatsapp')).toBe(true);
    expect(blocked('hablemos por wsp')).toBe(true);
    expect(blocked('te sigo en Instagram')).toBe(true);
    expect(blocked('mejor por Telegram')).toBe(true);
  });

  it('pedidos de seguir por afuera', () => {
    expect(blocked('pasame tu número y seguimos')).toBe(true);
    expect(blocked('escribime por fuera de la app')).toBe(true);
    expect(blocked('llamame cuando puedas')).toBe(true);
    expect(blocked('te paso mi cel')).toBe(true);
  });

  it('intentos de esquivarlo con letras o signos', () => {
    expect(blocked('w h a t s a p p')).toBe(true);
    expect(blocked('i.n.s.t.a')).toBe(true);
    expect(blocked('WhAtSaPp')).toBe(true);
    expect(blocked('whatsápp')).toBe(true);
  });
});

describe('filtro de contactos: lo que tiene que dejar pasar', () => {
  const ok = [
    'Hoy hice 3x10 en press de banca con 100 kg',
    'Mi objetivo son 2800 kcal y 170 g de proteína',
    'Estoy en la semana 4 del plan, 5 días por semana',
    'Pesé 79.5 kg esta mañana, bajé 1.2 kg',
    'Hice 12 repeticiones, 4 series, descanso de 90 segundos',
    'El face pull me cuesta, ¿lo cambio?',
    'Me duele la lumbar desde el 15 de octubre',
    'Entreno a las 7 de la mañana, de lunes a viernes',
    'Subí la carga a 82.5 kg en sentadilla',
    '¿Puedo comer 150 g de arroz y 200 g de pollo?',
    'Hola, soy Juan. Mucho gusto!',
    'Gracias, te mando la revisión el domingo',
    'Sentadilla 100 kg x 5, 105 x 5, 110 x 3',
    'Dormí 7.5 horas, el pulso en reposo es 58',
    'Corrí 5.2 km en 28 minutos',
    'Mi peso: 80 79 79 78',
  ];
  for (const text of ok) {
    it(`deja pasar: ${text}`, () => {
      expect(checkContactInfo(text)).toEqual({ blocked: false });
    });
  }
});

describe('motivo del bloqueo', () => {
  it('indica por qué se bloqueó', () => {
    expect(checkContactInfo('11 2345 6789').reason).toBe('PHONE');
    expect(checkContactInfo('a@b.com').reason).toBe('EMAIL');
    expect(checkContactInfo('https://x.com').reason).toBe('LINK');
    expect(checkContactInfo('@juan_fit').reason).toBe('HANDLE');
    expect(checkContactInfo('wsp').reason).toBe('APP');
    expect(checkContactInfo('por fuera de la app').reason).toBe('OFF_PLATFORM');
  });
});
