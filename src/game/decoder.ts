import type { DecoderPage } from '../types/campaign';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Build a 1–26 number→letter pad. `shift` rotates A toward later letters. */
export function makeLetterMap(shift = 0): Record<string, string> {
  const map: Record<string, string> = { '0': ' ' };
  for (let i = 0; i < 26; i++) {
    map[String(i + 1)] = LETTERS[(i + shift + 26) % 26]!;
  }
  return map;
}

export function decodeCipher(cipher: string, map: Record<string, string>): string {
  return cipher
    .trim()
    .split(/\s+/)
    .map((token) => map[token] ?? '?')
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export function encodeCipher(text: string, map: Record<string, string>): string {
  const inverse = new Map<string, string>();
  for (const [num, letter] of Object.entries(map)) {
    inverse.set(letter.toUpperCase(), num);
  }
  return text
    .toUpperCase()
    .split('')
    .map((ch) => {
      if (ch === ' ') {
        return inverse.get(' ') ?? '0';
      }
      return inverse.get(ch) ?? '?';
    })
    .join(' ');
}

export function decodeWithPage(cipher: string, page: DecoderPage): string {
  return decodeCipher(cipher, page.map);
}
