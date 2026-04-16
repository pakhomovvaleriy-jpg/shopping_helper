// Firebase Analytics — отслеживание установок и использования приложения
// Устойчивый импорт: если google-services.json не подключён — просто молчим

let analytics = null;
try {
  analytics = require('@react-native-firebase/analytics').default;
} catch (_) {}

const log = async (fn) => {
  if (!analytics) return;
  try { await fn(analytics()); } catch (_) {}
};

export const logScreen = (screenName) =>
  log(a => a.logScreenView({ screen_name: screenName, screen_class: screenName }));

export const logCreateList = () =>
  log(a => a.logEvent('create_list'));

export const logAddItem = () =>
  log(a => a.logEvent('add_item'));

export const logAIRequest = (query) =>
  log(a => a.logEvent('ai_request', { query: query.slice(0, 40) }));

export const logCompleteList = () =>
  log(a => a.logEvent('complete_list'));
