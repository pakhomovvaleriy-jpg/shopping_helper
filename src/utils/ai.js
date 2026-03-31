// AI подсказки через наш сервер anna-api.duckdns.org
// Сервер сам подбирает список продуктов по запросу

const API_URL = 'http://155.212.133.209:5050';

export const askAIForProducts = async (query) => {
  try {
    const response = await fetch(`${API_URL}/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      timeout: 15000,
    });

    const data = await response.json();

    if (data.error) {
      console.log('Suggest error:', data.error);
      return null;
    }

    // Преобразуем список строк в объекты товаров
    return data.items.map(name => ({
      name,
      category: 'other',
      unit: 'шт',
      quantity: 1,
      emoji: '📦',
    }));
  } catch (e) {
    console.log('AI request error:', e.message);
    return null;
  }
};

export const isAIConfigured = () => true;
