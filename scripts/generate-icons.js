const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// SVG иконки: красный градиент + корзина с галочкой
function makeIconSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff5252;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#b71c1c;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.12" />
      <stop offset="100%" style="stop-color:#000000;stop-opacity:0.08" />
    </linearGradient>
  </defs>

  <!-- Фон — скруглённый квадрат (как иконка Android) -->
  <rect width="1024" height="1024" rx="220" ry="220" fill="url(#grad)"/>
  <rect width="1024" height="1024" rx="220" ry="220" fill="url(#sheen)"/>

  <!-- Тело корзины -->
  <path d="M 280 420
           L 310 660
           Q 316 700 358 700
           L 666 700
           Q 708 700 714 660
           L 744 420
           Z"
        fill="white" opacity="0.95"/>

  <!-- Ручка корзины -->
  <path d="M 350 420 Q 350 300 512 300 Q 674 300 674 420"
        fill="none" stroke="white" stroke-width="58" stroke-linecap="round" opacity="0.95"/>

  <!-- Колёсики -->
  <circle cx="390" cy="748" r="42" fill="white" opacity="0.95"/>
  <circle cx="634" cy="748" r="42" fill="white" opacity="0.95"/>

  <!-- Галочка поверх корзины -->
  <path d="M 410 555 L 478 630 L 620 468"
        fill="none" stroke="#e53935" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

// Adaptive icon (foreground — без фона, только рисунок)
function makeAdaptiveSVG(size) {
  const p = size / 1024;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff5252;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#b71c1c;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Фон для adaptive icon -->
  <rect width="1024" height="1024" fill="url(#grad)"/>

  <!-- Тело корзины (чуть меньше — safe zone adaptive) -->
  <path d="M 310 450
           L 338 670
           Q 344 706 382 706
           L 642 706
           Q 680 706 686 670
           L 714 450
           Z"
        fill="white" opacity="0.95"/>

  <path d="M 378 450 Q 378 338 512 338 Q 646 338 646 450"
        fill="none" stroke="white" stroke-width="54" stroke-linecap="round" opacity="0.95"/>

  <circle cx="410" cy="750" r="38" fill="white" opacity="0.95"/>
  <circle cx="614" cy="750" r="38" fill="white" opacity="0.95"/>

  <path d="M 428 572 L 492 642 L 626 488"
        fill="none" stroke="#e53935" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

// Splash экран
function makeSplashSVG(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff5252;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#b71c1c;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>

  <!-- Иконка по центру -->
  <g transform="translate(${w/2 - 150}, ${h/2 - 200})">
    <path d="M 60 130 L 84 300 Q 88 324 112 324 L 288 324 Q 312 324 316 300 L 340 130 Z"
          fill="white" opacity="0.95"/>
    <path d="M 90 130 Q 90 60 200 60 Q 310 60 310 130"
          fill="none" stroke="white" stroke-width="28" stroke-linecap="round" opacity="0.95"/>
    <circle cx="130" cy="352" r="24" fill="white" opacity="0.95"/>
    <circle cx="270" cy="352" r="24" fill="white" opacity="0.95"/>
    <path d="M 110 218 L 152 268 L 250 168"
          fill="none" stroke="#e53935" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- Название -->
  <text x="${w/2}" y="${h/2 + 210}" font-family="Arial, sans-serif" font-size="52" font-weight="700"
        fill="white" text-anchor="middle" opacity="0.9">Список покупок</text>
</svg>`;
}

async function generate() {
  console.log('Генерирую иконки...');

  // icon.png — 1024x1024
  await sharp(Buffer.from(makeIconSVG(1024)))
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('✅ icon.png');

  // adaptive-icon.png — 1024x1024
  await sharp(Buffer.from(makeAdaptiveSVG(1024)))
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('✅ adaptive-icon.png');

  // splash.png — 1284x2778 (стандарт Expo)
  await sharp(Buffer.from(makeSplashSVG(1284, 2778)))
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  console.log('✅ splash.png');

  console.log('\nГотово! Все иконки в папке assets/');
}

generate().catch(console.error);
