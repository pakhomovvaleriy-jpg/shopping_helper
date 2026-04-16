import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { logScreen } from './src/utils/analytics';
import ListsScreen from './src/screens/ListsScreen';
import ShoppingScreen from './src/screens/ShoppingScreen';
import AddItemScreen from './src/screens/AddItemScreen';
import HelpScreen from './src/screens/HelpScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DonateScreen from './src/screens/DonateScreen';

function AppContent() {
  const [screen, setScreen] = useState('lists');
  const [params, setParams] = useState({});
  const { colors } = useTheme();

  const navigate = (screenName, screenParams = {}) => {
    setParams(screenParams);
    setScreen(screenName);
    logScreen(screenName);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'lists':    return <ListsScreen navigate={navigate} />;
      case 'shopping': return <ShoppingScreen navigate={navigate} params={params} />;
      case 'add':      return <AddItemScreen navigate={navigate} params={params} />;
      case 'help':     return <HelpScreen navigate={navigate} />;
      case 'settings': return <SettingsScreen navigate={navigate} />;
      case 'donate':   return <DonateScreen navigate={navigate} />;
      default:         return <ListsScreen navigate={navigate} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBar} backgroundColor={colors.background} />
      {renderScreen()}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
