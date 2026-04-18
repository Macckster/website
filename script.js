// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  const rocket = document.getElementById('rocket');
  rocket.style.animation = "float 2s ease-in-out infinite";
  applyTimeGreeting();

  // Wire charge-up to warp button
  const btn = document.querySelector('button');
  btn.addEventListener('mousedown',  warpChargeStart);
  btn.addEventListener('mouseup',    warpChargeRelease);
  btn.addEventListener('mouseleave', warpChargeCancel);
  btn.addEventListener('touchstart', warpChargeStart,   { passive: true });
  btn.addEventListener('touchend',   warpChargeRelease);
});

// Time-based tagline
function applyTimeGreeting() {
  const hour     = new Date().getHours();
  const headline = document.getElementById('headline');
  const tagline  = document.getElementById('tagline');
  if (hour >= 0 && hour < 5) {
    headline.textContent = 'Still Awake?';
    tagline.textContent  = "Let's beam you somewhere better 🚀";
  } else if (hour >= 5 && hour < 9) {
    headline.textContent = 'Early Launch Window';
    tagline.textContent  = "Let's beam you somewhere else 🚀";
  } else if (hour >= 22) {
    headline.textContent = 'Night Shift';
    tagline.textContent  = "Let's beam you somewhere else 🚀";
  } else {
    headline.textContent = 'Deep Space';
    tagline.textContent  = "Let's beam you somewhere else 🚀";
  }
}

// ─── Stars ───────────────────────────────────────────────────────────────────

const starsContainer = document.querySelector('.stars');
const stars     = [];
const starCount = 350;

let mouseX       = window.innerWidth  / 2;
let mouseY       = window.innerHeight / 2;
let targetMouseX = mouseX;
let targetMouseY = mouseY;

document.addEventListener('mousemove', (e) => {
  targetMouseX = e.clientX;
  targetMouseY = e.clientY;
  resetIdle();
});

for (let i = 0; i < starCount; i++) {
  const star  = document.createElement('span');
  const x     = Math.random() * window.innerWidth;
  const y     = Math.random() * window.innerHeight;
  const vx    = (Math.random() - 0.5) * 0.2;
  const vy    = (Math.random() - 0.5) * 0.2;
  const size  = 1 + Math.random() * 2;
  const depth = Math.random();
  star.style.left    = '0px';
  star.style.top     = '0px';
  star.style.width   = star.style.height = size + 'px';
  star.style.opacity = 0.3 + depth * 0.7;
  starsContainer.appendChild(star);
  stars.push({ el: star, x, y, vx, vy, depth });
}

let warping = false;

function animateStars() {
  mouseX += (targetMouseX - mouseX) * 0.05;
  mouseY += (targetMouseY - mouseY) * 0.05;

  const centerX = window.innerWidth  / 2;
  const centerY = window.innerHeight / 2;
  const offsetX = (mouseX - centerX) / centerX;
  const offsetY = (mouseY - centerY) / centerY;
  const margin  = 40;

  for (const s of stars) {
    if (!warping) {
      s.x += s.vx;
      s.y += s.vy;
      const edgeX = Math.min(s.x / margin, (window.innerWidth  - s.x) / margin, 1);
      const edgeY = Math.min(s.y / margin, (window.innerHeight - s.y) / margin, 1);
      s.el.style.opacity = (0.3 + s.depth * 0.7) * Math.max(0, Math.min(edgeX, edgeY));
      if (s.x < -margin)                     s.x = window.innerWidth  + margin;
      if (s.x > window.innerWidth  + margin)  s.x = -margin;
      if (s.y < -margin)                     s.y = window.innerHeight + margin;
      if (s.y > window.innerHeight + margin)  s.y = -margin;
    }
    const px = offsetX * s.depth * 30;
    const py = offsetY * s.depth * 30;
    s.el.style.transform = `translate(${s.x + px}px, ${s.y + py}px)`;
  }
  requestAnimationFrame(animateStars);
}
animateStars();

