// page-animations.js
// Автоматический стиггеринг + скелетоны для всего сайта
(function () {
  'use strict';

  // ===== 1. Устанавливаем --i у детей гридов для каскадной анимации =====
  function setStagger(root) {
    root = root || document;
    const selectors = [
      '.teachers-grid', '.exams-grid', '.resources-grid',
      '.tasks-container', '.content-container', '.timers-container',
      '.nav-buttons', '.filter-buttons', '.subjects-list'
    ];
    selectors.forEach(sel => {
      root.querySelectorAll(sel).forEach(grid => {
        [...grid.children].forEach((el, i) => el.style.setProperty('--i', i));
      });
    });
  }

  // ===== 2. Запуск при готовности DOM =====
  function boot() {
    setStagger();
    document.body.classList.add('page-loaded');
    // Следим за изменениями (React-подобное поведение для ванильного JS)
    const mo = new MutationObserver(() => setStagger());
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ===== 3. Публичные функции скелетонов =====
  window.showSkeleton = function (container, count, kind) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    count = count || 4;
    kind = kind || 'card';

    let html = '';
    if (kind === 'card') {
      for (let i = 0; i < count; i++) {
        html += '<div class="skeleton-card">'
              +   '<div class="skeleton skeleton-img"></div>'
              +   '<div class="skeleton skeleton-line" style="width:80%"></div>'
              +   '<div class="skeleton skeleton-line" style="width:55%"></div>'
              +   '<div class="skeleton skeleton-line" style="width:35%"></div>'
              + '</div>';
      }
    } else if (kind === 'row') {
      for (let i = 0; i < count; i++) {
        html += '<div class="skeleton-row">'
              +   '<div class="skeleton skeleton-img-sm"></div>'
              +   '<div style="flex:1">'
              +     '<div class="skeleton skeleton-line" style="width:70%"></div>'
              +     '<div class="skeleton skeleton-line" style="width:40%"></div>'
              +   '</div>'
              + '</div>';
      }
    } else if (kind === 'table') {
      for (let i = 0; i < count; i++) {
        html += '<div class="skeleton-row">'
              +   '<div class="skeleton skeleton-line" style="width:100%"></div>'
              + '</div>';
      }
    }
    container.innerHTML = html;
    container.dataset.skeleton = '1';
  };

  window.hideSkeleton = function (container) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    delete container.dataset.skeleton;
  };
})();