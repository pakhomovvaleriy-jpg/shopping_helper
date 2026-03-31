// Экран 2: Список покупок
// Показывает товары сгруппированные по категориям
// Галочки, удаление, переход к добавлению

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Modal,
  StyleSheet, Alert, ScrollView, Platform, StatusBar,
} from 'react-native';
import { COLORS } from '../config/colors';
import { CATEGORIES, UNITS } from '../config/constants';
import { globalStyles, theme } from '../styles/theme';
import {
  getListById, toggleItemChecked, removeItemFromList,
  resetCheckedItems, removeCheckedItems, updateItemInList, completeList,
} from '../utils/storage';

export default function ShoppingScreen({ navigate, params }) {
  const { listId } = params;
  const [list, setList] = useState(null);

  // Поиск
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Сортировка
  const [sortMode, setSortMode] = useState('category'); // category | alpha | price | added

  const SORT_MODES = [
    { id: 'category', label: 'По категориям' },
    { id: 'alpha',    label: 'По алфавиту' },
    { id: 'price',    label: 'По цене' },
    { id: 'added',    label: 'По добавлению' },
  ];

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
    await updateItemInList(listId, editItem.id, {
      quantity: parseFloat(editQty) || 1,
      unit: editUnit,
      price: parseFloat(editPrice) || 0,
    });
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

  if (!list) return (
    <View style={styles.container}>
      <Text style={globalStyles.textSecondary}>Загрузка...</Text>
    </View>
  );

  const items = list.items || [];
  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;

  // Подсчёт сумм
  const totalSum = items
    .filter(i => i.price > 0)
    .reduce((sum, i) => sum + i.quantity * i.price, 0);
  const boughtSum = items
    .filter(i => i.checked && i.price > 0)
    .reduce((sum, i) => sum + i.quantity * i.price, 0);
  const hasPrices = totalSum > 0;

  // Фильтрация по поиску
  const filteredItems = searchText.trim()
    ? items.filter(i => i.name.toLowerCase().includes(searchText.toLowerCase()))
    : items;

  // Сортировка и группировка
  const sortItems = (arr) => {
    const sorted = [...arr];
    if (sortMode === 'alpha') return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    if (sortMode === 'price') return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sortMode === 'added') return sorted; // порядок добавления
    return sorted; // category — группировка ниже
  };

  let grouped = [];
  if (sortMode === 'category') {
    grouped = CATEGORIES
      .map(cat => ({
        ...cat,
        items: filteredItems.filter(i => i.category === cat.id),
      }))
      .filter(cat => cat.items.length > 0);
    const otherItems = filteredItems.filter(i => !CATEGORIES.find(c => c.id === i.category));
    if (otherItems.length > 0) {
      grouped.push({ id: 'other', label: 'Другое', emoji: '📦', colorKey: 'categoryOther', items: otherItems });
    }
  } else {
    grouped = [{ id: 'all', label: SORT_MODES.find(s => s.id === sortMode).label, emoji: '📋', colorKey: 'categoryOther', items: sortItems(filteredItems) }];
  }

  const renderItem = (item) => (
    <TouchableOpacity
      key={item.id}
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
        <Text style={globalStyles.textSecondary}>
          {item.quantity} {item.unit}
          {item.price > 0 ? `  ·  ${item.price} ₽` : ''}
        </Text>
      </View>
      {item.price > 0 && (
        <Text style={[styles.itemTotal, item.checked && { color: COLORS.textHint }]}>
          {(item.quantity * item.price).toFixed(0)} ₽
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderCategory = (cat) => (
    <View key={cat.id} style={styles.categorySection}>
      <View style={[styles.categoryHeader, { borderLeftColor: COLORS[cat.colorKey] }]}>
        <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
        <Text style={styles.categoryLabel}>{cat.label}</Text>
        <Text style={globalStyles.textSecondary}>
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
        <TouchableOpacity onPress={() => navigate('lists')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Назад</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {list.icon} {list.name}
          </Text>
          <Text style={globalStyles.textSecondary}>
            {checkedCount} из {totalCount} куплено
          </Text>
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => {
            const idx = SORT_MODES.findIndex(s => s.id === sortMode);
            setSortMode(SORT_MODES[(idx + 1) % SORT_MODES.length].id);
          }}
        >
          <Text style={styles.sortBtnIcon}>⇅</Text>
          <Text style={styles.sortBtnText}>
            {SORT_MODES.find(s => s.id === sortMode).label.split(' ')[1]}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, { marginLeft: 6 }]}
          onPress={() => { setShowSearch(!showSearch); setSearchText(''); }}
        >
          <Text style={styles.sortBtnIcon}>🔍</Text>
        </TouchableOpacity>
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
        <View style={globalStyles.emptyContainer}>
          <Text style={{ fontSize: 64 }}>📝</Text>
          <Text style={globalStyles.emptyText}>Список пуст.{'\n'}Добавьте товары!</Text>
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

            <Text style={styles.modalLabel}>Цена за единицу (₽)</Text>
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
        {/* Кнопка назад — всегда видна */}
        <TouchableOpacity style={styles.backBigBtn} onPress={() => navigate('lists')}>
          <Text style={styles.backBigBtnText}>← Мои списки</Text>
        </TouchableOpacity>

        {/* Кнопка завершить — когда всё куплено */}
        {totalCount > 0 && checkedCount === totalCount && (
          <TouchableOpacity style={styles.completeBtn} onPress={handleCompleteList}>
            <Text style={styles.completeBtnText}>🎉 Завершить список</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomActions}>
          {checkedCount > 0 && checkedCount < totalCount && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleRemoveChecked}>
              <Text style={styles.actionBtnText}>🗑 Купленное</Text>
            </TouchableOpacity>
          )}
          {checkedCount > 0 && totalCount > checkedCount && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleResetAll}>
              <Text style={styles.actionBtnText}>↩ Сброс</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigate('add', { listId })}
          >
            <Text style={styles.addBtnText}>+ Добавить</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: theme.font.title,
    color: COLORS.primary,
    fontWeight: '600',
  },
  sortBtn: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortBtnIcon: {
    fontSize: 14,
    color: COLORS.primary,
  },
  sortBtnText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: theme.radius.round,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: theme.font.body,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchClear: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchClearText: {
    fontSize: 16,
    color: COLORS.textHint,
  },
  headerTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressBg: {
    height: 6,
    backgroundColor: COLORS.border,
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
    color: COLORS.success,
    fontWeight: '700',
    fontSize: theme.font.body,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
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
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemRowChecked: {
    opacity: 0.55,
    backgroundColor: COLORS.background,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.textHint,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  itemName: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: COLORS.textHint,
  },
  itemTotal: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 8,
  },
  totalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  totalFinalRow: {
    borderBottomWidth: 0,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: theme.font.body,
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  totalFinalLabel: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalFinalValue: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: COLORS.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: theme.spacing.md,
    gap: 8,
  },
  backBigBtn: {
    backgroundColor: COLORS.background,
    borderRadius: theme.radius.round,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.divider,
  },
  backBigBtnText: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: theme.radius.round,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.background,
  },
  actionBtnText: {
    fontSize: theme.font.small,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  addBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: theme.radius.round,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: theme.font.body,
  },
  completeBtn: {
    backgroundColor: COLORS.success,
    borderRadius: theme.radius.round,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  completeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: theme.font.body,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalQtyInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.background,
  },
  unitsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  unitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  modalSaveBtn: {
    backgroundColor: COLORS.primary,
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
    borderColor: COLORS.error || '#e53935',
  },
  modalDeleteBtnText: {
    color: COLORS.error || '#e53935',
    fontWeight: '600',
    fontSize: theme.font.body,
  },
});
