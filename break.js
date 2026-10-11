/* 独立休息页：无法在当前网页注入时使用（如 chrome:// 页面） */
(function () {
  var fallback = { breakSeconds: 180, soundEnabled: true, snoozeMinutes: 5 };

  function post(msg) {
    try {
      chrome.runtime.sendMessage(msg);
    } catch (e) {}
  }

  function setHeader(L) {
    var head = document.querySelector('.page-head');
    if (head) head.innerHTML = '<span class="dot"></span> ' + L.appName;
    document.title = L.appName;
  }

  function mount(config) {
    if (config && config.messages) setHeader(config.messages);
    window.BreakUI.mount(config, {
      onStart: function () { post({ type: 'BREAK_STARTED' }); },
      onComplete: function (seconds) {
        post({ type: 'BREAK_DONE', seconds: seconds });
      },
      onSkip: function () {
        post({ type: 'BREAK_SKIPPED' });
        try { window.close(); } catch (e) {}
      },
      onSnooze: function (minutes) {
        post({ type: 'SNOOZE', minutes: minutes });
        try { window.close(); } catch (e) {}
      },
      onDismiss: function () {
        try { window.close(); } catch (e) {}
        window.BreakUI.unmount();
      }
    });
  }

  try {
    chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, function (res) {
      mount((res && res.config) || fallback);
    });
  } catch (e) {
    mount(fallback);
  }
})();
