/**
 * USD per 1M tokens. Checked 2026-10-01 (see docs/00-benchmark.md §2.2). Update when prices change.
 * Unknown models are logged with cost 0 so usage is still recorded.
 */
const PRICES: { match: RegExp; input: number; cachedInput: number; output: number }[] = [
  { match: /^gemini-2\.5-flash-lite/, input: 0.1, cachedInput: 0.01, output: 0.4 },
  { match: /^gemini-3(\.\d+)?-flash-lite/, input: 0.3, cachedInput: 0.03, output: 2.5 },
  { match: /^gemini-3(\.\d+)?-flash/, input: 0.75, cachedInput: 0.075, output: 3.75 },
  { match: /^gemini-2\.5-flash/, input: 0.3, cachedInput: 0.03, output: 2.5 },
];

export function costUsd(model: string, inputTokens: number, cachedTokens: number, outputTokens: number): number {
  const p = PRICES.find((x) => x.match.test(model));
  if (!p) return 0;
  const uncached = Math.max(0, inputTokens - cachedTokens);
  return (uncached * p.input + cachedTokens * p.cachedInput + outputTokens * p.output) / 1_000_000;
}
