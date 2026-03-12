/* ─────────────────────────────────────────────────────────────────────────────
   CREWKIT — app.js
   Core: localStorage, dirty state, router, toast, utilities
   ───────────────────────────────────────────────────────────────────────────── */

'use strict';

/* ── Storage keys ─────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'crewkit_setup';

/* ── App state ────────────────────────────────────────────────────────────── */
const App = {
  setup:   null,   // parsed setup.json object currently in memory
  isDirty: false,  // true when localStorage has unsaved changes vs last export

  /* ── Init ─────────────────────────────────────────────────────────────── */
  init() {
    this._applyTheme();
    this._renderHeader();
    this._renderFooter();
    this.router.init();
  },

  /* ── Setup JSON management ────────────────────────────────────────────── */
  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  saveToStorage(data) {
    data.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    this.setup   = data;
    this.isDirty = true;
    this._updateSaveIndicator();
  },

  clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
    this.setup   = null;
    this.isDirty = false;
    this._updateSaveIndicator();
  },

  markClean() {
    this.isDirty = false;
    this._updateSaveIndicator();
  },

  /* ── Export setup.json ────────────────────────────────────────────────── */
  async exportSetup() {
    if (!this.setup) { Toast.show('No setup loaded.', 'warning'); return; }
    const json = JSON.stringify(this.setup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const filename = `${this._safeFilename(this.setup.company?.name || 'setup')}-setup.json`;
    await this.downloadWithDialog(blob, filename);
    this.markClean();
    Toast.show('setup.json downloaded.', 'success');
  },

  startFillMode() {
    // Navigate to index.html with task parameter to show tasks fill interface
    location.href = 'index.html?task=fillout';
  },

  _safeFilename(s) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 20);
  },

  /* ── Theme ────────────────────────────────────────────────────────────── */
  _applyTheme(theme) {
    const t = theme || this.setup?.company?.theme || 'light';
    if (t === 'system') {
      this._applySystemTheme();
    } else {
      document.documentElement.setAttribute('data-theme', t);
      this._systemThemeWatcher?.removeEventListener('change', this._systemThemeHandler);
    }
  },

  _applySystemTheme() {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
    // Watch for OS-level changes
    if (this._systemThemeHandler) {
      mq.removeEventListener('change', this._systemThemeHandler);
    }
    this._systemThemeHandler = e => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };
    this._systemThemeWatcher = mq;
    mq.addEventListener('change', this._systemThemeHandler);
  },

  /* ── Header ───────────────────────────────────────────────────────────── */
  _renderHeader() {
    const header = document.getElementById('app-header');
    if (!header) return;
    const company = this.setup?.company?.name || '';
    header.innerHTML = `
      <div class="app-header__inner">
        <a href="index.html" class="app-logo" style="text-decoration:none">
          <span>CrewKit</span>
          ${company
            ? `<span class="app-logo__sep">×</span>
               <span class="app-logo__company">${Utils.esc(company)}</span>`
            : ''}
        </a>

        <nav class="app-nav">
          <a href="how-it-works.html" class="app-nav__link"><span>How it works</span></a>
          ${this.setup ? `
          <div class="app-nav__divider"></div>
          <button class="btn btn--secondary btn--sm" onclick="App.startFillMode()">Fill out</button>
          <div class="app-nav__divider"></div>
          <div style="position:relative">
            <button class="btn btn--primary btn--sm" onclick="App._toggleSetupMenu(event)">setup.json ▾</button>
            <div id="setup-menu" style="display:none;position:absolute;top:calc(100% + 6px);right:0;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);box-shadow:var(--shadow-lg);min-width:180px;z-index:999;overflow:hidden">
              <button class="setup-menu-item" onclick="App.exportSetup();App._closeSetupMenu()">Download</button>
              <button class="setup-menu-item" onclick="App._closeSetupMenu();document.getElementById('header-file-replace').click()">Replace</button>
              <button class="setup-menu-item" onclick="App._closeSetupMenu();window.location.href='wizard.html?edit=1'">Edit</button>
              <div style="height:1px;background:var(--color-border);margin:4px 0"></div>
              <button class="setup-menu-item setup-menu-item--danger" onclick="App._closeSetupMenu();App._confirmReset()">Clear &amp; start over</button>
            </div>
            <input type="file" id="header-file-replace" style="display:none" accept=".json">
          </div>` : ''}
        </nav>
      </div>`;
  },

  _toggleSetupMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('setup-menu');
    if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    // Wire up file replace input once
    const input = document.getElementById('header-file-replace');
    if (input && !input._wired) {
      input._wired = true;
      input.addEventListener('change', async ev => {
        const file = ev.target.files[0];
        if (!file) return;
        input.value = '';
        try {
          const text = await Utils.readFile(file);
          const data = JSON.parse(text);
          App.saveToStorage(data);
          App.markClean();
          Toast.show('setup.json replaced.', 'success');
          setTimeout(() => location.reload(), 800);
        } catch {
          Toast.show('Could not read file.', 'error');
        }
      });
    }
  },

  _closeSetupMenu() {
    const menu = document.getElementById('setup-menu');
    if (menu) menu.style.display = 'none';
  },

  _confirmReset() {
    const ok = confirm('This will delete your current setup from the browser. Your downloaded setup.json files are not affected. Continue?');
    if (ok) { this.clearStorage(); location.reload(); }
  },

  _updateSaveIndicator() {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    el.className = `save-indicator ${this.isDirty ? 'save-indicator--dirty' : 'save-indicator--clean'}`;
    el.title     = this.isDirty ? 'Unsaved changes — click to download setup.json' : 'All changes saved';
    el.innerHTML = `<div class="save-indicator__dot"></div>${this.isDirty ? 'Unsaved' : 'Saved'}`;
    el.onclick   = this.isDirty ? () => this.exportSetup() : null;
  },

  /* ── Footer ───────────────────────────────────────────────────────────── */
  _renderFooter() {
    const footer = document.getElementById('app-footer');
    if (!footer) return;
    const year = new Date().getFullYear();
    footer.innerHTML = `
      <div class="app-footer__inner">
        <span><span style="color:var(--color-text-muted);font-size:.75rem">v1.0</span>&nbsp;&nbsp;&nbsp;Created by <a href="https://maximkich.com" target="_blank" class="app-footer__link">Maxim Kich</a></span>
        <a href="mailto:i.am@maximshevchenko.com" class="app-footer__link">Propose a change</a>
      </div>`;
  },

  /* ── UUID generator ───────────────────────────────────────────────────── */
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },
};

