import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../styles/theme';
import { BUDGET_CATEGORIES } from '../config/constants';
import { getBudget, saveBudget, getFactFromLists } from '../utils/storage';

const TABS = [
  { id: 'plan', label: 'План' },
  { id: 'fact', label: 'Факт' },
  { id: 'result', label: 'Итог' },
];

function getMonthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getMonthLabel(date) {
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export default function BudgetScreen({ navigate }) {
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C, insets), [C, insets]);

  const [activeTab, setActiveTab] = useState('plan');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plan, setPlan] = useState({});
  const [fact, setFact] = useState({});
  const [importing, setImporting] = useState(false);

  const monthKey = getMonthKey(currentDate);

  const loadBudget = useCallback(async () => {
    const data = await getBudget(monthKey);
    setPlan(data.plan || {});
    setFact(data.fact || {});
  }, [monthKey]);

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  const handleChangeAmount = async (type, categoryId, value) => {
    const num = value.replace(/[^0-9]/g, '');
    if (type === 'plan') {
      const updated = { ...plan, [categoryId]: num };
      setPlan(updated);
      await saveBudget(monthKey, { plan: updated, fact });
    } else {
      const updated = { ...fact, [categoryId]: num };
      setFact(updated);
      await saveBudget(monthKey, { plan, fact: updated });
    }
  };

  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleImport = async () => {
    setImporting(true);
    const { totals, listCount } = await getFactFromLists(monthKey);
    setImporting(false);

    if (listCount === 0) {
      Alert.alert(
        'Нет данных',
        'Завершённых списков с ценами за этот месяц не найдено.\n\nДобавляйте цены к товарам при покупке — тогда они попадут сюда автоматически.',
        [{ text: 'Понятно' }],
      );
      return;
    }

    const hasFact = Object.values(fact).some(v => parseInt(v) > 0);
    const doImport = async () => {
      const updated = { ...fact, ...Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, String(v)])) };
      setFact(updated);
      await saveBudget(monthKey, { plan, fact: updated });
      Alert.alert('Готово', `Загружено из ${listCount} сп. за этот месяц.\n\nТранспорт и Кафе заполните вручную.`, [{ text: 'OK' }]);
    };

    if (hasFact) {
      Alert.alert(
        'Заменить данные?',
        'Текущие значения факта будут заменены данными из списков покупок.',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Заменить', onPress: doImport },
        ],
      );
    } else {
      doImport();
    }
  };

  const totalPlan = BUDGET_CATEGORIES.reduce((sum, c) => sum + (parseInt(plan[c.id]) || 0), 0);
  const totalFact = BUDGET_CATEGORIES.reduce((sum, c) => sum + (parseInt(fact[c.id]) || 0), 0);
  const totalDiff = totalPlan - totalFact;

  return (
    <View style={styles.root}>
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('settings')} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Бюджет</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Переключатель месяца */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthArrowBtn}>
          <Text style={styles.monthArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{getMonthLabel(currentDate)}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.monthArrowBtn}>
          <Text style={styles.monthArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Вкладки */}
      <View style={styles.tabsRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Вкладка: План */}
        {activeTab === 'plan' && (
          <View>
            <Text style={styles.sectionHint}>Введите сколько планируете потратить по каждой категории</Text>
            {BUDGET_CATEGORIES.map(cat => (
              <View key={cat.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowEmoji}>{cat.emoji}</Text>
                  <Text style={styles.rowLabel}>{cat.label}</Text>
                </View>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    value={plan[cat.id] ? String(plan[cat.id]) : ''}
                    onChangeText={v => handleChangeAmount('plan', cat.id, v)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={C.textSecondary}
                    maxLength={7}
                  />
                  <Text style={styles.currency}>₽</Text>
                </View>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Итого план:</Text>
              <Text style={styles.totalAmount}>{totalPlan.toLocaleString('ru-RU')} ₽</Text>
            </View>
          </View>
        )}

        {/* Вкладка: Факт */}
        {activeTab === 'fact' && (
          <View>
            <Text style={styles.sectionHint}>Введите сколько потратили на самом деле</Text>
            <TouchableOpacity
              style={[styles.importBtn, importing && styles.importBtnDisabled]}
              onPress={handleImport}
              disabled={importing}
              activeOpacity={0.8}
            >
              <Text style={styles.importBtnText}>
                {importing ? 'Загрузка...' : '📥 Подтянуть из списков покупок'}
              </Text>
            </TouchableOpacity>
            {BUDGET_CATEGORIES.map(cat => (
              <View key={cat.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowEmoji}>{cat.emoji}</Text>
                  <Text style={styles.rowLabel}>{cat.label}</Text>
                </View>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    value={fact[cat.id] ? String(fact[cat.id]) : ''}
                    onChangeText={v => handleChangeAmount('fact', cat.id, v)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={C.textSecondary}
                    maxLength={7}
                  />
                  <Text style={styles.currency}>₽</Text>
                </View>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Итого факт:</Text>
              <Text style={styles.totalAmount}>{totalFact.toLocaleString('ru-RU')} ₽</Text>
            </View>
          </View>
        )}

        {/* Вкладка: Итог */}
        {activeTab === 'result' && (
          <View>
            {totalPlan === 0 && totalFact === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyEmoji}>💰</Text>
                <Text style={styles.emptyText}>Заполните план и факт{'\n'}чтобы увидеть итоги</Text>
              </View>
            ) : (
              <>
                {BUDGET_CATEGORIES.map(cat => {
                  const p = parseInt(plan[cat.id]) || 0;
                  const f = parseInt(fact[cat.id]) || 0;
                  const diff = p - f;
                  const progress = p > 0 ? Math.min(f / p, 1) : 0;
                  const overBudget = p > 0 && f > p;
                  if (p === 0 && f === 0) return null;
                  return (
                    <View key={cat.id} style={styles.resultCard}>
                      <View style={styles.resultCardHeader}>
                        <View style={styles.rowLeft}>
                          <Text style={styles.rowEmoji}>{cat.emoji}</Text>
                          <Text style={styles.rowLabel}>{cat.label}</Text>
                        </View>
                        <Text style={[styles.diffText, diff >= 0 ? styles.diffPositive : styles.diffNegative]}>
                          {diff >= 0 ? '+' : ''}{diff.toLocaleString('ru-RU')} ₽
                        </Text>
                      </View>
                      {/* Прогресс-бар */}
                      {p > 0 && (
                        <View style={styles.progressTrack}>
                          <View style={[
                            styles.progressFill,
                            { width: `${Math.round(progress * 100)}%`, backgroundColor: overBudget ? C.danger : cat.color },
                          ]} />
                        </View>
                      )}
                      <View style={styles.resultNums}>
                        <Text style={styles.resultNumText}>
                          Факт: <Text style={styles.resultNumBold}>{f.toLocaleString('ru-RU')} ₽</Text>
                        </Text>
                        {p > 0 && (
                          <Text style={styles.resultNumText}>
                            План: {p.toLocaleString('ru-RU')} ₽
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* Общий итог */}
                <View style={[styles.summaryCard, { borderColor: totalDiff >= 0 ? C.success : C.danger }]}>
                  <Text style={styles.summaryTitle}>
                    {totalDiff >= 0 ? 'Вы в бюджете' : 'Перерасход'}
                  </Text>
                  <Text style={[styles.summaryAmount, { color: totalDiff >= 0 ? C.success : C.danger }]}>
                    {totalDiff >= 0 ? '+' : ''}{totalDiff.toLocaleString('ru-RU')} ₽
                  </Text>
                  <Text style={styles.summaryDetail}>
                    План: {totalPlan.toLocaleString('ru-RU')} ₽ · Факт: {totalFact.toLocaleString('ru-RU')} ₽
                  </Text>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(C, insets) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: C.background,
      paddingTop: insets.top,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
    },
    backArrow: {
      fontSize: 24,
      color: C.textPrimary,
    },
    headerTitle: {
      fontSize: theme.font.title,
      fontWeight: '700',
      color: C.textPrimary,
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.md,
    },
    monthArrowBtn: {
      padding: theme.spacing.sm,
    },
    monthArrow: {
      fontSize: 28,
      color: C.primary,
      lineHeight: 32,
    },
    monthLabel: {
      fontSize: theme.font.subtitle,
      fontWeight: '600',
      color: C.textPrimary,
      textTransform: 'capitalize',
      minWidth: 180,
      textAlign: 'center',
    },
    tabsRow: {
      flexDirection: 'row',
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      backgroundColor: C.surface,
      borderRadius: theme.radius.lg,
      padding: 4,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      alignItems: 'center',
    },
    tabBtnActive: {
      backgroundColor: C.primary,
    },
    tabLabel: {
      fontSize: theme.font.body,
      color: C.textSecondary,
      fontWeight: '500',
    },
    tabLabelActive: {
      color: '#fff',
      fontWeight: '700',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: insets.bottom + theme.spacing.xl,
    },
    sectionHint: {
      fontSize: theme.font.small,
      color: C.textSecondary,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    importBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      borderColor: C.primary,
      paddingVertical: theme.spacing.sm + 2,
      marginBottom: theme.spacing.md,
    },
    importBtnDisabled: {
      opacity: 0.5,
    },
    importBtnText: {
      fontSize: theme.font.body,
      fontWeight: '600',
      color: C.primary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: C.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      marginBottom: theme.spacing.sm,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
    },
    rowEmoji: {
      fontSize: 22,
    },
    rowLabel: {
      fontSize: theme.font.body,
      color: C.textPrimary,
      fontWeight: '500',
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.background,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: theme.spacing.sm,
    },
    input: {
      fontSize: theme.font.subtitle,
      color: C.textPrimary,
      minWidth: 80,
      textAlign: 'right',
      paddingVertical: 6,
    },
    currency: {
      fontSize: theme.font.body,
      color: C.textSecondary,
      marginLeft: 4,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    totalLabel: {
      fontSize: theme.font.subtitle,
      color: C.textSecondary,
      fontWeight: '600',
    },
    totalAmount: {
      fontSize: theme.font.title,
      color: C.textPrimary,
      fontWeight: '700',
    },
    emptyWrap: {
      alignItems: 'center',
      paddingTop: 60,
      gap: theme.spacing.md,
    },
    emptyEmoji: {
      fontSize: 56,
    },
    emptyText: {
      fontSize: theme.font.body,
      color: C.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    resultCard: {
      backgroundColor: C.surface,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    resultCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    diffText: {
      fontSize: theme.font.body,
      fontWeight: '700',
    },
    diffPositive: {
      color: C.success,
    },
    diffNegative: {
      color: C.danger,
    },
    progressTrack: {
      height: 8,
      backgroundColor: C.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: theme.spacing.sm,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    resultNums: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    resultNumText: {
      fontSize: theme.font.small,
      color: C.textSecondary,
    },
    resultNumBold: {
      fontWeight: '700',
      color: C.textPrimary,
    },
    summaryCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.md,
      gap: theme.spacing.xs,
      backgroundColor: C.surface,
      borderWidth: 2,
    },
    summaryTitle: {
      fontSize: theme.font.subtitle,
      fontWeight: '600',
      color: C.textPrimary,
    },
    summaryAmount: {
      fontSize: 32,
      fontWeight: '700',
    },
    summaryDetail: {
      fontSize: theme.font.small,
      color: C.textSecondary,
      marginTop: 4,
    },
  });
}
