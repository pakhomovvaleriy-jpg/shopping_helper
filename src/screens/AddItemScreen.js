// Экран 3: Добавить товар
// Ручной ввод + автодополнение + AI подбор (DeepSeek)

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { CATEGORIES, UNITS, DEFAULT_CATEGORY } from '../config/constants';
import { theme } from '../styles/theme';
import { addItemToList, addItemsToList, getListById, saveItemPrice, getItemPrice, getSettings } from '../utils/storage';
import { searchProducts } from '../data/products';
import { parseMultipleItems } from '../utils/parser';
import { askAIForProducts, isAIConfigured } from '../utils/ai';
import { logAddItem, logAIRequest } from '../utils/analytics';

// Популярные запросы для AI подсказок (примеры)
const AI_QUICK_PROMPTS = [
  'для борща', 'для плова', 'для салата Оливье',
  'для пирогов', 'завтраки на неделю', 'для шашлыка',
  'для детей', 'бытовая химия', 'для окрошки',
];

export default function AddItemScreen({ navigate, params }) {
  const { colors: C, gs } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C, insets), [C, insets]);
  const { listId } = params;

  // Поле ввода
  const [inputText, setInputText] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Выбранный товар для редактирования перед добавлением
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemUnit, setItemUnit] = useState('шт');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState(DEFAULT_CATEGORY);
  const [itemEmoji, setItemEmoji] = useState('📦');

  // AI состояния
  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState([]);
  const [aiSelected, setAiSelected] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);

  const [adding, setAdding] = useState(false);
  const [listName, setListName] = useState('');
  const [listIcon, setListIcon] = useState('');

  useEffect(() => {
    getListById(listId)
      .then(list => { if (list) { setListName(list.name); setListIcon(list.icon); } })
      .catch(() => {});
  }, [listId]);

  // Обработка ввода текста → автодополнение
  const handleTextChange = (text) => {
    setInputText(text);
    if (text.length >= 2) {
      setSuggestions(searchProducts(text));
    } else {
      setSuggestions([]);
    }
  };

  // Выбрать подсказку из автодополнения
  const handleSelectSuggestion = async (product) => {
    setItemName(product.name);
    setItemUnit(product.unit);
    setItemCategory(product.category);
    setItemEmoji(product.emoji);
    setItemQty('1');
    setInputText(product.name);
    setSuggestions([]);
    const saved = await getItemPrice(product.name);
    if (saved) {
      setItemPrice(saved.price.toString());
      setItemUnit(saved.unit);
    }
  };

  // Подтвердить ввод текста (если нет выбора из списка)
  const handleConfirmText = async () => {
    if (!inputText.trim()) return;
    const parsed = parseMultipleItems(inputText);
    if (parsed.length > 0) {
      const first = parsed[0];
      setItemName(first.name);
      setItemUnit(first.unit);
      setItemCategory(first.category);
      setItemEmoji(first.emoji);
      setItemQty(first.quantity.toString());
      const saved = await getItemPrice(first.name);
      if (saved) {
        setItemPrice(saved.price.toString());
        setItemUnit(saved.unit);
      }
    }
    setSuggestions([]);
  };

  // Добавить товар в список
  const handleAdd = async (force = false) => {
    const name = itemName.trim() || inputText.trim();
    if (!name) {
      Alert.alert('Введите название товара');
      return;
    }

    // Проверка дубликата
    if (!force) {
      const currentList = await getListById(listId);
      const duplicate = currentList?.items.find(
        i => i.name.toLowerCase() === name.toLowerCase() && !i.checked
      );
      if (duplicate) {
        Alert.alert(
          'Товар уже в списке',
          `"${name}" уже есть среди некупленных. Добавить ещё?`,
          [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Добавить ещё', onPress: () => handleAdd(true) },
          ]
        );
        return;
      }
    }

    const price = parseFloat(itemPrice) || 0;
    setAdding(true);
    await addItemToList(listId, {
      name,
      quantity: parseFloat(itemQty) || 1,
      unit: itemUnit,
      price,
      category: itemCategory,
      emoji: itemEmoji,
    });
    if (price > 0) await saveItemPrice(name, price, itemUnit);
    logAddItem();
    const s = await getSettings();
    setInputText('');
    setItemName('');
    setItemQty('1');
    setItemUnit('шт');
    setItemPrice('');
    setItemCategory(DEFAULT_CATEGORY);
    setItemEmoji('📦');
    setSuggestions([]);
    setAdding(false);
    if (!s.stayOnAddScreen) navigate('shopping', { listId });
  };

  // AI: спросить что купить
  const handleAskAI = async (query) => {
    const q = query || aiQuery;
    if (!q.trim()) {
      Alert.alert('Введите запрос', 'Например: "для борща" или "завтраки на неделю"');
      return;
    }

    if (!isAIConfigured()) {
      Alert.alert(
        'AI не настроен',
        'Добавьте API ключ DeepSeek в файл src/config/api.js',
        [{ text: 'OK' }],
      );
      return;
    }

    setAiLoading(true);
    setAiResults([]);
    logAIRequest(q);
    const results = await askAIForProducts(q);
    setAiLoading(false);

    if (results === 'timeout') {
      Alert.alert('Сервер не отвечает', 'Превышено время ожидания. Проверьте интернет и попробуйте ещё раз.');
      return;
    }
    if (!results || results.length === 0) {
      Alert.alert('Нет результатов', 'Попробуйте изменить запрос или проверьте интернет.');
      return;
    }
    setAiResults(results);
    // По умолчанию все выбраны
    const selected = {};
    results.forEach((_, i) => { selected[i] = true; });
    setAiSelected(selected);
  };

  // Добавить все AI результаты в список
  const handleAddAllAI = async () => {
    const selected = aiResults.filter((_, i) => aiSelected[i]);
    if (selected.length === 0) return;
    setAdding(true);
    await addItemsToList(listId, selected);
    setAdding(false);
    setAiResults([]);
    setAiSelected({});
    setAiQuery('');
    setShowAIPanel(false);
    navigate('shopping', { listId });
  };

  // Сбросить результаты AI
  const handleClearAI = () => {
    setAiResults([]);
    setAiSelected({});
    setAiQuery('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('shopping', { listId })} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Назад</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Добавить товар</Text>
          {listName ? (
            <Text style={styles.headerSubtitle}>🛒 {listName}</Text>
          ) : null}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ─── Ввод товара ─── */}
        <View style={gs.card}>
          <Text style={styles.sectionTitle}>⌨️ Введите товар</Text>

          <TextInput
            style={styles.mainInput}
            placeholder="Например: молоко, хлеб и яйца..."
            value={inputText}
            onChangeText={handleTextChange}
            onSubmitEditing={handleConfirmText}
            returnKeyType="done"
            autoCapitalize="sentences"
          />

          {/* Автодополнение */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {suggestions.map(product => (
                <TouchableOpacity
                  key={product.name}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(product)}
                >
                  <Text style={styles.suggestionEmoji}>{product.emoji}</Text>
                  <Text style={styles.suggestionName}>{product.name}</Text>
                  <Text style={gs.textSecondary}>{product.unit}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Детали выбранного товара */}
          {(itemName || inputText) && (
            <View style={styles.itemDetails}>

              {/* Количество + единица в одной строке */}
              <Text style={styles.detailLabel}>Количество и единица измерения</Text>
              <View style={styles.qtyUnitRow}>
                <TextInput
                  style={styles.qtyInput}
                  value={itemQty}
                  onChangeText={setItemQty}
                  keyboardType="decimal-pad"
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                  <View style={styles.unitsRow}>
                    {UNITS.map(u => (
                      <TouchableOpacity
                        key={u.id}
                        style={[styles.unitBtn, itemUnit === u.id && styles.unitBtnSelected]}
                        onPress={() => setItemUnit(u.id)}
                      >
                        <Text style={[styles.unitBtnText, itemUnit === u.id && { color: '#fff' }]}>
                          {u.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <Text style={styles.detailLabel}>
                {(itemUnit === 'г' || itemUnit === 'мл') ? 'Стоимость товара (₽)' : `Цена за 1 ${itemUnit} (₽)`}
              </Text>
              <TextInput
                style={[styles.qtyInput, { width: '100%', marginBottom: 10, textAlign: 'left', paddingHorizontal: 12 }]}
                value={itemPrice}
                onChangeText={setItemPrice}
                keyboardType="decimal-pad"
                placeholder="Необязательно"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.detailLabel}>Категория</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.unitsRow}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.unitBtn, itemCategory === cat.id && styles.unitBtnSelected]}
                      onPress={() => setItemCategory(cat.id)}
                    >
                      <Text style={[styles.unitBtnText, itemCategory === cat.id && { color: '#fff' }]}>
                        {cat.emoji} {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            style={[gs.btnPrimary, { marginTop: 12 }, adding && { opacity: 0.6 }]}
            onPress={handleAdd}
            disabled={adding}
          >
            <Text style={gs.btnPrimaryText}>
              {adding ? 'Добавляю...' : '+ Добавить в список'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── AI подсказки ─── */}
        <View style={[gs.card, styles.aiCard]}>
          <TouchableOpacity
            style={styles.aiHeader}
            onPress={() => setShowAIPanel(!showAIPanel)}
          >
            <Text style={styles.sectionTitle}>🌟 Умный подбор</Text>
            <Text style={styles.aiToggle}>{showAIPanel ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showAIPanel && (
            <>
              <Text style={gs.textSecondary}>
                Спросите что купить для блюда или случая
              </Text>

              {/* Быстрые запросы */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                <View style={styles.quickPromptsRow}>
                  {AI_QUICK_PROMPTS.map(prompt => (
                    <TouchableOpacity
                      key={prompt}
                      style={styles.quickPromptBtn}
                      onPress={() => { setAiQuery(prompt); handleAskAI(prompt); }}
                    >
                      <Text style={styles.quickPromptText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Свой запрос */}
              <View style={styles.aiInputRow}>
                <TextInput
                  style={[styles.mainInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="Свой вопрос..."
                  value={aiQuery}
                  onChangeText={setAiQuery}
                />
                <TouchableOpacity
                  style={styles.aiAskBtn}
                  onPress={() => handleAskAI()}
                  disabled={aiLoading}
                >
                  <Text style={styles.aiAskBtnText}>
                    {aiLoading ? '...' : 'Спросить'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Результаты AI */}
              {aiResults.length > 0 && (
                <View style={styles.aiResults}>
                  <View style={styles.aiResultsHeader}>
                    <Text style={styles.aiResultsTitle}>AI предлагает:</Text>
                    <View style={styles.aiSelectBtns}>
                      <TouchableOpacity
                        onPress={() => {
                          const all = {};
                          aiResults.forEach((_, i) => { all[i] = true; });
                          setAiSelected(all);
                        }}
                      >
                        <Text style={styles.aiSelectBtnText}>Все</Text>
                      </TouchableOpacity>
                      <Text style={styles.aiSelectDivider}>|</Text>
                      <TouchableOpacity onPress={() => setAiSelected({})}>
                        <Text style={styles.aiSelectBtnText}>Снять</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {aiResults.map((item, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.aiResultItem, aiSelected[i] && styles.aiResultItemSelected]}
                      onPress={() => setAiSelected(prev => ({ ...prev, [i]: !prev[i] }))}
                    >
                      <View style={[styles.aiCheckbox, aiSelected[i] && styles.aiCheckboxChecked]}>
                        {aiSelected[i] && <Text style={styles.aiCheckmark}>✓</Text>}
                      </View>
                      <Text style={styles.aiResultEmoji}>{item.emoji}</Text>
                      <Text style={styles.aiResultName}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <View style={styles.aiActionsRow}>
                    <TouchableOpacity
                      style={styles.aiClearBtn}
                      onPress={handleClearAI}
                    >
                      <Text style={styles.aiClearBtnText}>Сбросить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[gs.btnPrimary, { flex: 1 }]}
                      onPress={handleAddAllAI}
                    >
                      <Text style={gs.btnPrimaryText}>
                        Добавить выбранное ({Object.values(aiSelected).filter(Boolean).length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (C, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: insets.top + 8,
    paddingBottom: theme.spacing.sm,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  backBtnText: {
    fontSize: theme.font.title,
    color: C.primary,
    fontWeight: '600',
  },
  headerCenter: {
    marginTop: 2,
  },
  headerTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: C.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.font.small,
    color: C.textSecondary,
    marginTop: 4,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 10,
  },
  mainInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: theme.font.body,
    color: C.textPrimary,
    backgroundColor: C.background,
    marginBottom: 8,
  },
  suggestionsBox: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  suggestionEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  suggestionName: {
    flex: 1,
    fontSize: theme.font.body,
    color: C.textPrimary,
    fontWeight: '500',
  },
  itemDetails: {
    marginTop: 8,
    padding: 12,
    backgroundColor: C.background,
    borderRadius: theme.radius.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: C.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qtyInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: theme.radius.sm,
    padding: 8,
    width: 70,
    textAlign: 'center',
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: C.textPrimary,
    backgroundColor: C.surface,
  },
  qtyUnitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  unitsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.round,
    backgroundColor: C.background,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  unitBtnSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  unitBtnText: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: C.textSecondary,
  },
  // AI панель
  aiCard: {
    borderWidth: 1.5,
    borderColor: C.aiBorder,
    backgroundColor: C.aiBackground,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiToggle: {
    fontSize: 16,
    color: C.aiText,
  },
  quickPromptsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickPromptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.surface,
    borderRadius: theme.radius.round,
    borderWidth: 1,
    borderColor: C.aiBorder,
  },
  quickPromptText: {
    fontSize: theme.font.small,
    color: C.aiText,
    fontWeight: '600',
  },
  aiInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  aiAskBtn: {
    backgroundColor: C.aiText,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  aiAskBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: theme.font.small,
  },
  aiResults: {
    marginTop: 12,
    padding: 12,
    backgroundColor: C.surface,
    borderRadius: theme.radius.md,
  },
  aiResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiResultsTitle: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: C.aiText,
  },
  aiSelectBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiSelectBtnText: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: C.aiText,
  },
  aiSelectDivider: {
    color: C.border,
    fontSize: theme.font.small,
  },
  aiResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    borderRadius: 6,
  },
  aiResultItemSelected: {
    backgroundColor: C.aiBackground,
  },
  aiCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.textHint,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCheckboxChecked: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  aiCheckmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  aiResultEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  aiResultName: {
    fontSize: theme.font.body,
    color: C.textPrimary,
  },
  aiActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  aiClearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  aiClearBtnText: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: C.textSecondary,
  },
});
