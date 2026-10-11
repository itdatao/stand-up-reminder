/* 设置面板逻辑 */
(function () {
  // 非扩展环境（如直接用浏览器打开 popup.html 预览）时的最小 chrome API 兜底
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    var mem = { settings: null, stats: null, nextReminderAt: Date.now() + 45 * 60 * 1000 };
    window.chrome = {
      storage: {
        local: {
          get: function (keys, cb) {
            var out = {};
            (Array.isArray(keys) ? keys : [keys]).forEach(function (k) { out[k] = mem[k]; });
            setTimeout(function () { cb(out); }, 0);
          },
          set: function (obj, cb) {
            Object.assign(mem, obj);
            setTimeout(function () { cb && cb(); }, 0);
          }
        },
        onChanged: { addListener: function () {} }
      },
      runtime: { sendMessage: function (msg, cb) { cb && cb({ ok: true }); } }
    };
  }

  var S = window.StandUpShared;
  var I = window.StandUpI18n;
  var $ = function (id) { return document.getElementById(id); };

  var settings = S.normalizeSettings(null);
  var stats = S.emptyStats();
  var nextReminderAt = 0;

  function lang() { return settings.lang || 'zh'; }
  function tt(key, params) { return I.t(lang(), key, params); }

  function collect() {
    return S.normalizeSettings({
      enabled: $('enabled').checked,
      lang: $('lang').value,
      intervalValue: $('intervalValue').value,
      intervalUnit: $('intervalUnit').value,
      breakMinutes: currentBreakMinutes(),
      snoozeMinutes: $('snoozeMinutes').value,
      soundEnabled: $('soundEnabled').checked,
      overlayEnabled: $('overlayEnabled').checked,
      notificationEnabled: $('notificationEnabled').checked,
      pauseWhenIdle: $('pauseWhenIdle').checked,
      dndEnabled: $('dndEnabled').checked,
      dndStart: $('dndStart').value || '18:30',
      dndEnd: $('dndEnd').value || '09:00'
    });
  }

  function activeChip(container) {
    return container.querySelector('.chip.active');
  }

  function currentBreakMinutes() {
    var el = activeChip($('breakChips'));
    return el ? Number(el.dataset.minutes) : settings.breakMinutes;
  }

  function save() {
    settings = collect();
    chrome.storage.local.set({ settings: settings });
    applyTexts();
  }

  // 翻译静态 [data-i18n] / [data-i18n-title]
  function translateStatic() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      el.textContent = tt(el.getAttribute('data-i18n'));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-title]'), function (el) {
      el.title = tt(el.getAttribute('data-i18n-title'));
    });
  }

  // 应用所有依赖语言的动态文案
  function applyTexts() {
    translateStatic();
    renderChips();
    renderStats();
    renderCountdown();
  }

  function render() {
    $('enabled').checked = settings.enabled;
    $('lang').value = lang();
    $('intervalValue').value = settings.intervalValue;
    $('intervalUnit').value = settings.intervalUnit;
    $('snoozeMinutes').value = settings.snoozeMinutes;
    $('soundEnabled').checked = settings.soundEnabled;
    $('overlayEnabled').checked = settings.overlayEnabled;
    $('notificationEnabled').checked = settings.notificationEnabled;
    $('pauseWhenIdle').checked = settings.pauseWhenIdle;
    $('dndEnabled').checked = settings.dndEnabled;
    $('dndStart').value = settings.dndStart;
    $('dndEnd').value = settings.dndEnd;
    applyUnitLimits();
    applyTexts();
  }

  function applyUnitLimits() {
    var unit = $('intervalUnit').value;
    var lim = S.LIMITS[unit] || S.LIMITS.minute;
    var input = $('intervalValue');
    input.min = lim.min;
    input.max = lim.max;
  }

  function chipLabel(minutes) {
    if (minutes >= 60 && minutes % 60 === 0) {
      return (minutes / 60) + ' ' + tt('unitHour');
    }
    return minutes + ' ' + tt('unitMinute');
  }

  function renderChips() {
    var total = S.settingsIntervalMinutes(settings);
    Array.prototype.forEach.call($('freqChips').children, function (chip) {
      var m = Number(chip.dataset.minutes);
      chip.textContent = chipLabel(m);
      chip.classList.toggle('active', m === total);
    });
    Array.prototype.forEach.call($('breakChips').children, function (chip) {
      var m = Number(chip.dataset.minutes);
      chip.textContent = chipLabel(m);
      chip.classList.toggle('active', m === Number(settings.breakMinutes));
    });
    $('snoozeBtn').textContent = tt('snooze', { n: settings.snoozeMinutes });
  }

  function renderStats() {
    $('statDone').textContent = stats.completed;
    $('statMin').textContent = Math.round(stats.minutes);
    $('statSkip').textContent = stats.skipped;
    $('statFoot').textContent = tt('allCompleted', {
      n: stats.allCompleted || 0,
      m: Math.round(stats.allMinutes || 0)
    });
  }

  function renderCountdown() {
    var el = $('countdown');
    if (!settings.enabled) {
      el.textContent = tt('paused');
      el.style.fontSize = '24px';
      return;
    }
    el.style.fontSize = '34px';
    var left = nextReminderAt ? Math.round((nextReminderAt - Date.now()) / 1000) : 0;
    if (left <= 0) {
      el.textContent = tt('inProgress');
      el.style.fontSize = '24px';
      return;
    }
    el.textContent = S.formatDuration(left);
  }

  function load() {
    chrome.storage.local.get(['settings', 'stats', 'nextReminderAt'], function (data) {
      settings = S.normalizeSettings(data.settings);
      stats = S.rolloverStats(data.stats);
      nextReminderAt = data.nextReminderAt || 0;
      render();
    });
  }

  function bind() {
    $('enabled').addEventListener('change', save);
    $('lang').addEventListener('change', save);

    $('intervalValue').addEventListener('change', save);
    $('intervalValue').addEventListener('input', function () {
      settings.intervalValue = $('intervalValue').value;
    });

    $('intervalUnit').addEventListener('change', function () {
      var total = S.settingsIntervalMinutes(settings);
      var unit = $('intervalUnit').value;
      var converted = unit === 'hour' ? Math.round(total / 60) : total;
      var lim = S.LIMITS[unit] || S.LIMITS.minute;
      $('intervalValue').value = S.clampNumber(converted, lim.min, lim.max, lim.min);
      applyUnitLimits();
      save();
    });

    $('freqChips').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      var minutes = Number(chip.dataset.minutes);
      if (minutes % 60 === 0 && minutes >= 60) {
        $('intervalUnit').value = 'hour';
        $('intervalValue').value = minutes / 60;
      } else {
        $('intervalUnit').value = 'minute';
        $('intervalValue').value = minutes;
      }
      applyUnitLimits();
      save();
    });

    $('breakChips').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      settings.breakMinutes = Number(chip.dataset.minutes);
      save();
    });

    ['soundEnabled', 'overlayEnabled', 'notificationEnabled', 'pauseWhenIdle', 'dndEnabled'].forEach(function (id) {
      $(id).addEventListener('change', save);
    });
    ['dndStart', 'dndEnd', 'snoozeMinutes'].forEach(function (id) {
      $(id).addEventListener('change', save);
    });

    $('nowBtn').addEventListener('click', function () {
      chrome.runtime.sendMessage({ type: 'TRIGGER_NOW' }, function () {
        window.close();
      });
    });

    $('snoozeBtn').addEventListener('click', function () {
      chrome.runtime.sendMessage({ type: 'SNOOZE', minutes: settings.snoozeMinutes }, function () {
        window.close();
      });
    });

    $('resetBtn').addEventListener('click', function () {
      chrome.runtime.sendMessage({ type: 'RESET_STATS' }, function () {
        load();
      });
    });
  }

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    if (changes.settings) settings = S.normalizeSettings(changes.settings.newValue);
    if (changes.stats) stats = S.rolloverStats(changes.stats.newValue);
    if (changes.nextReminderAt) nextReminderAt = changes.nextReminderAt.newValue || 0;
    if (document.activeElement !== $('intervalValue')) render();
    else { renderStats(); renderCountdown(); }
  });

  bind();
  load();
  setInterval(function () {
    var left = nextReminderAt ? Math.round((nextReminderAt - Date.now()) / 1000) : 0;
    if (left <= 0) nextReminderAt = 0;
    renderCountdown();
  }, 1000);
})();
