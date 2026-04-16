import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { THEMES, DEFAULT_THEME_ID } from '../config/themes';
import { createGlobalStyles } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext(null);

const THEME_KEY = '@shopping_theme';

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(saved => { if (saved && THEMES[saved]) setThemeId(saved); })
      .catch(() => {});
  }, []);

  const colors = THEMES[themeId];
  const gs = useMemo(() => createGlobalStyles(colors), [colors]);

  const setTheme = async (id) => {
    if (!THEMES[id]) return;
    setThemeId(id);
    try { await AsyncStorage.setItem(THEME_KEY, id); } catch (_) {}
  };

  return (
    <ThemeContext.Provider value={{ themeId, colors, gs, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
