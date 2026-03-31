// Парсинг текстового/голосового ввода в структуру товара
// Примеры: "два литра молока", "хлеб 2 шт", "сахар 1 кг"

import { UNITS } from '../config/constants';
import { detectCategory } from '../data/categories';
import { PRODUCTS } from '../data/products';

// Числа прописью → цифры
const WORDS_TO_NUMBERS = {
  'один': 1, 'одну': 1, 'одна': 1, 'одно': 1,
  'два': 2, 'две': 2,
  'три': 3, 'четыре': 4, 'пять': 5, 'шесть': 6,
  'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10,
  'полкило': 0.5, 'полкилограмма': 0.5,
  'полтора': 1.5, 'полторы': 1.5,
};

// Разобрать строку в товар
// Возвращает { name, quantity, unit, category, emoji }
export const parseItemText = (text) => {
  let input = text.trim().toLowerCase();

  // Заменяем числа прописью
  for (const [word, num] of Object.entries(WORDS_TO_NUMBERS)) {
    input = input.replace(new RegExp(`\\b${word}\\b`, 'g'), num.toString());
  }

  // Ищем количество (число в начале или конце)
  let quantity = 1;
  const numMatch = input.match(/(\d+([.,]\d+)?)/);
  if (numMatch) {
    quantity = parseFloat(numMatch[1].replace(',', '.'));
    input = input.replace(numMatch[0], '').trim();
  }

  // Ищем единицу измерения
  let unit = 'шт';
  for (const u of UNITS) {
    const pattern = new RegExp(`\\b${u.id}\\b`, 'i');
    if (pattern.test(input)) {
      unit = u.id;
      input = input.replace(pattern, '').trim();
      break;
    }
  }

  // Чистим лишние слова
  const stopWords = ['купи', 'добавь', 'нужно', 'нужен', 'нужна', 'возьми', 'положи'];
  for (const word of stopWords) {
    input = input.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
  }

  // Капитализируем первую букву
  const name = input.charAt(0).toUpperCase() + input.slice(1);

  // Ищем в базе продуктов для получения emoji
  const found = PRODUCTS.find(p => p.name.toLowerCase().includes(name.toLowerCase()));

  return {
    name: found ? found.name : name,
    quantity,
    unit: found ? found.unit : unit,
    category: detectCategory(name),
    emoji: found ? found.emoji : '📦',
  };
};

// Разобрать несколько товаров из одного текста
// "молоко и хлеб и яйца" → [{молоко}, {хлеб}, {яйца}]
export const parseMultipleItems = (text) => {
  const parts = text
    .split(/\s+и\s+|\s*,\s*|\s*;\s*/)
    .map(p => p.trim())
    .filter(p => p.length > 1);

  return parts.map(parseItemText);
};
