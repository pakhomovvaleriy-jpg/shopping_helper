// Общие стили — тени, скругления, отступы
// Используй вместо дублирования одинаковых стилей

import { StyleSheet } from 'react-native';
import { COLORS } from '../config/colors';

export const theme = {
  // Отступы
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  // Скругления
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 50,
  },
  // Шрифты
  font: {
    small: 12,
    body: 15,
    subtitle: 17,
    title: 20,
    header: 24,
    large: 28,
  },
};

export const globalStyles = StyleSheet.create({
  // Карточка
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  // Основная кнопка
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: theme.radius.round,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: theme.font.subtitle,
    fontWeight: '700',
  },
  // Кнопка-призрак
  btnOutline: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: theme.radius.round,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: COLORS.primary,
    fontSize: theme.font.body,
    fontWeight: '600',
  },
  // Заголовок экрана
  screenHeader: {
    fontSize: theme.font.header,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  // Вспомогательный текст
  textSecondary: {
    fontSize: theme.font.small,
    color: COLORS.textSecondary,
  },
  // Разделитель
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: theme.spacing.sm,
  },
  // Пустой экран — центр
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.font.subtitle,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});
