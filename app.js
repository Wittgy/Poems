/* ============================================================
   app.js — render the floors from window.SITE, wire the unease
   ============================================================ */
(function () {
  'use strict';
  var SITE = window.SITE;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- helpers ----------
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // group an array of lines (with '' as separators) into blocks, render each
  // block as a <div class="stanza"> with its lines joined by <br>.
  function blocks(lines, container) {
    var cur = [];
    function flush() {
      if (!cur.length) return;
      var s = el('div', 'stanza', cur.map(esc).join('<br>'));
      container.appendChild(s);
      cur = [];
    }
    lines.forEach(function (l) {
      if (l.trim() === '') flush();
      else cur.push(l);
    });
    flush();
  }

  // ---------- piece (a door) ----------
  function renderPiece(p) {
    var art = el('article', 'piece');
    art.id = p.id;

    var head = el('button', 'piece-head');
    head.setAttribute('aria-expanded', 'false');
    head.appendChild(el('span', 'piece-title', esc(p.title)));
    head.appendChild(el('span', 'piece-date', esc(p.date || '')));
    art.appendChild(head);

    var wrap = el('div', 'piece-wrap');
    var inner = el('div', 'piece-inner');
    var body = el('div', 'piece-body' + (p.type === 'prose' ? ' prose' : ''));

    if (p.image) {
      var img = el('img', 'piece-image');
      img.src = p.image;
      img.alt = p.title;
      img.loading = 'lazy';
      body.appendChild(img);
    }

    if (p.type === 'translation') {
      renderTranslation(p, body);
    } else {
      if (p.epigraph) {
        var ep = el('div', 'epigraph');
        ep.appendChild(el('span', 'art', esc(p.epigraph.art)));
        if (p.epigraph.quote) ep.appendChild(el('span', 'quote', esc(p.epigraph.quote)));
        body.appendChild(ep);
      }
      blocks(p.body, body);
    }

    inner.appendChild(body);
    wrap.appendChild(inner);
    art.appendChild(wrap);

    head.addEventListener('click', function () {
      var willOpen = !art.classList.contains('open');
      if (reduce) {
        art.classList.toggle('open', willOpen);
        wrap.style.maxHeight = willOpen ? 'none' : '0px';
        head.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        return;
      }
      if (willOpen) {
        art.classList.add('open');
        head.setAttribute('aria-expanded', 'true');
        wrap.style.maxHeight = inner.scrollHeight + 'px';
        wrap.addEventListener('transitionend', function te(e) {
          if (e.propertyName !== 'max-height') return;
          wrap.removeEventListener('transitionend', te);
          if (art.classList.contains('open')) wrap.style.maxHeight = 'none';
        });
      } else {
        wrap.style.maxHeight = inner.scrollHeight + 'px';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { wrap.style.maxHeight = '0px'; });
        });
        art.classList.remove('open');
        head.setAttribute('aria-expanded', 'false');
      }
    });
    return art;
  }

  function renderTranslation(p, body) {
    if (p.note && p.note.length) {
      var note = el('div', 'tnote');
      p.note.forEach(function (para) { note.appendChild(el('p', null, esc(para))); });
      body.appendChild(note);
    }
    var tt = el('div', 't-title', esc(p.title));
    if (p.subtitle) tt.appendChild(el('span', 't-sub', esc(p.subtitle)));
    body.appendChild(tt);
    blocks(p.tr, body);

    if (p.orig) {
      var o = el('div', 't-orig');
      var ot = el('div', 't-title', esc(p.orig.title));
      if (p.orig.subtitle) ot.appendChild(el('span', 't-sub', esc(p.orig.subtitle)));
      o.appendChild(ot);
      blocks(p.orig.body, o);
      o.appendChild(el('div', 't-author', esc(p.orig.author)));
      body.appendChild(o);
    }
  }

  // ---------- floor ----------
  var roman = ['', 'i', 'ii', 'iii', 'iv', 'v'];
  function renderFloor(sec, idx) {
    var floor = el('section', 'floor' + (sec.single ? ' zahar' : ''));
    floor.id = 'floor-' + sec.id;
    floor.setAttribute('data-screen-label', sec.name);

    var th = el('div', 'threshold veil');
    th.appendChild(el('div', 'mark', roman[idx + 1] + ' — ' + (sec.single ? 'son' : sec.pieces.length)));
    th.appendChild(el('h2', null, esc(sec.name)));
    th.appendChild(el('div', 'rule'));
    floor.appendChild(th);

    if (sec.single) {
      renderZahar(sec, floor);
    } else {
      var list = el('div', 'pieces');
      sec.pieces.forEach(function (p) { list.appendChild(renderPiece(p)); });
      floor.appendChild(list);
    }
    return floor;
  }

  function renderZahar(sec, floor) {
    var poem = el('div', 'zpoem veil');
    blocks(sec.poem, poem);
    floor.appendChild(poem);

    var voidEl = el('div', 'void');
    voidEl.appendChild(el('div', 'breath'));
    floor.appendChild(voidEl);

    var coda = el('div', 'zcoda veil');
    blocks(sec.coda, coda);
    floor.appendChild(coda);

    var base = el('div', 'basement');
    base.appendChild(el('div', 'sig veil', esc(SITE.author)));
    var up = el('button', 'up veil', 'başa dön');
    up.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
    base.appendChild(up);
    floor.appendChild(base);
  }

  // ---------- nav ----------
  function renderNav() {
    var nav = el('nav', 'nav');
    var brand = el('a', 'brand', esc(SITE.author));
    brand.href = '#top';
    nav.appendChild(brand);
    var links = el('div', 'links');
    SITE.sections.forEach(function (s) {
      var a = el('a', null, esc(s.name));
      a.href = '#floor-' + s.id;
      a.dataset.floor = 'floor-' + s.id;
      links.appendChild(a);
    });
    nav.appendChild(links);
    return nav;
  }

  // ============================================================
  // BUILD
  // ============================================================
  var nav = renderNav();
  document.body.appendChild(nav);

  var main = document.getElementById('main');
  SITE.sections.forEach(function (sec, i) {
    main.appendChild(renderFloor(sec, i));
  });

  // ---------- hero surfacing on load ----------
  var heroLine = document.querySelector('.hero .line');
  var heroName = document.querySelector('.hero .name');
  var cue = document.querySelector('.scrollcue');
  function up(node, delay) {
    if (!node) return;
    setTimeout(function () { node.classList.add('up'); }, delay);
  }
  // start hidden, surface slowly (do NOT gate on rAF — it's paused offscreen)
  up(heroLine, reduce ? 0 : 500);
  up(heroName, reduce ? 0 : 2200);
  setTimeout(function () { if (cue) cue.classList.add('show'); }, reduce ? 0 : 4200);

  // ---------- reveal-on-enter ----------
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.veil').forEach(function (n) { io.observe(n); });

  // ---------- nav appears after the first descent ----------
  var torch = document.querySelector('.torch');
  function onScroll() {
    var past = window.scrollY > window.innerHeight * 0.62;
    nav.classList.toggle('show', past);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // active section in nav
  var floorEls = SITE.sections.map(function (s) { return document.getElementById('floor-' + s.id); });
  var navLinks = nav.querySelectorAll('.links a');
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        navLinks.forEach(function (a) { a.classList.toggle('here', a.dataset.floor === e.target.id); });
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  floorEls.forEach(function (f) { if (f) spy.observe(f); });

  // ---------- the torch (a dim light you carry) ----------
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    var tx = window.innerWidth / 2, ty = window.innerHeight * 0.4;
    var cx = tx, cy = ty, raf = 0;
    setTimeout(function () { torch.classList.add('lit'); }, 1200);
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(follow);
    }, { passive: true });
    function follow() {
      raf = 0;
      cx += (tx - cx) * 0.06;   // slow, reluctant
      cy += (ty - cy) * 0.06;
      torch.style.setProperty('--mx', cx + 'px');
      torch.style.setProperty('--my', cy + 'px');
      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) raf = requestAnimationFrame(follow);
    }
  }
})();
