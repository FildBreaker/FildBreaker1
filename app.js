// app.js — SPA для Б-31ЛЕС
import { dataManager } from './dataManager.js';
import { createRichEditor, sanitizeHtml, escapeHtml as esc } from './rich-editor.js';

// ============================================================
// СОСТОЯНИЕ
// ============================================================
const state = {
  currentRoute: null,
  intervals: {},
  editors: {},
  data: {
    schedule: null,
    homework: null,
    exams: null,
    resources: null,
    extracurricular: null,
    teachers: null
  }
};

// ============================================================
// УТИЛИТЫ
// ============================================================
function toArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') {
    return Object.keys(val).sort((a, b) => Number(a) - Number(b)).map(k => val[k]);
  }
  return [];
}

function showToast(msg) {
  const t = document.createElement('div');
  t.innerText = msg;
  t.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#4a4e69; color:#fff3b0; padding:8px 24px; border-radius:40px; z-index:99999; font-size:0.85rem; box-shadow:0 4px 12px rgba(0,0,0,0.2); transition: opacity 0.4s;';
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 1800);
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'flex';
}

function setupModalGlobals() {
  // Клик по крестику и кнопкам "Отмена" с data-close
  document.addEventListener('click', (e) => {
    const closeEl = e.target.closest('[data-close]');
    if (closeEl) {
      const id = closeEl.dataset.close;
      if (id) closeModal(id);
    }
    // Клик вне .modal-content внутри .modal — закрываем
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
  // Escape закрывает верхнюю модалку
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modals = [...document.querySelectorAll('.modal')].filter(m => m.style.display === 'flex');
    if (modals.length) modals[modals.length - 1].style.display = 'none';
  });
}

// ============================================================
// РОУТЕР
// ============================================================
const ROUTES = ['home', 'schedule', 'exam', 'resources', 'homework', 'extracurricular', 'teacher'];

function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  return ROUTES.includes(hash) ? hash : 'home';
}

async function navigate() {
  const route = parseRoute();
  if (state.currentRoute === route) return;
  if (state.currentRoute) destroyRoute(state.currentRoute);
  state.currentRoute = route;

  // Подсветка активной ссылки
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });

  // Рендер
  try {
    const renderer = RENDERERS[route];
    if (renderer) await renderer();
    // Пере-применяем stagger после рендера
    if (window.setStagger) window.setStagger();
  } catch (err) {
    console.error(`[route:${route}] error:`, err);
  }
}

function destroyRoute(route) {
  // Убираем интервалы
  if (state.intervals[route]) {
    clearInterval(state.intervals[route]);
    state.intervals[route] = null;
  }
}

window.addEventListener('hashchange', navigate);

// ============================================================
// ОБЩИЙ РЕНДЕР КАРКАСА
// ============================================================
function setSidebar(html) {
  document.getElementById('sidebarDynamic').innerHTML = html;
}
function setMain(html) {
  document.getElementById('mainContent').innerHTML = html;
}

function showSkeletonMain(kind, count) {
  if (window.showSkeleton) {
    window.showSkeleton('mainContent', count || 3, kind || 'card');
  }
}
function hideSkeletonMain() {
  if (window.hideSkeleton) window.hideSkeleton('mainContent');
}

