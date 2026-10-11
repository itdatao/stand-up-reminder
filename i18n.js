/* 应用内 UI 文案（中/英），支持在 popup 手动切换语言 */
var MESSAGES = {
  zh: {
    langName: '中文',
    appName: '起身活动提醒',
    tagline: '久坐一小时，起身动一动',
    switchTip: '开启/关闭提醒',
    nextReminder: '下次提醒',
    paused: '已关闭',
    inProgress: '进行中',
    startNow: '立即休息',
    snooze: '推迟 {n} 分钟',
    frequency: '提醒频率',
    unitMinute: '分钟',
    unitHour: '小时',
    breakDuration: '每次活动时长',
    todayData: '今日数据',
    statDone: '完成(次)',
    statMinutes: '活动(分钟)',
    statSkip: '跳过(次)',
    allCompleted: '累计完成 {n} 次 · {m} 分钟',
    advanced: '高级设置',
    optOverlay: '浏览器内弹窗提醒',
    optNotification: '系统通知',
    optSound: '提示音',
    optIdle: '电脑空闲时自动延后',
    optDnd: '免打扰时段',
    to: '至',
    snoozeLen: '「稍后提醒」时长(分钟)',
    resetToday: '重置今日数据',
    langLabel: '语言',
    brkTitle: '该起身活动啦',
    brkSub: '你已经久坐了一段时间，离开座椅活动一下吧',
    brkHintReady: '准备开始',
    brkHintActive: '休息进行中',
    brkStart: '开始休息 · {n} 分钟',
    brkSnooze: '稍后提醒（{n} 分钟）',
    brkSkip: '跳过本次',
    brkMini: '休息中',
    brkMinimize: '最小化',
    brkEarlyEnd: '提前结束',
    brkResume: '继续工作',
    brkDoneTitle: '很棒，已完成！',
    brkEarlyTitle: '已结束本次休息',
    brkDoneHint: '休息完成',
    brkEarlyHint: '已提前结束',
    brkDoneSub: '继续保持，身体会感谢你 💪',
    brkEarlySub: '记得稍后补上活动哦',
    tip1: '站起来走动、倒杯水',
    tip2: '远眺 20 秒，放松眼睛',
    tip3: '伸展肩颈与腰部',
    notifTitle: '该起身活动啦 🧍',
    notifBody: '你已经久坐一段时间了，站起来活动 {n} 分钟吧！'
  },
  en: {
    langName: 'English',
    appName: 'StandUp Reminder',
    tagline: 'Sit less, move more',
    switchTip: 'Enable/disable reminders',
    nextReminder: 'Next reminder',
    paused: 'Paused',
    inProgress: 'In progress',
    startNow: 'Take a break now',
    snooze: 'Snooze {n} min',
    frequency: 'Reminder frequency',
    unitMinute: 'minutes',
    unitHour: 'hours',
    breakDuration: 'Break duration',
    todayData: "Today's stats",
    statDone: 'Done',
    statMinutes: 'Active(min)',
    statSkip: 'Skipped',
    allCompleted: 'Total {n} breaks · {m} min',
    advanced: 'Advanced',
    optOverlay: 'In-browser popup',
    optNotification: 'System notification',
    optSound: 'Sound',
    optIdle: 'Auto-delay when idle',
    optDnd: 'Do-not-disturb period',
    to: 'to',
    snoozeLen: 'Snooze length (min)',
    resetToday: 'Reset today',
    langLabel: 'Language',
    brkTitle: 'Time to stand up!',
    brkSub: "You've been sitting for a while — leave your seat and move around.",
    brkHintReady: 'Ready to start',
    brkHintActive: 'Break in progress',
    brkStart: 'Start break · {n} min',
    brkSnooze: 'Snooze ({n} min)',
    brkSkip: 'Skip this one',
    brkMini: 'Break',
    brkMinimize: 'Minimize',
    brkEarlyEnd: 'End early',
    brkResume: 'Back to work',
    brkDoneTitle: 'Nice, done!',
    brkEarlyTitle: 'Break ended',
    brkDoneHint: 'Break complete',
    brkEarlyHint: 'Ended early',
    brkDoneSub: 'Keep it up — your body thanks you 💪',
    brkEarlySub: 'Catch up on movement later',
    tip1: 'Stand up, walk around, grab water',
    tip2: 'Look 20 ft away for 20 seconds',
    tip3: 'Stretch neck, shoulders and back',
    notifTitle: 'Time to stand up 🧍',
    notifBody: "You've been sitting a while — stand up and move for {n} minutes!"
  }
};

function resolveLang(lang) {
  return MESSAGES[lang] ? lang : 'zh';
}

function getMessages(lang) {
  return MESSAGES[resolveLang(lang)];
}

function t(lang, key, params) {
  var m = getMessages(lang);
  var s = m[key] || MESSAGES.zh[key] || key;
  if (params) {
    for (var k in params) {
      s = s.split('{' + k + '}').join(params[k]);
    }
  }
  return s;
}

if (typeof window !== 'undefined') {
  window.StandUpI18n = { MESSAGES: MESSAGES, resolveLang: resolveLang, getMessages: getMessages, t: t };
}
