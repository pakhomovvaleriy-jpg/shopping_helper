// Три цветовые темы приложения
// Все экраны берут цвета через useTheme() — не импортировать COLORS напрямую

const categoryColors = {
  categoryMeat:       '#ef5350',
  categoryDairy:      '#42a5f5',
  categoryBread:      '#ffa726',
  categoryVegetables: '#66bb6a',
  categoryCereals:    '#ffca28',
  categoryCleaning:   '#26c6da',
  categoryFrozen:     '#7e57c2',
  categorySweets:     '#ec407a',
  categoryDrinks:     '#26a69a',
  categoryOther:      '#8d6e63',
};

const categoryColorsDark = {
  categoryMeat:       '#f87171',
  categoryDairy:      '#60a5fa',
  categoryBread:      '#fb923c',
  categoryVegetables: '#4ade80',
  categoryCereals:    '#facc15',
  categoryCleaning:   '#22d3ee',
  categoryFrozen:     '#a78bfa',
  categorySweets:     '#f472b6',
  categoryDrinks:     '#2dd4bf',
  categoryOther:      '#c4a882',
};

export const THEMES = {
  // ─── Алый ────────────────────────────────────────────────────────────────
  classic: {
    id: 'classic',
    name: 'Алый',
    emoji: '❤️',
    statusBar: 'dark',

    primary:      '#e53935',
    primaryLight: '#ffebee',
    primaryDark:  '#b71c1c',

    background: '#f5f5f5',
    surface:    '#ffffff',

    textPrimary:   '#212121',
    textSecondary: '#757575',
    textHint:      '#bdbdbd',

    success: '#43a047',
    danger:  '#e53935',
    warning: '#fb8c00',
    divider: '#e0e0e0',
    border:  '#eeeeee',

    aiBackground: '#e8f5e9',
    aiBorder:     '#a5d6a7',
    aiText:       '#2e7d32',

    ...categoryColors,
  },

  // ─── Индиго ───────────────────────────────────────────────────────────────
  indigo: {
    id: 'indigo',
    name: 'Индиго',
    emoji: '💜',
    statusBar: 'dark',

    primary:      '#6366f1',
    primaryLight: '#eef2ff',
    primaryDark:  '#4338ca',

    background: '#f8fafc',
    surface:    '#ffffff',

    textPrimary:   '#0f172a',
    textSecondary: '#64748b',
    textHint:      '#cbd5e1',

    success: '#22c55e',
    danger:  '#ef4444',
    warning: '#f59e0b',
    divider: '#e2e8f0',
    border:  '#e2e8f0',

    aiBackground: '#ede9fe',
    aiBorder:     '#c4b5fd',
    aiText:       '#5b21b6',

    ...categoryColors,
  },

  // ─── Ночь (тёмная) ────────────────────────────────────────────────────────
  dark: {
    id: 'dark',
    name: 'Ночь',
    emoji: '🌙',
    statusBar: 'light',

    primary:      '#818cf8',
    primaryLight: '#1e1b4b',
    primaryDark:  '#6366f1',

    background: '#0f172a',
    surface:    '#1e293b',

    textPrimary:   '#f1f5f9',
    textSecondary: '#94a3b8',
    textHint:      '#475569',

    success: '#4ade80',
    danger:  '#f87171',
    warning: '#fb923c',
    divider: '#334155',
    border:  '#334155',

    aiBackground: '#0d2818',
    aiBorder:     '#166534',
    aiText:       '#4ade80',

    ...categoryColorsDark,
  },
};

export const DEFAULT_THEME_ID = 'classic';
