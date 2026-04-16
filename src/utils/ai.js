import { DEEPSEEK, AI_SYSTEM_PROMPT } from '../config/api';

export const isAIConfigured = () => !!DEEPSEEK.API_KEY;

export const askAIForProducts = async (query) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(DEEPSEEK.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK.API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK.MODEL,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) return null;

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;

    // Парсим ответ — каждая строка это товар
    const items = text
      .split('\n')
      .map(line => line.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter(line => line.length > 1)
      .map(name => ({
        name,
        category: 'other',
        unit: 'шт',
        quantity: 1,
        emoji: '📦',
      }));

    return items.length > 0 ? items : null;
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') return 'timeout';
    return null;
  }
};
