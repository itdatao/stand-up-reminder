/* 休息弹窗 UI（Shadow DOM 隔离，注入任意网页或作为独立页面使用） */
(function () {
  var STYLE = [
    ':host{position:fixed !important;inset:0 !important;z-index:2147483647 !important;display:block !important;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Segoe UI",system-ui,sans-serif !important;}',
    '.su-mask{position:absolute !important;inset:0 !important;background:rgba(15,23,42,.55) !important;backdrop-filter:blur(6px) !important;-webkit-backdrop-filter:blur(6px) !important;display:flex !important;align-items:center !important;justify-content:center !important;padding:24px !important;animation:su-fade .25s ease !important;}',
    '.su-card{position:relative !important;width:min(420px,92vw) !important;background:#fff !important;color:#0f172a !important;border-radius:22px !important;padding:28px 26px 22px !important;box-shadow:0 24px 60px rgba(2,8,23,.35) !important;text-align:center !important;animation:su-pop .28s cubic-bezier(.2,.9,.3,1.2) !important;}',
    '.su-card.su-mini{width:auto !important;padding:10px 16px !important;border-radius:999px !important;box-shadow:0 12px 30px rgba(2,8,23,.3) !important;}',
    '.su-mini .su-body,.su-mini .su-actions,.su-mini .su-tips,.su-mini .su-title,.su-mini .su-sub{display:none !important}',
    '.su-mini .su-miniBar{display:flex !important}',
    '.su-miniBar{display:none !important;align-items:center !important;gap:10px !important;font-size:14px !important;font-weight:600 !important;cursor:pointer !important;background:none !important;border:0 !important;color:#0f172a !important;}',
    '.su-miniBar b{font-variant-numeric:tabular-nums !important;color:#0ea5e9 !important}',
    '.su-ringWrap{position:relative !important;width:168px !important;height:168px !important;margin:6px auto 14px !important;}',
    '.su-ring{transform:rotate(-90deg) !important;width:168px !important;height:168px !important;}',
    '.su-ring circle{fill:none !important;stroke-width:12 !important;stroke-linecap:round !important;}',
    '.su-ring .su-track{stroke:#e2e8f0 !important;}',
    '.su-ring .su-bar{stroke:url(#suGrad) !important;transition:stroke-dashoffset .95s linear !important;}',
    '.su-time{position:absolute !important;inset:0 !important;display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:center !important;}',
    '.su-time b{font-size:40px !important;line-height:1 !important;font-weight:800 !important;font-variant-numeric:tabular-nums !important;letter-spacing:1px !important;}',
    '.su-time span{font-size:12px !important;color:#64748b !important;margin-top:6px !important;}',
    '.su-title{margin:0 0 6px !important;font-size:21px !important;font-weight:800 !important;letter-spacing:.3px !important;}',
    '.su-sub{margin:0 0 12px !important;font-size:13.5px !important;color:#64748b !important;line-height:1.6 !important;}',
    '.su-tips{list-style:none !important;margin:0 0 18px !important;padding:12px 14px !important;background:#f1f5f9 !important;border-radius:14px !important;text-align:left !important;font-size:12.5px !important;color:#475569 !important;line-height:1.9 !important;}',
    '.su-tips li::before{content:"·" !important;margin-right:8px !important;color:#0ea5e9 !important;font-weight:900 !important;}',
    '.su-actions{display:flex !important;gap:10px !important;justify-content:center !important;flex-wrap:wrap !important;}',
    '.su-btn{border:0 !important;cursor:pointer !important;font-family:inherit !important;font-size:14px !important;font-weight:600 !important;padding:11px 18px !important;border-radius:12px !important;transition:transform .12s ease,box-shadow .2s ease,background .2s ease !important;}',
    '.su-btn:hover{transform:translateY(-1px) !important;}',
    '.su-btn:active{transform:translateY(0) !important;}',
    '.su-primary{background:linear-gradient(135deg,#22c55e,#0ea5e9) !important;color:#fff !important;box-shadow:0 8px 20px rgba(14,165,233,.35) !important;flex:1 1 100% !important;padding:13px 18px !important;font-size:15px !important;}',
    '.su-ghost{background:#f1f5f9 !important;color:#475569 !important;}',
    '.su-text{background:transparent !important;color:#94a3b8 !important;padding:11px 8px !important;}',
    '.su-text:hover{color:#475569 !important;}',
    '.su-minimize{position:absolute !important;top:12px !important;right:14px !important;background:transparent !important;border:0 !important;color:#94a3b8 !important;font-size:18px !important;line-height:1 !important;cursor:pointer !important;padding:6px !important;border-radius:8px !important;}',
    '.su-minimize:hover{background:#f1f5f9 !important;color:#475569 !important;}',
    '.su-done{font-size:52px !important;line-height:1 !important;}',
    '@keyframes su-fade{from{opacity:0}to{opacity:1}}',
    '@keyframes su-pop{from{opacity:0;transform:translateY(14px) scale(.94)}to{opacity:1;transform:none}}',
    '@media (prefers-color-scheme: dark){',
    '.su-card{background:#111827 !important;color:#f1f5f9 !important;box-shadow:0 24px 60px rgba(0,0,0,.6) !important;}',
    '.su-title,.su-miniBar{color:#f1f5f9 !important}',
    '.su-sub,.su-time span{color:#94a3b8 !important}',
    '.su-tips{background:#1f2937 !important;color:#cbd5e1 !important}',
    '.su-ring .su-track{stroke:#1f2937 !important}',
    '.su-ghost{background:#1f2937 !important;color:#cbd5e1 !important}',
    '.su-text{color:#94a3b8 !important}',
    '.su-minimize{color:#64748b !important}',
    '.su-minimize:hover{background:#1f2937 !important;color:#e2e8f0 !important}',
    '}'
  ].join('\n');

  var RING_R = 74;
  var CIRC = 2 * Math.PI * RING_R;
  var current = null;

  // 兜底文案（zh），正常情况下由 background 通过 config.messages 注入当前语言
  var FALLBACK = {
    brkTitle: '该起身活动啦', brkSub: '你已经久坐了一段时间，离开座椅活动一下吧',
    brkHintReady: '准备开始', brkHintActive: '休息进行中',
    brkStart: '开始休息 · {n} 分钟', brkSnooze: '稍后提醒（{n} 分钟）', brkSkip: '跳过本次',
    brkMini: '休息中', brkMinimize: '最小化', brkEarlyEnd: '提前结束', brkResume: '继续工作',
    brkDoneTitle: '很棒，已完成！', brkEarlyTitle: '已结束本次休息',
    brkDoneHint: '休息完成', brkEarlyHint: '已提前结束',
    brkDoneSub: '继续保持，身体会感谢你 💪', brkEarlySub: '记得稍后补上活动哦',
    tip1: '站起来走动、倒杯水', tip2: '远眺 20 秒，放松眼睛', tip3: '伸展肩颈与腰部'
  };

  function tr(s, p) {
    if (!p) return s;
    for (var k in p) s = s.split('{' + k + '}').join(p[k]);
    return s;
  }

  function svgRing() {
    return '<svg class="su-ring" viewBox="0 0 168 168" aria-hidden="true">' +
      '<defs><linearGradient id="suGrad" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#22c55e"/><stop offset="100%" stop-color="#0ea5e9"/>' +
      '</linearGradient></defs>' +
      '<circle class="su-track" cx="84" cy="84" r="' + RING_R + '"></circle>' +
      '<circle class="su-bar" cx="84" cy="84" r="' + RING_R + '" stroke-dasharray="' + CIRC.toFixed(2) + '" stroke-dashoffset="' + CIRC.toFixed(2) + '"></circle>' +
      '</svg>';
  }

  function beep(enabled) {
    if (!enabled) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      [0, 0.18, 0.36].forEach(function (offset, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = [740, 932, 1175][i];
        var t = ctx.currentTime + offset;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });
      setTimeout(function () { try { ctx.close(); } catch (e) {} }, 900);
    } catch (e) {}
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function mount(config, handlers) {
    var cfg = config || {};
    var total = Math.max(5, Number(cfg.breakSeconds) || 180);
    var snooze = Math.max(1, Number(cfg.snoozeMinutes) || 5);
    var h = handlers || {};
    var L = cfg.messages || FALLBACK;

    if (current && current.root && document.contains(current.root)) {
      current.destroy();
    }

    var host = document.createElement('div');
    host.className = 'su-root';
    var shadow = host.attachShadow({ mode: 'closed' });
    var style = document.createElement('style');
    style.textContent = STYLE;
    shadow.appendChild(style);

    var wrap = document.createElement('div');
    wrap.className = 'su-mask';
    wrap.innerHTML =
      '<div class="su-card" role="dialog" aria-modal="true">' +
      '<button class="su-minimize" title="' + L.brkMinimize + '">—</button>' +
      '<button class="su-miniBar"><span>' + L.brkMini + '</span><b>00:00</b></button>' +
      '<div class="su-body">' +
      '<div class="su-ringWrap">' + svgRing() +
      '<div class="su-time"><b class="su-clock">--:--</b><span class="su-hint">' + L.brkHintReady + '</span></div></div>' +
      '<h1 class="su-title">' + L.brkTitle + '</h1>' +
      '<p class="su-sub">' + L.brkSub + '</p>' +
      '<ul class="su-tips"><li>' + L.tip1 + '</li><li>' + L.tip2 + '</li><li>' + L.tip3 + '</li></ul>' +
      '<div class="su-actions">' +
      '<button class="su-btn su-primary su-start">' + tr(L.brkStart, { n: Math.round(total / 60) }) + '</button>' +
      '<button class="su-btn su-ghost su-snooze">' + tr(L.brkSnooze, { n: snooze }) + '</button>' +
      '<button class="su-btn su-text su-skip">' + L.brkSkip + '</button>' +
      '</div></div></div>';
    shadow.appendChild(wrap);
    document.documentElement.appendChild(host);
    try { document.body && (document.body.style.overflow = 'hidden'); } catch (e) {}

    var card = shadow.querySelector('.su-card');
    var clock = shadow.querySelector('.su-clock');
    var hint = shadow.querySelector('.su-hint');
    var bar = shadow.querySelector('.su-bar');
    var miniTime = shadow.querySelector('.su-miniBar b');
    var titleEl = shadow.querySelector('.su-title');
    var subEl = shadow.querySelector('.su-sub');
    var tipsEl = shadow.querySelector('.su-tips');
    var startBtn = shadow.querySelector('.su-start');
    var snoozeBtn = shadow.querySelector('.su-snooze');
    var skipBtn = shadow.querySelector('.su-skip');
    var miniBtn = shadow.querySelector('.su-minimize');
    var miniBar = shadow.querySelector('.su-miniBar');

    var timer = null;
    var endAt = 0;
    var remaining = total;
    var finished = false;

    function fmt(sec) {
      var s = Math.max(0, Math.round(sec));
      return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
    }

    function paint() {
      var text = fmt(remaining);
      clock.textContent = text;
      miniTime.textContent = text;
      bar.setAttribute('stroke-dashoffset', (CIRC * (1 - remaining / total)).toFixed(2));
    }

    function stopTimer() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function finish(early) {
      if (finished) return;
      finished = true;
      stopTimer();
      var elapsed = Math.max(0, total - remaining);
      remaining = 0;
      paint();
      clock.textContent = early ? '⏱' : '✓';
      clock.classList.add('su-done');
      hint.textContent = early ? L.brkEarlyHint : L.brkDoneHint;
      titleEl.textContent = early ? L.brkEarlyTitle : L.brkDoneTitle;
      subEl.textContent = early ? L.brkEarlySub : L.brkDoneSub;
      tipsEl.style.display = 'none';
      startBtn.textContent = L.brkResume;
      startBtn.onclick = function () { if (h.onDismiss) h.onDismiss(); else destroy(); };
      snoozeBtn.style.display = 'none';
      skipBtn.style.display = 'none';
      miniBtn.style.display = 'none';
      if (card.classList.contains('su-mini')) card.classList.remove('su-mini');
      beep(cfg.soundEnabled);
      if (h.onComplete) h.onComplete(Math.round(elapsed), !!early);
    }

    function tick() {
      remaining = (endAt - Date.now()) / 1000;
      if (remaining <= 0) { finish(false); return; }
      paint();
    }

    function start() {
      remaining = total;
      endAt = Date.now() + total * 1000;
      hint.textContent = L.brkHintActive;
      startBtn.textContent = L.brkEarlyEnd;
      startBtn.onclick = function () { finish(true); };
      snoozeBtn.style.display = 'none';
      skipBtn.style.display = 'none';
      paint();
      beep(cfg.soundEnabled);
      stopTimer();
      timer = setInterval(tick, 250);
      if (h.onStart) h.onStart();
    }

    startBtn.onclick = start;
    snoozeBtn.onclick = function () {
      beep(false);
      if (h.onSnooze) h.onSnooze(snooze);
      destroy();
    };
    skipBtn.onclick = function () {
      if (h.onSkip) h.onSkip();
      destroy();
    };
    miniBtn.onclick = function () { card.classList.add('su-mini'); };
    miniBar.onclick = function () { card.classList.remove('su-mini'); };

    function destroy() {
      stopTimer();
      try { document.body && (document.body.style.overflow = ''); } catch (e) {}
      if (host && host.parentNode) host.parentNode.removeChild(host);
      if (current && current.host === host) current = null;
    }

    paint();
    current = { host: host, root: host, destroy: destroy, finish: finish, start: start };
    return current;
  }

  window.BreakUI = {
    mount: mount,
    unmount: function () { if (current) current.destroy(); },
    start: function () { if (current && current.start) current.start(); },
    finish: function () { if (current && current.finish) current.finish(false); }
  };
})();
