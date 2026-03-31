// Экран 3: Добавить товар
// Ручной ввод + автодополнение + AI подсказки
// Голосовой ввод (заглушка — подключается через Yandex SpeechKit)

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, FlatList, Alert, Platform, StatusBar,
} from 'react-native';
import { COLORS } from '../config/colors';
import { CATEGORIES, UNITS, DEFAULT_CATEGORY } from '../config/constants';
import { globalStyles, theme } from '../styles/theme';
import { addItemToList, addItemsToList } from '../utils/storage';
import { searchProducts } from '../data/products';
import { parseMultipleItems } from '../utils/parser';
import { askAIForProducts, isAIConfigured } from '../utils/ai';

// Популярные запросы для AI подсказок (примеры)
const AI_QUICK_PROMPTS = [
  'для борща', 'для плова', 'для салата Оливье',
  'для пирогов', 'завтраки на неделю', 'для шашлыка',
  'для детей', 'бытовая химия', 'для окрошки',
];

export default function AddItemScreen({ navigate, params }) {
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
  const handleSelectSuggestion = (product) => {
    setItemName(product.name);
    setItemUnit(product.unit);
    setItemCategory(product.category);
    setItemEmoji(product.emoji);
    setItemQty('1');
    setInputText(product.name);
    setSuggestions([]);
  };

  // Подтвердить ввод текста (если нет выбора из списка)
  const handleConfirmText = () => {
    if (!inputText.trim()) return;
    const parsed = parseMultipleItems(inputText);
    if (parsed.length > 0) {
      const first = parsed[0];
      setItemName(first.name);
      setItemUnit(first.unit);
      setItemCategory(first.category);
      setItemEmoji(first.emoji);
      setItemQty(first.quantity.toString());
    }
    setSuggestions([]);
  };

  // Добавить товар в список
  const handleAdd = async () => {
    const name = itemName.trim() || inputText.trim();
    if (!name) {
      Alert.alert('Введите название товара');
      return;
    }
    setAdding(true);
    await addItemToList(listId, {
      name,
      quantity: parseFloat(itemQty) || 1,
      unit: itemUnit,
      price: parseFloat(itemPrice) || 0,
      category: itemCategory,
      emoji: itemEmoji,
    });
    // Сброс формы
    setInputText('');
    setItemName('');
    setItemQty('1');
    setItemUnit('шт');
    setItemPrice('');
    setItemCategory(DEFAULT_CATEGORY);
    setItemEmoji('📦');
    setSuggestions([]);
    setAdding(false);
    Alert.alert('', `✅ "${name}" добавлен в список`, [{ text: 'OK' }]);
  };

  // AI: спросить что купить
  const handleAskAI = async (query) => {
    const q = query || aiQuery;
    if (!q.trim()) return;

    if (!isAIConfigured()) {
      Alert.alert(
        'AI не настроен',
        'Добавьте ключи GigaChat в файл src/config/api.js',
        [{ text: 'OK' }],
      );
      return;
    }

    setAiLoading(true);
    setAiResults([]);
    const results = await askAIForProducts(q);
    setAiLoading(false);

    if (!results || results.length === 0) {
      Alert.alert('AI не ответил', 'Попробуйте ещё раз или проверьте интернет');
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

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('shopping', { listId })} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Добавить товар</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ─── Ввод товара ─── */}
        <View style={globalStyles.card}>
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
                  <Text style={globalStyles.textSecondary}>{product.unit}</Text>
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

              <Text style={styles.detailLabel}>Цена за единицу (₽)</Text>
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
            style={[globalStyles.btnPrimary, { marginTop: 12 }, adding && { opacity: 0.6 }]}
            onPress={handleAdd}
            disabled={adding}
          >
            <Text style={globalStyles.btnPrimaryText}>
              {adding ? 'Добавляю...' : '+ Добавить в список'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── AI подсказки ─── */}
        <View style={[globalStyles.card, styles.aiCard]}>
          <TouchableOpacity
            style={styles.aiHeader}
            onPress={() => setShowAIPanel(!showAIPanel)}
          >
            <Text style={styles.sectionTitle}>💡 Подсказка AI</Text>
            <Text style={styles.aiToggle}>{showAIPanel ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showAIPanel && (
            <>
              <Text style={globalStyles.textSecondary}>
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
                  <Text style={styles.aiResultsTitle}>AI предлагает:</Text>
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
                  <TouchableOpacity
                    style={[globalStyles.btnPrimary, { marginTop: 12 }]}
                    onPress={handleAddAllAI}
                  >
                    <Text style={globalStyles.btnPrimaryText}>
                      Добавить выбранное ({Object.values(aiSelected).filter(Boolean).length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : theme.spacing.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: theme.spacing.sm,
  },
  backBtnText: {
    fontSize: theme.font.title,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  mainInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: theme.font.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    marginBottom: 8,
  },
  suggestionsBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  suggestionEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  suggestionName: {
    flex: 1,
    fontSize: theme.font.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  itemDetails: {
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.background,
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
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qtyInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: theme.radius.sm,
    padding: 8,
    width: 70,
    textAlign: 'center',
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  unitBtnSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unitBtnText: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  // AI панель
  aiCard: {
    borderWidth: 1.5,
    borderColor: COLORS.aiBorder,
    backgroundColor: COLORS.aiBackground,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiToggle: {
    fontSize: 16,
    color: COLORS.aiText,
  },
  quickPromptsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickPromptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: theme.radius.round,
    borderWidth: 1,
    borderColor: COLORS.aiBorder,
  },
  quickPromptText: {
    fontSize: theme.font.small,
    color: COLORS.aiText,
    fontWeight: '600',
  },
  aiInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  aiAskBtn: {
    backgroundColor: COLORS.aiText,
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
    backgroundColor: COLORS.surface,
    borderRadius: theme.radius.md,
  },
  aiResultsTitle: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: COLORS.aiText,
    marginBottom: 8,
  },
  aiResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderRadius: 6,
  },
  aiResultItemSelected: {
    backgroundColor: COLORS.aiBackground,
  },
  aiCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.textHint,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCheckboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
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
    color: COLORS.textPrimary,
  },
});
