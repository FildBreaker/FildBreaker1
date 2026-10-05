import { dataManager } from './dataManager.js';

export const THEMES = {
  'dark-gold':   '🌙 Тёмная золотая',
  'dark-blue':   '🌙 Тёмная синяя',
  'dark-green':  '🌙 Тёмная зеленая',
  'dark-purple': '🌙 Тёмная фиолетовая',
  'dark-red':    '🌙 Тёмная красная',
  'light-gold':  '☀️ Светлая золотая',
  'light-blue':  '☀️ Светлая синяя',
  'light-green': '☀️ Светлая зеленая',
  'light-purple':'☀️ Светлая фиолетовая',
  'light-red':   '☀️ Светлая красная'
};

// Уникальные фоны для каждой темы
const THEME_BG = {
  'dark-gold':   'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80',
  'dark-blue':   'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=80',
  'dark-green':  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80',
  'dark-purple': 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=80',
  'dark-red':    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1920&q=80',
  'light-gold':  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1920&q=80',
  'light-blue':  'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1920&q=80',
  'light-green': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80',
  'light-purple':'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1920&q=80',
  'light-red':   'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=1920&q=80'
};

const themePreviewColors = {
  'dark-gold':   '#ffb347',
  'dark-blue':   '#4a8cff',
  'dark-green':  '#4caf50',
  'dark-purple': '#ab47bc',
  'dark-red':    '#e74c3c',
  'light-gold':  '#b8860b',
  'light-blue':  '#1a6b8a',
  'light-green': '#1a7a3a',
  'light-purple':'#6a1a8a',
  'light-red':   '#8a1a1a'
};

let currentTheme = 'dark-gold';
let themeModal = null;

export function applyTheme(themeName) {
  if (!themeName || !THEMES[themeName]) themeName = 'dark-gold';
  document.body.className = document.body.className
    .split(' ')
    .filter(c => !c.startsWith('theme-'))
    .join(' ');
  document.body.classList.add(`theme-${themeName}`);
  const bgUrl = THEME_BG[themeName] || THEME_BG['dark-gold'];
  document.documentElement.style.setProperty('--bg-image-url', `url("${bgUrl}")`);
  currentTheme = themeName;
  try { localStorage.setItem('b21-theme', themeName); } catch (e) {}
  if (themeModal && themeModal.style.display === 'flex') renderThemeOptions();
}

export async function loadTheme() {
  const localTheme = localStorage.getItem('b21-theme');
  if (localTheme && THEMES[localTheme]) applyTheme(localTheme);
  else applyTheme('dark-gold');
  try {
    const globalTheme = await dataManager.loadTheme();
    if (globalTheme && THEMES[globalTheme] && globalTheme !== currentTheme) {
      applyTheme(globalTheme);
    }
  } catch (e) { console.warn('Не удалось загрузить тему:', e); }
}

export async function saveTheme(themeName) {
  if (!THEMES[themeName]) return;
  applyTheme(themeName);
  try { await dataManager.saveTheme(themeName); }
  catch (e) { console.warn('Не удалось сохранить тему:', e); }
}

function createThemeModal() {
  if (document.getElementById('themeModal')) return;
  const modal = document.createElement('div');
  modal.id = 'themeModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:420px;">
      <span class="close-modal" onclick="window.closeThemeModal()">&times;</span>
      <h3 style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
        <i class="fas fa-palette" style="color:var(--accent);"></i>
        Выберите тему оформления
      </h3>
      <div id="themeOptions" style="display:flex; flex-direction:column; gap:10px;"></div>
      <div style="margin-top:20px; text-align:center; font-size:0.8rem; color:var(--text-muted);">
        Тема сохраняется для всех пользователей (через Firebase)
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  themeModal = modal;
  modal.addEventListener('click', (e) => { if (e.target === modal) closeThemeModal(); });
  renderThemeOptions();
}

function renderThemeOptions() {
  const container = document.getElementById('themeOptions');
  if (!container) return;
  container.innerHTML = '';
  Object.entries(THEMES).forEach(([key, label]) => {
    const btn = document.createElement('button');
    btn.className = `theme-option ${currentTheme === key ? 'active' : ''}`;
    btn.dataset.theme = key;
    const color = themePreviewColors[key] || '#888';
    btn.innerHTML = `
      <span class="theme-preview" style="border-color: ${color};"></span>
      <span>${label}</span>
      ${currentTheme === key ? '<i class="fas fa-check" style="color:var(--accent); margin-left:auto;"></i>' : ''}
    `;
    btn.addEventListener('click', async () => {
      await saveTheme(key);
      renderThemeOptions();
      setTimeout(closeThemeModal, 500);
    });
    container.appendChild(btn);
  });
}

export function openThemeModal() {
  if (!document.getElementById('themeModal')) createThemeModal();
  themeModal = document.getElementById('themeModal');
  if (themeModal) {
    renderThemeOptions();
    themeModal.style.display = 'flex';
  }
}

export function closeThemeModal() {
  if (themeModal) themeModal.style.display = 'none';
}

window.openThemeModal = openThemeModal;
window.closeThemeModal = closeThemeModal;
window.saveTheme = saveTheme;

document.addEventListener('DOMContentLoaded', loadTheme);