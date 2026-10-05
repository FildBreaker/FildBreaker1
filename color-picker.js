// color-picker.js
// Стилизованный выбор цвета — заменяет нативный input[type=color]

const PRESETS = [
  // Акцентные
  '#ffb347', '#f5d742', '#4a8cff', '#4caf50', '#ab47bc', '#e74c3c',
  // Пастельные
  '#ffd8a8', '#fff3b0', '#a8c8ff', '#b8e3cc', '#d0b8e3', '#f5b0b0',
  // Тёмные
  '#7a3a00', '#8a6b00', '#1a3a6a', '#1a5a2a', '#5a1a7a', '#8a1a1a',
  // Нейтральные
  '#000000', '#444444', '#888888', '#cccccc', '#f0f0f0', '#ffffff'
];

const RECENT_KEY = 'b31les_recent_colors';
const MAX_RECENT = 6;

let popoverEl = null;
let currentCleanup = null;

function getRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addRecent(color) {
  try {
    let list = getRecent().filter(c => c.toLowerCase() !== color.toLowerCase());
    list.unshift(color);
    list = list.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

function isValidHex(v) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}

function normalizeHex(v) {
  v = String(v).trim();
  if (!v.startsWith('#')) v = '#' + v;
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    return ('#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toLowerCase();
  }
  return v.toLowerCase();
}

export function openColorPicker({ anchorEl, initial = '#ffffff', onPick }) {
  closeColorPicker();
  if (!anchorEl) return;

  const safeInitial = isValidHex(initial) ? normalizeHex(initial) : '#ffffff';

  const pop = document.createElement('div');
  pop.className = 'color-picker-popover';
  pop.innerHTML = `
    <div class="cp-header">
      <div class="cp-preview" style="background:${safeInitial}"></div>
      <input type="text" class="cp-hex" value="${safeInitial}" maxlength="7" spellcheck="false" autocomplete="off">
    </div>
    <div class="cp-section">
      <div class="cp-label">Палитра</div>
      <div class="cp-presets"></div>
    </div>
    <div class="cp-section cp-recent-section" style="display:none">
      <div class="cp-label">Недавние</div>
      <div class="cp-recents"></div>
    </div>
  `;
  document.body.appendChild(pop);
  popoverEl = pop;

  const preview = pop.querySelector('.cp-preview');
  const hexInput = pop.querySelector('.cp-hex');
  const presetsBox = pop.querySelector('.cp-presets');
  const recentBox = pop.querySelector('.cp-recents');
  const recentSection = pop.querySelector('.cp-recent-section');

  let selected = safeInitial;

  function setSelected(color, commit = false) {
    if (!isValidHex(color)) return;
    selected = normalizeHex(color);
    preview.style.background = selected;
    hexInput.value = selected;
    // Подсветка активного свотча
    pop.querySelectorAll('.cp-swatch').forEach(s => {
      s.classList.toggle('active', (s.dataset.color || '').toLowerCase() === selected);
    });
    if (commit && typeof onPick === 'function') {
      onPick(selected);
      addRecent(selected);
      closeColorPicker();
    }
  }

  // Пресеты
  PRESETS.forEach(c => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'cp-swatch';
    sw.dataset.color = c;
    sw.style.background = c;
    sw.title = c;
    if (c.toLowerCase() === selected) sw.classList.add('active');
    sw.addEventListener('click', () => setSelected(c, true));
    presetsBox.appendChild(sw);
  });

  // Недавние
  const recents = getRecent();
  if (recents.length) {
    recentSection.style.display = '';
    recents.forEach(c => {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'cp-swatch';
      sw.dataset.color = c;
      sw.style.background = c;
      sw.title = c;
      sw.addEventListener('click', () => setSelected(c, true));
      recentBox.appendChild(sw);
    });
  }

  // Hex-инпут
  hexInput.addEventListener('input', () => {
    let v = hexInput.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (isValidHex(v)) {
      selected = normalizeHex(v);
      preview.style.background = selected;
      pop.querySelectorAll('.cp-swatch').forEach(s => {
        s.classList.toggle('active', (s.dataset.color || '').toLowerCase() === selected);
      });
    }
  });
  hexInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isValidHex(hexInput.value)) setSelected(hexInput.value, true);
    }
  });

  // Позиционирование рядом с кнопкой
  const rect = anchorEl.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  let left = rect.left + window.scrollX;
  let top  = rect.bottom + window.scrollY + 8;

  if (left + popRect.width > window.scrollX + window.innerWidth - 8) {
    left = window.scrollX + window.innerWidth - popRect.width - 8;
  }
  if (left < window.scrollX + 8) left = window.scrollX + 8;
  if (rect.bottom + popRect.height + 12 > window.innerHeight) {
    top = rect.top + window.scrollY - popRect.height - 8;
    if (top < window.scrollY + 8) top = rect.bottom + window.scrollY + 8;
  }
  pop.style.left = left + 'px';
  pop.style.top  = top  + 'px';

  // Закрытие по клику вне и Escape
  const onDocClick = (e) => {
    if (!pop.contains(e.target) && !anchorEl.contains(e.target)) closeColorPicker();
  };
  const onKey = (e) => { if (e.key === 'Escape') closeColorPicker(); };
  const onScroll = () => closeColorPicker();

  setTimeout(() => {
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
  }, 0);

  currentCleanup = () => {
    document.removeEventListener('mousedown', onDocClick);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', onScroll);
  };
}

export function closeColorPicker() {
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }
  if (popoverEl) { popoverEl.remove(); popoverEl = null; }
}