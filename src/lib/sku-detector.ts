/**
 * SKU pattern regex:
 * - Must contain at least one letter (pure digits = barcode, excluded)
 * - Alphanumeric + hyphen/underscore combinations
 * - Length 3~30 characters
 */
const SKU_PATTERN = /(?=[A-Za-z0-9-_]*[A-Za-z])[A-Za-z0-9][-_A-Za-z0-9]{2,29}/g;

const COMMON_WORDS = new Set([
  'THE', 'AND', 'FOR', 'NOT', 'ARE', 'BUT', 'WAS', 'ALL', 'CAN', 'HAD',
  'HER', 'ONE', 'OUR', 'OUT', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'MAY',
  'SAY', 'SHE', 'TWO', 'HOW', 'BOY', 'DID', 'ITS', 'LET', 'PUT', 'TOO',
  'USE', 'SIZE', 'COLOR', 'BLACK', 'WHITE', 'SMALL', 'MEDIUM', 'LARGE',
]);

export function extractSkuCandidates(text: string): string[] {
  const matches = text.match(SKU_PATTERN) || [];
  const unique = [...new Set(matches.map(m => m.toUpperCase()))];
  return unique.filter(m => !COMMON_WORDS.has(m));
}

export function getBestSkuCandidate(text: string): string | null {
  const candidates = extractSkuCandidates(text);
  const sorted = candidates.sort((a, b) => {
    const aHas = /[-_]/.test(a) ? 1 : 0;
    const bHas = /[-_]/.test(b) ? 1 : 0;
    return bHas - aHas || a.length - b.length;
  });
  return sorted[0] ?? null;
}