// ============================================================
// ГЛАВНАЯ
// ============================================================
async function renderHome() {
  setSidebar(`
    <h3><i class="fas fa-compass"></i> Основное</h3>
    <div class="nav-buttons">
      <button class="nav-btn" data-nav="extracurricular"><i class="fas fa-calendar-alt"></i> Мероприятия</button>
      <button class="nav-btn" data-nav="teacher"><i class="fas fa-chalkboard-teacher"></i> Преподаватели</button>
      <button class="nav-btn" data-nav="resources"><i class="fas fa-link"></i> Ресурсы</button>
      <button class="nav-btn" data-nav="homework"><i class="fas fa-book-open"></i> Домашка</button>
    </div>
    <div class="sidebar-note"><i class="fas fa-database"></i><p>Данные синхронизируются через Firebase.</p></div>
  `);
  setSidebarNavHandlers();

  setMain(`
    <div class="welcome-strip">
      <div class="strip-image"><img src="data/forest.gif" alt="Лес" loading="lazy"></div>
      <div class="strip-text"><h2>✨ Добро пожаловать!</h2><p>Единый портал группы Б‑31ЛЕС с актуальным расписанием, экзаменами, домашкой и прочей фигнёй.</p></div>
    </div>
    <div style="background:var(--card-bg); backdrop-filter:blur(6px); border-radius:var(--radius); padding:24px 28px; border:1px solid var(--border-color); box-shadow:var(--shadow);">
      <h3 style="color:var(--text-secondary); margin-bottom:16px;"><i class="fas fa-hourglass-half"></i> Важные даты</h3>
      <div class="timers-container">
        <div class="timer-card">
          <h3><i class="fas fa-graduation-cap"></i> До экзаменов</h3>
          <div class="timer-display" id="examTimer">--:--:--</div>
          <div class="timer-controls">
            <button id="setExamDateBtn"><i class="fas fa-calendar-alt"></i> Установить дату</button>
          </div>
        </div>
        <div class="timer-card">
          <h3><i class="fas fa-flag-checkered"></i> До конца обучения</h3>
          <div class="timer-display" id="gradTimer">--:--:--</div>
          <div class="timer-controls">
            <button id="setGradDateBtn"><i class="fas fa-calendar-alt"></i> Установить дату</button>
          </div>
        </div>
      </div>
    </div>
  `);

  // Таймеры
  let examTarget = localStorage.getItem('examTarget') || '2026-06-15T10:00';
  let gradTarget = localStorage.getItem('gradTarget') || '2026-06-30T23:59';

  function updateTimer(target, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) { el.textContent = '00:00:00'; return; }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    el.textContent = `${String(days).padStart(2,'0')}д ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  }
  function updateAll() {
    updateTimer(examTarget, 'examTimer');
    updateTimer(gradTarget, 'gradTimer');
  }
  updateAll();
  state.intervals.home = setInterval(updateAll, 1000);

  // Модалка
  let activeTimer = null;
  const dateModal = document.getElementById('homeDateModal');
  const datePicker = document.getElementById('homeDatePicker');
  const title = document.getElementById('homeDateModalTitle');

  function openDateModal(type) {
    activeTimer = type;
    const target = type === 'exam' ? examTarget : gradTarget;
    const dt = new Date(target);
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,'0');
    const d = String(dt.getDate()).padStart(2,'0');
    const hh = String(dt.getHours()).padStart(2,'0');
    const mm = String(dt.getMinutes()).padStart(2,'0');
    datePicker.value = `${y}-${m}-${d}T${hh}:${mm}`;
    title.innerHTML = type === 'exam'
      ? '<i class="fas fa-graduation-cap"></i> Дата экзаменов'
      : '<i class="fas fa-flag-checkered"></i> Дата окончания обучения';
    openModal('homeDateModal');
  }

  document.getElementById('setExamDateBtn').addEventListener('click', () => openDateModal('exam'));
  document.getElementById('setGradDateBtn').addEventListener('click', () => openDateModal('grad'));
  document.getElementById('homeDateSaveBtn').addEventListener('click', () => {
    if (!activeTimer) return;
    const val = datePicker.value;
    if (!val) { alert('Выберите дату'); return; }
    const iso = new Date(val).toISOString();
    if (activeTimer === 'exam') { examTarget = iso; localStorage.setItem('examTarget', iso); }
    else { gradTarget = iso; localStorage.setItem('gradTarget', iso); }
    updateAll();
    closeModal('homeDateModal');
  });
}

// ============================================================
// РАСПИСАНИЕ
// ============================================================
const defaultSchedule = {
  0: { 1: { subject: "Проектная деятельность (П)", room: "1-210", startDate: "", endDate: "31.05.2026", type: "practice" }, 2: { subject: "Основы лесопаркового хозяйства (П)", room: "1-308", startDate: "", endDate: "31.05.2026", type: "practice" }, 3: { subject: "Лесная энтомология (П)", room: "1-203", startDate: "", endDate: "31.05.2026", type: "practice" }, 4: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 5: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 6: { subject: "", room: "", startDate: "", endDate: "", type: "" } },
  1: { 1: { subject: "Экономическая теория (П)", room: "1-303", startDate: "", endDate: "31.05.2026", type: "practice" }, 2: { subject: "Экономическая теория (П)", room: "1-408а", startDate: "", endDate: "31.05.2026", type: "practice" }, 3: { subject: "Основы лесопаркового хозяйства (П)", room: "Библиотека 309", startDate: "", endDate: "31.05.2026", type: "practice" }, 4: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 5: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 6: { subject: "", room: "", startDate: "", endDate: "", type: "" } },
  2: { 1: { subject: "Цифровые технологии (П)", room: "4-222", startDate: "", endDate: "31.05.2026", type: "practice" }, 2: { subject: "Технология лесозащиты (П)", room: "1-308", startDate: "", endDate: "31.05.2026", type: "practice" }, 3: { subject: "Физ-ра", room: "Спорткомплекс", startDate: "", endDate: "31.05.2026", type: "practice" }, 4: { subject: "Цифровые технологии (П)", room: "Библиотека 3116", startDate: "", endDate: "31.05.2026", type: "practice" }, 5: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 6: { subject: "", room: "", startDate: "", endDate: "", type: "" } },
  3: { 1: { subject: "Лесная селекция (П)", room: "1-305", startDate: "", endDate: "31.05.2026", type: "practice" }, 2: { subject: "Лесная селекция (П)", room: "1-210", startDate: "", endDate: "31.05.2026", type: "practice" }, 3: { subject: "Таксация леса (П)", room: "1-202", startDate: "", endDate: "31.05.2026", type: "practice" }, 4: { subject: "Таксация леса (П)", room: "1-202", startDate: "", endDate: "31.05.2026", type: "practice" }, 5: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 6: { subject: "", room: "", startDate: "", endDate: "", type: "" } },
  4: { 1: { subject: "Начертательная геометрия (П)", room: "3-23", startDate: "", endDate: "31.05.2026", type: "practice" }, 2: { subject: "Начертательная геометрия (П)", room: "3-24", startDate: "", endDate: "31.05.2026", type: "practice" }, 3: { subject: "Лесная энтомология (П)", room: "1-202", startDate: "", endDate: "31.05.2026", type: "practice" }, 4: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 5: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 6: { subject: "", room: "", startDate: "", endDate: "", type: "" } },
  5: { 1: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 2: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 3: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 4: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 5: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 6: { subject: "", room: "", startDate: "", endDate: "", type: "" } },
  6: { 1: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 2: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 3: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 4: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 5: { subject: "", room: "", startDate: "", endDate: "", type: "" }, 6: { subject: "", room: "", startDate: "", endDate: "", type: "" } }
};
const pairTimes = { 1: "1 пара (9:00 – 10:30)", 2: "2 пара (10:45 – 12:15)", 3: "3 пара (12:30 – 14:00)", 4: "4 пара (14:40 – 16:10)", 5: "5 пара (16:20 – 17:50)", 6: "6 пара (18:00 – 19:30)" };
const breaks = { 1: "Перерыв: 15 минут", 2: "Перерыв: 15 минут", 3: "Перерыв: 40 минут", 4: "Перерыв: 10 минут", 5: "Перерыв: 10 минут" };
const MAX_PAIR = 6;

async function renderSchedule() {
  setSidebar(`
    <h3><i class="fas fa-compass"></i> Основное</h3>
    <div class="nav-buttons">
      <button class="nav-btn" data-nav="extracurricular"><i class="fas fa-calendar-alt"></i> Мероприятия</button>
      <button class="nav-btn" data-nav="teacher"><i class="fas fa-chalkboard-teacher"></i> Преподаватели</button>
      <button class="nav-btn" data-nav="resources"><i class="fas fa-link"></i> Ресурсы</button>
      <button class="nav-btn" data-nav="homework"><i class="fas fa-book-open"></i> Домашка</button>
    </div>
    <div class="sidebar-note"><i class="fas fa-cloud-upload-alt"></i><p>Большой брат следит за тобой.</p></div>
  `);
  setSidebarNavHandlers();

  setMain(`
    <div class="schedule-section">
      <div class="schedule-header">
        <h2><i class="fas fa-table-list"></i> Расписание занятий</h2>
        <div class="schedule-actions">
          <button id="resetScheduleBtn" class="reset-btn"><i class="fas fa-undo-alt"></i> Сбросить</button>
          <span class="sync-hint"><i class="fas fa-sync-alt"></i> автосинхронизация</span>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="schedule-table">
          <thead><tr><th>Пара</th><th>Пн</th><th>Вт</th><th>Ср</th><th>Чт</th><th>Пт</th><th>Сб</th><th>Вс</th></tr></thead>
          <tbody id="scheduleBody"></tbody>
        </table>
      </div>
    </div>
  `);

  if (!state.data.schedule) {
    const saved = await dataManager.load('schedule');
    state.data.schedule = saved || JSON.parse(JSON.stringify(defaultSchedule));
    if (!saved) await dataManager.save('schedule', state.data.schedule);
  }
  renderScheduleTable();

  // Обработчики модалки
  setupScheduleModal();
  document.getElementById('resetScheduleBtn').addEventListener('click', async () => {
    if (!confirm('Сбросить расписание к исходному?')) return;
    state.data.schedule = JSON.parse(JSON.stringify(defaultSchedule));
    await dataManager.save('schedule', state.data.schedule);
    renderScheduleTable();
  });
}

function renderScheduleTable() {
  const tbody = document.getElementById('scheduleBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const scheduleData = state.data.schedule;
  for (let pair = 1; pair <= MAX_PAIR; pair++) {
    const tr = document.createElement('tr');
    const tdTime = document.createElement('td');
    tdTime.className = 'pair-time';
    tdTime.innerHTML = `<strong>${pairTimes[pair]}</strong>`;
    tr.appendChild(tdTime);

    for (let day = 0; day < 7; day++) {
      const td = document.createElement('td');
      td.className = 'schedule-cell';
      const lesson = scheduleData[day]?.[pair] || { subject: '', room: '', startDate: '', endDate: '', type: '', notes: '' };
      const subjectHtml = lesson.subject ? esc(lesson.subject) : '—';
      const roomHtml = lesson.room ? ` (${esc(lesson.room)})` : '';
      let typeIcon = '';
      if (lesson.type === 'lecture') typeIcon = '<i class="fas fa-chalkboard-teacher" style="color:var(--accent);"></i> ';
      else if (lesson.type === 'practice') typeIcon = '<i class="fas fa-tools" style="color:var(--accent);"></i> ';
      let dateHtml = '';
      if (lesson.startDate || lesson.endDate) {
        const parts = [];
        if (lesson.startDate) parts.push(`с ${esc(lesson.startDate)}`);
        if (lesson.endDate) parts.push(`до ${esc(lesson.endDate)}`);
        dateHtml = `<div class="end-date"><i class="far fa-calendar-alt"></i> ${parts.join(' ')}</div>`;
      }
      let notesHtml = '';
      if (lesson.notes) notesHtml = `<div class="cell-notes rich-display">${sanitizeHtml(lesson.notes)}</div>`;

      td.innerHTML = `<div class="cell-content"><div class="subject">${typeIcon}${subjectHtml}${roomHtml}</div>${dateHtml}${notesHtml}<div class="edit-icon"><i class="fas fa-pen"></i></div></div>`;
      td.dataset.day = day;
      td.dataset.pair = pair;
      td.addEventListener('click', () => openScheduleEdit(day, pair));
      tr.appendChild(td);
    }
    tbody.appendChild(tr);

    if (pair < MAX_PAIR) {
      const breakTr = document.createElement('tr');
      breakTr.className = 'break-row';
      const breakTd = document.createElement('td');
      breakTd.colSpan = 8;
      breakTd.textContent = breaks[pair] || '';
      breakTr.appendChild(breakTd);
      tbody.appendChild(breakTr);
    }
  }
}

let scheduleEdit = { day: null, pair: null, type: '', notesEditor: null };

function setupScheduleModal() {
  const typeBtns = ['scheduleTypeLecture', 'scheduleTypePractice', 'scheduleTypeNone'];
  typeBtns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => {
      scheduleEdit.type = btn.dataset.type;
      typeBtns.forEach(i => document.getElementById(i).classList.remove('active'));
      btn.classList.add('active');
    });
  });
  const form = document.getElementById('scheduleEditForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveScheduleEdit();
  });
}

function openScheduleEdit(day, pair) {
  scheduleEdit.day = day;
  scheduleEdit.pair = pair;
  const lesson = state.data.schedule[day]?.[pair] || { subject: '', room: '', startDate: '', endDate: '', type: '', notes: '' };
  document.getElementById('scheduleEditSubject').value = lesson.subject || '';
  document.getElementById('scheduleEditRoom').value = lesson.room || '';
  document.getElementById('scheduleEditStartDate').value = lesson.startDate || '';
  document.getElementById('scheduleEditEndDate').value = lesson.endDate || '';

  scheduleEdit.type = lesson.type || '';
  ['scheduleTypeLecture', 'scheduleTypePractice', 'scheduleTypeNone'].forEach(id => document.getElementById(id).classList.remove('active'));
  if (lesson.type === 'lecture') document.getElementById('scheduleTypeLecture').classList.add('active');
  else if (lesson.type === 'practice') document.getElementById('scheduleTypePractice').classList.add('active');
  else document.getElementById('scheduleTypeNone').classList.add('active');

  const nc = document.getElementById('scheduleEditNotesEditor');
  nc.innerHTML = '';
  scheduleEdit.notesEditor = createRichEditor(nc, { placeholder: 'Дополнительные заметки...', minHeight: '60px' });
  scheduleEdit.notesEditor.setContent(lesson.notes || '');

  openModal('scheduleEditModal');
}

async function saveScheduleEdit() {
  const day = scheduleEdit.day, pair = scheduleEdit.pair;
  if (day === null || pair === null) return;
  const newSubject = document.getElementById('scheduleEditSubject').value.trim();
  const newRoom = document.getElementById('scheduleEditRoom').value.trim();
  const newStartDate = document.getElementById('scheduleEditStartDate').value.trim();
  const newEndDate = document.getElementById('scheduleEditEndDate').value.trim();
  const datePattern = /^\d{2}\.\d{2}\.\d{4}$/;
  if (newStartDate && !datePattern.test(newStartDate)) { alert('Дата начала в формате ДД.ММ.ГГГГ'); return; }
  if (newEndDate && !datePattern.test(newEndDate)) { alert('Дата окончания в формате ДД.ММ.ГГГГ'); return; }
  const newNotes = scheduleEdit.notesEditor ? sanitizeHtml(scheduleEdit.notesEditor.getContent()) : '';
  if (!state.data.schedule[day]) state.data.schedule[day] = {};
  state.data.schedule[day][pair] = {
    subject: newSubject, room: newRoom, startDate: newStartDate, endDate: newEndDate,
    type: scheduleEdit.type || '', notes: newNotes
  };
  await dataManager.save('schedule', state.data.schedule);
  renderScheduleTable();
  closeModal('scheduleEditModal');
}

// ============================================================
// ЭКЗАМЕНЫ
// ============================================================
async function renderExam() {
  setSidebar(`
    <h3><i class="fas fa-compass"></i> Основное</h3>
    <div class="nav-buttons">
      <button class="nav-btn" data-nav="extracurricular"><i class="fas fa-calendar-alt"></i> Мероприятия</button>
      <button class="nav-btn" data-nav="teacher"><i class="fas fa-chalkboard-teacher"></i> Преподаватели</button>
      <button class="nav-btn" data-nav="resources"><i class="fas fa-link"></i> Ресурсы</button>
      <button class="nav-btn" data-nav="homework"><i class="fas fa-book-open"></i> Домашка</button>
    </div>
    <div class="sidebar-note"><i class="fas fa-info-circle"></i><p>Информация о экзаменах, на которую мы забьём болт.</p></div>
  `);
  setSidebarNavHandlers();

  setMain(`
    <div class="exams-hero">
      <div class="hero-text"><h2><i class="fas fa-chalkboard"></i> Стенд экзаменов</h2></div>
      <div style="display:flex; gap:12px; align-items:center;">
        <span class="hero-badge"><i class="fas fa-calendar-alt"></i> Зимняя сессия 2026</span>
        <button id="addExamBtn" class="reset-btn"><i class="fas fa-plus"></i> Добавить экзамен</button>
      </div>
    </div>
    <div class="exams-grid" id="examsGrid"></div>
  `);

  showSkeletonMain('card', 2);
  if (!state.data.exams) {
    const saved = await dataManager.load('exams');
    if (saved && Array.isArray(saved)) state.data.exams = saved;
    else {
      state.data.exams = [
        { id: '1', subject: 'Лесоводство и таксация', date: '17 июня 2025, 10:00', room: '202 (лесной факультет)', teacher: 'доцент Сидорова Е.В.', format: 'устный билет + практика', resources: ['Билеты', 'Wiki', 'Видео'], method: 'методичка.pdf' },
        { id: '2', subject: 'Лесная селекция', date: '19 июня 2025, 10:00', room: '305 (лесной факультет)', teacher: 'профессор Лебедев А.И.', format: 'тестирование + устно', resources: ['Лекции', 'Статьи'], method: 'селекция_методичка.pdf' }
      ];
      await dataManager.save('exams', state.data.exams);
    }
  }
  hideSkeletonMain();
  renderExams();

  document.getElementById('addExamBtn').addEventListener('click', () => openExamModal());
  setupExamModal();

  const grid = document.getElementById('examsGrid');
  if (window.enableDragSort) {
    window.enableDragSort(grid, {
      itemSelector: '.exam-card',
      onReorder: async (newIds) => {
        const map = new Map(state.data.exams.map(e => [e.id, e]));
        state.data.exams = newIds.map(id => map.get(id)).filter(Boolean);
        await dataManager.save('exams', state.data.exams);
        renderExams();
        showToast('Порядок сохранён');
      }
    });
  }
}

function renderExams() {
  const grid = document.getElementById('examsGrid');
  if (!grid) return;
  if (!state.data.exams.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Нет экзаменов.</p></div>`;
    return;
  }
  grid.innerHTML = '';
  state.data.exams.forEach(exam => {
    const card = document.createElement('div');
    card.className = 'exam-card';
    card.dataset.id = exam.id;
    const icon = exam.subject.includes('таксация') ? 'fa-tree' : 'fa-seedling';
    card.innerHTML = `
      <div class="card-header">
        <div class="exam-icon"><i class="fas ${icon}"></i></div>
        <div class="exam-title"><h3>${esc(exam.subject)}</h3><span class="exam-type"><i class="fas fa-check-circle"></i> Экзамен</span></div>
        <div style="margin-left:auto; display:flex; gap:8px;">
          <button class="edit-exam" data-id="${exam.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer;"><i class="fas fa-edit"></i></button>
          <button class="delete-exam" data-id="${exam.id}" style="background:none; border:none; color:#e74c3c; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
      <div class="card-details">
        <div class="detail-row"><i class="fas fa-calendar-day"></i> <strong>Дата:</strong> ${esc(exam.date)}</div>
        <div class="detail-row"><i class="fas fa-location-dot"></i> <strong>Ауд.:</strong> ${esc(exam.room)}</div>
        <div class="detail-row"><i class="fas fa-user-graduate"></i> <strong>Преподаватель:</strong> ${esc(exam.teacher)}</div>
        <div class="detail-row"><i class="fas fa-clock"></i> <strong>Формат:</strong> ${esc(exam.format)}</div>
      </div>
      ${exam.resources && exam.resources.length ? `
        <div class="exam-resources">
          <p class="resources-title"><i class="fas fa-link"></i> Ресурсы:</p>
          <div class="resource-buttons">${exam.resources.map(r => `<a href="#" class="res-link"><i class="fas fa-file-pdf"></i> ${esc(r)}</a>`).join('')}</div>
        </div>` : ''}
      ${exam.method ? `<div class="card-footer-note"><i class="fas fa-arrow-right"></i> <a href="#">${esc(exam.method)}</a></div>` : ''}
      ${exam.notes ? `<div class="exam-notes rich-display">${sanitizeHtml(exam.notes)}</div>` : ''}
    `;
    card.querySelector('.edit-exam').addEventListener('click', (e) => { e.stopPropagation(); openExamModal(exam.id); });
    card.querySelector('.delete-exam').addEventListener('click', (e) => { e.stopPropagation(); deleteExam(exam.id); });
    grid.appendChild(card);
  });
}

