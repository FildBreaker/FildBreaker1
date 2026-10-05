// rich-editor.js
// ============================================================
// Единый Rich-Text редактор для всего сайта
// ============================================================

const ALLOWED_TAGS = ['B','I','U','S','BR','SPAN','P','DIV','STRONG','EM','FONT','MARK','SUB','SUP'];

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Очистка HTML от опасных тегов/атрибутов
export function sanitizeHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  function walk(node) {
    if (node.nodeType === 3) return; // text
    if (node.nodeType !== 1) return;

    const tag = node.tagName;
    if (!ALLOWED_TAGS.includes(tag)) {
      const frag = document.createDocumentFragment();
      while (node.firstChild) frag.appendChild(node.firstChild);
      node.parentNode.replaceChild(frag, node);
      return;
    }

    [...node.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (name.startsWith('on')) node.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) {
        node.removeAttribute(attr.name);
      }
      // Разрешаем только class из известных анимаций
      if (name === 'class') {
        const safe = value.split(/\s+/).filter(c => c.startsWith('anim-')).join(' ');
        if (safe) node.setAttribute('class', safe);
        else node.removeAttribute('class');
      }
    });

    [...node.childNodes].forEach(walk);
  }

  [...tmp.childNodes].forEach(walk);
  return tmp.innerHTML;
}

// ============================================================
// СОЗДАНИЕ РЕДАКТОРА
// ============================================================
export function createRichEditor(target, options = {}) {
  const container = typeof target === 'string' ? document.getElementById(target) : target;
  if (!container) return null;

  const placeholder = options.placeholder || 'Введите текст...';
  const initial = options.value || '';
  const minHeight = options.minHeight || '100px';

  container.classList.add('rich-editor-wrapper');
  container.innerHTML = `
    <div class="rich-toolbar" role="toolbar">
      <button type="button" data-cmd="bold" title="Жирный (Ctrl+B)"><i class="fas fa-bold"></i></button>
      <button type="button" data-cmd="italic" title="Курсив (Ctrl+I)"><i class="fas fa-italic"></i></button>
      <button type="button" data-cmd="underline" title="Подчёркнутый (Ctrl+U)"><i class="fas fa-underline"></i></button>
      <button type="button" data-cmd="strikeThrough" title="Зачёркнутый"><i class="fas fa-strikethrough"></i></button>
      <span class="rich-sep"></span>
      <label class="rich-color-picker" title="Цвет текста">
        <i class="fas fa-font"></i>
        <input type="color" data-cmd="foreColor" value="#ffb347">
      </label>
      <label class="rich-color-picker" title="Выделение">
        <i class="fas fa-highlighter"></i>
        <input type="color" data-cmd="hiliteColor" value="#fff3b0">
      </label>
      <span class="rich-sep"></span>
      <button type="button" data-anim="anim-glow" title="Свечение"><i class="fas fa-sun"></i></button>
      <button type="button" data-anim="anim-pulse" title="Пульсация"><i class="fas fa-heartbeat"></i></button>
      <button type="button" data-anim="anim-shake" title="Тряска"><i class="fas fa-bolt"></i></button>
      <button type="button" data-anim="anim-gradient" title="Градиент"><i class="fas fa-fill-drip"></i></button>
      <span class="rich-sep"></span>
      <button type="button" data-cmd="removeFormat" title="Очистить формат"><i class="fas fa-eraser"></i></button>
    </div>
    <div class="rich-content" contenteditable="true" data-placeholder="${escapeHtml(placeholder)}" style="min-height:${minHeight};">${initial}</div>
  `;

  const content = container.querySelector('.rich-content');
  const toolbar = container.querySelector('.rich-toolbar');

  function updateState() {
    ['bold','italic','underline','strikeThrough'].forEach(cmd => {
      const btn = toolbar.querySelector(`[data-cmd="${cmd}"]`);
      if (!btn) return;
      try {
        if (document.queryCommandState(cmd)) btn.classList.add('active');
        else btn.classList.remove('active');
      } catch (_) {}
    });
  }

  function updatePlaceholder() {
    const empty = content.textContent.trim() === '' && !content.querySelector('img, br + *, span');
    content.classList.toggle('empty', empty);
  }

  toolbar.querySelectorAll('[data-cmd]').forEach(btn => {
    if (btn.tagName === 'INPUT') return;
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', e => {
      e.preventDefault();
      content.focus();
      document.execCommand(btn.dataset.cmd, false, null);
      updateState();
    });
  });

  toolbar.querySelectorAll('input[type="color"]').forEach(input => {
    input.addEventListener('mousedown', e => e.preventDefault());
    input.addEventListener('input', e => {
      content.focus();
      document.execCommand(input.dataset.cmd, false, e.target.value);
    });
  });

  toolbar.querySelectorAll('[data-anim]').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', e => {
      e.preventDefault();
      applyAnimation(content, btn.dataset.anim);
    });
  });

  content.addEventListener('keyup', updateState);
  content.addEventListener('mouseup', updateState);
  content.addEventListener('focus', updateState);
  content.addEventListener('input', updatePlaceholder);

  // Вставка — чистый текст, \n → <br>, чтобы переносы сохранялись
  content.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
    const html = escapeHtml(text).replace(/\r?\n/g, '<br>');
    document.execCommand('insertHTML', false, html);
    updatePlaceholder();
  });

  // Enter → <br> вместо <div>
  content.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertHTML', false, '<br><br>');
    }
  });

  updatePlaceholder();

  return {
    getContent: () => content.innerHTML,
    getText: () => content.innerText,
    setContent: (html) => { content.innerHTML = html || ''; updatePlaceholder(); },
    isEmpty: () => content.textContent.trim() === '' && content.innerHTML.replace(/<br\s*\/?>/gi, '').trim() === '',
    element: content,
    focus: () => content.focus()
  };
}

function applyAnimation(content, animClass) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  // Если уже есть span с этим классом — убираем (toggle)
  let parent = range.commonAncestorContainer;
  if (parent.nodeType === 3) parent = parent.parentNode;
  if (parent && parent.classList && parent.classList.contains(animClass)) {
    parent.classList.remove(animClass);
    if (!parent.className) {
      const frag = document.createDocumentFragment();
      while (parent.firstChild) frag.appendChild(parent.firstChild);
      parent.parentNode.replaceChild(frag, parent);
    }
    return;
  }

  const span = document.createElement('span');
  span.className = animClass;
  try {
    range.surroundContents(span);
  } catch (_) {
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
  sel.removeAllRanges();
}