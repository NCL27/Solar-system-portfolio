// main.js — Application entry point with Translation Support

import './style.css';
import { SolarSystem } from './solar.js';
import { PANEL_RENDERERS, animateSkillBars } from './panels.js';
import { TRANSLATIONS } from './data.js';
import { initPacmanGame, destroyPacmanGame } from './pacman.js';
import { initInvadersGame, destroyInvadersGame } from './invaders.js';

// ---- DOM refs ----
const loader        = document.getElementById('loader');
const canvasWrap    = document.getElementById('canvas-container');
const labelsWrap    = document.getElementById('labels-container');
const panel         = document.getElementById('panel');
const panelContent  = document.getElementById('panel-content');
const panelOverlay  = document.getElementById('panel-overlay');
const panelClose    = document.getElementById('panel-close');
const tooltip       = document.getElementById('tooltip');
const resetBtn      = document.getElementById('resetCamera');

// ---- i18n State ----
// Detect system language preference if no localStorage is set
let currentLang = localStorage.getItem('portfolio-lang');
if (!currentLang) {
  const sysLang = (navigator.language || navigator.userLanguage || 'es').substring(0, 2).toLowerCase();
  currentLang = (sysLang === 'en') ? 'en' : 'es';
}

// ---- State ----
let solar = null;
let labelEls = {};
let labelAnimId = null;

function updateTelemetryCard(planetId) {
  const card = document.getElementById('telemetry-focus-card');
  if (!card) return;

  const t = TRANSLATIONS[currentLang];
  let def;
  if (planetId === 'asteroid') {
    def = {
      designation: "CV",
      emoji: "☄️",
      name: currentLang === 'es' ? "ARMAGEDON" : "ARMAGEDDON",
      section: "cv",
      hint: currentLang === 'es' ? "Descarga mi Curriculum Vitae" : "Download my Curriculum Vitae"
    };
  } else if (planetId === 'spaceship') {
    def = {
      designation: "SIM-NAVE",
      emoji: "🚀",
      name: "Space Invaders",
      section: "spaceship",
      hint: currentLang === 'es' ? "Módulo de Defensa Orbital. Repele las fuerzas invasoras." : "Orbital Defense Module. Defend against the invading forces."
    };
  } else {
    def = t.planets.find(p => p.id === planetId);
  }

  if (!def) {
    card.classList.add('hidden');
    return;
  }

  card.classList.remove('hidden');

  const tagEl = document.getElementById('telemetry-planet-id');
  const emojiEl = document.getElementById('telemetry-planet-emoji');
  const titleEl = document.getElementById('telemetry-planet-title');
  const descEl = document.getElementById('telemetry-planet-desc');
  const actionBtn = document.getElementById('telemetry-action-btn');

  if (tagEl) tagEl.textContent = def.designation;
  if (emojiEl) emojiEl.textContent = def.emoji;
  if (titleEl) titleEl.textContent = def.name;
  
  if (descEl) {
    if (planetId === 'asteroid') {
      descEl.textContent = currentLang === 'es'
        ? "Módulo de transmisión de Curriculum Vitae de ALCUNI.DEV."
        : "Curriculum Vitae transmission module for ALCUNI.DEV.";
    } else {
      descEl.textContent = t.ui.telemetryDescs[planetId] || def.hint || "";
    }
  }
  
  if (actionBtn) {
    actionBtn.onclick = (e) => {
      e.stopPropagation();
      if (planetId === 'spaceship') {
        openSpaceInvaders();
      } else {
        openPanel(def.section);
      }
    };
    
    const btnSpan = actionBtn.querySelector('span');
    if (btnSpan) {
      if (planetId === 'about') {
        btnSpan.textContent = t.ui.actionBtnBio;
      } else if (planetId === 'spaceship') {
        btnSpan.textContent = currentLang === 'es' ? "INICIAR SIMULACIÓN >_" : "START SIMULATION >_";
      } else {
        btnSpan.textContent = t.ui.actionBtnDetails.replace('{name}', def.name.toUpperCase());
      }
    }
  }
}

