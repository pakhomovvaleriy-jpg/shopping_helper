const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Фон — красный круг
  ctx.fillStyle = '#e53935';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();

  // Корзина — белый цвет
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.05;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.55;

  // Ручка корзины
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.15, s * 0.32, Math.PI, 0, false);
  ctx.stroke();

  // Тело корзины
  const bx = cx - s * 0.38;
  const by = cy - s * 0.05;
  const bw = s * 0.76;
  const bh = s * 0.48;

  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + bw, by);
  ctx.lineTo(bx + bw * 0.88, by + bh);
  ctx.lineTo(bx + bw * 0.12, by + bh);
  ctx.closePath();
  ctx.fill();

  // Колёсики
  ctx.beginPath();
  ctx.arc(bx + bw * 0.28, by + bh + size * 0.06, size * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx + bw * 0.72, by + bh + size * 0.06, size * 0.045, 0, Math.PI * 2);
  ctx.fill();

  // Сохраняем
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`Создан: ${filename} (${size}x${size})`);
}

// Создаём папку assets если нет
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

generateIcon(1024, path.join(assetsDir, 'icon.png'));
generateIcon(1024, path.join(assetsDir, 'adaptive-icon.png'));
generateIcon(2048, path.join(assetsDir, 'splash.png'));

console.log('Готово! Все иконки созданы.');