// ─── Rocket tricks ───────────────────────────────────────────────────────────

const tricks = [
  { anim: 'spin 0.8s ease-in-out' },
  { anim: 'spinFast 1.2s ease-in-out' },
  { anim: 'wobble 0.9s ease-in-out' },
  { anim: 'flip 0.9s ease-in-out' },
  { anim: 'bounce 1s ease-in-out' },
  { anim: 'glitch 0.8s steps(1)' },
  { anim: 'orbit 1.2s ease-in-out' },
  { anim: 'zigzag 1s ease-in-out' },
  { anim: 'shrinkGrow 0.9s ease-in-out' },
  { anim: 'tiltShake 0.9s ease-in-out' },
];

let trickQueue      = [];
let trickRunning    = false;
let clickCount      = 0;
let clickResetTimer = null;

function spin() {
  if (warping) return;
  resetIdle();

  clickCount++;
  clearTimeout(clickResetTimer);
  clickResetTimer = setTimeout(() => { clickCount = 0; }, 2000);

  if (clickCount === 10) {
    clickCount = 0;
    trickQueue = [];
    rocketRage();
    return;
  }

  const last = trickQueue.length ? trickQueue[trickQueue.length - 1] : null;
  let pick;
  do { pick = tricks[Math.floor(Math.random() * tricks.length)]; } while (pick === last && tricks.length > 1);
  trickQueue.push(pick);
  if (!trickRunning) runNextTrick();
}

function runNextTrick() {
  if (!trickQueue.length) {
    trickRunning = false;
    setRocketAnim('float 2s ease-in-out infinite');
    return;
  }
  trickRunning = true;
  const trick  = trickQueue.shift();
  setRocketAnim(trick.anim);
  getRocket().addEventListener('animationend', runNextTrick, { once: true });
}

function getRocket() { return document.getElementById('rocket'); }

function setRocketAnim(anim) {
  const r = getRocket();
  r.style.animation = 'none';
  void r.offsetWidth;
  r.style.animation = anim;
}

function rocketRage() {
  trickRunning = true;
  const r = getRocket();
  r.style.animation = 'none';
  void r.offsetWidth;
  r.style.animation = 'glitch 0.15s steps(1) infinite';
  r.style.filter    = 'hue-rotate(0deg)';

  let overlay = document.getElementById('rage-overlay');
  if (!overlay) {
    overlay    = document.createElement('div');
    overlay.id = 'rage-overlay';
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('active');
  void overlay.offsetWidth;
  overlay.classList.add('active');

  setTimeout(() => {
    overlay.classList.remove('active');
    trickRunning    = false;
    r.style.filter  = '';
    setRocketAnim('float 2s ease-in-out infinite');
  }, 1500);
}

// ─── Idle drift ───────────────────────────────────────────────────────────────

let idleTimer    = null;
let idleDrifting = false;

function resetIdle() {
  clearTimeout(idleTimer);
  if (idleDrifting) returnFromDrift();
  idleTimer = setTimeout(startDrift, 60000);
}

function startDrift() {
  if (warping || trickRunning) { resetIdle(); return; }
  idleDrifting       = true;
  const r            = getRocket();
  r.style.animation  = 'none';
  r.style.transition = 'none';
  r.style.transform  = 'translateY(0) scale(1)';
  r.style.opacity    = '1';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    r.style.transition = 'transform 5s cubic-bezier(0.2, 0, 1, 0.8), opacity 2s ease-in 2.5s';
    r.style.transform  = 'translateX(55vw) translateY(-35vh) rotate(50deg) scale(0.1)';
    r.style.opacity    = '0';
  }));
  setTimeout(() => {
    if (!idleDrifting) return;
    r.style.transition = 'none';
    r.style.transform  = 'translateX(-55vw) translateY(20vh) rotate(-30deg) scale(0.1)';
    r.style.opacity    = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      r.style.transition = 'transform 4s cubic-bezier(0, 0, 0.4, 1), opacity 1.5s ease-out';
      r.style.transform  = 'translateX(0) translateY(0) rotate(0deg) scale(1)';
      r.style.opacity    = '1';
    }));
    setTimeout(() => {
      if (!idleDrifting) return;
      idleDrifting       = false;
      r.style.transition = 'none';
      r.style.transform  = '';
      setRocketAnim('float 2s ease-in-out infinite');
      resetIdle();
    }, 4500);
  }, 6000);
}