// ---- Open / Close Panel ----
function openPanel(sectionId) {
  const renderer = PANEL_RENDERERS[sectionId];
  if (!renderer) return;

  const t = TRANSLATIONS[currentLang];
  panelContent.innerHTML = renderer(t);
  panel.classList.add('active');
  panelOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  // CV panel: add wider gold class; CSS handles all layout via flexbox
  if (sectionId === 'cv') {
    panel.classList.add('cv-panel');
  } else {
    panel.classList.remove('cv-panel');
  }

  // Animate skill bars if skills section
  if (sectionId === 'skills') {
    animateSkillBars(panelContent);
  }
}

function openSpacePacman() {
  const tTitle = currentLang === 'es' ? 'Space Pacman' : 'Space Pacman';
  const tSubtitle = currentLang === 'es' ? 'Módulo Recreativo Core v1.0a' : 'Core Recreational Module v1.0a';
  const tHeader = currentLang === 'es' ? 'SIMULADOR RETRO ARCADE' : 'RETRO ARCADE SIMULATOR';
  const tInstructions = currentLang === 'es' ? '🎮 CONTRÓLALO CON LAS TECLAS DE DIRECCIÓN (FLECHAS / WASD)' : '🎮 CONTROL WITH DIRECTIONAL KEYS (ARROWS / WASD)';
  const tRestart = currentLang === 'es' ? 'REINICIAR JUEGO' : 'RESTART GAME';

  panelContent.innerHTML = `
    <div class="panel-header">
      <span class="panel-planet-icon">🌕</span>
      <div>
        <div class="panel-title">${tTitle}</div>
        <div class="panel-subtitle">${tSubtitle}</div>
      </div>
    </div>

    <div class="terminal-header">
      <span>${tHeader}</span>
      <span class="status blink-fast" style="color:var(--accent-green)">📡 GAME_ACTIVE</span>
    </div>

    <div class="game-container">
      <div class="game-ui">
        <div class="score-box">SCORE: <span id="game-score">0000</span></div>
        <div class="high-score-box">HIGH: <span id="game-highscore">0000</span></div>
      </div>
      <canvas id="pacman-canvas" width="360" height="360"></canvas>
      <div class="game-instructions">
        <span>${tInstructions}</span>
        <button id="restart-game-btn" class="hud-btn" style="margin-top:10px; width:100%; justify-content:center;">${tRestart}</button>
      </div>
    </div>
  `;
  panel.classList.add('active');
  panelOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  initPacmanGame();
}

function openSpaceInvaders() {
  const tTitle = currentLang === 'es' ? 'Space Invaders' : 'Space Invaders';
  const tSubtitle = currentLang === 'es' ? 'Módulo de Defensa Orbital v1.0' : 'Orbital Defense Module v1.0';
  const tHeader = currentLang === 'es' ? 'SISTEMA TACTICO DE DEFENSA' : 'TACTICAL DEFENSE SYSTEM';
  const tInstructions = currentLang === 'es' ? '🎮 TECLAS: ◀ ▶ / A D PARA MOVER · ESPACIO PARA DISPARAR' : '🎮 KEYS: ◀ ▶ / A D TO MOVE · SPACE TO SHOOT';
  const tRestart = currentLang === 'es' ? 'REINICIAR JUEGO' : 'RESTART GAME';
  const tShoot = currentLang === 'es' ? 'FUEGO' : 'SHOOT';

  panelContent.innerHTML = `
    <div class="panel-header">
      <span class="panel-planet-icon">🚀</span>
      <div>
        <div class="panel-title">${tTitle}</div>
        <div class="panel-subtitle">${tSubtitle}</div>
      </div>
    </div>

    <div class="terminal-header">
      <span>${tHeader}</span>
      <span class="status blink-fast" style="color:var(--accent-green)">📡 GAME_ACTIVE</span>
    </div>

    <div class="game-container">
      <div class="game-ui">
        <div class="score-box">SCORE: <span id="game-score">0000</span></div>
        <div class="high-score-box">HIGH: <span id="game-highscore">0000</span></div>
      </div>
      <canvas id="invaders-canvas" width="360" height="360"></canvas>
      <div class="mobile-game-controls">
        <button id="btn-invaders-left" class="game-ctrl-btn">◀</button>
        <button id="btn-invaders-shoot" class="game-ctrl-btn shoot-btn">${tShoot}</button>
        <button id="btn-invaders-right" class="game-ctrl-btn">▶</button>
      </div>
      <div class="game-instructions">
        <span>${tInstructions}</span>
        <button id="restart-game-btn" class="hud-btn" style="margin-top:10px; width:100%; justify-content:center;">${tRestart}</button>
      </div>
    </div>
  `;
  panel.classList.add('active');
  panelOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  initInvadersGame();
}