let examEdit = { id: null, notesEditor: null };

function setupExamModal() {
  const form = document.getElementById('examForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subject = document.getElementById('examSubject').value.trim();
    const date = document.getElementById('examDate').value.trim();
    const room = document.getElementById('examRoom').value.trim();
    const teacher = document.getElementById('examTeacher').value.trim();
    const format = document.getElementById('examFormat').value.trim();
    const resourcesStr = document.getElementById('examResources').value.trim();
    const method = document.getElementById('examMethod').value.trim();
    if (!subject || !date || !room || !teacher || !format) { alert('Заполните все обязательные поля'); return; }
    const resources = resourcesStr ? resourcesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    const notes = examEdit.notesEditor ? sanitizeHtml(examEdit.notesEditor.getContent()) : '';
    const examData = { subject, date, room, teacher, format, resources, method, notes };
    if (examEdit.id) {
      const idx = state.data.exams.findIndex(x => x.id === examEdit.id);
      if (idx !== -1) state.data.exams[idx] = { ...state.data.exams[idx], ...examData };
    } else {
      state.data.exams.push({ id: Date.now().toString(), ...examData });
    }
    await dataManager.save('exams', state.data.exams);
    renderExams();
    closeModal('examModal');
  });
}

function openExamModal(id = null) {
  examEdit.id = id;
  const exam = id ? state.data.exams.find(x => x.id === id) : null;
  document.getElementById('examModalTitle').innerHTML = id ? '<i class="fas fa-edit"></i> Редактировать экзамен' : '<i class="fas fa-plus"></i> Добавить экзамен';
  document.getElementById('examSubject').value = exam ? (exam.subject || '') : '';
  document.getElementById('examDate').value = exam ? (exam.date || '') : '';
  document.getElementById('examRoom').value = exam ? (exam.room || '') : '';
  document.getElementById('examTeacher').value = exam ? (exam.teacher || '') : '';
  document.getElementById('examFormat').value = exam ? (exam.format || '') : '';
  document.getElementById('examResources').value = exam ? ((exam.resources || []).join(', ')) : '';
  document.getElementById('examMethod').value = exam ? (exam.method || '') : '';

  const nc = document.getElementById('examNotesEditor');
  nc.innerHTML = '';
  examEdit.notesEditor = createRichEditor(nc, { placeholder: 'Дополнительные заметки...', minHeight: '60px' });
  examEdit.notesEditor.setContent(exam ? (exam.notes || '') : '');
  openModal('examModal');
}

async function deleteExam(id) {
  if (!confirm('Удалить экзамен?')) return;
  state.data.exams = state.data.exams.filter(x => x.id !== id);
  await dataManager.save('exams', state.data.exams);
  renderExams();
}

// ============================================================
// РЕСУРСЫ
// ============================================================
const iconList = ['fa-book','fa-book-open','fa-file-pdf','fa-file-alt','fa-video','fa-film','fa-youtube','fa-play-circle','fa-tasks','fa-check-circle','fa-question-circle','fa-puzzle-piece','fa-laptop-code','fa-desktop','fa-download','fa-cloud-download-alt','fa-link','fa-external-link-alt','fa-folder-open','fa-archive','fa-graduation-cap','fa-chalkboard-teacher','fa-user-graduate'];