function returnFromDrift() {
  idleDrifting       = false;
  const r            = getRocket();
  r.style.transition = 'none';
  r.style.transform  = '';
  r.style.opacity    = '1';
  setRocketAnim('float 2s ease-in-out infinite');
}

resetIdle();

// ─── Konami code ─────────────────────────────────────────────────────────────

const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
  resetIdle();
  if (e.key === konami[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === konami.length) {
      konamiIndex = 0;
      activateHyperspace();
    }
  } else {
    konamiIndex = 0;
  }
});

function activateHyperspace() {
  starsContainer.classList.add('warp');
  document.body.classList.add('hyperspace');

  const msg      = document.createElement('div');
  msg.id         = 'konami-msg';
  msg.textContent = '🌌 HYPERSPACE UNLOCKED 🌌';
  document.querySelector('.container').appendChild(msg);
  requestAnimationFrame(() => requestAnimationFrame(() => msg.classList.add('visible')));

  setTimeout(() => {
    starsContainer.classList.remove('warp');
    document.body.classList.remove('hyperspace');
    msg.remove();
  }, 3000);
}

// ─── Keyword easter eggs ──────────────────────────────────────────────────────

let typed = '';

document.addEventListener('keydown', (e) => {
  if (e.key.length === 1) {
    typed += e.key.toLowerCase();
    typed  = typed.slice(-12);

    if (typed.includes('space'))    { typed = ''; toggleNebulaMode(); }
    else if (typed.includes('hl3')) { typed = ''; hl3Confirmed();    }
    else if (typed.includes('iddqd')){ typed = ''; godMode();        }
    else if (typed.includes('idkfa')){ typed = ''; infiniteAmmo();   }
    else {
      for (const [word, fn] of Object.entries(extraKeywords)) {
        if (typed.endsWith(word)) { typed = ''; fn(); break; }
      }
    }
  }
});

let nebulaOn = false;
function toggleNebulaMode() {
  nebulaOn = !nebulaOn;
  document.body.classList.toggle('nebula', nebulaOn);
}

// ─── HL3 easter egg ───────────────────────────────────────────────────────────

let hl3Running = false;
function hl3Confirmed() {
  if(hl3Running)
	  return;
  
  hl3Running = true;
  
  const headline = document.getElementById('headline');
  const original = headline.textContent;

  const messages = [
    'λ Half-Life 3? λ',
    'λ HL3 Confirmed λ',
    "λ It's Real λ",
    'λ Freeman Lives λ',
    'λ The Wait Is Over λ',
    'λ G-Man Was Right λ',
  ];

  // Pick ONE random message
  const chosen = messages[Math.floor(Math.random() * messages.length)];

  // Hold the headline's current height so the layout never collapses
  headline.style.minHeight  = headline.offsetHeight + 'px';
  headline.style.visibility = 'hidden';
  headline.classList.add('hl3-active');

  // One rAF so the browser commits the minHeight before we start typing
  requestAnimationFrame(() => {
    headline.textContent  = '';
    headline.style.visibility = '';

    let charIdx     = 0;
    const typeTimer = setInterval(() => {
      headline.textContent += chosen[charIdx];
      charIdx++;
      if (charIdx >= chosen.length) clearInterval(typeTimer);
    }, 65);

    setTimeout(() => {
      headline.style.opacity = '0';
      setTimeout(() => {
        clearInterval(typeTimer);
        headline.classList.remove('hl3-active');
        headline.textContent      = original;
		hl3Running = false;
        headline.style.opacity    = '';
        headline.style.minHeight  = '';
        headline.style.visibility = '';
      }, 400);
    }, 2800);
  });
}