function closePanel() {
  panel.classList.remove('active');
  panel.classList.remove('cv-panel');
  panelOverlay.classList.remove('active');
  document.body.style.overflow = '';
  destroyPacmanGame();
  destroyInvadersGame();
  
  // Clear the inner HTML after transition ends to avoid background rendering/iframe bugs in Safari
  setTimeout(() => {
    if (!panel.classList.contains('active')) {
      panelContent.innerHTML = '';
    }
  }, 400);
}

panelClose.addEventListener('click', closePanel);
panelOverlay.addEventListener('click', closePanel);

// Keyboard ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePanel();
});

// ---- Tooltip ----
function showTooltip(def, x, y) {
  tooltip.textContent = `${def.emoji} ${def.name} — ${def.hint}`;
  tooltip.classList.add('visible');

  // Position tooltip near cursor but within viewport
  const pad = 12;
  const tw = tooltip.offsetWidth || 180;
  const th = tooltip.offsetHeight || 32;
  let tx = x + 16;
  let ty = y - 40;
  if (tx + tw > window.innerWidth - pad) tx = x - tw - 16;
  if (ty < pad) ty = y + 16;
  tooltip.style.left = tx + 'px';
  tooltip.style.top  = ty + 'px';
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

// ---- Planet Labels ----
function createLabels() {
  labelsWrap.innerHTML = '';
  labelEls = {};
  const t = TRANSLATIONS[currentLang];
  
  t.planets.forEach(def => {
    const el = document.createElement('div');
    el.className = 'planet-label';
    el.id = `label-${def.id}`;
    
    const isSun = def.isSun;
    
    el.innerHTML = `
      <div class="hud-planet-tag tag-${def.id} ${isSun ? 'is-sun' : ''}">
        <span class="label-emoji">${def.emoji}</span>
        <span class="label-designation">${def.designation}</span>
        <span class="label-name">${def.name}</span>
        ${!isSun ? `
          <div class="tag-telemetry">
            <span class="telemetry-item telemetry-dist">R: -- AU</span>
            <span class="telemetry-item telemetry-vel">V: -- km/s</span>
          </div>
        ` : `
          <div class="tag-telemetry">
            <span class="telemetry-item">STATUS: CORE</span>
            <span class="telemetry-item">TEMP: 5.7k K</span>
          </div>
        `}
      </div>
    `;
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (solar && solar.focusPlanetId === def.id) {
        if (def.isSun) {
          openPanel('about');
        } else {
          openPanel(def.section);
        }
      } else {
        solar?.focusPlanet(def.id);
      }
    });
    labelsWrap.appendChild(el);
    labelEls[def.id] = el;
  });

  // Create education moon label (Pacman)
  const moonEl = document.createElement('div');
  moonEl.className = 'planet-label';
  moonEl.id = 'label-education-moon';
  moonEl.innerHTML = `
    <div class="hud-planet-tag moon-tag">
      <span class="label-emoji">🕹️</span>
      <span class="label-designation">SIM-LUNA</span>
      <span class="label-name">Pacman</span>
    </div>
  `;
  moonEl.style.cursor = 'pointer';
  moonEl.addEventListener('click', (e) => {
    e.stopPropagation();
    openSpacePacman();
  });
  labelsWrap.appendChild(moonEl);
  labelEls['education-moon'] = moonEl;

  // Create asteroid label (CV download)
  const asteroidEl = document.createElement('div');
  asteroidEl.className = 'planet-label';
  asteroidEl.id = 'label-asteroid';
  const labelCvText = currentLang === 'es' ? 'ARMAGEDON' : 'ARMAGEDDON';
  const downloadPdfText = currentLang === 'es' ? '▼ DESCARGAR PDF' : '▼ DOWNLOAD PDF';
  asteroidEl.innerHTML = `
    <div class="hud-planet-tag asteroid-tag">
      <span class="label-emoji">☄️</span>
      <span class="label-designation">CV</span>
      <span class="label-name">${labelCvText}</span>
      <div class="tag-telemetry">
        <span class="telemetry-item" style="color: var(--accent-gold);">${downloadPdfText}</span>
      </div>
    </div>
  `;
  asteroidEl.style.cursor = 'pointer';
  asteroidEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (solar && solar.focusPlanetId === 'asteroid') {
      openPanel('cv');
    } else {
      solar?.focusPlanet('asteroid');
    }
  });
  labelsWrap.appendChild(asteroidEl);
  labelEls['asteroid'] = asteroidEl;

  // Create spaceship label (Space Invaders)
  const spaceshipEl = document.createElement('div');
  spaceshipEl.className = 'planet-label';
  spaceshipEl.id = 'label-spaceship';
  const labelNaveText = currentLang === 'es' ? 'Space Invaders' : 'Space Invaders';
  spaceshipEl.innerHTML = `
    <div class="hud-planet-tag moon-tag spaceship-tag" style="border-color: rgba(0, 212, 255, 0.45);">
      <span class="label-emoji">🚀</span>
      <span class="label-designation">SIM-NAVE</span>
      <span class="label-name">${labelNaveText}</span>
    </div>
  `;
  spaceshipEl.style.cursor = 'pointer';
  spaceshipEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (solar && solar.focusPlanetId === 'spaceship') {
      openSpaceInvaders();
    } else {
      solar?.focusPlanet('spaceship');
    }
  });
  labelsWrap.appendChild(spaceshipEl);
  labelEls['spaceship'] = spaceshipEl;
}