async function renderResources() {
  setSidebar(`
    <h3><i class="fas fa-filter"></i> Фильтры</h3>
    <div class="filter-buttons">
      <button class="filter-btn active-filter" data-category="all"><i class="fas fa-th-large"></i> Все</button>
      <button class="filter-btn" data-category="study"><i class="fas fa-book"></i> Учебники</button>
      <button class="filter-btn" data-category="video"><i class="fas fa-video"></i> Видео</button>
      <button class="filter-btn" data-category="test"><i class="fas fa-tasks"></i> Конспекты</button>
      <button class="filter-btn" data-category="soft"><i class="fas fa-laptop-code"></i> Прочее</button>
    </div>
    <div class="sidebar-note"><i class="fas fa-database"></i><p>Архив для всякого хлама.</p></div>
  `);
  setSidebarNavHandlers();

  setMain(`
    <div class="hero-resources">
      <div class="hero-text"><h2><i class="fas fa-cloud-upload-alt"></i> Ресурсный центр</h2><p>Электронные книги, видео, конспекты, Прочее</p></div>
      <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <div class="hero-search"><div class="search-box"><i class="fas fa-search"></i><input type="text" id="searchInput" placeholder="Поиск..."></div></div>
        <button id="addResourceBtn" class="reset-btn"><i class="fas fa-plus"></i> Добавить</button>
      </div>
    </div>
    <div class="resources-grid" id="resourcesGrid"></div>
  `);

  showSkeletonMain('card', 3);
  if (!state.data.resources) {
    const saved = await dataManager.load('resources');
    if (saved && Array.isArray(saved)) state.data.resources = saved;
    else {
      state.data.resources = [
        { id: '1', title: 'Лесоводство. Полный курс', desc: 'Учебник PDF, 320 стр.', category: 'study', icon: 'fa-book-open', meta: 'PDF, 24 МБ', link: '#' },
        { id: '2', title: 'Лекции по таксации', desc: 'Плейлист из 12 видео', category: 'video', icon: 'fa-video', meta: 'YouTube', link: '#' },
        { id: '3', title: 'QGIS для лесоустройства', desc: 'Установочный пакет + плагины', category: 'soft', icon: 'fa-laptop-code', meta: '450 МБ', link: '#' }
      ];
      await dataManager.save('resources', state.data.resources);
    }
  }
  hideSkeletonMain();
  renderResources();

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active-filter'));
      btn.classList.add('active-filter');
      applyResourceFilters();
    });
  });
  document.getElementById('searchInput').addEventListener('input', applyResourceFilters);
  document.getElementById('addResourceBtn').addEventListener('click', () => openResourceModal());
  setupResourceModal();

  const grid = document.getElementById('resourcesGrid');
  if (window.enableDragSort) {
    window.enableDragSort(grid, {
      itemSelector: '.resource-card',
      onReorder: async (newIds) => {
        const map = new Map(state.data.resources.map(r => [r.id, r]));
        state.data.resources = newIds.map(id => map.get(id)).filter(Boolean);
        await dataManager.save('resources', state.data.resources);
        renderResources();
        showToast('Порядок сохранён');
      }
    });
  }
}

function renderResources() {
  const grid = document.getElementById('resourcesGrid');
  if (!grid) return;
  if (!state.data.resources.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i><p>Нет ресурсов.</p></div>`;
    return;
  }
  grid.innerHTML = '';
  state.data.resources.forEach(res => {
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.dataset.id = res.id;
    card.dataset.category = res.category;
    const icon = res.icon || 'fa-file';
    card.innerHTML = `
      <div class="card-icon"><i class="fas ${icon}"></i></div>
      <div class="card-content">
        <h3>${esc(res.title)}</h3>
        <div class="rich-display">${sanitizeHtml(res.desc)}</div>
        <div class="card-meta">
          <span><i class="fas fa-tag"></i> ${esc(res.meta || '')}</span>
          <div style="display:flex; gap:8px;">
            <a href="${esc(res.link || '#')}" class="card-link">Скачать <i class="fas fa-arrow-right"></i></a>
            <button class="edit-resource" data-id="${res.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer;"><i class="fas fa-edit"></i></button>
            <button class="delete-resource" data-id="${res.id}" style="background:none; border:none; color:#e74c3c; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      </div>
    `;
    card.querySelector('.edit-resource').addEventListener('click', () => openResourceModal(res.id));
    card.querySelector('.delete-resource').addEventListener('click', () => deleteResource(res.id));
    grid.appendChild(card);
  });
  applyResourceFilters();
}

function applyResourceFilters() {
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const activeCat = document.querySelector('.filter-btn.active-filter')?.dataset.category || 'all';
  document.querySelectorAll('.resource-card').forEach(card => {
    const text = card.textContent.toLowerCase();
    const cat = card.dataset.category;
    const matchSearch = text.includes(search);
    const matchCat = activeCat === 'all' || cat === activeCat;
    card.style.display = (matchSearch && matchCat) ? 'flex' : 'none';
  });
}

let resourceEdit = { id: null, descEditor: null };

function setupResourceModal() {
  const form = document.getElementById('resourceForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('resourceTitle').value.trim();
    const category = document.getElementById('resourceCategory').value;
    const icon = document.getElementById('resourceIcon').value.trim() || 'fa-file';
    const meta = document.getElementById('resourceMeta').value.trim();
    const link = document.getElementById('resourceLink').value.trim() || '#';
    const desc = resourceEdit.descEditor ? sanitizeHtml(resourceEdit.descEditor.getContent()) : '';
    const descText = resourceEdit.descEditor ? resourceEdit.descEditor.getText().trim() : '';
    if (!title) { alert('Введите название'); return; }
    if (!descText) { alert('Введите описание'); return; }
    const resData = { title, desc, category, icon, meta, link };
    if (resourceEdit.id) {
      const idx = state.data.resources.findIndex(r => r.id === resourceEdit.id);
      if (idx !== -1) state.data.resources[idx] = { ...state.data.resources[idx], ...resData };
    } else {
      state.data.resources.push({ id: Date.now().toString(), ...resData });
    }
    await dataManager.save('resources', state.data.resources);
    renderResources();
    closeModal('resourceModal');
  });
  document.getElementById('clearIconBtn').addEventListener('click', () => {
    document.getElementById('resourceIcon').value = '';
    renderIconPicker('');
  });
}

function renderIconPicker(selectedIcon) {
  const container = document.getElementById('iconPicker');
  container.innerHTML = '';
  iconList.forEach(icon => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `icon-option ${selectedIcon === icon ? 'active' : ''}`;
    btn.innerHTML = `<i class="fas ${icon}"></i>`;
    btn.title = icon;
    btn.addEventListener('click', () => {
      container.querySelectorAll('.icon-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('resourceIcon').value = icon;
    });
    container.appendChild(btn);
  });
}

function openResourceModal(id = null) {
  resourceEdit.id = id;
  let currentIcon = '', currentDesc = '';
  if (id) {
    const res = state.data.resources.find(r => r.id === id);
    if (!res) return;
    document.getElementById('resourceModalTitle').innerHTML = '<i class="fas fa-edit"></i> Редактировать ресурс';
    document.getElementById('resourceTitle').value = res.title || '';
    document.getElementById('resourceCategory').value = res.category || 'study';
    currentIcon = res.icon || '';
    document.getElementById('resourceIcon').value = currentIcon;
    document.getElementById('resourceMeta').value = res.meta || '';
    document.getElementById('resourceLink').value = res.link || '';
    currentDesc = res.desc || '';
  } else {
    document.getElementById('resourceModalTitle').innerHTML = '<i class="fas fa-plus"></i> Добавить ресурс';
    document.getElementById('resourceTitle').value = '';
    document.getElementById('resourceCategory').value = 'study';
    document.getElementById('resourceIcon').value = '';
    document.getElementById('resourceMeta').value = '';
    document.getElementById('resourceLink').value = '';
  }
  renderIconPicker(currentIcon);
  const ed = document.getElementById('resourceDescEditor');
  ed.innerHTML = '';
  resourceEdit.descEditor = createRichEditor(ed, { placeholder: 'Краткое описание ресурса...', minHeight: '80px' });
  resourceEdit.descEditor.setContent(currentDesc);
  openModal('resourceModal');
}

async function deleteResource(id) {
  if (!confirm('Удалить ресурс?')) return;
  state.data.resources = state.data.resources.filter(r => r.id !== id);
  await dataManager.save('resources', state.data.resources);
  renderResources();
}

// ============================================================
// ДОМАШКА
// ============================================================
function normalizeHomework(raw) {
  if (!raw || typeof raw !== 'object') return { subjects: [] };
  const subjectsRaw = toArray(raw.subjects);
  const subjects = subjectsRaw.map(subj => {
    if (!subj || typeof subj !== 'object') return null;
    const tasksRaw = toArray(subj.tasks);
    const tasks = tasksRaw.map(t => {
      if (!t || typeof t !== 'object') return null;
      return { id: t.id || String(Date.now() + Math.random()), desc: t.desc || '', links: toArray(t.links), tags: t.tags || '' };
    }).filter(Boolean);
    return { id: subj.id || String(Date.now() + Math.random()), name: subj.name || 'Без названия', tasks };
  }).filter(Boolean);
  return { subjects };
}

async function renderHomework() {
  setSidebar(`
    <h3><i class="fas fa-book"></i> Предметы</h3>
    <div class="subjects-list" id="subjectsList"></div>
    <button class="add-subject-btn" id="addSubjectBtn"><i class="fas fa-plus-circle"></i> Добавить предмет</button>
    <div class="sidebar-note"><i class="fas fa-cloud-upload-alt"></i><p>Расписание, на которое хотя бы смотреть можно.</p></div>
  `);

  setMain(`
    <div class="homework-header">
      <h2 id="currentSubjectTitle"><i class="fas fa-folder"></i> Выберите предмет</h2>
      <button class="add-task-btn" id="addTaskBtn" disabled><i class="fas fa-plus"></i> Добавить задание</button>
    </div>
    <div class="tasks-container" id="tasksContainer">
      <div class="empty-state"><i class="fas fa-hand-point-left"></i><p>Выберите предмет из боковой панели или создайте новый.</p></div>
    </div>
  `);

  if (!state.data.homework) {
    const saved = await dataManager.load('homework');
    state.data.homework = normalizeHomework(saved);
    if (state.data.homework.subjects.length === 0 && !saved) {
      state.data.homework = { subjects: [
        { id: 'subj1', name: 'Лесоводство', tasks: [{ id: 'task1', desc: 'Прочитать главы 3-5.', links: [{ url: '#', title: 'Учебник' }], tags: 'конспект' }] },
        { id: 'subj2', name: 'Экология леса', tasks: [{ id: 'task2', desc: 'Написать эссе.', links: [{ url: '#', title: 'Методичка' }], tags: 'эссе' }] }
      ]};
      await dataManager.save('homework', state.data.homework);
    }
  }

  homeworkState.currentSubjectId = sessionStorage.getItem('activeSubjectId');
  if (homeworkState.currentSubjectId && !state.data.homework.subjects.find(s => s.id === homeworkState.currentSubjectId)) {
    homeworkState.currentSubjectId = null;
  }
  renderSubjects();
  if (homeworkState.currentSubjectId) selectSubject(homeworkState.currentSubjectId);
  else if (state.data.homework.subjects.length) selectSubject(state.data.homework.subjects[0].id);
  else clearTasksView();

  document.getElementById('addSubjectBtn').addEventListener('click', () => openSubjectModal());
  document.getElementById('addTaskBtn').addEventListener('click', () => openTaskModal());
  setupHomeworkModals();

  if (window.enableDragSort) {
    window.enableDragSort(document.getElementById('subjectsList'), {
      itemSelector: '.subject-item',
      onReorder: async (newIds) => {
        const map = new Map(state.data.homework.subjects.map(s => [s.id, s]));
        state.data.homework.subjects = newIds.map(id => map.get(id)).filter(Boolean);
        await dataManager.save('homework', state.data.homework);
        renderSubjects();
        showToast('Порядок сохранён');
      }
    });
  }
}

const homeworkState = { currentSubjectId: null, editSubjectId: null, editTaskId: null, taskEditor: null };

function renderSubjects() {
  const container = document.getElementById('subjectsList');
  if (!container) return;
  container.innerHTML = '';
  state.data.homework.subjects.forEach(subj => {
    const div = document.createElement('div');
    div.className = `subject-item ${homeworkState.currentSubjectId === subj.id ? 'active' : ''}`;
    div.dataset.id = subj.id;
    div.innerHTML = `
      <span class="subject-name"><i class="fas fa-chalkboard"></i> ${esc(subj.name)}</span>
      <div class="subject-actions">
        <button class="edit-subject" data-id="${subj.id}"><i class="fas fa-edit"></i></button>
        <button class="delete-subject" data-id="${subj.id}"><i class="fas fa-trash"></i></button>
      </div>
    `;
    div.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      selectSubject(subj.id);
    });
    div.querySelector('.edit-subject').addEventListener('click', (e) => { e.stopPropagation(); openSubjectModal(subj.id); });
    div.querySelector('.delete-subject').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Удалить предмет "${subj.name}"?`)) return;
      await deleteSubject(subj.id);
    });
    container.appendChild(div);
  });
  const btn = document.getElementById('addTaskBtn');
  if (btn) btn.disabled = !homeworkState.currentSubjectId;
}

