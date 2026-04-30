import React, { useRef, useState } from 'react';
import {
  View, Text, Animated, PanResponder,
  TouchableOpacity, StyleSheet,
} from 'react-native';

const DELETE_WIDTH = 76;

export default function SwipeableRow({ onDelete, children, style }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const [open, setOpen] = useState(false);
  const [rowWidth, setRowWidth] = useState(0);

  const snapClose = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
    isOpen.current = false;
    setOpen(false);
  };

  const snapOpen = () => {
    Animated.spring(translateX, {
      toValue: -DELETE_WIDTH,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
    isOpen.current = true;
    setOpen(true);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8,
      onPanResponderMove: (_, { dx }) => {
        const base = isOpen.current ? -DELETE_WIDTH : 0;
        const next = Math.max(Math.min(base + dx, 0), -DELETE_WIDTH);
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, { dx }) => {
        const base = isOpen.current ? -DELETE_WIDTH : 0;
        if (base + dx < -(DELETE_WIDTH / 2)) {
          snapOpen();
        } else {
          snapClose();
        }
      },
      onPanResponderTerminate: () => snapClose(),
    }),
  ).current;

  const handleDelete = () => {
    Animated.timing(translateX, {
      toValue: -(rowWidth + DELETE_WIDTH),
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      isOpen.current = false;
      setOpen(false);
      onDelete();
    });
  };

  return (
    <View
      style={[styles.container, style]}
      onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.row,
          { width: rowWidth + DELETE_WIDTH, transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Контент — точная ширина контейнера */}
        <View style={{ width: rowWidth }}>
          {children}
          {open && (
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={snapClose}
              activeOpacity={1}
            />
          )}
        </View>

        {/* Кнопка удаления вплотную справа */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.85}
        >
          <Text style={styles.deleteIcon}>🗑</Text>
          <Text style={styles.deleteLabel}>Удалить</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  deleteBtn: {
    width: DELETE_WIDTH,
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  deleteIcon: {
    fontSize: 18,
  },
  deleteLabel: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
});
