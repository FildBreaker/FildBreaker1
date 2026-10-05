// logo-fx.js
// Интерактивный логотип: при клике — случайная анимация из коллекции.
(function () {
  'use strict';

  const ANIMS = [
    'logo-fx-spin',
    'logo-fx-bounce',
    'logo-fx-shake',
    'logo-fx-rainbow',
    'logo-fx-pop',
    'logo-fx-flip',
    'logo-fx-wiggle',
    'logo-fx-glow',
    'logo-fx-drunk'
  ];

  let busy = false;
  let lastAnim = '';

  function pickAnim() {
    let a;
    let guard = 0;
    do {
      a = ANIMS[Math.floor(Math.random() * ANIMS.length)];
      guard++;
    } while (a === lastAnim && guard < 5);
    lastAnim = a;
    return a;
  }

  // Создаёт "искры" вокруг элемента
  function spawnParticles(el, count) {
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const emojis = ['✨', '⭐', '🌟', '💫', '🎉', '⚡'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'logo-fx-particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = 55 + Math.random() * 45;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      p.style.left = centerX + 'px';
      p.style.top = centerY + 'px';
      p.style.setProperty('--dx', dx.toFixed(1) + 'px');
      p.style.setProperty('--dy', dy.toFixed(1) + 'px');
      p.style.fontSize = (12 + Math.random() * 10) + 'px';
      p.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';

      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1100);
    }
  }

  function playAnim(el, animClass) {
    if (busy) return;
    busy = true;

    // Стираем прошлые
    ANIMS.forEach(c => el.classList.remove(c));

    // Форсируем reflow, чтобы класс точно применился
    void el.offsetWidth;

    el.classList.add(animClass);

    // Спарклайм для некоторых эффектов
    if (animClass === 'logo-fx-pop' || animClass === 'logo-fx-spin') {
      spawnParticles(el, 8);
    } else if (animClass === 'logo-fx-rainbow') {
      spawnParticles(el, 12);
    }

    const duration = 900;
    setTimeout(() => {
      el.classList.remove(animClass);
      busy = false;
    }, duration);
  }

  function init() {
    const logos = document.querySelectorAll('.logo h1, .logo, .logo *');
    if (!logos.length) return;

    // Берём именно текст-контейнер (h1 внутри .logo)
    const target = document.querySelector('.logo h1') || document.querySelector('.logo');
    if (!target) return;

    target.classList.add('logo-fx-target');
    target.style.cursor = 'pointer';
    target.setAttribute('title', 'Тыкни меня 👆');

    target.addEventListener('click', () => {
      playAnim(target, pickAnim());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();