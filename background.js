/* 后台服务：定时调度提醒与统计 */

importScripts('shared.js');
importScripts('i18n.js');

var ALARM_MAIN = 'standup-main';
var NOTIF_ID = 'standup-notification';

var state = {
  settings: normalizeSettings(null),
  stats: emptyStats(),
  nextReminderAt: 0,
  awaitingBreak: false,   // 已弹出提醒，等待用户处理
  breaking: false,        // 用户正在休息倒计时中
  breakTabId: null
};

function log() {
  // console.log('[StandUp]', ...arguments);
}

function saveState(patch) {
  return chrome.storage.local.set(patch || {});
}

function persist() {
  return saveState({
    settings: state.settings,
    stats: state.stats,
    nextReminderAt: state.nextReminderAt
  });
}

function loadState() {
  return chrome.storage.local.get(['settings', 'stats', 'nextReminderAt']).then(function (data) {
    state.settings = normalizeSettings(data.settings);
    state.stats = rolloverStats(data.stats);
    state.nextReminderAt = data.nextReminderAt || 0;
  });
}

function scheduleIn(minutes, reason) {
  var mins = Math.max(1, Math.round(minutes));
  var when = Date.now() + mins * 60 * 1000;
  state.nextReminderAt = when;
  state.awaitingBreak = false;
  chrome.alarms.clear(ALARM_MAIN);
  chrome.alarms.create(ALARM_MAIN, { delayInMinutes: mins });
  log('schedule in ' + mins + ' min (' + (reason || '') + ')');
  return persist();
}

function scheduleNextReminder() {
  return scheduleIn(settingsIntervalMinutes(state.settings), 'interval');
}

function bumpStats(type, seconds) {
  var stats = rolloverStats(state.stats);
  if (type === 'done') {
    var mins = Math.max(1, Math.round((Number(seconds) || 0) / 60));
    stats.completed += 1;
    stats.minutes += mins;
    stats.allCompleted += 1;
    stats.allMinutes += mins;
  } else if (type === 'skip') {
    stats.skipped += 1;
  }
  state.stats = stats;
}

function openBreakPage() {
  var url = chrome.runtime.getURL('break.html');
  if (state.breakTabId) {
    chrome.tabs.get(state.breakTabId, function (tab) {
      if (chrome.runtime.lastError || !tab) {
        createBreakTab(url);
      } else {
        chrome.tabs.update(state.breakTabId, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
      }
    });
  } else {
    createBreakTab(url);
  }
}

function createBreakTab(url) {
  chrome.tabs.create({ url: url, active: true }, function (tab) {
    if (tab && tab.id) state.breakTabId = tab.id;
  });
}

function showNotification() {
  if (!state.settings.notificationEnabled) return;
  var lang = state.settings.lang;
  chrome.notifications.create(NOTIF_ID, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: t(lang, 'notifTitle'),
    message: t(lang, 'notifBody', { n: state.settings.breakMinutes }),
    priority: 2,
    requireInteraction: false
  });
}

function configForBreak() {
  var lang = state.settings.lang;
  return {
    lang: lang,
    messages: getMessages(lang),
    breakSeconds: state.settings.breakMinutes * 60,
    soundEnabled: state.settings.soundEnabled,
    snoozeMinutes: state.settings.snoozeMinutes
  };
}

function tryOverlay() {
  if (!state.settings.overlayEnabled) return Promise.resolve(false);
  return chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(function (tabs) {
    var tab = tabs && tabs[0];
    if (!tab || !tab.id || !/^https?:/.test(tab.url || '')) return false;
    return chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['break-ui.js', 'content.js']
    }).then(function () {
      return chrome.tabs.sendMessage(tab.id, { type: 'SHOW_BREAK', config: configForBreak() });
    }).then(function () {
      return true;
    }).catch(function () {
      return false;
    });
  }).catch(function () {
    return false;
  });
}

function triggerReminder() {
  if (!state.settings.enabled) return Promise.resolve();
  if (state.breaking || state.awaitingBreak) return Promise.resolve();

  var now = new Date();
  if (state.settings.dndEnabled && inDnd(now, state.settings.dndStart, state.settings.dndEnd)) {
    return scheduleIn(minutesUntilDndEnd(now, state.settings.dndEnd), 'dnd');
  }

  if (state.settings.pauseWhenIdle && chrome.idle) {
    return new Promise(function (resolve) {
      chrome.idle.queryState(60, function (idleState) {
        if (idleState && idleState !== 'active') {
          scheduleIn(1, 'idle:' + idleState).then(resolve);
        } else {
          doTrigger().then(resolve);
        }
      });
    });
  }
  return doTrigger();
}

