// Все операции с AsyncStorage в одном месте
// Используй эти функции везде — не обращайся к AsyncStorage напрямую

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';

// ─── СПИСКИ ────────────────────────────────────────────────────────────────

// Получить все списки
export const getLists = async () => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.LISTS);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

// Сохранить все списки
export const saveLists = async (lists) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(lists));
  } catch (e) {
    console.log('saveLists error:', e);
  }
};

// Создать новый список
export const createList = async ({ name, icon, color }) => {
  const lists = await getLists();
  const newList = {
    id: Date.now().toString(),
    name,
    icon,
    color,
    items: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  lists.unshift(newList); // добавляем в начало
  await saveLists(lists);
  return newList;
};

// Получить один список по ID
export const getListById = async (listId) => {
  const lists = await getLists();
  return lists.find(l => l.id === listId) || null;
};

// Обновить список целиком
export const updateList = async (updatedList) => {
  const lists = await getLists();
  const index = lists.findIndex(l => l.id === updatedList.id);
  if (index !== -1) {
    lists[index] = { ...updatedList, updatedAt: new Date().toISOString() };
    await saveLists(lists);
  }
};

// Завершить список (отправить в историю)
export const completeList = async (listId) => {
  const lists = await getLists();
  const index = lists.findIndex(l => l.id === listId);
  if (index === -1) return;
  lists[index].completedAt = new Date().toISOString();
  lists[index].updatedAt = new Date().toISOString();
  await saveLists(lists);
};

// Восстановить список из истории
export const restoreList = async (listId) => {
  const lists = await getLists();
  const index = lists.findIndex(l => l.id === listId);
  if (index === -1) return;
  delete lists[index].completedAt;
  lists[index].updatedAt = new Date().toISOString();
  await saveLists(lists);
};

// Удалить список
export const deleteList = async (listId) => {
  const lists = await getLists();
  await saveLists(lists.filter(l => l.id !== listId));
};

// ─── ТОВАРЫ В СПИСКЕ ────────────────────────────────────────────────────────

// Добавить товар в список
export const addItemToList = async (listId, item) => {
  const lists = await getLists();
  const index = lists.findIndex(l => l.id === listId);
  if (index === -1) return;

  const newItem = {
    id: Date.now().toString(),
    name: item.name,
    category: item.category || 'other',
    unit: item.unit || 'шт',
    quantity: item.quantity || 1,
    price: item.price || 0,
    emoji: item.emoji || '📦',
    checked: false,
    addedAt: new Date().toISOString(),
  };

  lists[index].items.push(newItem);
  lists[index].updatedAt = new Date().toISOString();
  await saveLists(lists);
  return newItem;
};

// Добавить сразу несколько товаров (из шаблона или AI)
export const addItemsToList = async (listId, items) => {
  const lists = await getLists();
  const index = lists.findIndex(l => l.id === listId);
  if (index === -1) return;

  const newItems = items.map(item => ({
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    name: item.name,
    category: item.category || 'other',
    unit: item.unit || 'шт',
    quantity: item.quantity || 1,
    price: item.price || 0,
    emoji: item.emoji || '📦',
    checked: false,
    addedAt: new Date().toISOString(),
  }));

  lists[index].items.push(...newItems);
  lists[index].updatedAt = new Date().toISOString();
  await saveLists(lists);
};

// Отметить/снять галочку на товаре
export const toggleItemChecked = async (listId, itemId) => {
  const lists = await getLists();
  const listIndex = lists.findIndex(l => l.id === listId);
  if (listIndex === -1) return;

  const itemIndex = lists[listIndex].items.findIndex(i => i.id === itemId);
  if (itemIndex === -1) return;

  lists[listIndex].items[itemIndex].checked = !lists[listIndex].items[itemIndex].checked;
  lists[listIndex].updatedAt = new Date().toISOString();
  await saveLists(lists);
};

// Обновить товар в списке
export const updateItemInList = async (listId, itemId, changes) => {
  const lists = await getLists();
  const listIndex = lists.findIndex(l => l.id === listId);
  if (listIndex === -1) return;

  const itemIndex = lists[listIndex].items.findIndex(i => i.id === itemId);
  if (itemIndex === -1) return;

  lists[listIndex].items[itemIndex] = {
    ...lists[listIndex].items[itemIndex],
    ...changes,
  };
  lists[listIndex].updatedAt = new Date().toISOString();
  await saveLists(lists);
};

// Удалить товар из списка
export const removeItemFromList = async (listId, itemId) => {
  const lists = await getLists();
  const index = lists.findIndex(l => l.id === listId);
  if (index === -1) return;

  lists[index].items = lists[index].items.filter(i => i.id !== itemId);
  lists[index].updatedAt = new Date().toISOString();
  await saveLists(lists);
};

// Снять все галочки в списке (начать покупку заново)
export const resetCheckedItems = async (listId) => {
  const lists = await getLists();
  const index = lists.findIndex(l => l.id === listId);
  if (index === -1) return;

  lists[index].items = lists[index].items.map(i => ({ ...i, checked: false }));
  lists[index].updatedAt = new Date().toISOString();
  await saveLists(lists);
};

// Удалить отмеченные товары из списка
export const removeCheckedItems = async (listId) => {
  const lists = await getLists();
  const index = lists.findIndex(l => l.id === listId);
  if (index === -1) return;

  lists[index].items = lists[index].items.filter(i => !i.checked);
  lists[index].updatedAt = new Date().toISOString();
  await saveLists(lists);
};

// ─── НАСТРОЙКИ ──────────────────────────────────────────────────────────────

export const getSettings = async () => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return json ? JSON.parse(json) : { isPremium: false, aiHintsUsedToday: 0, aiHintsDate: '' };
  } catch {
    return { isPremium: false, aiHintsUsedToday: 0, aiHintsDate: '' };
  }
};

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.log('saveSettings error:', e);
  }
};