/* ── Router ───────────────────────────────────────────────────────────────── */
const Router = {
  init() {
    // Router is implicit: each HTML page is its own file.
    // This just triggers page-specific setup based on body data-page attribute.
    const page = document.body.dataset.page;
    if (page && Pages[page]) Pages[page].init();
  },
};
App.router = Router;

/* ── Pages registry ───────────────────────────────────────────────────────── */
const Pages = {};

/* ── Confirm Modal ────────────────────────────────────────────────────────── */
const Modal = {
  confirm({ title, body, confirmLabel = 'Delete', confirmClass = 'btn btn--danger', onConfirm }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal__title">${title}</div>
        <div class="modal__body">${body}</div>
        <div class="modal__actions">
          <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
          <button class="${confirmClass}" id="modal-confirm">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('modal-backdrop--visible'));

    const close = () => {
      backdrop.classList.remove('modal-backdrop--visible');
      setTimeout(() => backdrop.remove(), 160);
    };

    backdrop.getElementById = id => backdrop.querySelector('#' + id);
    backdrop.querySelector('#modal-cancel').onclick  = close;
    backdrop.querySelector('#modal-confirm').onclick = () => { close(); onConfirm(); };
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  },
};

/* ── Toast ────────────────────────────────────────────────────────────────── */
const Toast = {
  show(msg, type = 'default', duration = 2600) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    // Use leading emoji from message if present, otherwise fall back to type icon
    const emojiMatch = msg.match(/^\p{Emoji_Presentation}/u);
    const icon = emojiMatch ? emojiMatch[0] : ({ success: '✓', warning: '⚠', error: '✕', default: 'ℹ' }[type] || 'ℹ');
    const text = emojiMatch ? msg.slice(emojiMatch[0].length).trim() : msg;
    el.innerHTML = `<span>${icon}</span><span>${Utils.esc(text)}</span>`;
    container.appendChild(el);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('toast--visible'));
    });
    setTimeout(() => {
      el.classList.remove('toast--visible');
      setTimeout(() => el.remove(), 250);
    }, duration);
  },
};