// ─── DOOM easter egg (iddqd) ──────────────────────────────────────────────────

function godMode() {
  const headline = document.getElementById('headline');
  const tagline  = document.getElementById('tagline');
  const origHead = headline.textContent;
  const origTag  = tagline.textContent;

  headline.textContent = 'IDDQD'
  tagline.textContent = 'Degreelessness Mode On';
  document.body.classList.add('god-mode');

  setTimeout(() => {
    clearInterval(doomFlicker);
    // Explicitly clear any inline styles so CSS transition doesn't leave orange behind
    headline.style.color      = '';
    headline.style.textShadow = '';
    headline.style.animation  = '';
  }, 2200);

  setTimeout(() => {
    // Pin the current glow as an inline style BEFORE removing the class,
    // so the browser has a from-value and can transition it away.
    headline.style.transition  = 'color 0.6s ease, text-shadow 0.6s ease';
    headline.style.textShadow  = '0 0 20px #ff2200, 0 0 50px #880000';
    headline.style.color       = '#cc2200';
    document.body.classList.remove('god-mode');
	headline.textContent    = origHead;
    tagline.textContent     = origTag;
    // On next frame, drive colour and glow to nothing so transition fires
    requestAnimationFrame(() => requestAnimationFrame(() => {
      headline.style.textShadow = 'none';
      headline.style.color      = '';
    }));
    // Clean up inline styles after transition completes
    setTimeout(() => {
      headline.style.transition = '';
      headline.style.textShadow = '';
      headline.style.color      = '';
      headline.style.animation  = '';
    }, 700);
  }, 3600);
}

// Bonus DOOM cheat: idkfa
function infiniteAmmo() {
  const headline = document.getElementById('headline');
  const tagline  = document.getElementById('tagline');
  const origHead = headline.textContent;
  const origTag  = tagline.textContent;

  headline.textContent = 'IDKFA';
  tagline.textContent  = 'Very Happy Ammo Added';
  document.body.classList.add('ammo-mode');

  setTimeout(() => {
    headline.style.transition  = 'color 0.6s ease, text-shadow 0.6s ease';
    headline.style.textShadow  = '0 0 20px #ffa500';
    headline.style.color       = '#ffd700';
    document.body.classList.remove('ammo-mode');
	headline.textContent = origHead;
    tagline.textContent  = origTag;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      headline.style.textShadow = 'none';
      headline.style.color      = '';
    }));
    setTimeout(() => {
      headline.style.transition = '';
      headline.style.textShadow = '';
      headline.style.color      = '';
      headline.style.animation  = '';
    }, 700);
  }, 3200);
}

// ─── Right-click context menu ─────────────────────────────────────────────────

const ctxMenu = document.getElementById('ctx-menu');

document.getElementById('rocket').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  ctxMenu.style.left = Math.min(e.clientX, window.innerWidth  - 160) + 'px';
  ctxMenu.style.top  = Math.min(e.clientY, window.innerHeight - 100) + 'px';
  ctxMenu.classList.add('open');
});

document.addEventListener('click',       () => ctxMenu.classList.remove('open'));
document.addEventListener('contextmenu', (e) => {
  if (e.target !== getRocket()) ctxMenu.classList.remove('open');
});

function ctxEject() {
  ctxMenu.classList.remove('open');
  const r    = getRocket();
  const rect = r.getBoundingClientRect();
  const pilot = document.createElement('div');
  pilot.id           = 'pilot';
  pilot.textContent  = '🧑‍🚀';
  pilot.style.left   = (rect.left + rect.width / 2) + 'px';
  pilot.style.top    = (rect.top  + rect.height * 0.15) + 'px';
  document.body.appendChild(pilot);
  requestAnimationFrame(() => requestAnimationFrame(() => pilot.classList.add('eject')));
  setTimeout(() => pilot.remove(), 2500);
  setRocketAnim('wobble 0.6s ease-in-out');
}