function selectSubject(subjectId) {
  homeworkState.currentSubjectId = subjectId;
  sessionStorage.setItem('activeSubjectId', subjectId);
  renderSubjects();
  const subject = state.data.homework.subjects.find(s => s.id === subjectId);
  if (subject) {
    if (!Array.isArray(subject.tasks)) subject.tasks = [];
    document.getElementById('currentSubjectTitle').innerHTML = `<i class="fas fa-book-open"></i> ${esc(subject.name)}`;
    renderTasks(subject.tasks);
    // Перезапускаем drag-sort на tasksContainer
    const tc = document.getElementById('tasksContainer');
    if (window.enableDragSort) {
      window.enableDragSort(tc, {
        itemSelector: '.task-card',
        onReorder: async (newIds) => {
          const subj = state.data.homework.subjects.find(s => s.id === homeworkState.currentSubjectId);
          if (!subj) return;
          const map = new Map(subj.tasks.map(t => [t.id, t]));
          subj.tasks = newIds.map(id => map.get(id)).filter(Boolean);
          await dataManager.save('homework', state.data.homework);
          renderTasks(subj.tasks);
          showToast('Порядок сохранён');
        }
      });
    }
  } else clearTasksView();
}

function clearTasksView() {
  const titleEl = document.getElementById('currentSubjectTitle');
  if (titleEl) titleEl.innerHTML = '<i class="fas fa-folder"></i> Не выбран предмет';
  const tc = document.getElementById('tasksContainer');
  if (tc) tc.innerHTML = `<div class="empty-state"><i class="fas fa-hand-point-left"></i><p>Выберите предмет слева</p></div>`;
  const btn = document.getElementById('addTaskBtn');
  if (btn) btn.disabled = true;
}

