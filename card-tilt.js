// card-tilt.js
// 3D-наклон карточек + световое пятно, следующее за курсором.
// Делегирование событий — один набор слушателей на весь документ.
(function () {
  'use strict';

  const SELECTOR = [
    '.teacher-card', '.exam-card', '.resource-card',
    '.task-card', '.poll-card', '.event-card', '.test-card'
  ].join(',');

  // Ограничители
  const MAX_TILT = 6;         // макс. угол наклона (градусы)
  const PERSPECTIVE = 900;    // глубина 3D-сцены
  let rafId = null;
  let activeCard = null;
  let lastX = 0, lastY = 0;

  // Отключаем на тач-устройствах (там нет hover) и если пользователь против анимаций
  const isTouch = matchMedia('(hover: none)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isTouch || reduceMotion) return;

  function updateCard() {
    rafId = null;
    if (!activeCard) return;
    const rect = activeCard.getBoundingClientRect();
    const x = (lastX - rect.left) / rect.width;   // 0..1
    const y = (lastY - rect.top) / rect.height;   // 0..1

    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    const rx = (clampedY - 0.5) * -2 * MAX_TILT;  // наклон по X
    const ry = (clampedX - 0.5) *  2 * MAX_TILT;  // наклон по Y

    activeCard.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    activeCard.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    activeCard.style.setProperty('--mx', (clampedX * 100).toFixed(2) + '%');
    activeCard.style.setProperty('--my', (clampedY * 100).toFixed(2) + '%');
    activeCard.style.setProperty('--per', PERSPECTIVE + 'px');
  }

  document.addEventListener('mouseover', (e) => {
    const card = e.target.closest(SELECTOR);
    if (!card || card === activeCard) return;
    if (activeCard) activeCard.classList.remove('tilt-active');
    activeCard = card;
    card.classList.add('tilt-active');
  });

  document.addEventListener('mousemove', (e) => {
    if (!activeCard) return;
    lastX = e.clientX;
    lastY = e.clientY;
    if (!rafId) rafId = requestAnimationFrame(updateCard);
  });

  document.addEventListener('mouseout', (e) => {
    const card = e.target.closest(SELECTOR);
    if (!card) return;
    const to = e.relatedTarget;
    if (to && card.contains(to)) return; // всё ещё внутри
    if (card === activeCard) {
      card.classList.remove('tilt-active');
      // Плавный сброс
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      activeCard = null;
    }
  });

  // Сброс при скролле (чтобы позиция не «плавала»)
  window.addEventListener('scroll', () => {
    if (activeCard) {
      activeCard.style.setProperty('--rx', '0deg');
      activeCard.style.setProperty('--ry', '0deg');
    }
  }, { passive: true });
})();