function doTrigger() {
  state.awaitingBreak = true;
  state.nextReminderAt = 0;
  return persist().then(tryOverlay).then(function (ok) {
    if (!ok) openBreakPage();
    if (!ok || state.settings.notificationEnabled) showNotification();
    return persist();
  });
}

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name !== ALARM_MAIN) return;
  loadState().then(function () {
    // 防止「过期/误触发」：只有真正到了计划时间，才弹窗提醒。
    // 浏览器重启、SW 唤醒等情况可能让残留的短延时 alarm 立即触发，
    // 这里统一用 nextReminderAt 校验，避免「刚打开浏览器就弹窗」。
    if (!state.settings.enabled) {
      chrome.alarms.clear(ALARM_MAIN);
      return;
    }
    if (state.breaking || state.awaitingBreak) return;

    var now = Date.now();
    var target = state.nextReminderAt || 0;
    var leftSec = (target - now) / 1000;

    if (target === 0) {
      // 没有计划时间（例如刚启动还没调度过），按完整间隔重新排
      return scheduleNextReminder();
    }
    if (leftSec > 30) {
      // 还没到时间，alarm 被提前触发（残留/漂移），重新按剩余时间排
      return scheduleIn(leftSec / 60, 'early-alarm');
    }
    // 真正到期（或仅小幅提前），正常触发提醒
    return triggerReminder();
  });
});

chrome.notifications.onClicked.addListener(function (id) {
  if (id !== NOTIF_ID) return;
  chrome.notifications.clear(id);
  if (state.settings.overlayEnabled) {
    tryOverlay().then(function (ok) {
      if (!ok) openBreakPage();
    });
  } else {
    openBreakPage();
  }
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  var type = msg && msg.type;
  if (!type) return;

  if (type === 'GET_CONFIG') {
    sendResponse({ config: configForBreak(), settings: state.settings });
    return;
  }

  if (type === 'GET_STATE') {
    sendResponse({ settings: state.settings, stats: rolloverStats(state.stats), nextReminderAt: state.nextReminderAt });
    return;
  }

  if (type === 'BREAK_STARTED') {
    state.breaking = true;
    state.awaitingBreak = true;
    persist();
    sendResponse({ ok: true });
    return;
  }

  if (type === 'BREAK_DONE') {
    state.breaking = false;
    bumpStats('done', msg.seconds);
    if (sender && sender.tab && sender.tab.id === state.breakTabId) state.breakTabId = null;
    sendResponse({ ok: true });
    scheduleNextReminder();
    return;
  }

  if (type === 'BREAK_SKIPPED') {
    state.breaking = false;
    bumpStats('skip');
    if (sender && sender.tab && sender.tab.id === state.breakTabId) state.breakTabId = null;
    sendResponse({ ok: true });
    scheduleNextReminder();
    return;
  }

  if (type === 'SNOOZE') {
    state.breaking = false;
    if (sender && sender.tab && sender.tab.id === state.breakTabId) state.breakTabId = null;
    sendResponse({ ok: true });
    scheduleIn(Number(msg.minutes) || state.settings.snoozeMinutes, 'snooze');
    return;
  }

  if (type === 'TRIGGER_NOW') {
    triggerReminder().then(function () {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (type === 'RESET_STATS') {
    state.stats = emptyStats();
    persist().then(function () {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (type === 'UPDATE_SETTINGS') {
    state.settings = normalizeSettings(msg.settings);
    persist().then(function () {
      sendResponse({ ok: true });
      if (!state.breaking && !state.awaitingBreak) scheduleNextReminder();
    });
    return true;
  }
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area !== 'local') return;
  if (changes.settings) {
    var prev = state.settings;
    state.settings = normalizeSettings(changes.settings.newValue);
    var prevMins = settingsIntervalMinutes(prev);
    var nextMins = settingsIntervalMinutes(state.settings);
    if (!state.breaking && !state.awaitingBreak && (prevMins !== nextMins || prev.enabled !== state.settings.enabled)) {
      if (state.settings.enabled) scheduleNextReminder();
      else chrome.alarms.clear(ALARM_MAIN);
    }
  }
  if (changes.stats) state.stats = rolloverStats(changes.stats.newValue);
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.alarms.clear(ALARM_MAIN);
  loadState().then(function () {
    return persist();
  }).then(function () {
    if (state.settings.enabled) return scheduleNextReminder();
  });
});

chrome.runtime.onStartup.addListener(function () {
  loadState().then(function () {
    state.breakTabId = null;
    // 启动时一律清除可能残留的旧 alarm，避免「刚开浏览器就弹窗」。
    chrome.alarms.clear(ALARM_MAIN);
    if (!state.settings.enabled) return;

    // 若正处于提醒/休息流程中，不打断，等待用户处理。
    if (state.breaking || state.awaitingBreak) return;

    var leftMin = state.nextReminderAt ? (state.nextReminderAt - Date.now()) / 60000 : 0;
    if (leftMin >= 1) {
      // 剩余时间足够，按剩余时间重排。
      return scheduleIn(leftMin, 'startup');
    }
    // nextReminderAt 已过期（浏览器关闭期间错过了），
    // 不立即弹窗，而是按完整间隔重新开始计时。
    return scheduleNextReminder();
  });
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  if (tabId === state.breakTabId) state.breakTabId = null;
});

// 服务进程唤醒时恢复内存状态
loadState();
