// SPDX-License-Identifier: Apache-2.0

import { resolveOpenRouterChatCompletionsUrl } from './openrouter-base-url.js';

export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

/**
 * Resolve the DeepSeek `/chat/completions` endpoint. DeepSeek's API is
 * OpenAI-compatible, so this reuses the OpenRouter URL normalisation with
 * https://api.deepseek.com as the default when no base URL is configured.
 */
export function resolveDeepSeekChatCompletionsUrl(baseUrl: string | undefined | null): string {
  const trimmed = baseUrl?.trim();
  return resolveOpenRouterChatCompletionsUrl(trimmed ? trimmed : DEFAULT_DEEPSEEK_BASE_URL);
}
