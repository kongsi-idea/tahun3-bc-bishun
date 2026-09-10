/* ================================================================
   三年级写字 —— 三年级习写生字 · 笔顺描红
   纯前端，无 build。笔画数据来自 js/char-data.js（离线打包）。
   架构照 tahun1-bc-bishun，换数据 + 换皮（We are Twinkle Twinkle · 暖调梦幻绘本）。
   ================================================================ */
(function () {
  "use strict";

  var UNITS = window.UNITS;
  var HW = window.HW_DATA;

  /* ---------- 当前学生 + 进度 ----------
     进度 = { "字": 0|1|2 }  0=未学 1=描过 2=写过(★)
     每个学生一份，localStorage key 带 playCode 与姓名；有班级代码时再同步到 Supabase。 */
  var SLUG = "tahun3-bc-bishun";
  var student = null;   // { name, classLabel, playCode }  playCode 可为 null（访客）
  var progress = {};

  function progKey() {
    var pc = (student && student.playCode) || "guest";
    var nm = (student && student.name) || "-";
    return "bishun3_prog__" + pc + "__" + nm;
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(progKey())) || {}; }
    catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(progKey(), JSON.stringify(progress)); }
    catch (e) {}
    syncSoon();
  }
  function stat(ch) { return progress[ch] || 0; }
  function bump(ch, v) { if (v > stat(ch)) { progress[ch] = v; save(); } }

  function unitDone(u) { return u.chars.every(function (c) { return stat(c) === 2; }); }
  function unitStars(u) { return u.chars.filter(function (c) { return stat(c) === 2; }).length; }
  function overallStars() {
    var n = 0;
    UNITS.forEach(function (u) { u.chars.forEach(function (c) { if (stat(c) === 2) n++; }); });
    return n;
  }
  var TOTAL_CELLS = UNITS.reduce(function (s, u) { return s + u.chars.length; }, 0);

  /* ---------- 声音（WebAudio，生成式，可静音） ---------- */
  var Sfx = (function () {
    var ctx = null, muted = localStorage.getItem("bishun3_muted") === "1";
    function ac() {
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
      return ctx;
    }
    function tone(freq, dur, type, vol, glideTo) {
      if (muted) return; var c = ac(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine"; o.frequency.value = freq;
      if (glideTo) o.frequency.linearRampToValueAtTime(glideTo, c.currentTime + dur);
      g.gain.value = vol || 0.2;
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur);
    }
    function noise(dur, vol, freq) {
      if (muted) return; var c = ac(); if (!c) return;
      var n = c.createBufferSource();
      var buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      n.buffer = buf;
      var f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq || 1600;
      var g = c.createGain(); g.gain.value = vol || 0.14;
      n.connect(f); f.connect(g); g.connect(c.destination);
      n.start();
    }
    return {
      resume: function () { var c = ac(); if (c && c.state === "suspended") c.resume(); },
      swish: function () { noise(0.16, 0.11, 1700); },
      miss: function () { tone(300, 0.18, "sine", 0.12, 220); },
      ding: function () { tone(660, 0.15, "sine", 0.17); setTimeout(function () { tone(880, 0.26, "sine", 0.15); }, 100); },
      fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { tone(f, 0.3, "triangle", 0.15); }, i * 105); }); },
      stamp: function () { tone(140, 0.22, "sine", 0.26, 90); noise(0.16, 0.18, 500); },
      toggle: function () { muted = !muted; localStorage.setItem("bishun3_muted", muted ? "1" : "0"); if (!muted) this.resume(); return muted; },
      isMuted: function () { return muted; }
    };
  })();

  /* ---------- 读音（浏览器内建语音，无需网络/密钥） ---------- */
  var Say = (function () {
    var synth = window.speechSynthesis || null;
    var voice = null, ready = false;
    function pickVoice() {
      if (!synth) return;
      var vs = synth.getVoices() || [];
      voice = vs.filter(function (v) { return /^zh(-|_|$)|Chinese|中文|普通话|國語|Mandarin/i.test(v.lang + " " + v.name); })
                 .sort(function (a, b) { return (/zh-CN|zh_CN|Hans/i.test(a.lang) ? -1 : 0) - (/zh-CN|zh_CN|Hans/i.test(b.lang) ? -1 : 0); })[0] || null;
      ready = true;
    }
    if (synth) {
      pickVoice();
      if (synth.onvoiceschanged !== undefined) synth.addEventListener("voiceschanged", pickVoice);
    }
    return {
      available: function () { return !!synth; },
      speak: function (text, onStart, onEnd) {
        if (!synth) { onEnd && onEnd(); return; }
        try {
          synth.cancel();
          var u = new SpeechSynthesisUtterance(text);
          u.lang = (voice && voice.lang) || "zh-CN";
          if (voice) u.voice = voice;
          u.rate = 0.6; u.pitch = 1.05;
          if (onStart) u.onstart = onStart;
          u.onend = function () { onEnd && onEnd(); };
          u.onerror = function () { onEnd && onEnd(); };
          synth.speak(u);
        } catch (e) { onEnd && onEnd(); }
      },
      stop: function () { if (synth) try { synth.cancel(); } catch (e) {} }
    };
  })();

  /* ---------- DOM ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var screens = {
    who: $("#screen-who"), home: $("#screen-home"), unit: $("#screen-unit"),
    practice: $("#screen-practice"), quiz: $("#screen-quiz")
  };
  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].hidden = (k !== name); });
    window.scrollTo(0, 0);
  }

  var muteBtn = $("#muteBtn");
  muteBtn.setAttribute("aria-pressed", Sfx.isMuted() ? "true" : "false");
  muteBtn.addEventListener("click", function () {
    var m = Sfx.toggle();
    muteBtn.setAttribute("aria-pressed", m ? "true" : "false");
  });
  document.addEventListener("pointerdown", function once() {
    Sfx.resume(); document.removeEventListener("pointerdown", once);
  });

  var toastEl = $("#toast"), toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    requestAnimationFrame(function () { toastEl.classList.add("show"); });
    clearTimeout(toastT);
    toastT = setTimeout(function () {
      toastEl.classList.remove("show");
      setTimeout(function () { toastEl.hidden = true; }, 300);
    }, 1800);
  }

  /* ================= 选名字 + 进度同步 ================= */
  var HAS_DB = typeof supabaseClient !== "undefined" && typeof ClassCode !== "undefined";
  var roster = [];        // ClassCode.load() 的结果
  var syncT = null;

  function withTimeout(p, ms) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms || 6000); })]);
  }

  async function fetchRemoteProgress() {
    if (!HAS_DB || !student || !student.playCode) return null;
    try {
      var res = await withTimeout(supabaseClient
        .from("tahun3_bc_bishun_progress")
        .select("chars_json")
        .eq("play_code", student.playCode)
        .eq("name", student.name)
        .maybeSingle(), 6000);
      if (res.error || !res.data) return null;
      return res.data.chars_json || {};
    } catch (e) { return null; }
  }

  function syncSoon() {
    if (!HAS_DB || !student || !student.playCode) return;
    clearTimeout(syncT);
    syncT = setTimeout(pushProgress, 1500);
  }
  async function pushProgress() {
    if (!HAS_DB || !student || !student.playCode) return;
    try {
      await withTimeout(supabaseClient.rpc("submit_tahun3_bc_bishun_progress", {
        p_play_code: student.playCode,
        p_class_label: student.classLabel || student.playCode,
        p_name: student.name,
        p_chars_json: progress
      }), 6000);
    } catch (e) { /* 离线也没关系，本机已存，下次再同步 */ }
  }

  function mergeInto(a, b) { // b 的较高状态并进 a
    Object.keys(b || {}).forEach(function (k) {
      if ((b[k] | 0) > (a[k] | 0)) a[k] = b[k] | 0;
    });
    return a;
  }

  async function pickStudent(s) {
    student = s;
    progress = load();                       // 本机这个学生的进度
    var remote = await fetchRemoteProgress(); // 服务器上的（可能来自别台电脑）
    if (remote) { mergeInto(progress, remote); save(); }
    updateWhoSwitch();
    renderHome();
  }

  function updateWhoSwitch() {
    var b = $("#whoSwitch");
    if (student && student.name) {
      b.hidden = false;
      b.textContent = "现在是 " + student.name + "　·　换人";
    } else { b.hidden = true; }
  }
  $("#whoSwitch").addEventListener("click", function () { showWho(false); });

  function renderWhoGrid() {
    var grid = $("#whoGrid"); grid.innerHTML = "";
    roster.forEach(function (r) {
      var localCount = countDoneFor(r.playCode, r.name);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "who-name" + (localCount > 0 ? " has-progress" : "");
      b.innerHTML =
        (r.seatNo != null ? '<span class="seat">' + r.seatNo + "</span>" : "") +
        esc(r.name) +
        (localCount > 0 ? '<span class="mini">★ ' + localCount + "</span>" : "");
      b.addEventListener("click", function () { pickStudent({ name: r.name, classLabel: r.className || r.playCode, playCode: r.playCode }); });
      grid.appendChild(b);
    });
  }
  function countDoneFor(pc, nm) {
    try {
      var p = JSON.parse(localStorage.getItem("bishun3_prog__" + (pc || "guest") + "__" + nm)) || {};
      return Object.keys(p).filter(function (k) { return p[k] === 2; }).length;
    } catch (e) { return 0; }
  }

  var CODE_KEY = "bishun3_code";
  var rosterLoaded = false;

  function urlCode() {
    try { return (new URLSearchParams(window.location.search).get("code") || "").trim(); }
    catch (e) { return ""; }
  }
  function savedCode() {
    try { return localStorage.getItem(CODE_KEY) || localStorage.getItem("kelasku_class_code") || ""; }
    catch (e) { return ""; }
  }
  function saveCode(c) { try { localStorage.setItem(CODE_KEY, c); } catch (e) {} }

  // 只对「网络请求」计时，绝不把等学生打字的时间算进去
  async function loadRoster(code) {
    if (!HAS_DB || !code) return [];
    try { return (await withTimeout(ClassCode.load(code), 12000)) || []; }
    catch (e) { return []; }
  }

  async function startWho() {
    show("who");
    $("#whoGrid").innerHTML = "";
    $("#whoManual").hidden = true;
    $("#whoCode").hidden = true;
    $("#whoFoot").textContent = "";

    var code = urlCode() || savedCode();
    if (HAS_DB && code) {
      $("#whoSub").textContent = "正在读班级名单…";
      roster = await loadRoster(code);
      if (roster.length > 0) { saveCode(code.toUpperCase()); rosterLoaded = true; renderNameGrid(); return; }
    }
    rosterLoaded = true;
    renderCodeEntry(code);   // 没代码 / 读不到 → 让学生输代码（不计时）
  }

  function renderCodeEntry(prefill) {
    show("who");
    $("#whoGrid").innerHTML = "";
    $("#whoManual").hidden = true;
    $("#whoFoot").textContent = "";
    $("#whoSub").textContent = HAS_DB ? "输入老师给的班级代码" : "打上你的名字就可以开始";
    if (!HAS_DB) { $("#whoCode").hidden = true; $("#whoManual").hidden = false; $("#whoInput").placeholder = "打上你的名字"; return; }
    $("#whoCode").hidden = false;
    $("#whoCodeInput").value = (prefill || "").toUpperCase();
    setTimeout(function () { $("#whoCodeInput").focus(); }, 50);
  }

  async function submitCode() {
    var c = ($("#whoCodeInput").value || "").trim().toUpperCase();
    if (!c) { $("#whoCodeInput").focus(); return; }
    var btn = $("#whoCodeBtn");
    btn.disabled = true;
    $("#whoSub").textContent = "正在读班级名单…";
    roster = await loadRoster(c);
    btn.disabled = false;
    if (roster.length > 0) { saveCode(c); renderNameGrid(); }
    else { $("#whoSub").textContent = "找不到「" + c + "」这个班级，检查一下，或按下面「跳过」"; }
  }
  $("#whoCodeBtn").addEventListener("click", submitCode);
  $("#whoCodeInput").addEventListener("keydown", function (e) { if (e.key === "Enter") submitCode(); });
  $("#whoCodeSkip").addEventListener("click", function () {
    roster = []; try { localStorage.removeItem(CODE_KEY); } catch (e) {}
    renderNameGrid();
  });

  function showWho(fetchAgain) {  // 「换人」：用已读到的名单，不重新问代码
    if (fetchAgain || !rosterLoaded) { startWho(); return; }
    show("who");
    renderNameGrid();
  }

  function renderNameGrid() {
    $("#whoCode").hidden = true;
    $("#whoGrid").innerHTML = "";
    $("#whoInput").value = "";
    if (roster.length > 0) {
      $("#whoSub").textContent = "先点一下你的名字";
      $("#whoFoot").textContent = (roster[0].schoolName ? roster[0].schoolName + " · " : "") +
        [].concat.apply([], roster.map(function (r) { return r.className; }))
          .filter(function (v, i, a) { return a.indexOf(v) === i; }).join(" / ");
      renderWhoGrid();
      $("#whoManual").hidden = false;
      $("#whoInput").placeholder = "名单上没有你？打上名字";
    } else {
      $("#whoSub").textContent = "打上你的名字就可以开始";
      $("#whoFoot").textContent = "";
      $("#whoManual").hidden = false;
      $("#whoInput").placeholder = "打上你的名字";
    }
  }
  $("#whoGoBtn").addEventListener("click", function () {
    var v = ($("#whoInput").value || "").trim();
    if (!v) { $("#whoInput").focus(); return; }
    var pc = roster.length > 0 ? roster[0].playCode : null;
    var cl = roster.length > 0 ? (roster[0].className || pc) : "访客";
    pickStudent({ name: v, classLabel: cl, playCode: pc });
  });
  $("#whoInput").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#whoGoBtn").click(); });

  /* ---------- 首页 ---------- */
  function renderHome() {
    var who = student && student.name ? student.name + "，" : "";
    $("#overallProgress").innerHTML =
      '<span class="star">★</span> ' + who + '写好了 ' + overallStars() + " / " + TOTAL_CELLS + " 个字";
    updateWhoSwitch();
    var grid = $("#unitGrid"); grid.innerHTML = "";
    UNITS.forEach(function (u) {
      var stars = unitStars(u), done = unitDone(u);
      var card = document.createElement("button");
      card.type = "button";
      card.className = "unit-card" + (done ? " done" : "");
      card.innerHTML =
        '<span class="seal">优</span>' +
        '<div class="u-name">' + u.label + "</div>" +
        '<div class="u-count">' + u.chars.length + " 个字</div>" +
        '<div class="u-preview">' + u.chars.slice(0, 4).map(esc).join("") + "</div>" +
        '<div class="u-bar"><i style="width:' + (stars / u.chars.length * 100) + '%"></i></div>' +
        '<div class="u-stars">★ ' + stars + " / " + u.chars.length + "</div>";
      card.addEventListener("click", function () { openUnit(u.id); });
      grid.appendChild(card);
    });
    show("home");
  }
  function esc(s) { return s.replace(/[&<>]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]; }); }

  /* ---------- 单元页 ---------- */
  var curUnit = null;
  function openUnit(id) {
    curUnit = UNITS.filter(function (u) { return u.id === id; })[0];
    $("#unitTitle").textContent = curUnit.label;
    var grid = $("#charGrid"); grid.innerHTML = "";
    curUnit.chars.forEach(function (ch, i) {
      var s = stat(ch);
      var t = document.createElement("button");
      t.type = "button";
      t.className = "char-tile" + (s === 1 ? " seen" : s === 2 ? " done" : "");
      t.innerHTML = '<span class="dot"></span>' + esc(ch);
      t.addEventListener("click", function () { openPractice(i); });
      grid.appendChild(t);
    });
    show("unit");
  }
  $("#unitQuizBtn").addEventListener("click", function () { if (curUnit) startQuiz(); });

  document.querySelectorAll("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () {
      var g = b.getAttribute("data-go");
      if (typeof Say !== "undefined") Say.stop();
      if (writer) { try { writer.cancelQuiz(); } catch (e) {} }
      if (g === "home") renderHome();
      else if (g === "unit" && curUnit) openUnit(curUnit.id);
      else renderHome();
    });
  });

  /* ---------- 练习页 ---------- */
  var writer = null, curIdx = 0, curStep = "watch";
  var tianEl = $("#tianGrid"), targetEl = $("#writerTarget");
  var coachEl = $("#coachText"), actionsEl = $("#practiceActions"), stampEl = $("#stamp");
  var stepBtns = document.querySelectorAll("#stepTabs .step");
  var sayBtn = $("#sayBtn");

  function sayChar(ch, auto) {
    if (!Say.available()) { sayBtn.hidden = true; return; }
    sayBtn.hidden = false;
    if (auto && Sfx.isMuted()) return;   // 自动读音跟着静音开关；手动按永远会响
    sayBtn.classList.add("saying");
    Say.speak(ch, null, function () { sayBtn.classList.remove("saying"); });
  }
  sayBtn.addEventListener("click", function () {
    if (curUnit && curUnit.chars[curIdx]) sayChar(curUnit.chars[curIdx], false);
  });

  var COLORS = {
    stroke: "#5A3D28", outline: "#DFC79E", drawing: "#5E9BC4", highlight: "#79B36A"
  };

  function writerSize() {
    var w = tianEl.clientWidth || 380;
    return { size: w, pad: Math.round(w * 0.13) };
  }
  function makeWriter(char, opts) {
    targetEl.innerHTML = "";
    var d = writerSize();
    var base = {
      width: d.size, height: d.size, padding: d.pad,
      charDataLoader: function (c, done) { if (HW[c]) done(HW[c]); },
      strokeColor: COLORS.stroke, outlineColor: COLORS.outline,
      drawingColor: COLORS.drawing, highlightColor: COLORS.highlight,
      strokeAnimationSpeed: 0.9, delayBetweenStrokes: 320,
      drawingWidth: 26
    };
    for (var k in opts) base[k] = opts[k];
    return HanziWriter.create(targetEl, char, base);
  }

  function openPractice(idx) {
    curIdx = idx;
    curStep = "watch";
    show("practice");
    loadStep();
  }

  function setStepUI() {
    stepBtns.forEach(function (b) {
      var s = b.getAttribute("data-step");
      b.setAttribute("aria-current", s === curStep ? "true" : "false");
    });
    $("#practicePos").textContent = "第 " + (curIdx + 1) + " / " + curUnit.chars.length + " 个字";
  }

  function loadStep() {
    var ch = curUnit.chars[curIdx];
    stampEl.hidden = true;
    setStepUI();
    Say.stop(); sayBtn.classList.remove("saying");
    sayBtn.hidden = !Say.available();
    var strokeCount = (HW[ch] && HW[ch].strokes) ? HW[ch].strokes.length : 0;
    $("#practiceStrokes").textContent = "共 " + strokeCount + " 笔";
    if (writer) { try { writer.cancelQuiz(); } catch (e) {} }

    if (curStep === "watch") {
      writer = makeWriter(ch, { showCharacter: false, showOutline: true });
      coachEl.innerHTML = "先看一遍：这个字有 <b>" + strokeCount + "</b> 笔。";
      setTimeout(function () {
        var p = writer.animateCharacter();
        var after = function () { sayChar(ch, true); };   // 笔顺演示完自动读音
        if (p && p.then) p.then(after, after); else setTimeout(after, strokeCount * 900 + 600);
      }, 300);
      actionsEl.innerHTML = "";
      addBtn("再看一次", "", function () { writer.animateCharacter(); });
      addBtn("下一步：描一描 →", "primary", function () { curStep = "trace"; loadStep(); });

    } else if (curStep === "trace") {
      writer = makeWriter(ch, { showCharacter: false, showOutline: true });
      coachEl.innerHTML = "跟着淡淡的线，一笔一笔描。";
      startQuizFlow(ch, 1, function () {
        Sfx.ding();
        bump(ch, 1);
        coachEl.innerHTML = "描得好！<b>自己写写看。</b>";
        actionsEl.innerHTML = "";
        addBtn("再描一次", "", function () { curStep = "trace"; loadStep(); });
        addBtn("下一步：写一写 →", "primary", function () { curStep = "write"; loadStep(); });
      });
      actionsEl.innerHTML = "";
      addBtn("再看示范", "", function () { demoThenQuiz(ch, 1); });

    } else { // write
      writer = makeWriter(ch, { showCharacter: false, showOutline: false });
      coachEl.innerHTML = "凭记忆写出来，写错了会给你提示。";
      startQuizFlow(ch, 3, function () {
        onCharWritten(ch);
      });
      actionsEl.innerHTML = "";
      addBtn("再看示范", "", function () { demoThenQuiz(ch, 3); });
    }
  }

  function startQuizFlow(ch, hintAfter, onDone) {
    writer.quiz({
      leniency: 1.6,
      showHintAfterMisses: hintAfter,
      markStrokeCorrectAfterMisses: 5,
      onMistake: function () { Sfx.miss(); flash("#E08A5E"); },
      onCorrectStroke: function () { Sfx.swish(); },
      onComplete: function () { onDone(); }
    });
  }
  function demoThenQuiz(ch, hintAfter) {
    try { writer.cancelQuiz(); } catch (e) {}
    writer.showOutline({ duration: 0 });
    var traceDone = function () {
      Sfx.ding(); bump(ch, 1);
      coachEl.innerHTML = "描得好！<b>自己写写看。</b>";
      actionsEl.innerHTML = "";
      addBtn("再描一次", "", function () { curStep = "trace"; loadStep(); });
      addBtn("下一步：写一写 →", "primary", function () { curStep = "write"; loadStep(); });
    };
    var p = writer.animateCharacter();
    var after = function () {
      if (curStep === "write") writer.hideOutline({ duration: 0 });
      startQuizFlow(ch, hintAfter,
        curStep === "write" ? function () { onCharWritten(ch); } : traceDone);
    };
    if (p && p.then) p.then(after, after);
    else setTimeout(after, HW[ch].strokes.length * 900 + 500);
  }

  function onCharWritten(ch) {
    var wasDone = stat(ch) === 2;
    bump(ch, 2);
    Sfx.stamp();
    stampEl.hidden = false;
    setTimeout(Sfx.fanfare, 180);
    flyStars(3);
    coachEl.innerHTML = wasDone ? "又写对了，真棒！" : "写好了！得到一颗 ★";
    actionsEl.innerHTML = "";
    addBtn("再写一次", "", function () { stampEl.hidden = true; curStep = "write"; loadStep(); });
    if (curIdx + 1 < curUnit.chars.length) {
      addBtn("下一个字 →", "gold", function () {
        curIdx++; curStep = "watch"; loadStep();
      });
    } else {
      addBtn("完成，回单元 →", "gold", function () {
        if (unitDone(curUnit)) { toast("整个单元都写好了！★"); }
        openUnit(curUnit.id);
      });
    }
  }

  function addBtn(label, cls, fn) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "pa-btn" + (cls ? " " + cls : "");
    b.textContent = label;
    b.addEventListener("click", fn);
    actionsEl.appendChild(b);
  }
  function flash(color) {
    tianEl.style.transition = "box-shadow .1s";
    tianEl.style.boxShadow = "0 0 0 6px " + color + "aa, 0 16px 34px rgba(60,40,20,.18)";
    setTimeout(function () { tianEl.style.boxShadow = ""; }, 200);
  }
  function flyStars(n) {
    var r = tianEl.getBoundingClientRect();
    for (var i = 0; i < n; i++) {
      (function (i) {
        var s = document.createElement("div");
        s.className = "fly-star"; s.textContent = "★";
        s.style.left = (r.left + r.width / 2) + "px";
        s.style.top = (r.top + r.height / 2) + "px";
        s.style.setProperty("--dx", (Math.random() * 260 - 130) + "px");
        s.style.setProperty("--dy", (-160 - Math.random() * 120) + "px");
        s.style.animationDelay = (i * 90) + "ms";
        document.body.appendChild(s);
        setTimeout(function () { s.remove(); }, 1200 + i * 90);
      })(i);
    }
  }
  stepBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var s = b.getAttribute("data-step");
      // 只能往回跳或跳到已解锁的步骤：看一看永远可点；描/写在看过之后可点
      curStep = s; loadStep();
    });
  });

  /* ---------- 小考 ---------- */
  var quizList = [], quizPos = 0, quizRight = 0, quizWriter = null;
  var qTarget = $("#quizTarget"), qStamp = $("#quizStamp"), qCoach = $("#quizCoach"),
      qActions = $("#quizActions"), qTian = $("#quizTian");

  function startQuiz() {
    quizList = curUnit.chars.slice();
    for (var i = quizList.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = quizList[i]; quizList[i] = quizList[j]; quizList[j] = t;
    }
    if (quizList.length > 8) quizList = quizList.slice(0, 8);
    quizPos = 0; quizRight = 0;
    $("#quizTitle").textContent = curUnit.label + " · 小考";
    show("quiz");
    quizStep();
  }
  function quizStep() {
    qStamp.hidden = true;
    $("#quizPos").textContent = "第 " + (quizPos + 1) + " / " + quizList.length + " 题";
    var ch = quizList[quizPos];
    qCoach.innerHTML = "凭记忆写出来。";
    qActions.innerHTML = "";
    qTarget.innerHTML = "";
    var w = qTian.clientWidth || 380;
    quizWriter = HanziWriter.create(qTarget, ch, {
      width: w, height: w, padding: Math.round(w * 0.13),
      charDataLoader: function (c, done) { if (HW[c]) done(HW[c]); },
      strokeColor: COLORS.stroke, outlineColor: COLORS.outline,
      drawingColor: COLORS.drawing, highlightColor: COLORS.highlight,
      showCharacter: false, showOutline: false, drawingWidth: 26,
      strokeAnimationSpeed: 0.9
    });
    function runQuiz() {
      quizWriter.quiz({
        leniency: 1.7, showHintAfterMisses: 2, markStrokeCorrectAfterMisses: 4,
        onMistake: function () { Sfx.miss(); },
        onCorrectStroke: function () { Sfx.swish(); },
        onComplete: function (s) {
          if (!s || s.totalMistakes <= 2) quizRight++;
          bump(ch, 2);
          Sfx.stamp(); qStamp.hidden = false; setTimeout(Sfx.ding, 150);
          qActions.innerHTML = "";
          var b = document.createElement("button");
          b.type = "button"; b.className = "pa-btn gold";
          if (quizPos + 1 < quizList.length) {
            b.textContent = "下一题 →";
            b.addEventListener("click", function () { quizPos++; quizStep(); });
          } else {
            b.textContent = "看结果 →";
            b.addEventListener("click", quizResult);
          }
          qActions.appendChild(b);
        }
      });
    }
    runQuiz();

    var demo = document.createElement("button");
    demo.type = "button"; demo.className = "pa-btn";
    demo.textContent = "看示范";
    demo.addEventListener("click", function () {
      try { quizWriter.cancelQuiz(); } catch (e) {}
      quizWriter.showOutline({ duration: 0 });
      var p = quizWriter.animateCharacter();
      var resume = function () { runQuiz(); };
      if (p && p.then) p.then(resume, resume);
      else setTimeout(resume, HW[ch].strokes.length * 900 + 500);
    });
    qActions.appendChild(demo);
  }
  function quizResult() {
    show("quiz");
    qTarget.innerHTML = "";
    qStamp.hidden = true;
    $("#quizPos").textContent = "";
    qCoach.innerHTML = "小考完成！写对 <b>" + quizRight + " / " + quizList.length + "</b> 个字。";
    qActions.innerHTML = "";
    var b1 = document.createElement("button");
    b1.type = "button"; b1.className = "pa-btn primary"; b1.textContent = "再考一次";
    b1.addEventListener("click", startQuiz);
    var b2 = document.createElement("button");
    b2.type = "button"; b2.className = "pa-btn gold"; b2.textContent = "回单元 →";
    b2.addEventListener("click", function () {
      if (unitDone(curUnit)) toast("整个单元都写好了！★");
      openUnit(curUnit.id);
    });
    qActions.appendChild(b1); qActions.appendChild(b2);
  }

  /* ---------- 重画（窗口宽度明显变化时才重建，避免打断正在写的字） ---------- */
  var rT, lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    clearTimeout(rT);
    rT = setTimeout(function () {
      if (Math.abs(window.innerWidth - lastW) < 60) return;
      lastW = window.innerWidth;
      if (!screens.practice.hidden && writer) loadStep();
      else if (!screens.quiz.hidden && quizWriter && quizList.length) quizStep();
    }, 400);
  });

  /* ---------- 启动 ---------- */
  startWho();
})();
