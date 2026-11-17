/* Vardam's living engine and quiet atmospheric effects. No external dependencies. */
(function () {
  'use strict';

  var media = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reducedMotion = media.matches;
  var canvas = null;
  var context = null;
  var fogSprite = null;
  var particles = [];
  var width = 0;
  var height = 0;
  var ratio = 1;
  var isMobile = false;
  var started = false;
  var frameId = 0;
  var lastPaint = 0;
  var hiddenAt = 0;
  var resizeFrame = 0;
  var elapsedAtmosphere = 0;
  var active = null;
  var hasEntered = false;
  var currentPage = 'home';
  var currentLanguage = 'en';
  var gate = null;
  var skipButton = null;

  var words = {
    en: [
      ['Pressure rising', 'Brass chambers draw their first breath.'],
      ['Living tissue responding', 'The roots remember their purpose.'],
      ['Life and steel, in accord', 'Every cog finds the rhythm of a living heart.'],
      ['The Union holds', 'The Academy is ready to receive you.']
    ],
    es: [
      ['La presión asciende', 'Las cámaras de latón toman su primer aliento.'],
      ['El tejido vivo responde', 'Las raíces recuerdan su propósito.'],
      ['Vida y acero, en armonía', 'Cada engranaje encuentra el ritmo de un corazón vivo.'],
      ['La Unión permanece', 'La Academia está lista para recibirte.']
    ]
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cue(name) {
    if (!active || typeof active.sound !== 'function') return;
    try { active.sound(name); } catch (error) { /* Sound remains optional. */ }
  }

  function setProgress(value) {
    var pressure = document.getElementById('intro-pressure');
    if (!pressure) return;
    var percent = Math.round(clamp(value, 0, 1) * 100);
    pressure.style.setProperty('--intro-progress', percent + '%');
    pressure.setAttribute('aria-valuenow', String(percent));
    pressure.setAttribute('aria-valuemin', '0');
    pressure.setAttribute('aria-valuemax', '100');
    var fill = pressure.querySelector('[data-pressure-fill], .pressure-fill, span');
    if (fill) fill.style.width = percent + '%';
  }

  function setPhase(index) {
    if (!active || active.phase === index) return;
    active.phase = index;
    var copy = words[currentLanguage][index];
    var status = document.getElementById('intro-status');
    var detail = document.getElementById('intro-log');
    if (status) status.textContent = copy[0];
    if (detail) detail.textContent = copy[1];
    if (gate) gate.setAttribute('data-engine-phase', String(index + 1));
    cue(['pressure', 'tissue', 'heartbeat', 'union'][index]);
  }

  function openShutters() {
    if (!active || active.opened) return;
    active.opened = true;
    if (gate) gate.classList.add('shutters-open');
    cue('open');
  }

  function finish() {
    if (!active) return;
    var callback = active.done;
    active = null;
    hasEntered = true;
    setProgress(1);
    if (gate) {
      gate.classList.add('shutters-open', 'engine-complete');
      gate.classList.remove('engine-igniting');
      gate.setAttribute('aria-busy', 'false');
      if ('inert' in gate) gate.inert = true;
    }
    if (skipButton) skipButton.disabled = true;
    if (typeof callback === 'function') callback();
  }

  function updateIgnition(now) {
    if (!active) return;
    var elapsed = now - active.began;

    if (active.skipAt !== null) {
      if (now >= active.skipAt) finish();
      return;
    }

    if (active.reduced) {
      setProgress(1);
      if (elapsed >= 180) openShutters();
      if (elapsed >= 900) finish();
      return;
    }

    // A measured rise, with time for the grown fibres to settle before entry.
    setProgress(Math.min(elapsed / 6500, 1));
    if (elapsed >= 1800 && active.phase < 1) {
      if (gate) gate.classList.add('engine-growing');
      setPhase(1);
    }
    if (elapsed >= 3600 && active.phase < 2) setPhase(2);
    if (elapsed >= 5400 && active.phase < 3) {
      if (gate) gate.classList.add('engine-awake');
      setPhase(3);
    }
    if (elapsed >= 6500) openShutters();
    if (elapsed >= 8100) finish();
  }

  function createFogSprite() {
    var sprite = document.createElement('canvas');
    sprite.width = 320;
    sprite.height = 160;
    var brush = sprite.getContext('2d');
    if (!brush) return null;
    var haze = brush.createRadialGradient(160, 80, 5, 160, 80, 155);
    haze.addColorStop(0, 'rgba(211,213,180,.25)');
    haze.addColorStop(.45, 'rgba(190,203,175,.12)');
    haze.addColorStop(1, 'rgba(179,197,166,0)');
    brush.fillStyle = haze;
    brush.save();
    brush.translate(0, 40);
    brush.scale(1, .5);
    brush.fillRect(0, -80, 320, 320);
    brush.restore();
    return sprite;
  }

  function particle(initial) {
    return {
      x: Math.random() * width,
      y: initial ? Math.random() * height : height + 14,
      size: .55 + Math.random() * 1.7,
      speed: 3 + Math.random() * 8,
      drift: Math.random() * Math.PI * 2,
      sway: 5 + Math.random() * 19,
      alpha: .12 + Math.random() * .34,
      petal: Math.random() > .78
    };
  }

  function resize() {
    resizeFrame = 0;
    if (!canvas || !context) return;
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    isMobile = width <= 720;
    ratio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    var count = reducedMotion ? 12 : clamp(Math.round(width * height / 37000), 16, isMobile ? 20 : 42);
    particles = [];
    for (var i = 0; i < count; i += 1) particles.push(particle(true));
    paint(0);
    requestTick();
  }

  function requestResize() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(resize);
  }

  function paint(delta) {
    if (!context || !width || !height) return;
    context.clearRect(0, 0, width, height);
    if (!reducedMotion) elapsedAtmosphere += delta;
    var time = elapsedAtmosphere;
    var warmPage = /home|academy|union|about|lore|world|story/.test(currentPage);
    var tinge = warmPage ? '225,209,151' : '191,211,167';

    // Three broad, translucent wisps; sprites avoid rebuilding gradients each frame.
    if (fogSprite) {
      context.globalAlpha = reducedMotion ? .21 : .29;
      var fogWidth = Math.min(width * .9, 1050);
      for (var f = 0; f < (isMobile ? 2 : 3); f += 1) {
        var fogX = (width * (.1 + f * .38)) + Math.sin(time * .026 + f * 2) * 70;
        var fogY = height * (.81 + f * .045) + Math.sin(time * .05 + f) * 13;
        context.drawImage(fogSprite, fogX - fogWidth / 2, fogY - 70, fogWidth, 150);
      }
    }

    context.globalAlpha = 1;
    for (var i = 0; i < particles.length; i += 1) {
      var p = particles[i];
      if (!reducedMotion) {
        p.y -= p.speed * delta;
        p.x += Math.sin(time * .27 + p.drift) * p.sway * delta * .13;
        if (p.y < -18 || p.x < -22 || p.x > width + 22) {
          particles[i] = particle(false);
          continue;
        }
      }
      var alpha = p.alpha * (.82 + Math.sin(time * .25 + p.drift) * .18);
      context.fillStyle = 'rgba(' + tinge + ',' + alpha.toFixed(3) + ')';
      context.beginPath();
      if (p.petal) {
        context.ellipse(p.x, p.y, p.size * 1.7, p.size * .62, p.drift + time * .04, 0, Math.PI * 2);
      } else {
        context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      context.fill();
    }
  }

  function tick(now) {
    frameId = 0;
    if (document.hidden) return;
    updateIgnition(now);
    var targetInterval = isMobile ? 1000 / 24 : 1000 / 30;
    var delta = now - lastPaint;
    if (!reducedMotion && delta >= targetInterval) {
      paint(Math.min(delta / 1000, .08));
      lastPaint = now;
    }
    if (!reducedMotion || active) requestTick();
  }

  function requestTick() {
    if (frameId || document.hidden || !started) return;
    if (reducedMotion && !active) return;
    frameId = window.requestAnimationFrame(tick);
  }

  function visibilityChanged() {
    if (document.hidden) {
      hiddenAt = performance.now();
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      if (gate) gate.classList.add('engine-paused');
      return;
    }
    var now = performance.now();
    if (active && hiddenAt) {
      var pause = now - hiddenAt;
      active.began += pause;
      if (active.skipAt !== null) active.skipAt += pause;
    }
    hiddenAt = 0;
    lastPaint = now;
    if (gate) gate.classList.remove('engine-paused');
    requestTick();
  }

  function motionChanged(event) {
    reducedMotion = event.matches;
    if (reducedMotion && frameId && !active) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }
    resize();
  }

  function begin() {
    if (started) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', begin, { once: true });
      return;
    }
    started = true;
    gate = document.getElementById('gate');
    skipButton = document.getElementById('skip-intro');
    canvas = document.getElementById('atmosphere');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'atmosphere';
      document.body.appendChild(canvas);
    }
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('role', 'presentation');
    canvas.dataset.page = currentPage;
    context = canvas.getContext('2d', { alpha: true });
    fogSprite = createFogSprite();
    if (skipButton) skipButton.addEventListener('click', skip);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && active) {
        event.preventDefault();
        skip();
      }
    });
    document.addEventListener('visibilitychange', visibilityChanged);
    window.addEventListener('resize', requestResize, { passive: true });
    if (typeof media.addEventListener === 'function') media.addEventListener('change', motionChanged);
    else if (typeof media.addListener === 'function') media.addListener(motionChanged);
    if (gate && document.hidden) gate.classList.add('engine-paused');
    resize();
  }

  function ignite(done, options) {
    begin();
    options = options || {};
    if (active) return false;
    gate = document.getElementById('gate');
    skipButton = document.getElementById('skip-intro');
    currentLanguage = options.language === 'es' ? 'es' : 'en';
    active = {
      done: done,
      sound: options.sound,
      began: performance.now(),
      reduced: reducedMotion,
      phase: -1,
      opened: false,
      skipAt: null
    };
    if (gate) {
      gate.classList.remove('engine-complete', 'shutters-open', 'engine-growing', 'engine-awake');
      gate.classList.add('engine-igniting', 'engine-pressurizing');
      gate.setAttribute('aria-busy', 'true');
      if ('inert' in gate) gate.inert = false;
    }
    if (skipButton) {
      skipButton.disabled = false;
      skipButton.textContent = currentLanguage === 'es' ? 'Saltar apertura' : 'Skip opening';
      skipButton.setAttribute('aria-label', currentLanguage === 'es' ? 'Saltar la apertura y entrar en la Academia' : 'Skip the opening and enter the Academy');
    }
    if (reducedMotion) {
      if (gate) gate.classList.add('engine-growing', 'engine-awake');
      setPhase(3);
      setProgress(1);
    } else {
      setPhase(0);
      setProgress(0);
    }
    if (document.hidden) hiddenAt = performance.now();
    requestTick();
    return true;
  }

  function skip() {
    if (!active || active.skipAt !== null) return false;
    if (gate) gate.classList.add('engine-growing', 'engine-awake');
    setPhase(3);
    setProgress(1);
    openShutters();
    active.skipAt = performance.now() + (reducedMotion ? 0 : 160);
    requestTick();
    return true;
  }

  function setPage(page) {
    currentPage = String(page || 'home').toLowerCase();
    if (canvas) canvas.dataset.page = currentPage;
    if (reducedMotion) paint(0);
  }

  window.VARDAM_FX = {
    begin: begin,
    ignite: ignite,
    skip: skip,
    setPage: setPage
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, { once: true });
  else begin();
}());