function updateLabels() {
  if (!solar) return;
  const positions = solar.getAllPlanetScreenPositions();
  positions.forEach(({ id, x, y, z, distance, velocity }) => {
    const el = labelEls[id];
    if (!el) return;

    // Hide labels that are behind the camera or off-screen
    if (z > 1 || x < -100 || x > window.innerWidth + 100 ||
        y < -100 || y > window.innerHeight + 100) {
      el.style.opacity = '0';
      return;
    }

    const t = TRANSLATIONS[currentLang];
    const def = t.planets.find(p => p.id === id);
    const offset = (def?.size || 1) * 20 + 26; // px offset below planet
    el.style.left = x + 'px';
    el.style.top  = (y + offset) + 'px';
    el.style.opacity = '1';

    // Update real-time values
    if (def && !def.isSun) {
      const distEl = el.querySelector('.telemetry-dist');
      const velEl = el.querySelector('.telemetry-vel');
      if (distEl) {
        distEl.textContent = `R: ${(distance * 0.1).toFixed(3)} AU`;
      }
      if (velEl) {
        velEl.textContent = `V: ${velocity.toFixed(2)} km/s`;
      }
    }
  });

  // Update moon label position
  const moonPos = solar.getPlanetScreenPos('education-moon');
  const moonEl = labelEls['education-moon'];
  if (moonEl && moonPos) {
    const { x, y, z } = moonPos;
    if (z > 1 || x < -100 || x > window.innerWidth + 100 ||
        y < -100 || y > window.innerHeight + 100) {
      moonEl.style.opacity = '0';
    } else {
      const offset = 14; // offset below moon sphere
      moonEl.style.left = x + 'px';
      moonEl.style.top  = (y + offset) + 'px';
      moonEl.style.opacity = '0.85';
    }
  }

  // Update asteroid label position
  const asteroidPos = solar.getAsteroidScreenPos?.();
  const asteroidEl = labelEls['asteroid'];
  if (asteroidEl && asteroidPos) {
    const { x, y, z } = asteroidPos;
    if (z > 1 || x < -100 || x > window.innerWidth + 100 ||
        y < -100 || y > window.innerHeight + 100) {
      asteroidEl.style.opacity = '0';
    } else {
      asteroidEl.style.left = x + 'px';
      asteroidEl.style.top  = (y + 22) + 'px';
      asteroidEl.style.opacity = '0.9';
    }
  }

  // Update spaceship label position
  const spaceshipPos = solar.getPlanetScreenPos('spaceship');
  const spaceshipEl = labelEls['spaceship'];
  if (spaceshipEl && spaceshipPos) {
    const { x, y, z } = spaceshipPos;
    if (z > 1 || x < -100 || x > window.innerWidth + 100 ||
        y < -100 || y > window.innerHeight + 100) {
      spaceshipEl.style.opacity = '0';
    } else {
      spaceshipEl.style.left = x + 'px';
      spaceshipEl.style.top  = (y + 18) + 'px';
      spaceshipEl.style.opacity = '0.9';
    }
  }

  // Update floating telemetry focus card real-time values
  if (solar && solar.focusPlanetId) {
    const focusId = solar.focusPlanetId;
    const focusPos = solar.getPlanetScreenPos(focusId);
    if (focusPos) {
      const { distance, velocity } = focusPos;
      const rEl = document.getElementById('telemetry-stat-r');
      const vEl = document.getElementById('telemetry-stat-v');
      
      const isSun = focusId === 'about';
      if (rEl) {
        rEl.textContent = isSun ? "0.000 AU" : `${(distance * 0.1).toFixed(3)} AU`;
      }
      if (vEl) {
        vEl.textContent = isSun ? "0.00 km/s" : `${velocity.toFixed(2)} km/s`;
      }
    }
  }

  labelAnimId = requestAnimationFrame(updateLabels);
}

