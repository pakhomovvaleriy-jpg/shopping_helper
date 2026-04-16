// Экран 1: Мои списки
// Показывает все созданные списки покупок
// Позволяет создать новый список (вручную или из шаблона)

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Modal, TextInput, ScrollView,
  Alert, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { LIST_ICONS, LIST_COLORS } from '../config/constants';
import { theme } from '../styles/theme';
import { getLists, createList, deleteList, addItemsToList, restoreList, updateList } from '../utils/storage';
import { logCreateList } from '../utils/analytics';
import { scheduleListReminder, cancelListReminder } from '../utils/notifications';
import { TEMPLATES } from '../data/templates';

export default function ListsScreen({ navigate }) {
  const { colors: C, gs } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C, insets), [C, insets]);
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

  // Напоминания
  const [reminderList, setReminderList] = useState(null);
  const [reminderDate, setReminderDate] = useState(new Date());
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

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
      logCreateList();
      setNewName('');
      await loadLists();
      setShowCreate(false);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось создать список. Попробуйте ещё раз.');
    }
  };

  const handleDeleteList = (listId, listName) => {
    const list = lists.find(l => l.id === listId);
    Alert.alert(
      'Удалить список?',
      `Список "${listName}" будет удалён безвозвратно`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить', style: 'destructive',
          onPress: async () => {
            if (list?.reminder?.notificationId) {
              await cancelListReminder(list.reminder.notificationId);
            }
            await deleteList(listId);
            loadLists();
          },
        },
      ],
    );
  };

  // Открыть модалку напоминания для списка
  const handleOpenReminder = (list) => {
    const initial = list.reminder?.date
      ? new Date(list.reminder.date)
      : (() => { const n = new Date(); n.setHours(n.getHours() + 1, 0, 0, 0); return n; })();
    setReminderDate(initial);
    setReminderList(list);
    setShowReminderModal(true);
  };

  // Сохранить напоминание
  const handleSaveReminder = async () => {
    if (reminderDate <= new Date()) {
      Alert.alert('Неверное время', 'Выберите время в будущем');
      return;
    }
    if (reminderList.reminder?.notificationId) {
      await cancelListReminder(reminderList.reminder.notificationId);
    }
    const notificationId = await scheduleListReminder(reminderList.id, reminderList.name, reminderDate);
    if (!notificationId) {
      Alert.alert('Нет разрешения', 'Разрешите уведомления в настройках телефона');
      return;
    }
    await updateList({ ...reminderList, reminder: { date: reminderDate.toISOString(), notificationId } });
    setShowReminderModal(false);
    loadLists();
    Alert.alert('Напоминание установлено', formatReminderFull(reminderDate));
  };

  // Удалить напоминание
  const handleRemoveReminder = async () => {
    if (reminderList.reminder?.notificationId) {
      await cancelListReminder(reminderList.reminder.notificationId);
    }
    await updateList({ ...reminderList, reminder: null });
    setShowReminderModal(false);
    loadLists();
  };

  // Форматирование даты/времени напоминания
  const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  const formatReminderDate = (d) =>
    `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const formatReminderTime = (d) =>
    `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  const formatReminderFull = (d) =>
    `${formatReminderDate(d)} в ${formatReminderTime(d)}`;

  const handleUseTemplate = async (template) => {
    const list = await createList({
      name: template.label,
      icon: template.emoji,
      color: LIST_COLORS[Math.floor(Math.random() * LIST_COLORS.length)],
    });
    await addItemsToList(list.id, template.items);
    await loadLists();
    setShowTemplates(false);
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
      <View style={[gs.card, styles.listCard]}>
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
              <Text style={gs.textSecondary}>
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

        {/* Кнопка напоминание */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleOpenReminder(item)}
        >
          <Text style={styles.deleteBtnText}>{item.reminder ? '🔔' : '🔕'}</Text>
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
      .reduce((s, i) => s + ((i.unit === 'г' || i.unit === 'мл') ? i.price : i.quantity * i.price), 0);

    return (
      <View style={[gs.card, styles.listCard, styles.historyCard]}>
        <View style={[styles.colorBar, { backgroundColor: item.color, opacity: 0.4 }]} />
        <View style={styles.listCardContent}>
          <View style={styles.listCardHeader}>
            <Text style={styles.listIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.listName, { color: C.textSecondary }]}>{item.name}</Text>
              <Text style={gs.textSecondary}>
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
        <Text style={gs.screenHeader}>Мои списки</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.templateBtn}
            onPress={() => setShowTemplates(true)}
          >
            <Text style={styles.templateBtnText}>📋 Шаблоны</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() => navigate('help')}
          >
            <Text style={styles.helpBtnText}>?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() => navigate('settings')}
          >
            <Text style={styles.helpBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Список */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeLists.length === 0 && completedLists.length === 0 && (
          <View style={gs.emptyContainer}>
            <Text style={{ fontSize: 64 }}>🛒</Text>
            <Text style={gs.emptyText}>
              У вас пока нет списков.{'\n'}Создайте первый!
            </Text>
          </View>
        )}

        {activeLists.map(item => (
          <React.Fragment key={item.id}>{renderListCard({ item })}</React.Fragment>
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
              <React.Fragment key={item.id}>{renderHistoryCard({ item })}</React.Fragment>
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
                style={[gs.btnOutline, { flex: 1, marginRight: 8 }]}
                onPress={() => { setShowCreate(false); setNewName(''); }}
              >
                <Text style={gs.btnOutlineText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[gs.btnPrimary, { flex: 1 }]}
                onPress={handleCreate}
              >
                <Text style={gs.btnPrimaryText}>Создать</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка: напоминание */}
      <Modal visible={showReminderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              🔔 Напоминание
            </Text>
            {reminderList && (
              <Text style={styles.modalLabel}>
                Список: {reminderList.icon} {reminderList.name}
              </Text>
            )}

            {Platform.OS === 'ios' ? (
              // iOS: единый inline-пикер даты и времени
              <DateTimePicker
                value={reminderDate}
                mode="datetime"
                display="spinner"
                onChange={(_, d) => { if (d) setReminderDate(d); }}
                minimumDate={new Date()}
                locale="ru-RU"
                style={{ marginVertical: 8 }}
              />
            ) : (
              // Android: две кнопки — дата и время — открывают диалоги
              <View style={{ marginVertical: 12 }}>
                <TouchableOpacity
                  style={styles.datePickerRow}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.datePickerLabel}>📅 Дата</Text>
                  <Text style={styles.datePickerValue}>{formatReminderDate(reminderDate)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePickerRow}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.datePickerLabel}>🕐 Время</Text>
                  <Text style={styles.datePickerValue}>{formatReminderTime(reminderDate)}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={reminderDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(e, d) => {
                      setShowDatePicker(false);
                      if (e.type === 'set' && d) {
                        setReminderDate(prev => {
                          const n = new Date(prev);
                          n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                          return n;
                        });
                      }
                    }}
                  />
                )}
                {showTimePicker && (
                  <DateTimePicker
                    value={reminderDate}
                    mode="time"
                    display="default"
                    onChange={(e, d) => {
                      setShowTimePicker(false);
                      if (e.type === 'set' && d) {
                        setReminderDate(prev => {
                          const n = new Date(prev);
                          n.setHours(d.getHours(), d.getMinutes(), 0, 0);
                          return n;
                        });
                      }
                    }}
                  />
                )}
              </View>
            )}

            {/* Кнопки */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[gs.btnOutline, { flex: 1, marginRight: 8 }]}
                onPress={() => setShowReminderModal(false)}
              >
                <Text style={gs.btnOutlineText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[gs.btnPrimary, { flex: 1 }]}
                onPress={handleSaveReminder}
              >
                <Text style={gs.btnPrimaryText}>Сохранить</Text>
              </TouchableOpacity>
            </View>

            {reminderList?.reminder && (
              <TouchableOpacity
                style={styles.removeReminderBtn}
                onPress={handleRemoveReminder}
              >
                <Text style={styles.removeReminderText}>🔕 Удалить напоминание</Text>
              </TouchableOpacity>
            )}
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
                    <Text style={gs.textSecondary}>{template.description}</Text>
                    <Text style={styles.templateCount}>{template.items.length} товаров</Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[gs.btnOutline, { marginTop: 12 }]}
              onPress={() => setShowTemplates(false)}
            >
              <Text style={gs.btnOutlineText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (C, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: insets.top + 8,
    paddingBottom: theme.spacing.sm,
    backgroundColor: C.background,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateBtn: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.round,
  },
  templateBtnText: {
    color: C.primary,
    fontWeight: '600',
    fontSize: theme.font.small,
  },
  helpBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtnText: {
    color: C.primary,
    fontWeight: '700',
    fontSize: theme.font.body,
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
    color: C.textPrimary,
  },
  arrowIcon: {
    fontSize: 28,
    color: C.textHint,
    marginLeft: 4,
  },
  deleteBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: C.border,
  },
  deleteBtnText: {
    fontSize: 20,
  },
  progressBg: {
    height: 4,
    backgroundColor: C.border,
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
    bottom: insets.bottom + 16,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: C.primary,
    borderRadius: theme.radius.round,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: C.primary,
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
    backgroundColor: C.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.font.title,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: theme.spacing.md,
  },
  modalLabel: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: C.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: theme.font.subtitle,
    color: C.textPrimary,
    backgroundColor: C.background,
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
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconBtnSelected: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  iconBtnText: {
    fontSize: 22,
  },
  iconBtnLabel: {
    fontSize: 9,
    color: C.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  colorDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: C.textPrimary,
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
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
    borderTopColor: C.border,
  },
  historyToggleText: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: C.textSecondary,
  },
  historyToggleArrow: {
    fontSize: 14,
    color: C.textHint,
  },
  historyCard: {
    opacity: 0.75,
  },
  doneIcon: {
    fontSize: 20,
    color: C.success,
    fontWeight: '700',
    marginLeft: 4,
  },
  // Напоминания
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: C.background,
    borderRadius: theme.radius.md,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  datePickerLabel: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: C.textSecondary,
  },
  datePickerValue: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: C.primary,
  },
  removeReminderBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: C.danger || '#e74c3c',
  },
  removeReminderText: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: C.danger || '#e74c3c',
  },
  // Шаблоны
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  templateEmoji: {
    fontSize: 32,
    marginRight: theme.spacing.sm,
  },
  templateName: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: C.textPrimary,
  },
  templateCount: {
    fontSize: theme.font.small,
    color: C.primary,
    fontWeight: '600',
    marginTop: 2,
  },
});
