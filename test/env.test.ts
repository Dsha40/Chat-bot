import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.ts';

describe('loadEnv', () => {
  it('fixes common .env copy/paste mistakes', () => {
    const env = loadEnv({
      LLM_MODEL: 'LLM_MODEL=gemini-3.5-flash-lite',
      LLM_FALLBACK_MODEL: ' "models/gemini-3.7-flash" ',
      GOOGLE_GENERATIVE_AI_API_KEY: 'GOOGLE_GENERATIVE_AI_API_KEY=AIzaTest',
    });
    expect(env.LLM_MODEL).toBe('gemini-3.5-flash-lite');
    expect(env.LLM_FALLBACK_MODEL).toBe('gemini-3.7-flash');
    expect(env.GOOGLE_GENERATIVE_AI_API_KEY).toBe('AIzaTest');
  });

  it('uses defaults when values are empty', () => {
    const env = loadEnv({ LLM_MODEL: '', DEBOUNCE_MS: '' });
    expect(env.LLM_MODEL).toBe('gemini-3.5-flash-lite');
  });
});