function renderTasks(tasks) {
  const container = document.getElementById('tasksContainer');
  if (!container) return;
  if (!tasks || tasks.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>Нет заданий.</p></div>`;
    return;
  }
  container.innerHTML = '';
  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.id = task.id;
    let linksHtml = '';
    if (task.links && task.links.length) {
      linksHtml = '<div class="task-links"><i class="fas fa-link"></i> Ресурсы: ';
      task.links.forEach(link => {
        linksHtml += `<a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.title || 'Ссылка')}</a> `;
      });
      linksHtml += '</div>';
    }
    const tagsHtml = task.tags ? `<div class="task-tags"><i class="fas fa-tags"></i> ${esc(task.tags)}</div>` : '';
    card.innerHTML = `
      <div class="task-content">
        <div class="task-desc rich-display">${sanitizeHtml(task.desc)}</div>
        ${linksHtml}
        ${tagsHtml}
      </div>
      <div class="task-actions">
        <button class="edit-task" data-id="${task.id}"><i class="fas fa-pen"></i></button>
        <button class="delete-task" data-id="${task.id}"><i class="fas fa-trash-alt"></i></button>
      </div>
    `;
    card.querySelector('.edit-task').addEventListener('click', () => openTaskModal(task.id));
    card.querySelector('.delete-task').addEventListener('click', () => deleteTask(task.id));
    container.appendChild(card);
  });
}

function setupHomeworkModals() {
  document.getElementById('saveSubjectBtn').addEventListener('click', saveSubjectFromModal);
  document.getElementById('saveTaskBtn').addEventListener('click', (e) => { e.preventDefault(); saveTaskFromModal(); });
  document.getElementById('addLinkBtn').addEventListener('click', () => addLinkGroup('', ''));
}

function openSubjectModal(subjectId = null) {
  homeworkState.editSubjectId = subjectId;
  if (subjectId) {
    const subj = state.data.homework.subjects.find(s => s.id === subjectId);
    if (subj) {
      document.getElementById('subjectModalTitle').innerHTML = '<i class="fas fa-pen"></i> Редактировать предмет';
      document.getElementById('subjectNameInput').value = subj.name;
    }
  } else {
    document.getElementById('subjectModalTitle').innerHTML = '<i class="fas fa-plus"></i> Новый предмет';
    document.getElementById('subjectNameInput').value = '';
  }
  openModal('subjectModal');
}

async function saveSubjectFromModal() {
  const name = document.getElementById('subjectNameInput').value.trim();
  if (!name) return alert('Введите название');
  if (homeworkState.editSubjectId) {
    const subj = state.data.homework.subjects.find(s => s.id === homeworkState.editSubjectId);
    if (subj) { subj.name = name; }
  } else {
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 6);
    state.data.homework.subjects.push({ id: newId, name, tasks: [] });
    homeworkState.currentSubjectId = newId;
    sessionStorage.setItem('activeSubjectId', newId);
  }
  await dataManager.save('homework', state.data.homework);
  renderSubjects();
  if (homeworkState.currentSubjectId) selectSubject(homeworkState.currentSubjectId);
  closeModal('subjectModal');
}

async function deleteSubject(subjectId) {
  const idx = state.data.homework.subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return;
  state.data.homework.subjects.splice(idx, 1);
  await dataManager.save('homework', state.data.homework);
  if (homeworkState.currentSubjectId === subjectId) {
    homeworkState.currentSubjectId = null;
    sessionStorage.removeItem('activeSubjectId');
    clearTasksView();
  }
  renderSubjects();
}

function addLinkGroup(urlVal = '', titleVal = '') {
  const group = document.createElement('div');
  group.className = 'link-input-group';
  group.innerHTML = `
    <input type="text" class="link-url" placeholder="URL / путь к файлу" value="${esc(urlVal)}">
    <input type="text" class="link-title" placeholder="Название ссылки" value="${esc(titleVal)}">
    <button class="remove-link-btn" type="button"><i class="fas fa-trash-alt"></i></button>
  `;
  group.querySelector('.remove-link-btn').addEventListener('click', () => group.remove());
  document.getElementById('linksContainer').appendChild(group);
}

function collectLinks() {
  const groups = document.querySelectorAll('#linksContainer .link-input-group');
  const links = [];
  groups.forEach(g => {
    const url = g.querySelector('.link-url').value.trim();
    const title = g.querySelector('.link-title').value.trim();
    if (url) links.push({ url, title: title || 'Ссылка' });
  });
  return links;
}

function openTaskModal(taskId = null) {
  if (!homeworkState.currentSubjectId) { alert('Выберите предмет'); return; }
  const subject = state.data.homework.subjects.find(s => s.id === homeworkState.currentSubjectId);
  if (!subject) return;
  if (!Array.isArray(subject.tasks)) subject.tasks = [];
  homeworkState.editTaskId = taskId;
  const task = taskId ? subject.tasks.find(t => t.id === taskId) : null;
  const initialHtml = task ? (task.desc || '') : '';
  const tagsVal = task ? (task.tags || '') : '';
  const linksVal = task ? (task.links || []) : [];

  document.getElementById('taskModalTitle').innerHTML = taskId ? '<i class="fas fa-edit"></i> Редактировать задание' : '<i class="fas fa-plus"></i> Новое задание';
  document.getElementById('taskTags').value = tagsVal;
  const lc = document.getElementById('linksContainer');
  lc.innerHTML = '';
  if (linksVal.length) linksVal.forEach(l => addLinkGroup(l.url, l.title));
  else addLinkGroup('', '');

  const container = document.getElementById('taskDescEditor');
  container.innerHTML = '';
  homeworkState.taskEditor = createRichEditor(container, { placeholder: 'Подробное описание задания...', minHeight: '120px' });
  homeworkState.taskEditor.setContent(initialHtml);
  openModal('taskModal');
}

async function saveTaskFromModal() {
  try {
    if (!homeworkState.currentSubjectId) { alert('Не выбран предмет'); return; }
    const descHtml = homeworkState.taskEditor ? homeworkState.taskEditor.getContent() : '';
    const descText = homeworkState.taskEditor ? homeworkState.taskEditor.getText().trim() : '';
    if (!descText) { alert('Введите описание'); return; }
    const links = collectLinks();
    const tags = document.getElementById('taskTags').value.trim();
    const subject = state.data.homework.subjects.find(s => s.id === homeworkState.currentSubjectId);
    if (!subject) { alert('Предмет не найден'); return; }
    if (!Array.isArray(subject.tasks)) subject.tasks = [];
    if (homeworkState.editTaskId) {
      const task = subject.tasks.find(t => t.id === homeworkState.editTaskId);
      if (task) { task.desc = sanitizeHtml(descHtml); task.links = links; task.tags = tags; }
    } else {
      subject.tasks.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        desc: sanitizeHtml(descHtml), links, tags
      });
    }
    await dataManager.save('homework', state.data.homework);
    renderTasks(subject.tasks);
    closeModal('taskModal');
  } catch (err) {
    console.error(err);
    alert('Ошибка сохранения: ' + err.message);
  }
}

async function deleteTask(taskId) {
  if (!homeworkState.currentSubjectId) return;
  const subject = state.data.homework.subjects.find(s => s.id === homeworkState.currentSubjectId);
  if (!subject || !Array.isArray(subject.tasks)) return;
  const idx = subject.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return;
  subject.tasks.splice(idx, 1);
  await dataManager.save('homework', state.data.homework);
  renderTasks(subject.tasks);
}

// ============================================================
// ВНЕУРОЧКА
// ============================================================
async function renderExtracurricular() {
  setSidebar(`
    <h3><i class="fas fa-compass"></i> Разделы</h3>
    <div class="nav-sections">
      <button class="section-btn active" data-section="events"><i class="fas fa-party-horn"></i> Мероприятия</button>
      <button class="section-btn" data-section="polls"><i class="fas fa-chart-simple"></i> Опросы</button>
      <button class="section-btn" data-section="tests"><i class="fas fa-puzzle-piece"></i> Тесты</button>
    </div>
    <button class="add-global-btn" id="globalAddBtn"><i class="fas fa-plus-circle"></i> Добавить</button>
    <div class="sidebar-note"><i class="fas fa-database"></i><p>День прошёл, число сменилось...</p></div>
  `);

  setMain(`
    <div class="section-header" id="ecSectionHeader">
      <h2><i class="fas fa-party-horn"></i> Мероприятия</h2>
      <p>Ближайшие события</p>
    </div>
    <div class="content-container" id="ecContentContainer"></div>
  `);

  showSkeletonMain('card', 2);
  if (!state.data.extracurricular) {
    const saved = await dataManager.load('extracurricular');
    if (saved) {
      state.data.extracurricular = {
        events: saved.events || [],
        polls: saved.polls || [],
        tests: saved.tests || []
      };
    } else {
      state.data.extracurricular = {
        events: [
          { id: 'ev1', title: 'Лесная олимпиада', date: '2026-06-10', description: 'Командное соревнование.', link: '#' },
          { id: 'ev2', title: 'Лекция по ГИС', date: '2026-05-25', description: 'Приглашённый специалист.', link: '#' }
        ],
        polls: [
          { id: 'poll1', question: 'Какое направление интереснее?', options: [{text:'Лесоводство', votes:12}, {text:'Экология', votes:8}, {text:'ГИС', votes:5}], totalVotes: 25, userVoted: false }
        ],
        tests: [
          { id: 'test1', title: 'Основы дендрологии', questions: [
            { text: 'Какое дерево хвойное?', options: ['Берёза', 'Сосна', 'Дуб', 'Клён'], correctIndex: 1 }
          ] }
        ]
      };
      await dataManager.save('extracurricular', state.data.extracurricular);
    }
  }
  state.data.extracurricular.polls.forEach(p => {
    if (!p.totalVotes) p.totalVotes = p.options.reduce((s, o) => s + (o.votes || 0), 0);
    if (p.userVoted === undefined) p.userVoted = false;
  });
  hideSkeletonMain();

  ecState.currentSection = 'events';
  renderEcCurrent();

  document.querySelectorAll('.section-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.section-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ecState.currentSection = btn.dataset.section;
      renderEcCurrent();
    });
  });
  document.getElementById('globalAddBtn').addEventListener('click', () => openEcEditModal(ecState.currentSection));
  setupEcModals();

  if (window.enableDragSort) {
    window.enableDragSort(document.getElementById('ecContentContainer'), {
      itemSelector: '.event-card, .poll-card, .test-card',
      onReorder: async (newIds) => {
        const d = state.data.extracurricular;
        if (ecState.currentSection === 'events') {
          const map = new Map(d.events.map(x => [x.id, x]));
          d.events = newIds.map(id => map.get(id)).filter(Boolean);
        } else if (ecState.currentSection === 'polls') {
          const map = new Map(d.polls.map(x => [x.id, x]));
          d.polls = newIds.map(id => map.get(id)).filter(Boolean);
        } else {
          const map = new Map(d.tests.map(x => [x.id, x]));
          d.tests = newIds.map(id => map.get(id)).filter(Boolean);
        }
        await dataManager.save('extracurricular', d);
        renderEcCurrent();
      }
    });
  }
}

const ecState = { currentSection: 'events', editModalSection: null, editModalId: null, eventDescEditor: null, currentTestId: null };

function renderEcCurrent() {
  const headerEl = document.getElementById('ecSectionHeader');
  const container = document.getElementById('ecContentContainer');
  if (!container) return;
  const d = state.data.extracurricular;
  if (ecState.currentSection === 'events') {
    headerEl.innerHTML = `<h2><i class="fas fa-party-horn"></i> Мероприятия</h2><p>Ближайшие события и дни сурка</p>`;
    renderEcEvents(container, d.events);
  } else if (ecState.currentSection === 'polls') {
    headerEl.innerHTML = `<h2><i class="fas fa-chart-simple"></i> Опросы</h2><p>Выразите своё мнение</p>`;
    renderEcPolls(container, d.polls);
  } else {
    headerEl.innerHTML = `<h2><i class="fas fa-puzzle-piece"></i> Тесты</h2><p>Проверьте знания</p>`;
    renderEcTests(container, d.tests);
  }
}

function renderEcEvents(container, events) {
  if (!events.length) { container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Пока нет мероприятий</p></div>`; return; }
  container.innerHTML = '';
  events.forEach(ev => {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.dataset.id = ev.id;
    card.innerHTML = `
      <div class="card-header-event">
        <div class="event-date"><i class="fas fa-calendar-day"></i> ${esc(ev.date)}</div>
        <div class="event-actions">
          <button class="edit-event"><i class="fas fa-edit"></i></button>
          <button class="delete-event"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
      <h3>${esc(ev.title)}</h3>
      <div class="rich-display">${sanitizeHtml(ev.description)}</div>
      ${ev.link && ev.link !== '#' ? `<a href="${esc(ev.link)}" target="_blank" class="event-link">Подробнее <i class="fas fa-external-link-alt"></i></a>` : ''}
    `;
    card.querySelector('.edit-event').addEventListener('click', () => openEcEditModal('events', ev.id));
    card.querySelector('.delete-event').addEventListener('click', () => deleteEcItem('events', ev.id));
    container.appendChild(card);
  });
}

function renderEcPolls(container, polls) {
  if (!polls.length) { container.innerHTML = `<div class="empty-state"><i class="fas fa-chart-simple"></i><p>Нет опросов</p></div>`; return; }
  container.innerHTML = '';
  polls.forEach(poll => {
    const card = document.createElement('div');
    card.className = 'poll-card';
    card.dataset.id = poll.id;
    const total = poll.totalVotes || poll.options.reduce((s, o) => s + (o.votes || 0), 0);
    const userVoted = poll.userVoted === true;
    card.innerHTML = `
      <div class="poll-header">
        <h3><i class="fas fa-poll"></i> ${esc(poll.question)}</h3>
        <button class="delete-poll"><i class="fas fa-trash-alt"></i></button>
      </div>
      <div class="poll-options">
        ${poll.options.map((opt, idx) => `
          <div class="poll-option">
            <div class="option-text">${esc(opt.text)}</div>
            ${userVoted
              ? `<div class="option-bar"><div class="bar-fill" style="width:${(opt.votes/total*100)}%"></div></div>
                 <div class="option-stats">${opt.votes} (${total ? ((opt.votes/total)*100).toFixed(1) : 0}%)</div>`
              : `<button class="vote-btn" data-poll="${poll.id}" data-optidx="${idx}">Голосовать</button>`}
          </div>`).join('')}
      </div>
      <div class="poll-footer">Всего голосов: ${total}</div>
    `;
    if (!userVoted) {
      card.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', () => voteEcPoll(btn.dataset.poll, parseInt(btn.dataset.optidx)));
      });
    }
    card.querySelector('.delete-poll').addEventListener('click', () => deleteEcItem('polls', poll.id));
    container.appendChild(card);
  });
}

