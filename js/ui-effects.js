/* =====================================================================
   ALIFTZY STORE — UI micro-interactions (Dark Glass Premium)
   Purely additive: only reads the DOM and adds transform/style hints.
   Never overrides onclick handlers, never touches Firebase/API/app logic.
   Safe to remove this file at any time with zero functional impact.
   ===================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---- 1. Tilt-on-hover for cards (product cards, membership cards) ---- */
  function attachTilt(el) {
    if (!el || el.__tiltBound) return;
    el.__tiltBound = true;

    var rect, raf;

    function onMove(e) {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        var rx = (py - 0.5) * -6;
        var ry = (px - 0.5) * 6;
        el.style.transform = 'translateY(-6px) scale(1.015) perspective(800px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      });
    }
    function onLeave() {
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = '';
    }
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
  }

  function bindTiltTargets() {
    if (!supportsHover) return;
    document.querySelectorAll('.product-card, .membership-card').forEach(attachTilt);
  }

  /* ---- 2. Ripple feedback on buttons / tabs (visual only, no logic change) ---- */
  function spawnRipple(el, x, y) {
    var ripple = document.createElement('span');
    var rect = el.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 1.6;
    ripple.style.cssText =
      'position:absolute;border-radius:50%;pointer-events:none;' +
      'width:' + size + 'px;height:' + size + 'px;' +
      'left:' + (x - rect.left - size / 2) + 'px;top:' + (y - rect.top - size / 2) + 'px;' +
      'background:radial-gradient(circle, rgba(255,255,255,0.35), rgba(255,255,255,0) 70%);' +
      'transform:scale(0);opacity:1;transition:transform .55s cubic-bezier(.2,.8,.2,1), opacity .55s ease;z-index:0;';
    var prevPosition = getComputedStyle(el).position;
    if (prevPosition === 'static') el.style.position = 'relative';
    var prevOverflow = getComputedStyle(el).overflow;
    if (prevOverflow === 'visible') el.style.overflow = 'hidden';
    el.appendChild(ripple);
    requestAnimationFrame(function () {
      ripple.style.transform = 'scale(1)';
      ripple.style.opacity = '0';
    });
    setTimeout(function () { ripple.remove(); }, 600);
  }

  function bindRipple(el) {
    if (!el || el.__rippleBound) return;
    el.__rippleBound = true;
    el.addEventListener('pointerdown', function (e) {
      spawnRipple(el, e.clientX, e.clientY);
    });
  }

  function bindRippleTargets() {
    document.querySelectorAll('.btn, .cat-tab, .music-btn, .home-nav-tab, .track-select-btn').forEach(bindRipple);
  }

  /* ---- 2b. Magnetic hover pull for primary buttons (desktop only) ---- */
  function attachMagnetic(el) {
    if (!el || el.__magneticBound) return;
    el.__magneticBound = true;
    var raf;
    el.addEventListener('pointermove', function (e) {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var rect = el.getBoundingClientRect();
        var mx = (e.clientX - rect.left - rect.width / 2) * 0.22;
        var my = (e.clientY - rect.top - rect.height / 2) * 0.28;
        el.style.transform = 'translate(' + mx.toFixed(1) + 'px,' + my.toFixed(1) + 'px)';
      });
    });
    el.addEventListener('pointerleave', function () {
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = '';
    });
  }
  function bindMagneticTargets() {
    if (!supportsHover) return;
    document.querySelectorAll('.btn-primary, .btn-gold, .music-btn-play').forEach(attachMagnetic);
  }

  /* ---- 3. Subtle parallax on hero orbs following pointer (desktop only) ---- */
  function bindHeroParallax() {
    if (!supportsHover) return;
    var banner = document.querySelector('.banner-ratio');
    var glowLeft = document.querySelector('.banner-glow-left');
    var glowRight = document.querySelector('.banner-glow-right');
    if (!banner || (!glowLeft && !glowRight)) return;

    var raf;
    banner.addEventListener('pointermove', function (e) {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var rect = banner.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        if (glowLeft) glowLeft.style.transform = 'translateY(-50%) translate(' + (px * -16) + 'px,' + (py * -10) + 'px)';
        if (glowRight) glowRight.style.transform = 'translateY(-50%) translate(' + (px * 16) + 'px,' + (py * 10) + 'px)';
      });
    });
    banner.addEventListener('pointerleave', function () {
      if (glowLeft) glowLeft.style.transform = '';
      if (glowRight) glowRight.style.transform = '';
    });
  }

  /* ---- 4. Play-ring pulse sync — mirrors the existing "playing" class ---- */
  function bindPlayRing() {
    var playBtn = document.getElementById('play-btn');
    var eq = document.getElementById('equalizer');
    if (!playBtn || !eq) return;
    var observer = new MutationObserver(function () {
      playBtn.classList.toggle('is-playing', eq.classList.contains('playing'));
    });
    observer.observe(eq, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---- Re-bind whenever new cards get injected (product grid re-renders) ---- */
  function rebindDynamic() {
    bindTiltTargets();
    bindRippleTargets();
    bindMagneticTargets();
  }

  document.addEventListener('DOMContentLoaded', function () {
    rebindDynamic();
    bindHeroParallax();
    bindPlayRing();

    var grid = document.getElementById('product-grid');
    if (grid && 'MutationObserver' in window) {
      var mo = new MutationObserver(function () { rebindDynamic(); });
      mo.observe(grid, { childList: true });
    }

    // Catch late-rendered nav tabs / membership cards without polling too aggressively.
    setTimeout(rebindDynamic, 1200);
  });
})();
