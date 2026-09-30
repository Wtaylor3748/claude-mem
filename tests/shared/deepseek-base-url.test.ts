import { describe, expect, it } from 'bun:test';
import { resolveDeepSeekChatCompletionsUrl } from '../../src/shared/deepseek-base-url.js';

describe('resolveDeepSeekChatCompletionsUrl', () => {
  it('defaults to api.deepseek.com when unset or blank', () => {
    const expected = 'https://api.deepseek.com/chat/completions';
    expect(resolveDeepSeekChatCompletionsUrl(undefined)).toBe(expected);
    expect(resolveDeepSeekChatCompletionsUrl(null)).toBe(expected);
    expect(resolveDeepSeekChatCompletionsUrl('  ')).toBe(expected);
  });

  it('appends /chat/completions to a custom base and normalizes slashes', () => {
    expect(resolveDeepSeekChatCompletionsUrl('https://gw.example.com/v1/')).toBe('https://gw.example.com/v1/chat/completions');
  });

  it('uses a full chat/completions URL verbatim', () => {
    expect(resolveDeepSeekChatCompletionsUrl('https://gw.example.com/chat/completions')).toBe('https://gw.example.com/chat/completions');
  });
});
