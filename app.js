/* The listening test (M024): consent, two background questions, a volume check, then the 18 clips of one block (one
   of four; ?b=1..4 picks it, else a lottery) in
   an order of their own (no two clips of one request in a row), four ratings each - open once the clip has played
   20 s - and at the end the answer code (codec.js), sent in the background to the researcher's Google Form
   (settings.js); if sending fails, a retry and the code to copy. Progress stays in this browser, so a reload carries
   on where it was (and an unsent code is sent then). */
(function () {
  "use strict";
  var C = window.LT_CLIPS, S = window.LT_SETTINGS || {}, X = window.LTCodec;
  var DEV = window.LT_DEV_STATE || null;                 // only the preview page in listening_test/dev sets it
  // A try-out (?test=1, or the page opened from a file on this computer; ?test=0 overrides): its code reaches the form
  // as "TEST-<code>", which listening_read.py never counts, and it keeps its own progress apart from a real run.
  var TQ = new URLSearchParams(location.search).get("test");
  var TEST = TQ === "1" || (TQ !== "0" && location.protocol === "file:");
  var STORE = "lt-" + C.build + (TEST ? "-test" : ""), N = 18, NV = 3;
  var current = null, prefetch = null;
  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

  function fa(x) { return String(x).replace(/[0-9]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[+d]; }); }
  function rand(n) { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
  function mmss(t) { t = Math.max(0, Math.floor(t || 0)); return fa(Math.floor(t / 60) + ":" + ("0" + t % 60).slice(-2)); }

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return el;
  }
  function button(label, onclick, primary) { return h("button", { type: "button", class: primary === false ? "btn" : "btn primary", text: label, onclick: onclick }); }
  function actions() { return h("div", { class: "actions" }, Array.prototype.slice.call(arguments)); }

  // ------------------------------------------------------------------------------------------------ state --
  function order() {                                     // a shuffle with no two clips of one request side by side
    var o;
    for (var tries = 0; tries < 5000; tries++) {
      o = [];
      for (var i = 0; i < N; i++) o.push(i);
      for (i = N - 1; i > 0; i--) { var j = rand(i + 1), t = o[i]; o[i] = o[j]; o[j] = t; }
      var ok = true;
      for (i = 1; i < N && ok; i++) ok = Math.floor(o[i] / NV) !== Math.floor(o[i - 1] / NV);
      if (ok) break;
    }
    return o;
  }
  function fresh() {
    var nb = C.blocks.length, b = parseInt(new URLSearchParams(location.search).get("b"), 10);
    var ratings = [], play = [];
    for (var k = 0; k < N; k++) { ratings.push([null, null, null, null]); play.push(0); }
    return { v: 1, screen: "welcome", block: b >= 1 && b <= nb ? b : 1 + rand(nb), order: order(), pos: 0,
             ratings: ratings, play: play, bg: null, dev: null, t0: null, t1: null, code: null };
  }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(STORE)); return s && s.v === 1 ? s : null; } catch (e) { return null; }
  }
  function save() { if (DEV) return; try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) { /* private window */ } }
  var st = DEV ? Object.assign(fresh(), DEV) : (load() || fresh());

  function go(screen) { st.screen = screen; save(); render(); }

  // ----------------------------------------------------------------------------------------------- pieces --
  function player(src, played0, onPlayed) {
    var a = new Audio(), played = played0 || 0, last = null;
    a.preload = "auto";
    a.src = src;
    var btn = h("button", { type: "button", class: "play", html: PLAY, "aria-label": "پخش" });
    var fill = h("i"), time = h("span", { class: "time", dir: "ltr" });
    var err = h("p", { class: "hint", role: "status" });
    function icon(on) { btn.innerHTML = on ? PAUSE : PLAY; btn.setAttribute("aria-label", on ? "توقف" : "پخش"); }
    function draw() {
      var d = isFinite(a.duration) && a.duration > 0 ? a.duration : C.seconds;
      fill.style.width = (100 * Math.min(a.currentTime / d, 1)) + "%";
      time.textContent = mmss(a.currentTime) + " / " + mmss(d);
    }
    btn.addEventListener("click", function () {
      if (a.paused) {
        err.textContent = "";
        if (a.ended) a.currentTime = 0;
        var p = a.play();
        if (p && p.catch) p.catch(function () { err.textContent = "پخش نشد. دوباره دکمه‌ی پخش را بزنید."; });
      } else a.pause();
    });
    a.addEventListener("play", function () { icon(true); last = a.currentTime; });
    a.addEventListener("pause", function () { icon(false); last = null; });
    a.addEventListener("timeupdate", function () {
      if (last != null && !a.paused) {
        var d = a.currentTime - last;
        if (d > 0 && d < 1.5) { played += d; onPlayed(played); }
      }
      last = a.currentTime;
      draw();
    });
    a.addEventListener("loadedmetadata", draw);
    a.addEventListener("error", function () { if (a.getAttribute("src")) err.textContent = "این تکه بارگذاری نشد. اینترنت را بررسی کنید و دوباره دکمه‌ی پخش را بزنید."; });
    draw();
    current = { stop: function () { a.pause(); a.removeAttribute("src"); a.load(); } };
    return h("div", { class: "card" }, [h("div", { class: "player" }, [btn, h("div", { class: "track" }, [h("div", { class: "bar" }, [fill]), time])]), err]);
  }

  function choice(title, options, value, onPick) {
    var id = "q" + rand(1e9), btns = options.map(function (o, i) {
      return h("button", { type: "button", class: "opt", role: "radio", "aria-checked": String(value === i), text: o, onclick: function () { pick(i); } });
    });
    function pick(i) { btns.forEach(function (b, j) { b.setAttribute("aria-checked", String(i === j)); }); onPick(i); }
    return h("div", { class: "q" }, [h("p", { class: "qt", id: id, text: title }), h("div", { class: "opts", role: "radiogroup", "aria-labelledby": id }, btns)]);
  }

  function scale(title, lo, hi, value, onPick) {
    var id = "q" + rand(1e9), btns = [];
    for (var v = 1; v <= 5; v++) (function (v) {
      btns.push(h("button", { type: "button", class: "dot", role: "radio", "aria-checked": String(value === v), "aria-label": fa(v), text: fa(v), onclick: function () { pick(v); } }));
    })(v);
    function pick(v) { btns.forEach(function (b, i) { b.setAttribute("aria-checked", String(i + 1 === v)); }); onPick(v); }
    var el = h("div", { class: "q" }, [h("p", { class: "qt", id: id }, [title]), h("div", { class: "scale", role: "radiogroup", "aria-labelledby": id }, btns),
      h("div", { class: "ends", "aria-hidden": "true" }, [h("span", { text: fa(1) + " = " + lo }), h("span", { text: fa(5) + " = " + hi })])]);
    return { el: el, enable: function (on) { el.classList.toggle("off", !on); btns.forEach(function (b) { b.disabled = !on; }); } };
  }

  // ---------------------------------------------------------------------------------------------- screens --
  function welcome() {
    var box = h("input", { type: "checkbox", id: "agree" });
    var start = button("شروع", function () { go("background"); });
    start.disabled = true;
    box.addEventListener("change", function () { start.disabled = !box.checked; });
    return [
      h("h1", { text: "آزمونِ شنیداریِ موسیقی" }),
      S.about ? h("p", { class: "sub", text: S.about }) : null,
      h("p", { text: "سلام! این آزمون بخشی از یک پژوهش درباره‌ی ساختنِ موسیقی با رایانه است." }),
      h("ul", { class: "facts" }, [
        "۱۸ تکه‌ی کوتاهِ موسیقی می‌شنوید، هر کدام ۳۰ ثانیه، و به هر کدام چهار امتیازِ ساده می‌دهید. حدودِ ۱۵ دقیقه طول می‌کشد.",
        "لازم نیست موسیقی‌دان باشید. جوابِ درست و غلط ندارد؛ برداشتِ خودتان مهم است.",
        "اگر می‌شود، با هدفون یا هندزفری و در جای آرام گوش کنید.",
        "نام یا هیچ اطلاعِ شخصی‌ای از شما گرفته نمی‌شود. پاسخ‌ها بی‌نام در فرمِ گوگلِ پژوهشگر ثبت می‌شوند و فقط برای این پژوهش و به‌صورتِ جمعی به کار می‌روند.",
        "هر وقت خواستید می‌توانید آزمون را رها کنید. اگر صفحه بسته شد، با باز کردنِ دوباره‌ی همین پیوند از همان‌جا ادامه می‌دهید."
      ].map(function (t) { return h("li", { text: t }); })),
      h("label", { class: "check", for: "agree" }, [box, h("span", { text: "خواندم و می‌خواهم شرکت کنم." })]),
      actions(start)
    ];
  }

  function background() {
    var next = button("ادامه", function () { go("volume"); });
    function upd() { next.disabled = st.bg == null || st.dev == null; save(); }
    var out = [
      h("h2", { text: "دو پرسشِ کوتاه" }),
      choice("سابقه‌ی موسیقی‌تان کدام است؟", ["هیچ", "کمی (مثلاً کمی ساز زده‌ام یا کمی آموزش دیده‌ام)", "آموزش‌دیده (چند سال آموزش یا نوازندگیِ جدی)"], st.bg, function (v) { st.bg = v; upd(); }),
      choice("با چه چیزی گوش می‌دهید؟", ["هدفون یا هندزفری", "بلندگوی رایانه یا لپ‌تاپ", "بلندگوی گوشی"], st.dev, function (v) { st.dev = v; upd(); }),
      actions(next)
    ];
    upd();
    return out;
  }

  function volume() {
    var next = button("صدا تنظیم شد؛ شروع کنیم", function () { if (st.t0 == null) st.t0 = Date.now(); go("trial"); });
    next.disabled = true;
    return [
      h("h2", { text: "تنظیمِ صدا" }),
      h("p", { text: "این تکه فقط برای تنظیمِ صداست و امتیازی ندارد. آن را پخش کنید و صدای دستگاه را طوری تنظیم کنید که راحت و واضح بشنوید. بعد از آن، تا پایانِ آزمون صدا را تغییر ندهید." }),
      player(C.calib, 0, function (p) { if (p >= 3) next.disabled = false; }),
      actions(next)
    ];
  }

  function trial() {
    var k = st.order[st.pos], req = C.blocks[st.block - 1][Math.floor(k / NV)], src = req.clips[k % NV];
    var last = st.pos === N - 1, need = C.minListen;
    var emo = h("span", { class: "emotion", text: "«" + req.emotion + "»" });
    var qs = [
      ["این تکه چقدر برایتان خوشایند است؟", "اصلاً", "خیلی"],
      ["چقدر شبیهِ موسیقی‌ای است که یک انسان ساخته؟", "اصلاً", "کاملاً"],
      ["چقدر منسجم است؟ یعنی بخش‌هایش به هم ربط دارند و ایده‌هایش دوباره برمی‌گردند، نه اینکه پراکنده و بی‌ربط باشد.", "اصلاً", "خیلی"],
      [h("span", {}, ["قرار بوده این موسیقی ", emo, " باشد. چقدر این حس را در آن می‌شنوید؟"]), "اصلاً", "خیلی"]
    ];
    var hint = h("p", { class: "hint", role: "status" });
    var next = button(last ? "پایان" : "بعدی", function () {
      if (current) current.stop();
      if (last) finish(); else { st.pos++; go("trial"); }
    });
    var scales = qs.map(function (q, i) {
      return scale(q[0], q[1], q[2], st.ratings[k][i], function (v) { st.ratings[k][i] = v; save(); upd(); });
    });
    function upd() {
      var open = st.play[k] >= need;
      scales.forEach(function (s) { s.enable(open); });
      hint.textContent = open ? "" : "پرسش‌ها پس از " + fa(need) + " ثانیه گوش دادن فعال می‌شوند" +
        (st.play[k] > 0 ? " (" + fa(Math.ceil(need - st.play[k])) + " ثانیه‌ی دیگر)." : ".");
      next.disabled = !open || st.ratings[k].some(function (x) { return x == null; });
    }
    var pl = player(src, st.play[k], function (p) { st.play[k] = p; save(); upd(); });
    pl.appendChild(hint);
    if (!last) {                                         // warm the next clip while this one plays
      prefetch = new Audio();
      prefetch.preload = "auto";
      prefetch.src = C.blocks[st.block - 1][Math.floor(st.order[st.pos + 1] / NV)].clips[st.order[st.pos + 1] % NV];
    }
    upd();
    return [
      h("div", { class: "progress" }, [h("span", { text: "تکه‌ی " + fa(st.pos + 1) + " از " + fa(N) }),
        h("div", { class: "pbar" }, [h("i", { style: "width:" + (100 * st.pos / N) + "%" })])]),
      pl
    ].concat(scales.map(function (s) { return s.el; }), [actions(next)]);
  }

  function finish() {
    st.t1 = Date.now();
    st.code = X.encode({ build: C.build, block: st.block, background: st.bg, device: st.dev, order: st.order,
                         ratings: st.ratings, play: st.play, minutes: st.t0 ? (st.t1 - st.t0) / 60000 : 0 });
    st.sent = false;
    go("end");
  }

  function copy(text, btn) {
    function done() { btn.textContent = "کپی شد ✓"; setTimeout(function () { btn.textContent = "کپیِ کد"; }, 2500); }
    function old() {
      var t = h("textarea", { style: "position:fixed;opacity:0" });
      t.value = text;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand("copy"); done(); } catch (e) { /* the box below can still be selected by hand */ }
      document.body.removeChild(t);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, old); else old();
  }

  /* The answer code to the researcher's Google Form, in the background (settings.js googleForm). The form's reply
     cannot be read from another site (no-cors), so "sent" means the request left without a network error; a cut
     connection or no answer in 20 s is a failure, and the last page then offers a retry and the code to copy. */
  function send() {
    var g = S.googleForm, body = new URLSearchParams(), ctl = window.AbortController ? new AbortController() : null;
    body.append(g.entry, (TEST ? "TEST-" : "") + st.code);
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    return fetch(g.action, { method: "POST", mode: "no-cors", body: body, keepalive: true, signal: ctl ? ctl.signal : undefined })
      .then(function () { clearTimeout(timer); }, function (e) { clearTimeout(timer); throw e; });
  }

  function codeBox() {
    var box = h("textarea", { class: "code", readonly: true, rows: "3", dir: "ltr", "aria-label": "کدِ پاسخ‌ها" });
    box.value = st.code;
    box.addEventListener("focus", function () { box.select(); });
    var cp = button("کپیِ کد", function () { copy(st.code, cp); }, false);
    return [box, actions(cp)];
  }

  function end() {
    var canSend = S.googleForm && S.googleForm.action && S.googleForm.entry && (!DEV || window.LT_DEV_SEND);
    var thanks = h("h1", { text: "سپاس!" });
    if (!canSend) {
      return [thanks, h("p", { text: "آزمون تمام شد. ممنون که وقت گذاشتید." }),
              h("p", { text: "لطفاً این کد را کپی کنید و برای پژوهشگر بفرستید:" })].concat(codeBox(),
              [S.contact ? h("p", { class: "sub", text: S.contact }) : null]);
    }
    if (st.sent) {
      return [thanks, h("p", { class: "ok", role: "status", text: "پاسخ‌هایتان ثبت شد. ممنون که وقت گذاشتید!" }),
              h("details", { class: "backup" }, [h("summary", { text: "کدِ پشتیبان (فقط اگر پژوهشگر خواست)" })].concat(codeBox()))];
    }
    var status = h("p", { class: "hint", role: "status", text: "در حالِ فرستادنِ پاسخ‌ها…" });
    var retry = button("دوباره بفرست", function () { attempt(); });
    var fallback = h("div", { hidden: true }, [retry ? actions(retry) : null,
      h("p", { text: "اگر باز هم نشد، این کد را کپی کنید و برای پژوهشگر بفرستید:" })].concat(codeBox(),
      [h("p", { class: "sub", text: S.contact || "کد را از هر راهی که پژوهشگر را می‌شناسید برایش بفرستید." })]));
    function attempt() {
      retry.disabled = true;
      status.textContent = "در حالِ فرستادنِ پاسخ‌ها…";
      send().then(function () { st.sent = true; save(); render(); }, function () {
        retry.disabled = false;
        status.textContent = "فرستادنِ پاسخ‌ها نشد. اینترنت را بررسی کنید و «دوباره بفرست» را بزنید.";
        fallback.hidden = false;
      });
    }
    setTimeout(attempt, 0);
    return [thanks, h("p", { text: "آزمون تمام شد." }), status, fallback];
  }

  function render() {
    if (current) { current.stop(); current = null; }
    var app = document.getElementById("app"), screens = { welcome: welcome, background: background, volume: volume, trial: trial, end: end };
    app.textContent = "";
    if (TEST) app.appendChild(h("p", { class: "testbar", text: "حالتِ آزمایشی: پاسخِ این اجرا با نشانِ TEST در فرم ثبت می‌شود و در تحلیل شمرده نمی‌شود." }));
    (screens[st.screen] || welcome)().forEach(function (n) { if (n) app.appendChild(n); });
    window.scrollTo(0, 0);
  }

  render();
})();