async function voteEcPoll(pollId, optionIndex) {
  const poll = state.data.extracurricular.polls.find(p => p.id === pollId);
  if (!poll || poll.userVoted) return;
  poll.options[optionIndex].votes = (poll.options[optionIndex].votes || 0) + 1;
  poll.totalVotes = (poll.totalVotes || 0) + 1;
  poll.userVoted = true;
  await dataManager.save('extracurricular', state.data.extracurricular);
  renderEcCurrent();
}

function renderEcTests(container, tests) {
  if (!tests.length) { container.innerHTML = `<div class="empty-state"><i class="fas fa-puzzle-piece"></i><p>Нет тестов</p></div>`; return; }
  container.innerHTML = '';
  tests.forEach(test => {
    const card = document.createElement('div');
    card.className = 'test-card';
    card.dataset.id = test.id;
    card.innerHTML = `
      <div class="test-header">
        <h3><i class="fas fa-brain"></i> ${esc(test.title)}</h3>
        <div class="test-actions">
          <button class="take-test"><i class="fas fa-play"></i> Пройти</button>
          <button class="edit-test"><i class="fas fa-edit"></i></button>
          <button class="delete-test"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
      <p>Вопросов: ${test.questions.length}</p>
    `;
    card.querySelector('.take-test').addEventListener('click', () => openEcTest(test.id));
    card.querySelector('.edit-test').addEventListener('click', () => openEcEditModal('tests', test.id));
    card.querySelector('.delete-test').addEventListener('click', () => deleteEcItem('tests', test.id));
    container.appendChild(card);
  });
}

async function deleteEcItem(section, id) {
  const d = state.data.extracurricular;
  if (section === 'events') d.events = d.events.filter(e => e.id !== id);
  else if (section === 'polls') d.polls = d.polls.filter(p => p.id !== id);
  else d.tests = d.tests.filter(t => t.id !== id);
  await dataManager.save('extracurricular', d);
  renderEcCurrent();
}

function setupEcModals() {
  document.getElementById('ecSaveModalBtn').addEventListener('click', saveEcModalItem);
}

function openEcEditModal(section, id = null) {
  ecState.editModalSection = section;
  ecState.editModalId = id;
  const title = document.getElementById('ecModalTitle');
  const fields = document.getElementById('ecModalDynamicFields');
  fields.innerHTML = '';
  const d = state.data.extracurricular;

  if (section === 'events') {
    title.innerHTML = id ? '<i class="fas fa-edit"></i> Редактировать' : '<i class="fas fa-plus"></i> Добавить';
    fields.innerHTML = `
      <label>Название</label><input type="text" id="ecEvTitle">
      <label>Дата (ГГГГ-ММ-ДД)</label><input type="date" id="ecEvDate">
      <label>Описание</label><div id="ecEvDescEditor"></div>
      <label>Ссылка</label><input type="url" id="ecEvLink" placeholder="https://...">
    `;
    const ev = id ? d.events.find(x => x.id === id) : null;
    if (ev) {
      document.getElementById('ecEvTitle').value = ev.title || '';
      document.getElementById('ecEvDate').value = ev.date || '';
      document.getElementById('ecEvLink').value = ev.link || '';
    }
    const ed = document.getElementById('ecEvDescEditor');
    ecState.eventDescEditor = createRichEditor(ed, { placeholder: 'Описание...', minHeight: '90px' });
    ecState.eventDescEditor.setContent(ev ? (ev.description || '') : '');
  } else if (section === 'polls') {
    title.innerHTML = id ? '<i class="fas fa-edit"></i> Редактировать опрос' : '<i class="fas fa-plus"></i> Создать опрос';
    fields.innerHTML = `
      <label>Вопрос</label><input type="text" id="ecPollQuestion">
      <label>Варианты (каждый с новой строки)</label><textarea id="ecPollOptions" rows="3"></textarea>
    `;
    const poll = id ? d.polls.find(p => p.id === id) : null;
    if (poll) {
      document.getElementById('ecPollQuestion').value = poll.question;
      document.getElementById('ecPollOptions').value = poll.options.map(o => o.text).join('\n');
    }
  } else {
    title.innerHTML = id ? '<i class="fas fa-edit"></i> Редактировать тест' : '<i class="fas fa-plus"></i> Создать тест';
    fields.innerHTML = `
      <label>Название</label><input type="text" id="ecTestTitle">
      <div id="ecQuestionsEditor"></div>
      <button type="button" id="ecAddQuestionBtn" class="add-link-btn"><i class="fas fa-plus"></i> Добавить вопрос</button>
    `;
    let questions = id ? (d.tests.find(t => t.id === id)?.questions || []) : [];
    ecState._draftQuestions = questions;
    const renderQE = () => {
      const c = document.getElementById('ecQuestionsEditor');
      c.innerHTML = '';
      questions.forEach((q, idx) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'question-editor';
        qDiv.innerHTML = `
          <div class="question-text"><input type="text" value="${esc(q.text)}" class="q-text"></div>
          <div class="question-options">
            ${q.options.map(opt => `<div class="opt-row"><input type="text" value="${esc(opt)}" class="q-opt"></div>`).join('')}
          </div>
          <select class="q-correct">
            ${q.options.map((_, oi) => `<option value="${oi}" ${oi === q.correctIndex ? 'selected' : ''}>Правильный: ${oi+1}</option>`).join('')}
          </select>
          <button class="remove-question-btn" type="button">Удалить</button>
        `;
        qDiv.querySelector('.remove-question-btn').addEventListener('click', () => { questions.splice(idx, 1); renderQE(); });
        c.appendChild(qDiv);
      });
    };
    renderQE();
    document.getElementById('ecAddQuestionBtn').addEventListener('click', () => {
      questions.push({ text: 'Новый вопрос', options: ['Вариант 1', 'Вариант 2'], correctIndex: 0 });
      renderQE();
    });
    if (id) document.getElementById('ecTestTitle').value = d.tests.find(t => t.id === id).title;
  }
  openModal('ecEditModal');
}

async function saveEcModalItem() {
  const section = ecState.editModalSection;
  const id = ecState.editModalId;
  const d = state.data.extracurricular;

  if (section === 'events') {
    const title = document.getElementById('ecEvTitle')?.value.trim();
    const date = document.getElementById('ecEvDate')?.value;
    const link = document.getElementById('ecEvLink')?.value.trim();
    const descHtml = ecState.eventDescEditor ? sanitizeHtml(ecState.eventDescEditor.getContent()) : '';
    const descText = ecState.eventDescEditor ? ecState.eventDescEditor.getText().trim() : '';
    if (!title || !date) { alert('Заполните название и дату'); return; }
    if (!descText) { alert('Введите описание'); return; }
    if (id) {
      const ev = d.events.find(x => x.id === id);
      if (ev) { ev.title = title; ev.date = date; ev.description = descHtml; ev.link = link || '#'; }
    } else {
      d.events.push({ id: Date.now().toString(), title, date, description: descHtml, link: link || '#' });
    }
  } else if (section === 'polls') {
    const question = document.getElementById('ecPollQuestion')?.value.trim();
    const optsText = document.getElementById('ecPollOptions')?.value;
    if (!question || !optsText) { alert('Введите вопрос и варианты'); return; }
    const optionsArray = optsText.split('\n').filter(s => s.trim()).map(t => ({ text: t.trim(), votes: 0 }));
    if (optionsArray.length < 2) { alert('Нужно минимум 2 варианта'); return; }
    if (id) {
      const poll = d.polls.find(p => p.id === id);
      if (poll) { poll.question = question; poll.options = optionsArray; poll.totalVotes = 0; poll.userVoted = false; }
    } else {
      d.polls.push({ id: Date.now().toString(), question, options: optionsArray, totalVotes: 0, userVoted: false });
    }
  } else {
    const testTitle = document.getElementById('ecTestTitle')?.value.trim();
    if (!testTitle) { alert('Введите название'); return; }
    const questions = [];
    document.querySelectorAll('#ecQuestionsEditor .question-editor').forEach(div => {
      const qText = div.querySelector('.q-text')?.value.trim();
      const options = Array.from(div.querySelectorAll('.q-opt')).map(i => i.value.trim()).filter(Boolean);
      const correctIdx = parseInt(div.querySelector('.q-correct')?.value);
      if (qText && options.length >= 2) questions.push({ text: qText, options, correctIndex: correctIdx });
    });
    if (!questions.length) { alert('Добавьте хотя бы один вопрос'); return; }
    if (id) {
      const test = d.tests.find(t => t.id === id);
      if (test) { test.title = testTitle; test.questions = questions; }
    } else {
      d.tests.push({ id: Date.now().toString(), title: testTitle, questions });
    }
  }
  await dataManager.save('extracurricular', d);
  closeModal('ecEditModal');
  renderEcCurrent();
}

