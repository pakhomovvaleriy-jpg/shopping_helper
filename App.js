import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

import ListsScreen from './src/screens/ListsScreen';
import ShoppingScreen from './src/screens/ShoppingScreen';
import AddItemScreen from './src/screens/AddItemScreen';
import { COLORS } from './src/config/colors';

// Навигация без сторонних библиотек — простое переключение экранов через state
// screen: 'lists' | 'shopping' | 'add'
// params: данные передаваемые между экранами

export default function App() {
  const [screen, setScreen] = useState('lists');
  const [params, setParams] = useState({});

  const navigate = (screenName, screenParams = {}) => {
    setParams(screenParams);
    setScreen(screenName);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'lists':
        return <ListsScreen navigate={navigate} />;
      case 'shopping':
        return <ShoppingScreen navigate={navigate} params={params} />;
      case 'add':
        return <AddItemScreen navigate={navigate} params={params} />;
      default:
        return <ListsScreen navigate={navigate} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
