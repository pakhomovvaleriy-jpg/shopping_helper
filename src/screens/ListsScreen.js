// Экран 1: Мои списки
// Показывает все созданные списки покупок
// Позволяет создать новый список (вручную или из шаблона)

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Modal, TextInput, ScrollView,
  Alert, RefreshControl, Platform, StatusBar,
} from 'react-native';
import { COLORS } from '../config/colors';
import { LIST_ICONS, LIST_COLORS } from '../config/constants';
import { globalStyles, theme } from '../styles/theme';
import { getLists, createList, deleteList, addItemsToList, restoreList } from '../utils/storage';
import { TEMPLATES } from '../data/templates';

export default function ListsScreen({ navigate }) {
  const [lists, setLists] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Модалка создания нового списка
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(LIST_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(LIST_COLORS[0]);

  // Модалка выбора шаблона
  const [showTemplates, setShowTemplates] = useState(false);

  const loadLists = useCallback(async () => {
    const data = await getLists();
    setLists(data);
  }, []);

  // Загружаем при каждом открытии экрана
  React.useEffect(() => {
    loadLists();
  }, [loadLists]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLists();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      Alert.alert('Введите название', 'Напишите название списка перед созданием');
      return;
    }
    try {
      await createList({ name, icon: selectedIcon.emoji, color: selectedColor });
      setNewName('');
      setShowCreate(false);
      loadLists();
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось создать список. Попробуйте ещё раз.');
    }
  };

  const handleDeleteList = (listId, listName) => {
    Alert.alert(
      'Удалить список?',
      `Список "${listName}" будет удалён безвозвратно`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить', style: 'destructive',
          onPress: async () => {
            await deleteList(listId);
            loadLists();
          },
        },
      ],
    );
  };

  const handleUseTemplate = async (template) => {
    const list = await createList({
      name: template.label,
      icon: template.emoji,
      color: LIST_COLORS[Math.floor(Math.random() * LIST_COLORS.length)],
    });
    await addItemsToList(list.id, template.items);
    setShowTemplates(false);
    loadLists();
  };

  const handleRestoreList = (listId, listName) => {
    Alert.alert('Восстановить список?', `"${listName}" вернётся в активные`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Восстановить', onPress: async () => { await restoreList(listId); loadLists(); } },
    ]);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return `${d.getDate()} ${['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][d.getMonth()]} ${d.getFullYear()}`;
  };

  // Краткая статистика для карточки списка
  const getListStats = (list) => {
    const total = list.items.length;
    const checked = list.items.filter(i => i.checked).length;
    return { total, checked };
  };

  const renderListCard = ({ item }) => {
    const { total, checked } = getListStats(item);
    const progress = total > 0 ? checked / total : 0;

    return (
      <View style={[globalStyles.card, styles.listCard]}>
        {/* Цветная полоска слева */}
        <View style={[styles.colorBar, { backgroundColor: item.color }]} />

        <TouchableOpacity
          style={styles.listCardContent}
          onPress={() => navigate('shopping', { listId: item.id })}
          activeOpacity={0.85}
        >
          <View style={styles.listCardHeader}>
            <Text style={styles.listIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.listName}>{item.name}</Text>
              <Text style={globalStyles.textSecondary}>
                {total === 0
                  ? 'Список пуст'
                  : `${checked} из ${total} куплено`}
              </Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </View>

          {/* Прогресс-бар */}
          {total > 0 && (
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, {
                width: `${progress * 100}%`,
                backgroundColor: item.color,
              }]} />
            </View>
          )}
        </TouchableOpacity>

        {/* Кнопка удалить */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteList(item.id, item.name)}
        >
          <Text style={styles.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const activeLists = lists.filter(l => !l.completedAt);
  const completedLists = lists.filter(l => l.completedAt)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  const renderHistoryCard = ({ item }) => {
    const { total } = getListStats(item);
    const totalSum = item.items
      .filter(i => i.price > 0)
      .reduce((s, i) => s + i.quantity * i.price, 0);

    return (
      <View style={[globalStyles.card, styles.listCard, styles.historyCard]}>
        <View style={[styles.colorBar, { backgroundColor: item.color, opacity: 0.4 }]} />
        <View style={styles.listCardContent}>
          <View style={styles.listCardHeader}>
            <Text style={styles.listIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.listName, { color: COLORS.textSecondary }]}>{item.name}</Text>
              <Text style={globalStyles.textSecondary}>
                {total} товаров · {formatDate(item.completedAt)}
                {totalSum > 0 ? ` · ${totalSum.toFixed(0)} ₽` : ''}
              </Text>
            </View>
            <Text style={styles.doneIcon}>✓</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleRestoreList(item.id, item.name)}
        >
          <Text style={styles.deleteBtnText}>↩</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteList(item.id, item.name)}
        >
          <Text style={styles.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <Text style={globalStyles.screenHeader}>Мои списки</Text>
        <TouchableOpacity
          style={styles.templateBtn}
          onPress={() => setShowTemplates(true)}
        >
          <Text style={styles.templateBtnText}>📋 Шаблоны</Text>
        </TouchableOpacity>
      </View>

      {/* Список */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeLists.length === 0 && completedLists.length === 0 && (
          <View style={globalStyles.emptyContainer}>
            <Text style={{ fontSize: 64 }}>🛒</Text>
            <Text style={globalStyles.emptyText}>
              У вас пока нет списков.{'\n'}Создайте первый!
            </Text>
          </View>
        )}

        {activeLists.map(item => (
          <View key={item.id}>{renderListCard({ item })}</View>
        ))}

        {completedLists.length > 0 && (
          <View style={styles.historySection}>
            <TouchableOpacity
              style={styles.historyToggle}
              onPress={() => setShowHistory(!showHistory)}
            >
              <Text style={styles.historyToggleText}>
                📦 История покупок ({completedLists.length})
              </Text>
              <Text style={styles.historyToggleArrow}>{showHistory ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showHistory && completedLists.map(item => (
              <View key={item.id}>{renderHistoryCard({ item })}</View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Кнопка создать */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+ Новый список</Text>
      </TouchableOpacity>

      {/* Модалка: создать список */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Новый список</Text>

            <TextInput
              style={styles.input}
              placeholder="Название списка..."
              value={newName}
              onChangeText={setNewName}
              autoFocus
              maxLength={40}
            />

            {/* Выбор иконки */}
            <Text style={styles.modalLabel}>Иконка — {selectedIcon.label}</Text>
            <View style={styles.iconsRow}>
              {LIST_ICONS.map(icon => (
                <TouchableOpacity
                  key={icon.emoji}
                  style={[styles.iconBtn, selectedIcon.emoji === icon.emoji && styles.iconBtnSelected]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Text style={styles.iconBtnText}>{icon.emoji}</Text>
                  <Text style={styles.iconBtnLabel}>{icon.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Выбор цвета */}
            <Text style={styles.modalLabel}>Цвет</Text>
            <View style={styles.colorsRow}>
              {LIST_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorDot, { backgroundColor: color },
                    selectedColor === color && styles.colorDotSelected]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[globalStyles.btnOutline, { flex: 1, marginRight: 8 }]}
                onPress={() => { setShowCreate(false); setNewName(''); }}
              >
                <Text style={globalStyles.btnOutlineText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[globalStyles.btnPrimary, { flex: 1 }]}
                onPress={handleCreate}
              >
                <Text style={globalStyles.btnPrimaryText}>Создать</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка: шаблоны */}
      <Modal visible={showTemplates} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Шаблоны списков</Text>
            <ScrollView>
              {TEMPLATES.map(template => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateItem}
                  onPress={() => handleUseTemplate(template)}
                >
                  <Text style={styles.templateEmoji}>{template.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.templateName}>{template.label}</Text>
                    <Text style={globalStyles.textSecondary}>{template.description}</Text>
                    <Text style={styles.templateCount}>{template.items.length} товаров</Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[globalStyles.btnOutline, { marginTop: 12 }]}
              onPress={() => setShowTemplates(false)}
            >
              <Text style={globalStyles.btnOutlineText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: COLORS.background,
  },
  templateBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.round,
  },
  templateBtnText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: theme.font.small,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  listCard: {
    flexDirection: 'row',
    padding: 0,
    overflow: 'hidden',
  },
  colorBar: {
    width: 5,
    borderRadius: 0,
  },
  listCardContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  listCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listIcon: {
    fontSize: 28,
    marginRight: theme.spacing.sm,
  },
  listName: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  arrowIcon: {
    fontSize: 28,
    color: COLORS.textHint,
    marginLeft: 4,
  },
  deleteBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  deleteBtnText: {
    fontSize: 20,
  },
  progressBg: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: COLORS.primary,
    borderRadius: theme.radius.round,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: theme.font.subtitle,
    fontWeight: '700',
  },
  // Модалка
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.font.title,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: theme.spacing.md,
  },
  modalLabel: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: theme.font.subtitle,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  iconsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconBtn: {
    width: 56,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  iconBtnText: {
    fontSize: 22,
  },
  iconBtnLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: COLORS.textPrimary,
    transform: [{ scale: 1.2 }],
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
  },
  historySection: {
    marginTop: 8,
    marginBottom: 16,
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  historyToggleText: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  historyToggleArrow: {
    fontSize: 14,
    color: COLORS.textHint,
  },
  historyCard: {
    opacity: 0.75,
  },
  doneIcon: {
    fontSize: 20,
    color: COLORS.success,
    fontWeight: '700',
    marginLeft: 4,
  },
  // Шаблоны
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  templateEmoji: {
    fontSize: 32,
    marginRight: theme.spacing.sm,
  },
  templateName: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  templateCount: {
    fontSize: theme.font.small,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
});
