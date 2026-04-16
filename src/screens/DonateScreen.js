import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../styles/theme';

// ─── Замените на свои данные из кабинета ЮКасса ───────────────────────────────
// yookassa.ru → Интеграция → API ключи
const SHOP_ID     = '1290673';
const SECRET_KEY  = 'live_6kEms6Yek2_72WRHDgAe7v7WmaGIvZ0IJ1N8_ApN6rU';
// Страница, куда пользователь попадёт после оплаты (можно оставить как есть)
const RETURN_URL  = 'https://yookassa.ru';
// ─────────────────────────────────────────────────────────────────────────────

const AMOUNTS = [
  { value: 50,  label: '50 ₽',  emoji: '☕', hint: 'Кофе' },
  { value: 100, label: '100 ₽', emoji: '🍕', hint: 'Пицца' },
  { value: 200, label: '200 ₽', emoji: '🎁', hint: 'Подарок' },
  { value: 500, label: '500 ₽', emoji: '⭐', hint: 'Звезда' },
];

function makeUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function DonateScreen({ navigate }) {
  const { colors: C, gs } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C, insets), [C, insets]);

  const [selected, setSelected]     = useState(100);
  const [custom, setCustom]         = useState('');
  const [loading, setLoading]       = useState(false);

  const amount = custom ? parseInt(custom, 10) : selected;

  const handleDonate = async () => {
    if (!amount || amount < 10) {
      Alert.alert('', 'Минимальная сумма — 10 ₽');
      return;
    }

    setLoading(true);
    try {
      const credentials = btoa(`${SHOP_ID}:${SECRET_KEY}`);
      const res = await fetch('https://api.yookassa.ru/v3/payments', {
        method: 'POST',
        headers: {
          'Authorization':    `Basic ${credentials}`,
          'Idempotence-Key':  makeUUID(),
          'Content-Type':     'application/json',
        },
        body: JSON.stringify({
          amount: {
            value:    `${amount}.00`,
            currency: 'RUB',
          },
          confirmation: {
            type:       'redirect',
            return_url: RETURN_URL,
          },
          description: 'Благодарность разработчику ShoppingHelper',
          capture: true,
        }),
      });

      const data = await res.json();

      if (data.confirmation?.confirmation_url) {
        await Linking.openURL(data.confirmation.confirmation_url);
      } else {
        throw new Error(data.description || 'Нет ссылки на оплату');
      }
    } catch {
      Alert.alert(
        'Не удалось открыть оплату',
        'Проверьте интернет-соединение и попробуйте ещё раз.',
        [{ text: 'Ок' }],
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('settings')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Поддержать разработчика</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>❤️</Text>
          <Text style={styles.heroTitle}>Спасибо, что пользуетесь приложением!</Text>
          <Text style={styles.heroDesc}>
            ShoppingHelper — полностью бесплатное приложение без рекламы.
            Если оно экономит вам время и деньги, вы можете поддержать
            его развитие любой суммой.
          </Text>
        </View>

        {/* Суммы */}
        <Text style={styles.groupLabel}>Выберите сумму</Text>
        <View style={styles.amountsGrid}>
          {AMOUNTS.map(opt => {
            const isActive = !custom && selected === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.amountCard, isActive && { borderColor: C.primary, backgroundColor: C.primaryLight }]}
                onPress={() => { setSelected(opt.value); setCustom(''); }}
                activeOpacity={0.75}
              >
                <Text style={styles.amountEmoji}>{opt.emoji}</Text>
                <Text style={[styles.amountValue, isActive && { color: C.primary }]}>{opt.label}</Text>
                <Text style={styles.amountHint}>{opt.hint}</Text>
                {isActive && (
                  <View style={[styles.amountCheck, { backgroundColor: C.primary }]}>
                    <Text style={styles.amountCheckMark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Своя сумма */}
        <Text style={styles.groupLabel}>Или введите свою</Text>
        <View style={[gs.card, styles.customRow]}>
          <TextInput
            style={[styles.customInput, { color: C.textPrimary }]}
            value={custom}
            onChangeText={t => setCustom(t.replace(/\D/g, ''))}
            placeholder="Сумма"
            placeholderTextColor={C.textHint}
            keyboardType="number-pad"
            maxLength={5}
            onFocus={() => setSelected(null)}
          />
          <Text style={styles.customCurrency}>₽</Text>
        </View>

        {/* Кнопка */}
        <TouchableOpacity
          style={[styles.donateBtn, { backgroundColor: C.primary }, loading && { opacity: 0.7 }]}
          onPress={handleDonate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : (
              <>
                <Text style={styles.donateBtnText}>
                  Поддержать {amount ? `${amount} ₽` : ''}
                </Text>
                <Text style={styles.donateBtnSub}>через ЮКассу · безопасно</Text>
              </>
            )
          }
        </TouchableOpacity>

        {/* Подпись */}
        <Text style={styles.footerNote}>
          Оплата через сервис ЮКасса. Поддерживаются карты МИР, Visa, Mastercard, СБП и другие способы.
        </Text>

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
    paddingBottom: 48,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroDesc: {
    fontSize: theme.font.body,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  groupLabel: {
    fontSize: theme.font.small,
    fontWeight: '700',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 4,
  },

  // Суммы
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: theme.spacing.sm,
  },
  amountCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    position: 'relative',
  },
  amountEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  amountValue: {
    fontSize: theme.font.subtitle,
    fontWeight: '700',
    color: C.textPrimary,
  },
  amountHint: {
    fontSize: theme.font.small,
    color: C.textSecondary,
    marginTop: 2,
  },
  amountCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountCheckMark: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Своя сумма
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  customInput: {
    flex: 1,
    fontSize: theme.font.title,
    fontWeight: '600',
    paddingVertical: 4,
  },
  customCurrency: {
    fontSize: theme.font.title,
    fontWeight: '600',
    color: C.textSecondary,
    marginLeft: 6,
  },

  // Кнопка
  donateBtn: {
    borderRadius: theme.radius.round,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  donateBtnText: {
    color: '#fff',
    fontSize: theme.font.subtitle,
    fontWeight: '700',
  },
  donateBtnSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: theme.font.small,
    marginTop: 2,
  },

  footerNote: {
    fontSize: theme.font.small,
    color: C.textHint,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: theme.spacing.md,
  },
});