// ---- i18n Core Updates ----
function updateUILanguage() {
  const t = TRANSLATIONS[currentLang];
  const ui = t.ui;

  // 1. Update text of toggle button to show the target language
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  if (langToggleBtn) {
    langToggleBtn.textContent = currentLang === 'es' ? 'EN' : 'ES';
  }

  // 2. Update static HTML strings
  const loaderTextVal = document.getElementById('loader-text-val');
  if (loaderTextVal) loaderTextVal.textContent = ui.loaderText;

  const sectorLabel = document.getElementById('hud-sector-label');
  if (sectorLabel) sectorLabel.textContent = ui.sectorLabel;
  const sectorValue = document.getElementById('hud-sector');
  if (sectorValue) sectorValue.textContent = ui.sectorValue;

  const systemStatus = document.getElementById('hud-system-status');
  if (systemStatus) systemStatus.textContent = ui.systemActive;

  const controlsText = document.getElementById('hud-controls-text');
  if (controlsText) controlsText.textContent = ui.controlsHint;

  const mobileHintText = document.getElementById('mobile-hint-text');
  if (mobileHintText) mobileHintText.textContent = ui.mobileHint;

  const connectionStatus = document.getElementById('telemetry-connection-status');
  if (connectionStatus) {
    connectionStatus.innerHTML = `<span class="pulse-dot"></span> ${ui.telemetryStatus}`;
  }

  const lblDist = document.getElementById('telemetry-lbl-dist');
  if (lblDist) lblDist.textContent = ui.telemetryDist;
  const lblVel = document.getElementById('telemetry-lbl-vel');
  if (lblVel) lblVel.textContent = ui.telemetryVel;

  const lblFocus = document.getElementById('hud-lbl-focus');
  if (lblFocus) lblFocus.textContent = currentLang === 'es' ? 'ENFOQUE:' : 'FOCUS:';

  // 3. Update top-center navigation console button labels
  const navBtns = document.querySelectorAll('.nav-console-btn');
  navBtns.forEach(btn => {
    const focusId = btn.getAttribute('data-focus');
    const tDef = t.planets.find(p => p.id === focusId);
    if (tDef) {
      btn.textContent = `${tDef.designation} // ${tDef.name.toUpperCase()}`;
    }
  });

  // 4. Update dropdown selector options if exists
  const focusSelect = document.getElementById('cameraFocusSelect');
  if (focusSelect) {
    focusSelect.innerHTML = t.planets.map(p => {
      const display = p.isSun ? `${p.designation} (${p.name})` : p.name;
      return `<option value="${p.id}">${display.toUpperCase()}</option>`;
    }).join('');
    if (solar) {
      focusSelect.value = solar.focusPlanetId;
    }
  }

  // 5. Re-create labels for the 3D scene (updating names and telemetry structure)
  createLabels();

  // 6. Refresh current focus card details
  if (solar) {
    updateTelemetryCard(solar.focusPlanetId);
  }

  // 7. Refresh side panel content if currently active
  if (panel.classList.contains('active')) {
    const activeSection = panel.classList.contains('cv-panel') ? 'cv' : (solar ? solar.focusPlanetId : 'about');
    const isPacman = document.querySelector('#pacman-canvas') !== null;
    const isInvaders = document.querySelector('#invaders-canvas') !== null;
    
    if (!isPacman && !isInvaders) {
      const renderer = PANEL_RENDERERS[activeSection];
      if (renderer) {
        panelContent.innerHTML = renderer(t);
        if (activeSection === 'skills') {
          animateSkillBars(panelContent);
        }
      }
    } else if (isPacman) {
      // Re-translate Pacman static strings
      const gameTitle = document.querySelector('.panel-title');
      const gameSubtitle = document.querySelector('.panel-subtitle');
      const retroArcade = document.querySelector('.terminal-header span');
      const instructions = document.querySelector('.game-instructions span');
      const restartBtn = document.getElementById('restart-game-btn');
      
      if (gameTitle) gameTitle.textContent = currentLang === 'es' ? 'Space Pacman' : 'Space Pacman';
      if (gameSubtitle) gameSubtitle.textContent = currentLang === 'es' ? 'Módulo Recreativo Core v1.0a' : 'Core Recreational Module v1.0a';
      if (retroArcade) retroArcade.textContent = currentLang === 'es' ? 'SIMULADOR RETRO ARCADE' : 'RETRO ARCADE SIMULATOR';
      if (instructions) instructions.textContent = currentLang === 'es' ? '🎮 CONTRÓLALO CON LAS TECLAS DE DIRECCIÓN (FLECHAS / WASD)' : '🎮 CONTROL WITH DIRECTIONAL KEYS (ARROWS / WASD)';
      if (restartBtn) restartBtn.textContent = currentLang === 'es' ? 'REINICIAR JUEGO' : 'RESTART GAME';
    } else if (isInvaders) {
      // Re-translate Invaders static strings
      const gameTitle = document.querySelector('.panel-title');
      const gameSubtitle = document.querySelector('.panel-subtitle');
      const retroArcade = document.querySelector('.terminal-header span');
      const instructions = document.querySelector('.game-instructions span');
      const restartBtn = document.getElementById('restart-game-btn');
      const shootBtn = document.getElementById('btn-invaders-shoot');
      
      if (gameTitle) gameTitle.textContent = currentLang === 'es' ? 'Space Invaders' : 'Space Invaders';
      if (gameSubtitle) gameSubtitle.textContent = currentLang === 'es' ? 'Módulo de Defensa Orbital v1.0' : 'Orbital Defense Module v1.0';
      if (retroArcade) retroArcade.textContent = currentLang === 'es' ? 'SISTEMA TACTICO DE DEFENSA' : 'TACTICAL DEFENSE SYSTEM';
      if (instructions) instructions.textContent = currentLang === 'es' ? '🎮 TECLAS: ◀ ▶ / A D PARA MOVER · ESPACIO PARA DISPARAR' : '🎮 KEYS: ◀ ▶ / A D TO MOVE · SPACE TO SHOOT';
      if (restartBtn) restartBtn.textContent = currentLang === 'es' ? 'REINICIAR JUEGO' : 'RESTART GAME';
      if (shootBtn) shootBtn.textContent = currentLang === 'es' ? 'FUEGO' : 'SHOOT';
    }
  }
}