function openEcTest(testId) {
  const test = state.data.extracurricular.tests.find(t => t.id === testId);
  if (!test) return;
  ecState.currentTestId = testId;
  document.getElementById('ecTestModalTitle').innerHTML = `<i class="fas fa-question-circle"></i> ${esc(test.title)}`;
  const c = document.getElementById('ecTestQuestionsContainer');
  c.innerHTML = '';
  test.questions.forEach((q, idx) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'test-question';
    qDiv.innerHTML = `
      <p><strong>${idx+1}. ${esc(q.text)}</strong></p>
      <div class="test-options">
        ${q.options.map((opt, oi) => `<label><input type="radio" name="ecq${idx}" value="${oi}"> ${esc(opt)}</label>`).join('')}
      </div>
    `;
    c.appendChild(qDiv);
  });
  document.getElementById('ecTestResult').innerHTML = '';
  document.getElementById('ecSubmitTestBtn').onclick = () => {
    let score = 0;
    test.questions.forEach((q, idx) => {
      const sel = document.querySelector(`input[name="ecq${idx}"]:checked`);
      if (sel && parseInt(sel.value) === q.correctIndex) score++;
    });
    document.getElementById('ecTestResult').innerHTML =
      `<i class="fas fa-chart-line"></i> ${score} из ${test.questions.length} (${Math.round(score/test.questions.length*100)}%)`;
  };
  openModal('ecTestModal');
}

// ============================================================
// ПРЕПОДАВАТЕЛИ
// ============================================================
async function renderTeacher() {
  setSidebar(`
    <h3><i class="fas fa-compass"></i> Основное</h3>
    <div class="nav-buttons">
      <button class="nav-btn" data-nav="extracurricular"><i class="fas fa-calendar-alt"></i> Мероприятия</button>
      <button class="nav-btn" data-nav="teacher"><i class="fas fa-chalkboard-teacher"></i> Преподаватели</button>
      <button class="nav-btn" data-nav="resources"><i class="fas fa-link"></i> Ресурсы</button>
      <button class="nav-btn" data-nav="homework"><i class="fas fa-book-open"></i> Домашка</button>
    </div>
    <div class="sidebar-note"><i class="fas fa-users"></i><p>Преподавательский состав</p></div>
  `);
  setSidebarNavHandlers();

  setMain(`
    <div class="teachers-section">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <h2><i class="fas fa-leaf"></i> Выбери своего бойца!</h2>
        <button id="addTeacherBtn" class="reset-btn"><i class="fas fa-plus"></i> Добавить преподавателя</button>
      </div>
      <div class="teachers-grid" id="teachersGridContainer"></div>
    </div>
  `);

  showSkeletonMain('card', 3);
  if (!state.data.teachers) {
    const saved = await dataManager.load('teachers');
    if (saved && Array.isArray(saved)) state.data.teachers = saved;
    else {
      state.data.teachers = [
        { id: '1', name: 'Гайвас Алексей Алексеевич', position: 'кафедра садоводства, лесного хозяйства и защиты растений', degree: 'Кандидат сельскохозяйственных наук, доцент', degree2: 'Предмет: Энтомология', phone: '(3812) 65-27-63, 13-42', email: 'aa.gayvas@omgau.org', photo: 'data/Teachers/Gaivas.jpg' },
        { id: '2', name: 'Иванова Елена Васильевна', position: 'кафедра лесоводства и лесопаркового хозяйства', degree: 'Доктор биологических наук, профессор', degree2: 'Предмет: Лесоводство', phone: '(3812) 65-27-64', email: 'ev.ivanova@omgau.org', photo: 'data/Teachers/Ivanova.jpg' }
      ];
      await dataManager.save('teachers', state.data.teachers);
    }
  }
  hideSkeletonMain();
  renderTeachers();

  document.getElementById('addTeacherBtn').addEventListener('click', () => openTeacherModal());
  setupTeacherModal();

  const grid = document.getElementById('teachersGridContainer');
  if (window.enableDragSort) {
    window.enableDragSort(grid, {
      itemSelector: '.teacher-card',
      onReorder: async (newIds) => {
        const map = new Map(state.data.teachers.map(t => [t.id, t]));
        state.data.teachers = newIds.map(id => map.get(id)).filter(Boolean);
        await dataManager.save('teachers', state.data.teachers);
        renderTeachers();
      }
    });
  }
}

let teacherEdit = { id: null };

function renderTeachers() {
  const container = document.getElementById('teachersGridContainer');
  if (!container) return;
  if (!state.data.teachers.length) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-user-slash"></i><p>Нет преподавателей.</p></div>`;
    return;
  }
  container.innerHTML = '';
  state.data.teachers.forEach(teacher => {
    const card = document.createElement('div');
    card.className = 'teacher-card';
    card.dataset.id = teacher.id;
    card.innerHTML = `
      <div class="card-photo"><img src="${teacher.photo || 'https://via.placeholder.com/130x130?text=Нет+фото'}" alt="${esc(teacher.name)}" loading="lazy"></div>
      <div class="teacher-info">
        <div class="teacher-name"><i class="fas fa-user-tie"></i> ${esc(teacher.name)}</div>
        <div class="teacher-position"><i class="fas fa-briefcase"></i> ${esc(teacher.position)}</div>
        <div class="teacher-degree"><i class="fas fa-graduation-cap"></i> ${esc(teacher.degree)}</div>
        <div class="teacher-degree2"><i class="fas fa-graduation-cap"></i> ${esc(teacher.degree2)}</div>
        <div class="contact-details-card">
          <p><i class="fas fa-phone-alt"></i> ${esc(teacher.phone)}</p>
          <p><i class="fas fa-envelope"></i> <a href="mailto:${teacher.email}" style="color:var(--accent);">${esc(teacher.email)}</a></p>
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="edit-teacher" style="background:none; border:none; color:var(--text-muted); cursor:pointer;"><i class="fas fa-edit"></i></button>
          <button class="delete-teacher" style="background:none; border:none; color:#e74c3c; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
    `;
    card.querySelector('.edit-teacher').addEventListener('click', () => openTeacherModal(teacher.id));
    card.querySelector('.delete-teacher').addEventListener('click', () => deleteTeacher(teacher.id));
    container.appendChild(card);
  });
}

function setupTeacherModal() {
  document.getElementById('teacherForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('teacherName').value.trim();
    const position = document.getElementById('teacherPosition').value.trim();
    const degree = document.getElementById('teacherDegree').value.trim();
    const degree2 = document.getElementById('teacherDegree2').value.trim();
    const phone = document.getElementById('teacherPhone').value.trim();
    const email = document.getElementById('teacherEmail').value.trim();
    const photo = document.getElementById('teacherPhoto').value.trim();
    if (!name || !position || !degree || !degree2 || !phone || !email) { alert('Заполните все поля'); return; }
    const data = { name, position, degree, degree2, phone, email, photo };
    if (teacherEdit.id) {
      const idx = state.data.teachers.findIndex(t => t.id === teacherEdit.id);
      if (idx !== -1) state.data.teachers[idx] = { ...state.data.teachers[idx], ...data };
    } else {
      state.data.teachers.push({ id: Date.now().toString(), ...data });
    }
    await dataManager.save('teachers', state.data.teachers);
    renderTeachers();
    closeModal('teacherModal');
  });
}

function openTeacherModal(id = null) {
  teacherEdit.id = id;
  const t = id ? state.data.teachers.find(x => x.id === id) : null;
  document.getElementById('teacherModalTitle').innerHTML = id ? '<i class="fas fa-edit"></i> Редактировать' : '<i class="fas fa-plus"></i> Добавить';
  document.getElementById('teacherName').value = t ? (t.name || '') : '';
  document.getElementById('teacherPosition').value = t ? (t.position || '') : '';
  document.getElementById('teacherDegree').value = t ? (t.degree || '') : '';
  document.getElementById('teacherDegree2').value = t ? (t.degree2 || '') : '';
  document.getElementById('teacherPhone').value = t ? (t.phone || '') : '';
  document.getElementById('teacherEmail').value = t ? (t.email || '') : '';
  document.getElementById('teacherPhoto').value = t ? (t.photo || '') : '';
  openModal('teacherModal');
}

async function deleteTeacher(id) {
  if (!confirm('Удалить преподавателя?')) return;
  state.data.teachers = state.data.teachers.filter(t => t.id !== id);
  await dataManager.save('teachers', state.data.teachers);
  renderTeachers();
}

// ============================================================
// ОБЩИЕ ОБРАБОТЧИКИ САЙДБАРА (быстрые ссылки)
// ============================================================
function setSidebarNavHandlers() {
  document.querySelectorAll('#sidebarDynamic [data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      location.hash = '#/' + btn.dataset.nav;
    });
  });
}

// ============================================================
// РЕЕСТР РЕНДЕРЕРОВ
// ============================================================
const RENDERERS = {
  home: renderHome,
  schedule: renderSchedule,
  exam: renderExam,
  resources: renderResources,
  homework: renderHomework,
  extracurricular: renderExtracurricular,
  teacher: renderTeacher
};

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
function exposeStagger() {
  // page-animations.js регистрирует функцию setStagger внутри IIFE, но не выставляет наружу.
  // Пробуем восстановить из MutationObserver — если не получится, обойдёмся.
  // Простой способ: пере-вызвать через фейковое событие, если есть. Пока оставим null.
}

document.addEventListener('DOMContentLoaded', () => {
  setupModalGlobals();
  exposeStagger();
  if (!location.hash) location.hash = '#/home';
  navigate();
});