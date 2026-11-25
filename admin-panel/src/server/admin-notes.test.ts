import { describe, expect, it } from 'vitest';
import { sniffPhoto } from './admin-notes-shared';

const bytes = (...n: number[]) => new Uint8Array([...n, ...Array(12).fill(0)]);

describe('sniffPhoto', () => {
  it('reconoce jpg, png y webp por el contenido', () => {
    expect(sniffPhoto(bytes(0xff, 0xd8, 0xff))?.ext).toBe('jpg');
    expect(sniffPhoto(bytes(0x89, 0x50, 0x4e, 0x47))?.ext).toBe('png');
    const webp = new TextEncoder().encode('RIFF0000WEBPVP8 ');
    expect(sniffPhoto(webp)?.ext).toBe('webp');
  });
  it('rechaza lo que no es una imagen admitida', () => {
    expect(sniffPhoto(new TextEncoder().encode('<svg onload=alert(1)></svg>'))).toBeNull();
    expect(sniffPhoto(new Uint8Array([]))).toBeNull();
  });
});