function ctxRefuel() {
  ctxMenu.classList.remove('open');
  const bar = document.createElement('div');
  bar.id        = 'fuel-bar';
  bar.innerHTML = '<div id="fuel-fill"></div><span>FUELING...</span>';
  document.body.appendChild(bar);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.classList.add('visible');
    document.getElementById('fuel-fill').style.width = '100%';
  }));
  setTimeout(() => { bar.querySelector('span').textContent = 'READY FOR LAUNCH'; }, 1800);
  setTimeout(() => bar.remove(), 3000);
}

// ─── Warp ────────────────────────────────────────────────────────────────────

const destinations = [
  { url: "https://www.reddit.com",         label: "Reddit"       },
  { url: "https://duckduckgo.com",         label: "DuckDuckGo"   },
  { url: "https://news.ycombinator.com",   label: "Hacker News"  },
  { url: "https://xkcd.com",              label: "xkcd"         },
  { url: "https://wikipedia.org",          label: "Wikipedia"    },
  { url: "https://www.torproject.org/",    label: "Tor Project"  },
];

// ─── Charge-up warp ───────────────────────────────────────────────────────────

let chargeLevel     = 0;
let chargeInterval  = null;
let chargeStartTime = 0;
let chargeActive    = false;

function warpChargeStart() {
  if (warping) return;
  chargeActive    = true;
  chargeLevel     = 0;
  chargeStartTime = Date.now();

  const btn = document.querySelector('button');
  const r   = getRocket();
  btn.classList.add('charging');
  r.classList.add('charging');

  chargeInterval = setInterval(() => {
    chargeLevel = Math.min(chargeLevel + 0.05, 1);
    btn.style.setProperty('--charge', chargeLevel);
    r.style.setProperty('--charge',   chargeLevel);
    if (chargeLevel >= 1) {
      clearInterval(chargeInterval);
      warpFire();
    }
  }, 40);
}

function warpChargeRelease() {
  if (warping || !chargeActive) return;
  chargeActive = false;
  clearInterval(chargeInterval);

  const btn = document.querySelector('button');
  const r   = getRocket();
  btn.classList.remove('charging');
  r.classList.remove('charging');
  btn.style.setProperty('--charge', 0);
  r.style.removeProperty('--charge');

  // Any release fires — click or full hold
  warpFire();
}

function warpChargeCancel() {
  if (warping) return;
  chargeActive = false;
  clearInterval(chargeInterval);
  chargeLevel  = 0;

  const btn = document.querySelector('button');
  const r   = getRocket();
  btn.classList.remove('charging');
  r.classList.remove('charging');
  btn.style.setProperty('--charge', 0);
  r.style.removeProperty('--charge');
}

function warpFire() {
  clearInterval(chargeInterval);
  if (warping) return;
  warping      = true;
  chargeActive = false;
  trickQueue   = [];
  trickRunning = false;
  clearTimeout(idleTimer);

  const btn = document.querySelector('button');
  const r   = getRocket();
  btn.classList.remove('charging');
  r.classList.remove('charging');
  r.style.removeProperty('--charge');
  btn.disabled = true;

  const dest = destinations[Math.floor(Math.random() * destinations.length)];

  setRocketAnim('shake 0.6s ease-in-out');

  setTimeout(() => {
    setRocketAnim('launch 1s ease-in forwards');
    starsContainer.classList.add('warp');
    document.body.classList.add('warp-active');
    showDestination(dest.label);
    setTimeout(() => { window.location.replace(dest.url); }, 2200);
  }, 600);
}

