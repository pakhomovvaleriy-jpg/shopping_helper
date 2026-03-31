// Конфигурация внешних API
// Вставь свои ключи здесь при подключении

// GigaChat (Сбер) — AI подсказки
// Получить ключ: https://developers.sber.ru/portal/products/gigachat
export const GIGACHAT = {
  AUTH_URL: 'https://ngw.devices.sber.ru:9443/api/v2/oauth',
  API_URL: 'https://gigachat.devices.sber.ru/api/v1/chat/completions',
  CREDENTIALS: 'MDE5ZDQ0MmUtNjZiMC03NmRiLWJhMmQtODEzMjMxZjVhNDJkOmY3ZDBkNzBiLTUxOTItNGM4MS05ZjQ0LTUxOWQ1MmM2M2QxNg==',
  SCOPE: 'GIGACHAT_API_PERS',
};

// Yandex SpeechKit — голосовой ввод
// Получить ключ: https://cloud.yandex.ru/services/speechkit
export const YANDEX_SPEECH = {
  API_URL: 'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize',
  API_KEY: '',        // вставь API ключ Яндекс Облака
  LANG: 'ru-RU',
  FOLDER_ID: '',      // ID папки в Яндекс Облаке
};

// Промпт для GigaChat — что AI отвечает на запросы
export const AI_SYSTEM_PROMPT = `Ты помощник по покупкам для российской домохозяйки.
Когда тебя спрашивают что нужно купить для блюда или случая — отвечай только списком продуктов.
Формат ответа — каждый продукт с новой строки, без нумерации, без лишних слов.
Используй русские названия. Отвечай кратко.
Пример: "Что нужно для борща?"
Ответ:
Свёкла
Капуста белокочанная
Морковь
Лук репчатый
Картофель
Томатная паста
Говядина
Масло подсолнечное`;
