import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import type { Env } from '../config/env.ts';

/**
 * Model factory. Every provider sits behind this function, so swapping Gemini for another
 * provider (OpenRouter, Groq, Anthropic...) only touches this file.
 */
export interface ModelSet {
  primary: LanguageModel;
  primaryId: string;
  fallback?: LanguageModel;
  fallbackId?: string;
}

export function createModels(env: Env): ModelSet {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY. Get one at https://aistudio.google.com/apikey');
  }
  const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
  return {
    primary: google(env.LLM_MODEL),
    primaryId: env.LLM_MODEL,
    fallback: env.LLM_FALLBACK_MODEL ? google(env.LLM_FALLBACK_MODEL) : undefined,
    fallbackId: env.LLM_FALLBACK_MODEL,
  };
}
