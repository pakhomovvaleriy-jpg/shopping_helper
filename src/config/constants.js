// Константы приложения — всё в одном месте
// Добавляй новые категории, иконки и настройки здесь

// Ключи AsyncStorage
export const STORAGE_KEYS = {
  LISTS: 'shopping_lists',           // все списки покупок
  SETTINGS: 'app_settings',          // настройки приложения
};

// Категории товаров (порядок = порядок в магазине)
export const CATEGORIES = [
  { id: 'vegetables', label: 'Овощи и фрукты',  emoji: '🥦', colorKey: 'categoryVegetables' },
  { id: 'meat',       label: 'Мясо и рыба',     emoji: '🥩', colorKey: 'categoryMeat' },
  { id: 'dairy',      label: 'Молочное',         emoji: '🥛', colorKey: 'categoryDairy' },
  { id: 'bread',      label: 'Хлеб и выпечка',  emoji: '🍞', colorKey: 'categoryBread' },
  { id: 'cereals',    label: 'Крупы и макароны', emoji: '🌾', colorKey: 'categoryCereals' },
  { id: 'frozen',     label: 'Заморозка',        emoji: '🧊', colorKey: 'categoryFrozen' },
  { id: 'drinks',     label: 'Напитки',          emoji: '🧃', colorKey: 'categoryDrinks' },
  { id: 'sweets',     label: 'Сладкое',          emoji: '🍬', colorKey: 'categorySweets' },
  { id: 'cleaning',   label: 'Бытовая химия',    emoji: '🧴', colorKey: 'categoryCleaning' },
  { id: 'other',      label: 'Другое',           emoji: '📦', colorKey: 'categoryOther' },
];

// ID категории по умолчанию
export const DEFAULT_CATEGORY = 'other';

// Лимиты (бесплатная версия)
export const LIMITS = {
  FREE_LISTS: 5,          // максимум списков в бесплатной версии
  FREE_AI_HINTS: 3,       // AI подсказок в день бесплатно
};

// Единицы измерения для товаров
export const UNITS = [
  { id: 'шт',  label: 'шт' },
  { id: 'кг',  label: 'кг' },
  { id: 'г',   label: 'г' },
  { id: 'л',   label: 'л' },
  { id: 'мл',  label: 'мл' },
  { id: 'уп',  label: 'уп' },
  { id: 'пач', label: 'пач' },
  { id: 'бут', label: 'бут' },
];

// Иконки для быстрого выбора при создании списка
export const LIST_ICONS = [
  { emoji: '🛒', label: 'Покупки' },
  { emoji: '🥗', label: 'Еда' },
  { emoji: '🎂', label: 'Праздник' },
  { emoji: '🏠', label: 'Дом' },
  { emoji: '🧹', label: 'Уборка' },
  { emoji: '🍳', label: 'Готовка' },
  { emoji: '🎁', label: 'Подарки' },
  { emoji: '🐾', label: 'Животные' },
  { emoji: '💊', label: 'Аптека' },
  { emoji: '🌿', label: 'Огород' },
];

// Цвета для списков
export const LIST_COLORS = [
  '#e53935', '#e91e63', '#9c27b0', '#3f51b5',
  '#2196f3', '#009688', '#4caf50', '#ff9800',
];
