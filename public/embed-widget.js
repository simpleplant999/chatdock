/**
 * ChatDock embed widget — floating bubble (bottom-right).
 *
 * Usage:
 *   <script
 *     src="https://your-host/embed-widget.js"
 *     data-bot-id="CHATBOT_UUID"
 *     defer
 *   ></script>
 *
 * Optional: data-color="#0f766e" data-title="Chat with us"
 */
(function () {
  'use strict';

  var script =
    document.currentScript ||
    document.querySelector('script[src*="embed-widget.js"][data-bot-id]');
  if (!script) {
    console.error('[ChatDock] Could not find embed-widget.js script tag');
    return;
  }

  var botId = script.getAttribute('data-bot-id');
  if (!botId) {
    console.error('[ChatDock] Missing data-bot-id on embed-widget.js');
    return;
  }

  var color = script.getAttribute('data-color') || '#0f766e';
  var title = script.getAttribute('data-title') || 'Athena';
  var srcBase = (script.getAttribute('src') || '').replace(
    /\/embed-widget\.js(?:\?.*)?$/i,
    '',
  );
  if (!srcBase) {
    srcBase = window.location.origin;
  }
  var embedUrl = srcBase + '/embed/' + encodeURIComponent(botId);

  if (document.getElementById('cc-widget-root')) return;

  var css = document.createElement('style');
  css.textContent = [
    '#cc-widget-root{all:initial;position:fixed;z-index:2147483000;right:20px;bottom:20px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}',
    '#cc-widget-root *,#cc-widget-root *::before,#cc-widget-root *::after{box-sizing:border-box}',
    '#cc-launcher{width:60px;height:60px;border-radius:999px;border:0;cursor:pointer;display:grid;place-items:center;background:' +
      color +
      ';color:#fff;box-shadow:0 10px 30px rgba(16,35,31,.28);transition:transform .18s ease,box-shadow .18s ease}',
    '#cc-launcher:hover{transform:scale(1.05);box-shadow:0 14px 34px rgba(16,35,31,.34)}',
    '#cc-launcher:focus-visible{outline:3px solid rgba(15,118,110,.35);outline-offset:3px}',
    '#cc-launcher svg{width:28px;height:28px;display:block}',
    '#cc-panel{position:absolute;right:0;bottom:76px;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 120px));border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 18px 50px rgba(16,35,31,.28);border:1px solid rgba(16,35,31,.08);opacity:0;pointer-events:none;transform:translateY(12px) scale(.96);transform-origin:bottom right;transition:opacity .2s ease,transform .2s ease}',
    '#cc-panel.cc-open{opacity:1;pointer-events:auto;transform:translateY(0) scale(1)}',
    '#cc-panel iframe{width:100%;height:100%;border:0;display:block;background:#fff}',
    '#cc-close{position:absolute;top:10px;right:10px;z-index:2;width:32px;height:32px;border:0;border-radius:999px;background:rgba(255,255,255,.92);color:#10231f;cursor:pointer;display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,.12)}',
    '#cc-close:hover{background:#fff}',
    '@media (max-width:480px){#cc-widget-root{right:12px;bottom:12px}#cc-panel{width:calc(100vw - 24px);height:min(70vh,560px);bottom:72px}}',
  ].join('');

  var root = document.createElement('div');
  root.id = 'cc-widget-root';
  root.setAttribute('data-bot-id', botId);

  var panel = document.createElement('div');
  panel.id = 'cc-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', title);
  panel.setAttribute('aria-hidden', 'true');

  var closeBtn = document.createElement('button');
  closeBtn.id = 'cc-close';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close chat');
  closeBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var launcher = document.createElement('button');
  launcher.id = 'cc-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open chat');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v7.4a2.8 2.8 0 0 1-2.8 2.8H9.2L5 20v-3h-.2A2.8 2.8 0 0 1 2 14.2V6.8A2.8 2.8 0 0 1 4 6.8Z" fill="currentColor" opacity=".95"/><circle cx="8.2" cy="10.2" r="1.1" fill="' +
    color +
    '"/><circle cx="12" cy="10.2" r="1.1" fill="' +
    color +
    '"/><circle cx="15.8" cy="10.2" r="1.1" fill="' +
    color +
    '"/></svg>';

  var iframe = null;
  var open = false;

  function setOpen(next) {
    open = next;
    if (next) {
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.title = title;
        iframe.src = embedUrl;
        iframe.allow = 'clipboard-write';
        panel.appendChild(iframe);
      }
      panel.classList.add('cc-open');
      panel.setAttribute('aria-hidden', 'false');
      launcher.setAttribute('aria-expanded', 'true');
      launcher.setAttribute('aria-label', 'Close chat');
      launcher.innerHTML =
        '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    } else {
      panel.classList.remove('cc-open');
      panel.setAttribute('aria-hidden', 'true');
      launcher.setAttribute('aria-expanded', 'false');
      launcher.setAttribute('aria-label', 'Open chat');
      launcher.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v7.4a2.8 2.8 0 0 1-2.8 2.8H9.2L5 20v-3h-.2A2.8 2.8 0 0 1 2 14.2V6.8A2.8 2.8 0 0 1 4 6.8Z" fill="currentColor" opacity=".95"/><circle cx="8.2" cy="10.2" r="1.1" fill="' +
        color +
        '"/><circle cx="12" cy="10.2" r="1.1" fill="' +
        color +
        '"/><circle cx="15.8" cy="10.2" r="1.1" fill="' +
        color +
        '"/></svg>';
    }
  }

  launcher.addEventListener('click', function () {
    setOpen(!open);
  });
  closeBtn.addEventListener('click', function () {
    setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) setOpen(false);
  });

  panel.appendChild(closeBtn);
  root.appendChild(panel);
  root.appendChild(launcher);

  function mount() {
    document.head.appendChild(css);
    document.body.appendChild(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