function showDestination(label) {
  const existing = document.getElementById('warp-destination');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'warp-destination';
  el.innerHTML = `<span class="warp-label">WARPING TO</span><span class="warp-name">${label}</span>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));
}

// ─── Meteor shower (double-click background) ──────────────────────────────────

document.body.addEventListener('dblclick', (e) => {
  if (warping) return;
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'img' || tag === 'button') return;
  spawnMeteorShower();
});

function spawnMeteorShower() {
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const meteor  = document.createElement('div');
      meteor.className = 'meteor';
      meteor.style.left = (Math.random() * window.innerWidth  * 0.7) + 'px';
      meteor.style.top  = (Math.random() * window.innerHeight * 0.3) + 'px';
      document.body.appendChild(meteor);
      requestAnimationFrame(() => requestAnimationFrame(() => meteor.classList.add('fall')));
      setTimeout(() => meteor.remove(), 1200);
    }, i * 120);
  }
}

// ─── Extra rocket animation easter eggs ──────────────────────────────────────
// Type these words to trigger: "spiral", "moonwalk", "tiny", "comet"

const extraKeywords = {
  'spiral':   rocketSpiral,
  'moonwalk': rocketMoonwalk,
  'tiny':     rocketTiny,
  'comet':    rocketComet,
};

function rocketSpiral() {
  if (trickRunning || warping) return;
  trickRunning = true;
  showBriefTag('🌀 SPIRAL MODE');
  setRocketAnim('spiral 1.4s cubic-bezier(0.4,0,0.6,1)');
  getRocket().addEventListener('animationend', () => {
    trickRunning = false;
    setRocketAnim('float 2s ease-in-out infinite');
  }, { once: true });
}

function rocketMoonwalk() {
  if (trickRunning || warping) return;
  trickRunning = true;
  showBriefTag('🕺 MOONWALK');
  setRocketAnim('moonwalk 1.4s ease-in-out');
  getRocket().addEventListener('animationend', () => {
    trickRunning = false;
    setRocketAnim('float 2s ease-in-out infinite');
  }, { once: true });
}

function rocketTiny() {
  if (trickRunning || warping) return;
  trickRunning = true;
  showBriefTag('🔬 TINY MODE');
  setRocketAnim('tinyMode 2s ease-in-out');
  getRocket().addEventListener('animationend', () => {
    trickRunning = false;
    setRocketAnim('float 2s ease-in-out infinite');
  }, { once: true });
}

function rocketComet() {
  if (trickRunning || warping) return;
  trickRunning = true;
  showBriefTag('☄️ COMET!');
  const r        = getRocket();
  r.style.animation  = 'none';
  r.style.transition = 'none';
  void r.offsetWidth;
  r.style.transition = 'transform 0.8s cubic-bezier(0.2,0,1,0.8), opacity 0.4s ease-in 0.4s';
  r.style.transform  = 'translateX(70vw) translateY(-40vh) rotate(45deg) scale(0.15)';
  r.style.opacity    = '0';

  setTimeout(() => {
    r.style.transition = 'none';
    r.style.transform  = 'translateX(-70vw) translateY(30vh) rotate(-20deg) scale(0.15)';
    r.style.opacity    = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      r.style.transition = 'transform 1s cubic-bezier(0,0,0.4,1), opacity 0.6s ease-out';
      r.style.transform  = 'translateX(0) translateY(0) rotate(0) scale(1)';
      r.style.opacity    = '1';
    }));
    setTimeout(() => {
      trickRunning       = false;
      r.style.transition = 'none';
      r.style.transform  = '';
      setRocketAnim('float 2s ease-in-out infinite');
    }, 1200);
  }, 950);
}

function showBriefTag(text) {
  let tag = document.getElementById('brief-tag');
  if (tag) tag.remove();
  tag             = document.createElement('div');
  tag.id          = 'brief-tag';
  tag.textContent = text;
  document.body.appendChild(tag);
  requestAnimationFrame(() => requestAnimationFrame(() => tag.classList.add('visible')));
  setTimeout(() => {
    tag.classList.remove('visible');
    setTimeout(() => tag.remove(), 400);
  }, 1600);
}

// ─── Resize ───────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  for (const s of stars) {
    s.x = Math.random() * window.innerWidth;
    s.y = Math.random() * window.innerHeight;
  }
});