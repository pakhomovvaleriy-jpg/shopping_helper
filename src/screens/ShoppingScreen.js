// Экран 2: Список покупок
// Показывает товары сгруппированные по категориям
// Галочки, удаление, переход к добавлению

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  StyleSheet, Alert, ScrollView, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import SwipeableRow from '../components/SwipeableRow';
import { CATEGORIES, UNITS } from '../config/constants';
import { theme } from '../styles/theme';
import {
  getListById, toggleItemChecked, removeItemFromList,
  resetCheckedItems, removeCheckedItems, updateItemInList, completeList, saveItemPrice, getSettings,
} from '../utils/storage';
import { logCompleteList } from '../utils/analytics';

const SORT_MODES = [
  { id: 'category', label: 'По категориям', short: 'Категории' },
  { id: 'alpha',    label: 'По алфавиту',   short: 'Алфавит' },
  { id: 'price',    label: 'По цене',        short: 'Цена' },
  { id: 'added',    label: 'По добавлению',  short: 'Порядок' },
];

export default function ShoppingScreen({ navigate, params }) {
  const { colors: C, gs } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C, insets), [C, insets]);
  const { listId } = params;
  const [list, setList] = useState(null);

  // Поиск
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Сортировка
  const [sortMode, setSortMode] = useState('category');

  // Редактирование товара
  const [editItem, setEditItem] = useState(null); // товар для редактирования
  const [editQty, setEditQty] = useState('1');
  const [editUnit, setEditUnit] = useState('шт');
  const [editPrice, setEditPrice] = useState('');

  const loadList = useCallback(async () => {
    const data = await getListById(listId);
    setList(data);
  }, [listId]);

  React.useEffect(() => {
    loadList();
  }, [loadList]);

  React.useEffect(() => {
    getSettings().then(s => setSortMode(s.defaultSort || 'category')).catch(() => {});
  }, []);

  const handleToggle = async (itemId) => {
    await toggleItemChecked(listId, itemId);
    loadList();
  };

  const handleCompleteList = () => {
    Alert.alert(
      '🎉 Завершить список?',
      'Список будет перемещён в историю покупок',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Завершить',
          onPress: async () => {
            await completeList(listId);
            logCompleteList();
            navigate('lists');
          },
        },
      ],
    );
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setEditQty(item.quantity.toString());
    setEditUnit(item.unit);
    setEditPrice(item.price ? item.price.toString() : '');
  };

  const handleSaveEdit = async () => {
    const price = parseFloat(editPrice) || 0;
    await updateItemInList(listId, editItem.id, {
      quantity: parseFloat(editQty) || 1,
      unit: editUnit,
      price,
    });
    if (price > 0) await saveItemPrice(editItem.name, price, editUnit);
    setEditItem(null);
    loadList();
  };

  const handleRemoveItem = async (itemId) => {
    await removeItemFromList(listId, itemId);
    setEditItem(null);
    loadList();
  };

  const handleResetAll = async () => {
    Alert.alert('Начать заново?', 'Все галочки будут сняты', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Сбросить',
        onPress: async () => {
          await resetCheckedItems(listId);
          loadList();
        },
      },
    ]);
  };

  const handleShare = async () => {
    const unchecked = items.filter(i => !i.checked);
    const checked = items.filter(i => i.checked);
    const formatItem = (i, done) =>
      `${done ? '✅' : '⬜'} ${i.emoji} ${i.name} — ${i.quantity} ${i.unit}`;

    const lines = [
      `${list.icon} ${list.name}`,
      '',
      ...[...unchecked, ...checked].map(i => formatItem(i, i.checked)),
    ];
    if (hasPrices) {
      lines.push('');
      lines.push(`Итого: ${totalSum.toFixed(0)} ₽`);
    }
    try {
      await Share.share({ message: lines.join('\n') });
    } catch (_) {}
  };

  const handleRemoveChecked = async () => {
    const checked = list?.items.filter(i => i.checked).length || 0;
    if (checked === 0) return;
    Alert.alert('Удалить купленное?', `Удалить ${checked} отмеченных товаров?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          await removeCheckedItems(listId);
          loadList();
        },
      },
    ]);
  };

  const items = list?.items || [];
  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;

  // г и мл — итоговая цена, остальные — цена за единицу × количество
  const itemTotal = (item) =>
    (item.unit === 'г' || item.unit === 'мл')
      ? item.price
      : item.quantity * item.price;

  const totalSum = items
    .filter(i => i.price > 0)
    .reduce((sum, i) => sum + itemTotal(i), 0);
  const boughtSum = items
    .filter(i => i.checked && i.price > 0)
    .reduce((sum, i) => sum + itemTotal(i), 0);
  const hasPrices = totalSum > 0;

  // Фильтрация и группировка — хук до раннего return
  const grouped = useMemo(() => {
    const filteredItems = searchText.trim()
      ? items.filter(i => i.name.toLowerCase().includes(searchText.toLowerCase()))
      : items;

    if (sortMode === 'category') {
      const result = CATEGORIES
        .map(cat => ({ ...cat, items: filteredItems.filter(i => i.category === cat.id) }))
        .filter(cat => cat.items.length > 0);
      const otherItems = filteredItems.filter(i => !CATEGORIES.find(c => c.id === i.category));
      if (otherItems.length > 0) {
        result.push({ id: 'other', label: 'Другое', emoji: '📦', colorKey: 'categoryOther', items: otherItems });
      }
      return result;
    }

    const sorted = [...filteredItems];
    if (sortMode === 'alpha') sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    if (sortMode === 'price') {
      sorted.sort((a, b) => {
        const getTotal = (i) => i.price > 0
          ? (i.unit === 'г' || i.unit === 'мл' ? i.price : i.quantity * i.price)
          : -1;
        const aT = getTotal(a);
        const bT = getTotal(b);
        if (aT < 0 && bT < 0) return 0;
        if (aT < 0) return 1;
        if (bT < 0) return -1;
        return bT - aT;
      });
    }
    return [{ id: 'all', label: SORT_MODES.find(s => s.id === sortMode).label, emoji: '📋', colorKey: 'categoryOther', items: sorted }];
  }, [items, sortMode, searchText]);

  if (!list) return (
    <View style={[styles.container, gs.emptyContainer]}>
      <Text style={gs.textSecondary}>Загрузка...</Text>
    </View>
  );

  const renderItem = (item) => (
    <SwipeableRow key={item.id} onDelete={() => handleRemoveItem(item.id)} style={styles.swipeableRow}>
      <TouchableOpacity
        style={[styles.itemRow, item.checked && styles.itemRowChecked]}
        onPress={() => handleToggle(item.id)}
        onLongPress={() => handleOpenEdit(item)}
        activeOpacity={0.7}
      >
        {/* Чекбокс */}
        <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </View>

        {/* Название */}
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
            {item.emoji} {item.name}
          </Text>
          <Text style={gs.textSecondary}>
            {item.quantity} {item.unit}
            {item.price > 0
              ? (item.unit === 'г' || item.unit === 'мл')
                ? `  ·  ${item.price} ₽`
                : `  ·  ${item.price} ₽/${item.unit}`
              : ''}
          </Text>
        </View>
        {item.price > 0 && (
          <Text style={[styles.itemTotal, item.checked && { color: C.textHint }]}>
            {itemTotal(item).toFixed(0)} ₽
          </Text>
        )}
      </TouchableOpacity>
    </SwipeableRow>
  );

  const renderCategory = (cat) => (
    <View key={cat.id} style={styles.categorySection}>
      <View style={[styles.categoryHeader, { borderLeftColor: C[cat.colorKey] }]}>
        <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
        <Text style={styles.categoryLabel}>{cat.label}</Text>
        <Text style={gs.textSecondary}>
          {cat.items.filter(i => i.checked).length}/{cat.items.length}
        </Text>
      </View>
      {cat.items.map(renderItem)}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigate('lists')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ Назад</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.sortBtn}
              onPress={() => {
                const idx = SORT_MODES.findIndex(s => s.id === sortMode);
                setSortMode(SORT_MODES[(idx + 1) % SORT_MODES.length].id);
              }}
            >
              <Text style={styles.sortBtnIcon}>⇅</Text>
              <Text style={styles.sortBtnText}>
                {SORT_MODES.find(s => s.id === sortMode).short}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortBtn, { marginLeft: 6 }]}
              onPress={() => { setShowSearch(!showSearch); setSearchText(''); }}
            >
              <Text style={styles.sortBtnIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortBtn, { marginLeft: 6 }]}
              onPress={handleShare}
            >
              <Text style={styles.sortBtnIcon}>↑</Text>
              <Text style={styles.sortBtnText}>Послать</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {list.icon} {list.name}
        </Text>
        <Text style={styles.headerSubtitle}>
          {checkedCount} из {totalCount} куплено
        </Text>
      </View>

      {/* Строка поиска */}
      {showSearch && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по списку..."
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
            clearButtonMode="while-editing"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.searchClear}>
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Прогресс */}
      {totalCount > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, {
              width: `${(checkedCount / totalCount) * 100}%`,
              backgroundColor: list.color,
            }]} />
          </View>
          {checkedCount === totalCount && totalCount > 0 && (
            <Text style={styles.doneText}>Всё куплено! 🎉</Text>
          )}
        </View>
      )}

      {/* Список по категориям */}
      {items.length === 0 ? (
        <View style={gs.emptyContainer}>
          <Text style={{ fontSize: 64 }}>📝</Text>
          <Text style={gs.emptyText}>Список пуст.{'\n'}Добавьте товары!</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
        >
          {grouped.map(renderCategory)}

          {/* Итоговая сумма */}
          {hasPrices && (
            <View style={styles.totalBox}>
              {boughtSum > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>✅ Куплено</Text>
                  <Text style={styles.totalValue}>{boughtSum.toFixed(0)} ₽</Text>
                </View>
              )}
              {totalSum > boughtSum && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>🛒 Ещё купить</Text>
                  <Text style={styles.totalValue}>{(totalSum - boughtSum).toFixed(0)} ₽</Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.totalFinalRow]}>
                <Text style={styles.totalFinalLabel}>Итого</Text>
                <Text style={styles.totalFinalValue}>{totalSum.toFixed(0)} ₽</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Модальное окно редактирования товара */}
      <Modal
        visible={!!editItem}
        transparent
        animationType="slide"
        onRequestClose={() => setEditItem(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditItem(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editItem?.emoji} {editItem?.name}</Text>

            <Text style={styles.modalLabel}>Количество</Text>
            <TextInput
              style={styles.modalQtyInput}
              value={editQty}
              onChangeText={setEditQty}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />

            <Text style={styles.modalLabel}>
              {(editUnit === 'г' || editUnit === 'мл') ? 'Стоимость товара (₽)' : `Цена за 1 ${editUnit} (₽)`}
            </Text>
            <TextInput
              style={[styles.modalQtyInput, { fontSize: theme.font.body, marginBottom: 16 }]}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="decimal-pad"
              placeholder="Не указана"
              placeholderTextColor="#aaa"
            />

            <Text style={styles.modalLabel}>Единица измерения</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.unitsRow}>
                {UNITS.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.unitBtn, editUnit === u.id && styles.unitBtnSelected]}
                    onPress={() => setEditUnit(u.id)}
                  >
                    <Text style={[styles.unitBtnText, editUnit === u.id && { color: '#fff' }]}>
                      {u.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveEdit}>
              <Text style={styles.modalSaveBtnText}>Сохранить</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalDeleteBtn}
              onPress={() => handleRemoveItem(editItem?.id)}
            >
              <Text style={styles.modalDeleteBtnText}>🗑 Удалить товар</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Нижняя панель действий */}
      <View style={styles.bottomBar}>
        {totalCount > 0 && checkedCount === totalCount ? (
          <TouchableOpacity style={styles.btnSuccess} onPress={handleCompleteList}>
            <Text style={styles.btnText}>🎉 Завершить список</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.bottomActions}>
            {checkedCount > 0 && (
              <TouchableOpacity style={styles.btnSecondary} onPress={handleRemoveChecked}>
                <Text style={styles.btnSecondaryText}>🗑 Купленное</Text>
              </TouchableOpacity>
            )}
            {checkedCount > 0 && (
              <TouchableOpacity style={styles.btnSecondary} onPress={handleResetAll}>
                <Text style={styles.btnSecondaryText}>↩ Сброс</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigate('add', { listId })}
            >
              <Text style={styles.btnText}>+ Добавить</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerActions: {
    flexDirection: 'row',
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: theme.font.title,
    color: C.primary,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: theme.font.small,
    color: C.textSecondary,
    marginTop: 2,
  },
  sortBtn: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
  },
  sortBtnIcon: {
    fontSize: 14,
    color: C.primary,
  },
  sortBtnText: {
    fontSize: 10,
    color: C.textSecondary,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: C.background,
    borderRadius: theme.radius.round,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: theme.font.body,
    color: C.textPrimary,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchClear: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchClearText: {
    fontSize: 16,
    color: C.textHint,
  },
  headerTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: C.textPrimary,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  progressBg: {
    height: 6,
    backgroundColor: C.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  doneText: {
    textAlign: 'center',
    marginTop: 6,
    color: C.success,
    fontWeight: '700',
    fontSize: theme.font.body,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 180,
  },
  categorySection: {
    marginBottom: theme.spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    paddingLeft: 8,
    marginBottom: 6,
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryLabel: {
    flex: 1,
    fontSize: theme.font.body,
    fontWeight: '700',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  swipeableRow: {
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemRowChecked: {
    opacity: 0.55,
    backgroundColor: C.background,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: C.textHint,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  itemName: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: C.textPrimary,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: C.textHint,
  },
  itemTotal: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: C.primary,
    marginLeft: 8,
  },
  totalBox: {
    backgroundColor: C.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  totalFinalRow: {
    borderBottomWidth: 0,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: theme.font.body,
    color: C.textSecondary,
  },
  totalValue: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: C.textSecondary,
  },
  totalFinalLabel: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: C.textPrimary,
  },
  totalFinalValue: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: C.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: insets.bottom + theme.spacing.md,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: theme.radius.round,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnSuccess: {
    backgroundColor: C.success,
    borderRadius: theme.radius.round,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnSecondary: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: theme.radius.round,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: C.background,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: theme.font.small,
  },
  btnSecondaryText: {
    fontSize: theme.font.small,
    fontWeight: '700',
    color: C.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalQtyInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: 24,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: C.background,
  },
  unitsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  unitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  modalSaveBtn: {
    backgroundColor: C.primary,
    borderRadius: theme.radius.round,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalSaveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: theme.font.body,
  },
  modalDeleteBtn: {
    borderRadius: theme.radius.round,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.danger,
  },
  modalDeleteBtnText: {
    color: C.danger,
    fontWeight: '600',
    fontSize: theme.font.body,
  },
});
