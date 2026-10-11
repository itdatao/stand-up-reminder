/* 注入到网页中的桥接脚本：接收后台指令并挂载休息弹窗 */
(function () {
  if (window.__standUpInjected) return;
  window.__standUpInjected = true;

  function post(msg) {
    try {
      chrome.runtime.sendMessage(msg);
    } catch (e) {}
  }

  function show(config) {
    if (!window.BreakUI) return;
    window.BreakUI.mount(config, {
      onStart: function () { post({ type: 'BREAK_STARTED' }); },
      onComplete: function (seconds) { post({ type: 'BREAK_DONE', seconds: seconds }); },
      onSkip: function () { post({ type: 'BREAK_SKIPPED' }); },
      onSnooze: function (minutes) { post({ type: 'SNOOZE', minutes: minutes }); },
      onDismiss: function () { window.BreakUI.unmount(); }
    });
  }

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg || !msg.type) return;
    if (msg.type === 'SHOW_BREAK') {
      show(msg.config || {});
      sendResponse && sendResponse({ ok: true });
    } else if (msg.type === 'HIDE_BREAK') {
      window.BreakUI && window.BreakUI.unmount();
      sendResponse && sendResponse({ ok: true });
    }
  });
})();
