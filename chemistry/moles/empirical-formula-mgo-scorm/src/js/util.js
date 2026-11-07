/* util.js: small helpers shared by the builder and the app. */

var UI = (function () {
  'use strict';

  /* h('div', { class: 'x', onclick: fn, text: 'hi' }, [child, 'text']) */
  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(s) {
    var x = 2166136261;
    for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }

  function shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* A typed whole number: accepts "+2", "2", "-1", "−1", " 32 ". NaN otherwise. */
  function num(text) {
    var t = String(text == null ? '' : text).replace(/[\u2212\u2013\u2014]/g, '-').replace(/\s+/g, '');
    return /^[+-]?\d+$/.test(t) ? parseInt(t, 10) : NaN;
  }

  /* Fill {X}-style placeholders. */
  function fill(text, vars) {
    return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  }

  return { h: h, rng: rng, hash: hash, shuffle: shuffle, num: num, fill: fill };
})();