/* ── Utilities ────────────────────────────────────────────────────────────── */
const Utils = {
  esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  copyToClipboard(text, label = 'Copied!') {
    navigator.clipboard.writeText(text)
      .then(() => Toast.show(label, 'success'))
      .catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity  = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        Toast.show(label, 'success');
      });
  },

  formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
  },

  debounce(fn, ms = 400) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },

  // Read file as text (returns Promise)
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },


  // Render a prompt snippet card
  promptSnippet(label, text) {
    const id = 'ps_' + Math.random().toString(36).slice(2);
    return `
      <div class="prompt-snippet">
        <div class="prompt-snippet__header">
          <span class="prompt-snippet__label">🤖 ${Utils.esc(label)}</span>
          <button class="btn btn--sm btn--ghost" onclick="Utils.copyToClipboard(document.getElementById('${id}').textContent, 'Prompt copied!')">
            Copy prompt
          </button>
        </div>
        <pre class="prompt-snippet__text" id="${id}">${Utils.esc(text)}</pre>
      </div>`;
  },

  // Score bar HTML (0–5)
  scoreBar(value, name, onChange) {
    const id = 'sb_' + Math.random().toString(36).slice(2);
    const btns = [0,1,2,3,4,5].map(n =>
      `<button class="score-btn ${value === n ? 'score-btn--active' : ''}"
               data-score="${n}"
               onclick="Utils._scoreBarClick('${id}', ${n}, ${onChange})">${n}</button>`
    ).join('');
    return `<div class="score-bar" id="${id}" data-value="${value}">${btns}</div>`;
  },

  _scoreBarClick(id, n, onChange) {
    const bar = document.getElementById(id);
    if (!bar) return;
    bar.dataset.value = n;
    bar.querySelectorAll('.score-btn').forEach(btn => {
      btn.classList.toggle('score-btn--active', parseInt(btn.dataset.score) === n);
    });
    if (typeof onChange === 'function') onChange(n);
  },

  // Bipolar bar HTML (-3 to +3, excluding 0)
  bipolarBar(value, leftPole, rightPole, name, onChange) {
    const id    = 'bp_' + Math.random().toString(36).slice(2);
    const vals  = [-3, -2, -1, 1, 2, 3];
    const btns  = vals.map(n => {
      const side = n < 0 ? 'left' : 'right';
      const active = value === n ? 'bipolar-btn--active' : '';
      return `<button class="bipolar-btn bipolar-btn--${side} ${active}"
                      data-score="${n}"
                      onclick="Utils._bipolarClick('${id}', ${n}, ${onChange})">${n}</button>`;
    }).join('');
    return `
      <div class="bipolar-widget">
        <div class="bipolar-widget__pole">${Utils.esc(leftPole)}</div>
        <div class="bipolar-bar" id="${id}" data-value="${value}">${btns}</div>
        <div class="bipolar-widget__pole bipolar-widget__pole--right">${Utils.esc(rightPole)}</div>
      </div>`;
  },

  _bipolarClick(id, n, onChange) {
    const bar = document.getElementById(id);
    if (!bar) return;
    bar.dataset.value = n;
    bar.querySelectorAll('.bipolar-btn').forEach(btn => {
      const s = parseInt(btn.dataset.score);
      const side = s < 0 ? 'left' : 'right';
      btn.classList.remove('bipolar-btn--active');
      if (s === n) btn.classList.add('bipolar-btn--active');
    });
    if (typeof onChange === 'function') onChange(n);
  },
};

/* ── Accordion helper ─────────────────────────────────────────────────────── */
function initAccordions(root = document) {
  root.querySelectorAll('.accordion__header').forEach(btn => {
    btn.addEventListener('click', () => {
      const acc = btn.closest('.accordion');
      acc.classList.toggle('accordion--open');
    });
  });
}

/* ── Tab helper ───────────────────────────────────────────────────────────── */
function initTabs(root = document) {
  root.querySelectorAll('.tabs').forEach(tabBar => {
    tabBar.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        const container = tabBar.closest('[data-tabs-container]') || tabBar.parentElement;

        tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-btn--active'));
        btn.classList.add('tab-btn--active');

        container.querySelectorAll('.tab-panel').forEach(panel => {
          panel.classList.toggle('tab-panel--active', panel.dataset.tab === target);
        });
      });
    });
    // Activate first tab by default
    const first = tabBar.querySelector('.tab-btn');
    if (first && !tabBar.querySelector('.tab-btn--active')) first.click();
  });
}

/* ── Validation banner renderer ───────────────────────────────────────────── */
function renderValidationBanners(result, container) {
  if (!container) return;
  container.innerHTML = '';
  if (result.errors.length) {
    const list = result.errors.map(e =>
      `<li><span class="error-badge error-badge--l1">L1</span>${Utils.esc(e.msg)}</li>`
    ).join('');
    container.innerHTML += `
      <div class="validation-banner validation-banner--error">
        <div class="validation-banner__icon">✕</div>
        <div class="validation-banner__body">
          <div class="validation-banner__title">setup.json has errors that must be fixed</div>
          <ul class="validation-banner__list">${list}</ul>
        </div>
      </div>`;
  }
  if (result.warnings.length) {
    const list = result.warnings.map(w =>
      `<li><span class="error-badge error-badge--l2">L2</span>${Utils.esc(w.msg)}</li>`
    ).join('');
    container.innerHTML += `
      <div class="validation-banner validation-banner--warning">
        <div class="validation-banner__icon">⚠</div>
        <div class="validation-banner__body">
          <div class="validation-banner__title">setup.json has ${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}</div>
          <ul class="validation-banner__list">${list}</ul>
        </div>
      </div>`;
  }
}

/* ── App download utilities ────────────────────────────────────────────────────── */
// Extend App object with download methods
App.downloadWithDialog = async function(blob, suggestedFilename) {
  // Try File System Access API (modern browsers)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: suggestedFilename,
        types: [
          {
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // User cancelled or error occurred, fall through to default
      if (err.name === 'AbortError') return;
    }
  }

  // Fallback: traditional download (browser chooses location)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

App.downloadJSON = async function(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  await App.downloadWithDialog(blob, filename);
};

/* ── Boot ─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Load setup from storage
  App.setup = App.loadFromStorage();
  // Apply theme immediately
  App._applyTheme();
  // Render shell
  App._renderHeader();
  App._renderFooter();
  // Route to page
  App.router.init();
  // Init UI helpers
  initAccordions();
  initTabs();
  // Close setup menu on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#setup-menu') && !e.target.closest('[onclick*="_toggleSetupMenu"]')) {
      App._closeSetupMenu();
    }
  });
});
