/* =====================================================================
   ALIFTZY STORE — Ambient particle system (Dark Glass Premium)
   Canvas-only, purely decorative background layer. Reads nothing from
   and writes nothing to app state, Firebase, or the DOM outside of the
   #fx-particle-canvas element it owns. Safe to delete with zero impact
   on functionality.
   ===================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('fx-particle-canvas');
  if (!canvas || !canvas.getContext) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) { canvas.remove(); return; }

  var ctx = canvas.getContext('2d');
  var isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  var W = 0, H = 0;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  /* ---------------------------------------------------------------
     Build icon point-clouds by rasterizing simple shapes offscreen
     and sampling opaque pixels. Avoids hand-written bezier point
     lists while staying dependency-free.
     --------------------------------------------------------------- */
  function rasterizeIcon(drawFn, size) {
    var off = document.createElement('canvas');
    off.width = size; off.height = size;
    var octx = off.getContext('2d');
    octx.fillStyle = '#fff';
    octx.strokeStyle = '#fff';
    drawFn(octx, size);
    var data = octx.getImageData(0, 0, size, size).data;
    var pts = [];
    var step = Math.max(2, Math.round(size / 26));
    for (var y = 0; y < size; y += step) {
      for (var x = 0; x < size; x += step) {
        var alpha = data[(y * size + x) * 4 + 3];
        if (alpha > 90) {
          pts.push({ x: (x / size - 0.5), y: (y / size - 0.5) });
        }
      }
    }
    return pts;
  }

  var ICONS = [
    // Music note
    function (c, s) {
      c.lineWidth = s * 0.07;
      c.beginPath(); c.arc(s * 0.34, s * 0.72, s * 0.14, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(s * 0.72, s * 0.62, s * 0.14, 0, Math.PI * 2); c.fill();
      c.beginPath();
      c.moveTo(s * 0.46, s * 0.72); c.lineTo(s * 0.46, s * 0.2);
      c.lineTo(s * 0.86, s * 0.12); c.lineTo(s * 0.86, s * 0.62);
      c.stroke();
    },
    // Play triangle
    function (c, s) {
      c.beginPath();
      c.moveTo(s * 0.32, s * 0.18);
      c.lineTo(s * 0.32, s * 0.82);
      c.lineTo(s * 0.84, s * 0.5);
      c.closePath();
      c.fill();
    },
    // Paintbrush
    function (c, s) {
      c.save();
      c.translate(s * 0.5, s * 0.5);
      c.rotate(-Math.PI / 4);
      c.fillRect(-s * 0.06, -s * 0.4, s * 0.12, s * 0.5);
      c.beginPath();
      c.moveTo(-s * 0.1, s * 0.1);
      c.lineTo(s * 0.1, s * 0.1);
      c.lineTo(s * 0.05, s * 0.34);
      c.quadraticCurveTo(0, s * 0.42, -s * 0.05, s * 0.34);
      c.closePath();
      c.fill();
      c.restore();
    },
    // Sparkle
    function (c, s) {
      c.save();
      c.translate(s * 0.5, s * 0.5);
      function star(scale, rot) {
        c.save();
        c.rotate(rot);
        c.beginPath();
        c.moveTo(0, -s * 0.42 * scale);
        c.quadraticCurveTo(s * 0.06 * scale, -s * 0.06 * scale, s * 0.42 * scale, 0);
        c.quadraticCurveTo(s * 0.06 * scale, s * 0.06 * scale, 0, s * 0.42 * scale);
        c.quadraticCurveTo(-s * 0.06 * scale, s * 0.06 * scale, -s * 0.42 * scale, 0);
        c.quadraticCurveTo(-s * 0.06 * scale, -s * 0.06 * scale, 0, -s * 0.42 * scale);
        c.closePath();
        c.fill();
        c.restore();
      }
      star(1, 0);
      c.translate(s * 0.26, -s * 0.24);
      star(0.4, 0.3);
      c.restore();
    }
  ];

  var iconPointSets = ICONS.map(function (fn) { return rasterizeIcon(fn, 96); });

  /* ---------------------------------------------------------------
     Particle system
     --------------------------------------------------------------- */
  var COUNT = isCoarse ? 34 : 64;
  var LINK_DIST = isCoarse ? 70 : 110;
  var ICON_BOX = Math.min(W, H) * (isCoarse ? 0.32 : 0.24);

  var particles = [];
  function randFloatTarget() {
    return { x: Math.random() * W, y: Math.random() * H };
  }

  for (var i = 0; i < COUNT; i++) {
    var start = randFloatTarget();
    particles.push({
      x: start.x, y: start.y,
      fx: start.x, fy: start.y, // current "free" wander anchor
      angle: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.25,
      radius: 1 + Math.random() * 1.6,
      hue: Math.random() < 0.5 ? '109,92,255' : '78,197,255',
      iconIdx: i % (iconPointSets[0] ? iconPointSets.length : 1)
    });
  }

  var CYCLE = {
    FLOAT: 0, MORPH_IN: 1, HOLD: 2, MORPH_OUT: 3
  };
  var phase = CYCLE.FLOAT;
  var phaseStart = performance.now();
  var DURATIONS = { 0: 7000, 1: 2200, 2: 2600, 3: 2200 };
  var currentIcon = 0;
  var center = { x: W * 0.5, y: H * 0.42 };

  function assignIconTargets() {
    var set = iconPointSets[currentIcon];
    if (!set || !set.length) return;
    for (var i = 0; i < particles.length; i++) {
      var p = set[i % set.length];
      var jitterAngle = Math.random() * Math.PI * 2;
      var jitter = Math.random() * 3;
      particles[i].tx = center.x + p.x * ICON_BOX + Math.cos(jitterAngle) * jitter;
      particles[i].ty = center.y + p.y * ICON_BOX + Math.sin(jitterAngle) * jitter;
    }
  }

  var pointer = { x: -9999, y: -9999, active: false };
  window.addEventListener('mousemove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches[0]) {
      pointer.x = e.touches[0].clientX; pointer.y = e.touches[0].clientY; pointer.active = true;
    }
  }, { passive: true });
  window.addEventListener('touchend', function () { pointer.active = false; }, { passive: true });

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  var running = true;
  document.addEventListener('visibilitychange', function () {
    running = document.visibilityState === 'visible';
    if (running) { last = performance.now(); requestAnimationFrame(tick); }
  });

  var last = performance.now();

  function tick(now) {
    if (!running) return;
    var dt = Math.min(now - last, 40);
    last = now;

    var elapsed = now - phaseStart;
    var dur = DURATIONS[phase];

    if (phase === CYCLE.FLOAT) {
      center.x = W * 0.5; center.y = H * 0.42;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.angle += (Math.sin(now * 0.0003 + i) * 0.01);
        p.fx += Math.cos(p.angle) * p.speed;
        p.fy += Math.sin(p.angle) * p.speed * 0.6;
        if (p.fx < -20) p.fx = W + 20; if (p.fx > W + 20) p.fx = -20;
        if (p.fy < -20) p.fy = H + 20; if (p.fy > H + 20) p.fy = -20;

        if (pointer.active) {
          var dx = p.fx - pointer.x, dy = p.fy - pointer.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 14400) {
            var d = Math.sqrt(d2) || 1;
            var force = (1 - d / 120) * 1.4;
            p.fx += (dx / d) * force;
            p.fy += (dy / d) * force;
          }
        }
        p.x = p.fx; p.y = p.fy;
      }
      if (elapsed > dur) { assignIconTargets(); phase = CYCLE.MORPH_IN; phaseStart = now; }
    } else if (phase === CYCLE.MORPH_IN) {
      var t = easeInOut(Math.min(elapsed / dur, 1));
      for (var i2 = 0; i2 < particles.length; i2++) {
        var p2 = particles[i2];
        p2.x = lerp(p2.fx, p2.tx, t);
        p2.y = lerp(p2.fy, p2.ty, t);
      }
      if (elapsed > dur) { phase = CYCLE.HOLD; phaseStart = now; }
    } else if (phase === CYCLE.HOLD) {
      for (var i3 = 0; i3 < particles.length; i3++) {
        var p3 = particles[i3];
        p3.x = p3.tx + Math.sin(now * 0.002 + i3) * 1.2;
        p3.y = p3.ty + Math.cos(now * 0.0022 + i3) * 1.2;
      }
      if (elapsed > dur) {
        for (var i4 = 0; i4 < particles.length; i4++) {
          var nf = randFloatTarget();
          particles[i4].nfx = nf.x; particles[i4].nfy = nf.y;
        }
        phase = CYCLE.MORPH_OUT; phaseStart = now;
      }
    } else if (phase === CYCLE.MORPH_OUT) {
      var t2 = easeInOut(Math.min(elapsed / dur, 1));
      for (var i5 = 0; i5 < particles.length; i5++) {
        var p5 = particles[i5];
        p5.x = lerp(p5.tx, p5.nfx, t2);
        p5.y = lerp(p5.ty, p5.nfy, t2);
      }
      if (elapsed > dur) {
        for (var i6 = 0; i6 < particles.length; i6++) {
          particles[i6].fx = particles[i6].nfx;
          particles[i6].fy = particles[i6].nfy;
        }
        currentIcon = (currentIcon + 1) % iconPointSets.length;
        phase = CYCLE.FLOAT; phaseStart = now;
      }
    }

    draw();
    requestAnimationFrame(tick);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    if (!isCoarse) {
      ctx.lineWidth = 1;
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var a = particles[i], b = particles[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            var alpha = (1 - dist / LINK_DIST) * 0.14;
            ctx.strokeStyle = 'rgba(109,92,255,' + alpha + ')';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    for (var k = 0; k < particles.length; k++) {
      var p = particles[k];
      var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
      grad.addColorStop(0, 'rgba(' + p.hue + ',0.9)');
      grad.addColorStop(1, 'rgba(' + p.hue + ',0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  requestAnimationFrame(tick);
})();
