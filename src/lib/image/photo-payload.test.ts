import { describe, expect, it } from 'vitest';
import { packPhotos, photoPayloadSchema, unpackPhotos } from './photo-payload';

const photo = (n: number) => `data:image/jpeg;base64,${'A'.repeat(n)}`;

describe('photo payload', () => {
  it('ida y vuelta conserva las fotos y su orden', () => {
    const list = [photo(10), photo(20), photo(30)];
    expect(unpackPhotos(packPhotos(list))).toEqual(list);
  });

  it('descarta lo que pasa de cuatro fotos', () => {
    const list = [photo(1), photo(2), photo(3), photo(4), photo(5)];
    expect(unpackPhotos(packPhotos(list))).toHaveLength(4);
  });

  it('sin fotos devuelve una lista vacía', () => {
    expect(unpackPhotos(undefined)).toEqual([]);
    expect(unpackPhotos(packPhotos([]))).toEqual([]);
  });

  it('el esquema acepta imágenes y rechaza cualquier otra cosa', () => {
    expect(photoPayloadSchema.safeParse(packPhotos([photo(50)])).success).toBe(true);
    expect(photoPayloadSchema.safeParse({ p0: 'http://ejemplo.com/foto.jpg' }).success).toBe(false);
  });
});
