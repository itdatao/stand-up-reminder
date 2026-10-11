/* 共享常量与工具方法：background / popup / 页面均会加载 */

var DEFAULTS = {
  enabled: true,               // 总开关
  lang: 'zh',                  // 界面语言 'zh' | 'en'
  intervalValue: 45,           // 提醒频率数值
  intervalUnit: 'minute',      // 'minute' | 'hour'
  breakMinutes: 3,             // 每次活动时长（分钟）
  snoozeMinutes: 5,            // 「稍后提醒」延后时长（分钟）
  soundEnabled: true,          // 提示音
  overlayEnabled: true,        // 浏览器内弹窗（注入当前页面）
  notificationEnabled: true,   // 系统通知
  pauseWhenIdle: true,         // 电脑空闲时自动延后
  dndEnabled: false,           // 免打扰时段
  dndStart: '18:30',           // 免打扰开始 HH:mm
  dndEnd: '09:00'              // 免打扰结束 HH:mm
};

var LIMITS = {
  minute: { min: 1, max: 600 },
  hour: { min: 1, max: 12 },
  breakMinutes: { min: 1, max: 30 },
  snoozeMinutes: { min: 1, max: 60 }
};

function intervalToMinutes(value, unit) {
  var v = Number(value) || 0;
  return unit === 'hour' ? v * 60 : v;
}

function clampNumber(value, min, max, fallback) {
  var n = Number(value);
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeSettings(raw) {
  var s = {};
  for (var k in DEFAULTS) s[k] = DEFAULTS[k];
  if (raw) {
    for (var key in DEFAULTS) {
      if (raw[key] !== undefined && raw[key] !== null) s[key] = raw[key];
    }
  }
  var lim = LIMITS[s.intervalUnit] || LIMITS.minute;
  s.intervalValue = clampNumber(s.intervalValue, lim.min, lim.max, DEFAULTS.intervalValue);
  s.intervalUnit = s.intervalUnit === 'hour' ? 'hour' : 'minute';
  s.breakMinutes = clampNumber(s.breakMinutes, LIMITS.breakMinutes.min, LIMITS.breakMinutes.max, DEFAULTS.breakMinutes);
  s.snoozeMinutes = clampNumber(s.snoozeMinutes, LIMITS.snoozeMinutes.min, LIMITS.snoozeMinutes.max, DEFAULTS.snoozeMinutes);
  s.enabled = !!s.enabled;
  s.lang = (s.lang === 'en') ? 'en' : 'zh';
  return s;
}

function settingsIntervalMinutes(s) {
  return intervalToMinutes(s.intervalValue, s.intervalUnit);
}

function todayKey(d) {
  var date = d || new Date();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + m + '-' + day;
}

function emptyStats(dateKey) {
  return { date: dateKey || todayKey(), completed: 0, skipped: 0, minutes: 0, allCompleted: 0, allMinutes: 0 };
}

/** 跨天时重置当日数据，保留累计数据 */
function rolloverStats(stats) {
  var key = todayKey();
  if (!stats || typeof stats !== 'object') return emptyStats(key);
  if (stats.date !== key) {
    return {
      date: key,
      completed: 0,
      skipped: 0,
      minutes: 0,
      allCompleted: stats.allCompleted || 0,
      allMinutes: stats.allMinutes || 0
    };
  }
  return {
    date: key,
    completed: stats.completed || 0,
    skipped: stats.skipped || 0,
    minutes: stats.minutes || 0,
    allCompleted: stats.allCompleted || 0,
    allMinutes: stats.allMinutes || 0
  };
}

/** 判断 now 是否落在免打扰区间（支持跨夜，如 18:30 -> 09:00） */
function inDnd(now, start, end) {
  var toMin = function (hhmm) {
    var parts = String(hhmm || '00:00').split(':');
    return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  };
  var cur = now.getHours() * 60 + now.getMinutes();
  var s = toMin(start);
  var e = toMin(end);
  if (s === e) return false;
  return s < e ? (cur >= s && cur < e) : (cur >= s || cur < e);
}

/** 免打扰结束距离现在还有多少分钟 */
function minutesUntilDndEnd(now, end) {
  var parts = String(end || '00:00').split(':');
  var e = (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  var cur = now.getHours() * 60 + now.getMinutes();
  var diff = e - cur;
  if (diff <= 0) diff += 24 * 60;
  return Math.max(1, diff);
}

function formatDuration(totalSeconds) {
  var s = Math.max(0, Math.round(totalSeconds));
  var m = Math.floor(s / 60);
  var sec = s % 60;
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

if (typeof window !== 'undefined') {
  window.StandUpShared = {
    DEFAULTS: DEFAULTS,
    LIMITS: LIMITS,
    normalizeSettings: normalizeSettings,
    settingsIntervalMinutes: settingsIntervalMinutes,
    intervalToMinutes: intervalToMinutes,
    clampNumber: clampNumber,
    todayKey: todayKey,
    emptyStats: emptyStats,
    rolloverStats: rolloverStats,
    inDnd: inDnd,
    minutesUntilDndEnd: minutesUntilDndEnd,
    formatDuration: formatDuration
  };
}