// Setup language switcher click events
function setupLanguageSwitcher() {
  const btn = document.getElementById('lang-toggle-btn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentLang = currentLang === 'es' ? 'en' : 'es';
      localStorage.setItem('portfolio-lang', currentLang);
      updateUILanguage();
    });
  }
}

// ---- Init ----
function init() {
  // Setup language toggle buttons
  setupLanguageSwitcher();

  // Perform initial i18n strings pass
  updateUILanguage();

  solar = new SolarSystem(
    canvasWrap,
    // onPlanetClick
    (planetId) => {
      if (solar && solar.focusPlanetId === planetId) {
        // Already focused, open details panel
        const t = TRANSLATIONS[currentLang];
        const def = t.planets.find(p => p.id === planetId);
        if (def) openPanel(def.section);
      } else {
        // First click just focuses the planet
        solar?.focusPlanet(planetId);
      }
    },
    // onPlanetHover
    (def, x, y) => {
      if (def) {
        if (def.id === 'asteroid') {
          const name = currentLang === 'es' ? 'CV ARMAGEDON' : 'CV ARMAGEDDON';
          const hint = currentLang === 'es' ? 'Descarga mi Curriculum Vitae' : 'Download my Curriculum Vitae';
          showTooltip({ emoji: '☄️', name, hint }, x, y);
        } else if (def.id === 'moon') {
          const name = currentLang === 'es' ? 'Luna de Júpiter' : 'Jovian Moon';
          const hint = currentLang === 'es' ? '¡Click para jugar Space Pacman!' : 'Click to play Space Pacman!';
          showTooltip({ emoji: '🌕', name, hint }, x, y);
        } else if (def.id === 'spaceship') {
          const name = currentLang === 'es' ? 'Nave Espacial' : 'Spaceship';
          const hint = currentLang === 'es' ? '¡Click para jugar Space Invaders!' : 'Click to play Space Invaders!';
          showTooltip({ emoji: '🚀', name, hint }, x, y);
        } else {
          const t = TRANSLATIONS[currentLang];
          const tDef = t.planets.find(p => p.id === def.planetId || p.id === def.id);
          if (tDef) {
            showTooltip({ emoji: def.emoji || tDef.emoji, name: tDef.name, hint: tDef.hint }, x, y);
          } else {
            showTooltip(def, x, y);
          }
        }
      } else {
        hideTooltip();
      }
    },
    // onMoonClick
    (parentPlanetId) => {
      openSpacePacman();
    }
  );

  // Asteroid CV click handler — focus or open panel
  solar.onAsteroidClick = () => {
    if (solar && solar.focusPlanetId === 'asteroid') {
      openPanel('cv');
    } else {
      solar?.focusPlanet('asteroid');
    }
  };

  // Spaceship Space Invaders click handler — focus or open panel
  solar.onSpaceshipClick = () => {
    if (solar && solar.focusPlanetId === 'spaceship') {
      openSpaceInvaders();
    } else {
      solar?.focusPlanet('spaceship');
    }
  };

  updateLabels();

  // Focus Selector HUD interaction
  const focusSelect = document.getElementById('cameraFocusSelect');
  const consoleBtns = document.querySelectorAll('.nav-console-btn');
  
  // Console buttons listeners
  consoleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const focusId = btn.getAttribute('data-focus');
      solar?.focusPlanet(focusId);
    });
  });

  if (focusSelect) {
    focusSelect.addEventListener('change', (e) => {
      solar?.focusPlanet(e.target.value);
    });
    window.syncFocusDropdown = (planetId) => {
      focusSelect.value = planetId;
      
      // Update active class on top-center console buttons
      consoleBtns.forEach(btn => {
        if (btn.getAttribute('data-focus') === planetId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      
      // Update telemetry card
      updateTelemetryCard(planetId);
    };
  }

  // Reset camera button
  resetBtn.addEventListener('click', () => {
    solar?.resetCamera();
  });

  // Initialize first view telemetry card
  updateTelemetryCard('about');

  // Hide loader
  setTimeout(() => {
    loader.classList.add('hidden');
  }, 1200);
}

// Start when fonts are loaded
if (document.fonts) {
  document.fonts.ready.then(() => {
    init();
    window.openPanel = openPanel;
    window.closePanel = closePanel;
    window.openSpacePacman = openSpacePacman;
    window.openSpaceInvaders = openSpaceInvaders;
  });
} else {
  window.addEventListener('load', () => {
    init();
    window.openPanel = openPanel;
    window.closePanel = closePanel;
    window.openSpacePacman = openSpacePacman;
    window.openSpaceInvaders = openSpaceInvaders;
  });
}
