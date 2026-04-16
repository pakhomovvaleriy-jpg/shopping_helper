import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../config/themes';
import { theme } from '../styles/theme';
import { getSettings, saveSettings, clearPrices, clearHistory } from '../utils/storage';

const SORT_OPTIONS = [
  { id: 'category', label: 'По категориям', emoji: '🗂' },
  { id: 'alpha',    label: 'По алфавиту',   emoji: '🔤' },
  { id: 'price',    label: 'По цене',        emoji: '💰' },
  { id: 'added',    label: 'По добавлению',  emoji: '🕐' },
];

const APP_VERSION = '1.0.0';

export default function SettingsScreen({ navigate }) {
  const { colors: C, gs, themeId, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C, insets), [C, insets]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleClearPrices = () => {
    Alert.alert(
      'Очистить базу цен?',
      'Все сохранённые цены будут удалены. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить', style: 'destructive',
          onPress: async () => {
            await clearPrices();
            Alert.alert('', '✅ База цен очищена');
          },
        },
      ],
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Очистить историю?',
      'Все завершённые списки будут удалены. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить', style: 'destructive',
          onPress: async () => {
            await clearHistory();
            Alert.alert('', '✅ История очищена');
          },
        },
      ],
    );
  };

  if (!settings) return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: C.textSecondary }}>Загрузка...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('lists')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройки</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>

        {/* ─── Цветовая тема ─── */}
        <Text style={styles.groupLabel}>Цветовая тема</Text>
        <View style={gs.card}>
          <Text style={styles.settingTitle}>Внешний вид приложения</Text>
          <Text style={styles.settingDesc}>Выберите тему оформления</Text>
          <View style={styles.themesRow}>
            {Object.values(THEMES).map(t => {
              const active = themeId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.themeCard, active && styles.themeCardActive, { borderColor: active ? t.primary : C.border }]}
                  onPress={() => setTheme(t.id)}
                  activeOpacity={0.8}
                >
                  {/* Цветовой круг */}
                  <View style={[styles.themeCircle, { backgroundColor: t.background, borderColor: t.border }]}>
                    <View style={[styles.themeCircleInner, { backgroundColor: t.primary }]} />
                    <View style={[styles.themeCircleSurface, { backgroundColor: t.surface, borderColor: t.border }]} />
                  </View>

                  {/* Название */}
                  <Text style={[styles.themeName, { color: active ? C.primary : C.textPrimary }]}>
                    {t.emoji} {t.name}
                  </Text>

                  {/* Галочка если выбрана */}
                  {active && (
                    <View style={[styles.themeCheck, { backgroundColor: t.primary }]}>
                      <Text style={styles.themeCheckMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Список покупок ─── */}
        <Text style={styles.groupLabel}>Список покупок</Text>
        <View style={gs.card}>
          <Text style={styles.settingTitle}>Сортировка по умолчанию</Text>
          <Text style={styles.settingDesc}>Как товары будут упорядочены при открытии списка</Text>
          <View style={styles.optionsGrid}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.optionBtn, settings.defaultSort === opt.id && styles.optionBtnSelected]}
                onPress={() => updateSetting('defaultSort', opt.id)}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <Text style={[styles.optionLabel, settings.defaultSort === opt.id && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── Добавление товара ─── */}
        <Text style={styles.groupLabel}>Добавление товара</Text>
        <View style={gs.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Оставаться на экране</Text>
              <Text style={styles.settingDesc}>После добавления товара не переходить на главный экран — удобно при добавлении нескольких товаров подряд</Text>
            </View>
            <Switch
              value={settings.stayOnAddScreen}
              onValueChange={val => updateSetting('stayOnAddScreen', val)}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ─── Данные ─── */}
        <Text style={styles.groupLabel}>Данные</Text>
        <View style={gs.card}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleClearPrices}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Очистить базу цен</Text>
              <Text style={styles.settingDesc}>Удалить все сохранённые цены товаров</Text>
            </View>
            <Text style={styles.dangerIcon}>🗑</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.dangerRow} onPress={handleClearHistory}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Очистить историю</Text>
              <Text style={styles.settingDesc}>Удалить все завершённые списки покупок</Text>
            </View>
            <Text style={styles.dangerIcon}>🗑</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Поддержать разработчика ─── */}
        <Text style={styles.groupLabel}>Поддержать разработчика</Text>
        <TouchableOpacity style={styles.donateCard} onPress={() => navigate('donate')} activeOpacity={0.85}>
          <Text style={styles.donateHeart}>❤️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.donateTitle}>Поддержать разработчика</Text>
            <Text style={styles.donateDesc}>
              Приложение бесплатное. Если оно вам нравится — вы можете поддержать развитие любой суммой.
            </Text>
            <View style={styles.donateBadge}>
              <Text style={styles.donateBadgeText}>💳 ЮКасса · МИР, СБП и другие</Text>
            </View>
          </View>
          <Text style={styles.infoArrow}>›</Text>
        </TouchableOpacity>

        {/* ─── О приложении ─── */}
        <Text style={styles.groupLabel}>О приложении</Text>
        <View style={gs.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Версия</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.infoRow} onPress={() => navigate('help')}>
            <Text style={styles.infoLabel}>Помощь и инструкция</Text>
            <Text style={styles.infoArrow}>›</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
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
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  backBtnText: {
    fontSize: theme.font.title,
    color: C.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: C.textPrimary,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  groupLabel: {
    fontSize: theme.font.small,
    fontWeight: '700',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  settingTitle: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: theme.font.small,
    color: C.textSecondary,
    lineHeight: 18,
  },

  // Темы
  themesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    backgroundColor: C.background,
    position: 'relative',
  },
  themeCardActive: {
    borderWidth: 2.5,
  },
  themeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  themeCircleInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  themeCircleSurface: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
  },
  themeName: {
    fontSize: theme.font.small,
    fontWeight: '700',
    textAlign: 'center',
  },
  themeCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCheckMark: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Сортировка
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.round,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.background,
    gap: 6,
  },
  optionBtnSelected: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  optionEmoji: {
    fontSize: 14,
  },
  optionLabel: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: C.textSecondary,
  },
  optionLabelSelected: {
    color: C.primary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dangerIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: theme.font.body,
    color: C.textPrimary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: theme.font.body,
    color: C.textSecondary,
  },
  infoArrow: {
    fontSize: 22,
    color: C.textHint,
  },

  // Донат
  donateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: C.danger,
    gap: 12,
    shadowColor: C.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  donateHeart: {
    fontSize: 32,
  },
  donateTitle: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 4,
  },
  donateDesc: {
    fontSize: theme.font.small,
    color: C.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  donateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.background,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  donateBadgeText: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: C.textSecondary,
  },
});
