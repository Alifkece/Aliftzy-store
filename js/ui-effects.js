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

  /* ---- Ripple feedback on buttons / tabs (visual only, no logic change) ---- */
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

  /* ---- Subtle parallax on hero glows following pointer (desktop only) ---- */
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
    bindRippleTargets();
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
