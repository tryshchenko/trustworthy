/*! Trustworthy analytics — no cookies, no storage, no identifiers. */
(function (w, d) {
  "use strict";
  var s = d.currentScript;
  if (!s) return;
  var n = w.navigator, l = w.location, a = function (k) { return s.getAttribute("data-" + k); };
  var api = a("api") || new URL(s.src).origin + "/api/event";
  var queue = (w.tw && w.tw.q) || [];
  var off = function () {};
  var tz;
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}

  if (
    n.webdriver ||
    l.protocol === "file:" ||
    (/^(localhost|127\.|\[::1\]|0\.0\.0\.0)|\.local$/.test(l.hostname) && a("allow-localhost") === null) ||
    (a("respect-dnt") !== null && (n.doNotTrack === "1" || n.globalPrivacyControl))
  ) {
    w.tw = off;
    return;
  }

  // Only the path and campaign parameters leave the browser; other query
  // parameters and fragments may contain personal data and are dropped here.
  function pageUrl() {
    var q = [], p = new URLSearchParams(l.search);
    p.forEach(function (v, k) { if (/^(utm_(source|medium|campaign)|ref|source)$/.test(k)) q.push(encodeURIComponent(k) + "=" + encodeURIComponent(v)); });
    return l.origin + l.pathname + (q.length ? "?" + q.join("&") : "");
  }
  // Only the origin of the previous page is sent, never its path.
  function origin(u) { try { return u ? new URL(u).origin : ""; } catch (e) { return ""; } }

  function send(p) {
    p.u = p.u || pageUrl();
    p.w = w.innerWidth;
    if (tz) p.tz = tz;
    if (a("domain")) p.d = a("domain");
    var body = JSON.stringify(p);
    try {
      if (n.sendBeacon && n.sendBeacon(api, new Blob([body], { type: "text/plain" }))) return;
    } catch (e) {}
    try { fetch(api, { method: "POST", body: body, keepalive: true, credentials: "omit", headers: { "Content-Type": "text/plain" } }); } catch (e) {}
  }

  var last;
  function view(spa) {
    var u = pageUrl();
    if (u === last) return;
    var p = { u: u };
    if (spa) {
      p.r = l.origin;
      p.t = "spa";
    } else {
      p.r = origin(d.referrer);
      try {
        var e = performance.getEntriesByType("navigation")[0];
        if (e && e.type !== "navigate") p.t = e.type;
      } catch (x) {}
    }
    last = u;
    send(p);
  }

  function track(name) {
    if (typeof name === "string" && name) send({ n: name });
  }
  w.tw = track;
  for (var i = 0; i < queue.length; i++) track(queue[i][0]);

  // Declarative events: <button data-tw-event="Signup">
  d.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var el = t.closest("[data-tw-event]");
    if (el) track(el.getAttribute("data-tw-event"));
    if (a("outbound") !== null) {
      var link = t.closest("a[href]");
      if (link && link.host && link.host !== l.host && /^https?:/.test(link.protocol)) track("Outbound: " + link.hostname.replace(/^www\./, ""));
    }
  }, true);

  // Single-page apps: count client-side navigations.
  if (a("spa") !== "false") {
    var h = w.history, push = h.pushState;
    if (push) {
      h.pushState = function () { push.apply(this, arguments); view(true); };
      w.addEventListener("popstate", function () { view(true); });
    }
  }

  if (d.prerendering) d.addEventListener("prerenderingchange", function () { view(false); }, { once: true });
  else view(false);
})(window, document);
