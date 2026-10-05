// drag-sort.js
// Универсальный модуль drag-and-drop сортировки для карточек.
// Работает на мыши и на тач-устройствах (long-press).
(function () {
  'use strict';

  const DRAG_THRESHOLD = 5;
  const LONG_PRESS_MS = 250;
  const EDGE_ZONE = 90;
  const SCROLL_SPEED = 14;

  function getItems(container, selector) {
    if (!selector) return Array.from(container.children).filter(el => el.nodeType === 1);
    return Array.from(container.querySelectorAll(selector))
      .filter(el => el.parentElement === container);
  }

  function isInteractive(el) {
    return !!el.closest('input, textarea, select, a, button, [contenteditable="true"], label, .no-drag');
  }

  function enableDragSort(container, opts) {
    if (!container || container.dataset.dragSort === '1') return;
    opts = opts || {};
    const itemSelector = opts.itemSelector || null;
    const onReorder = typeof opts.onReorder === 'function' ? opts.onReorder : null;
    const handleSelector = opts.handleSelector || null;

    container.dataset.dragSort = '1';
    container.classList.add('drag-sort-container');

    const s = {
      pid: null,
      startX: 0, startY: 0,
      pointerX: 0, pointerY: 0,
      offsetX: 0, offsetY: 0,
      candidate: null,
      source: null,
      placeholder: null,
      ghost: null,
      dragging: false,
      isTouch: false,
      longPressTimer: null,
      longPressReady: false,
      raf: null
    };

    function items() { return getItems(container, itemSelector); }

    function clearState() {
      if (s.raf) cancelAnimationFrame(s.raf);
      if (s.longPressTimer) clearTimeout(s.longPressTimer);
      s.raf = null;
      s.longPressTimer = null;
      if (s.ghost && s.ghost.parentNode) s.ghost.remove();
      if (s.placeholder && s.placeholder.parentNode) s.placeholder.remove();
      if (s.source) {
        s.source.style.display = '';
        s.source.classList.remove('dragging-source');
      }
      s.candidate = null;
      s.source = null;
      s.placeholder = null;
      s.ghost = null;
      s.dragging = false;
      s.isTouch = false;
      s.longPressReady = false;
      s.pid = null;
      document.body.classList.remove('drag-in-progress');
    }

    function onPointerDown(e) {
      if (s.pid !== null) return;
      if (e.button !== undefined && e.button > 0) return;
      if (handleSelector && !e.target.closest(handleSelector)) return;
      if (!handleSelector && isInteractive(e.target)) return;

      let node = e.target;
      while (node && node.parentElement !== container) node = node.parentElement;
      if (!node || node.parentElement !== container) return;
      if (itemSelector && !node.matches(itemSelector)) return;

      s.pid = e.pointerId;
      s.startX = e.clientX;
      s.startY = e.clientY;
      s.pointerX = e.clientX;
      s.pointerY = e.clientY;
      s.candidate = node;
      s.isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';

      if (s.isTouch) {
        // Long-press для тача
        s.longPressTimer = setTimeout(() => {
          s.longPressReady = true;
          if (navigator.vibrate) navigator.vibrate(15);
        }, LONG_PRESS_MS);
      }

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(e) {
      if (s.pid !== e.pointerId) return;
      s.pointerX = e.clientX;
      s.pointerY = e.clientY;

      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      // Для тача: пока long-press не сработал, даём странице скроллиться
      if (s.isTouch && !s.longPressReady) {
        if (Math.hypot(dx, dy) > 10) {
          // пользователь свайпает — отменяем drag, пусть скроллится
          if (s.longPressTimer) clearTimeout(s.longPressTimer);
          s.longPressTimer = null;
          detach();
          clearState();
        }
        return;
      }

      if (!s.dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        beginDrag(s.candidate);
      }
      if (s.dragging) {
        e.preventDefault();
        if (!s.raf) s.raf = requestAnimationFrame(updateFrame);
      }
    }

    function beginDrag(el) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);

      const ph = document.createElement('div');
      ph.className = 'drag-placeholder';
      ph.style.width = rect.width + 'px';
      ph.style.height = rect.height + 'px';
      ph.style.marginTop = cs.marginTop;
      ph.style.marginBottom = cs.marginBottom;
      ph.style.marginLeft = cs.marginLeft;
      ph.style.marginRight = cs.marginRight;
      ph.style.flexShrink = cs.flexShrink;

      const ghost = el.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.style.position = 'fixed';
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.margin = '0';
      ghost.style.zIndex = '99999';
      ghost.style.pointerEvents = 'none';
      ghost.style.boxSizing = 'border-box';

      s.offsetX = s.startX - rect.left;
      s.offsetY = s.startY - rect.top;

      el.parentNode.insertBefore(ph, el);
      document.body.appendChild(ghost);

      s.source = el;
      s.placeholder = ph;
      s.ghost = ghost;
      s.dragging = true;

      el.classList.add('dragging-source');
      document.body.classList.add('drag-in-progress');
      container.classList.add('drag-active');

      updateFrame();
    }

    function updateFrame() {
      s.raf = null;
      if (!s.dragging) return;

      const x = s.pointerX - s.offsetX;
      const y = s.pointerY - s.offsetY;
      s.ghost.style.left = x + 'px';
      s.ghost.style.top = y + 'px';
      s.ghost.style.transform = 'rotate(1.2deg) scale(1.015)';

      const ph = s.placeholder;
      const others = items().filter(el => el !== s.source && el !== ph);
      const cs = getComputedStyle(container);
      const isFlex = cs.display === 'flex';
      const isGrid = cs.display === 'grid';
      const flexDir = cs.flexDirection || 'column';
      const cols = isGrid ? cs.gridTemplateColumns.split(' ').filter(Boolean).length : 1;
      const isRow = (isFlex && flexDir.startsWith('row')) || (isGrid && cols > 1);

      let insertBefore = null;
      for (const el of others) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        if (isRow) {
          if (s.pointerX < cx) { insertBefore = el; break; }
        } else {
          if (s.pointerY < cy) { insertBefore = el; break; }
        }
      }
      if (insertBefore) {
        if (ph.nextElementSibling !== insertBefore) container.insertBefore(ph, insertBefore);
      } else if (container.lastElementChild !== ph) {
        container.appendChild(ph);
      }

      if (s.pointerY < EDGE_ZONE) window.scrollBy(0, -SCROLL_SPEED);
      else if (s.pointerY > window.innerHeight - EDGE_ZONE) window.scrollBy(0, SCROLL_SPEED);
    }

    function detach() {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    }

    function onPointerUp(e) {
      if (s.pid !== e.pointerId) return;
      detach();

      if (s.dragging) {
        e.preventDefault();
        const src = s.source;
        const ph = s.placeholder;
        if (src && ph && ph.parentNode) ph.parentNode.insertBefore(src, ph);
        if (src) {
          src.style.display = '';
          src.classList.remove('dragging-source');
        }
        const newIds = items().map(el => el.dataset.id).filter(Boolean);
        container.classList.remove('drag-active');
        clearState();
        if (onReorder && newIds.length) onReorder(newIds);
      } else {
        clearState();
      }
    }

    container.addEventListener('pointerdown', onPointerDown);

    return function destroy() {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeAttribute('data-drag-sort');
      container.classList.remove('drag-sort-container', 'drag-active');
      clearState();
    };
  }

  window.enableDragSort = enableDragSort;
})();