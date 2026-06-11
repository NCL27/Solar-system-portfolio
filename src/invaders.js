// invaders.js — Retro Space Invaders clone with persistent Highscore and touch support

let canvas, ctx;
let gameInterval = null;

// Game State variables
let score = 0;
let highscore = parseInt(localStorage.getItem('invaders-highscore')) || 0;
let lives = 3;
let level = 1;
let gameOver = false;
let gameWon = false;

// Entities
let player = {
  x: 165,
  y: 320,
  width: 30,
  height: 16,
  speed: 4.5,
};

let bullets = [];      // Player bullets: { x, y, width: 2, height: 10 }
let alienBullets = []; // Alien bullets: { x, y, width: 2, height: 8 }
let aliens = [];       // Aliens: { x, y, width: 20, height: 14, type: 0/1/2, points: 10/20/30, alive: true, animFrame: 0 }
let bunkers = [];      // Destructible block fragments: { x, y, width: 6, height: 6, alive: true }
let stars = [];        // Star background particles: { x, y, size, speed }

// Alien grid movement variables
let alienDirection = 1; // 1 = right, -1 = left
let alienSpeed = 0.5;
let alienMoveTimer = 0;
let alienMoveInterval = 25; // tick frames between movements (slower/faster depending on remaining count)
let alienFireProbability = 0.015; // chances per frame that some alien shoots

let keysPressed = {};
let touchLeft = false;
let touchRight = false;
let touchShoot = false;
let lastShotTime = 0;

// Setup star background
function initStars() {
  stars = [];
  for (let i = 0; i < 35; i++) {
    stars.push({
      x: Math.random() * 360,
      y: Math.random() * 360,
      size: 1 + Math.random() * 2,
      speed: 0.2 + Math.random() * 0.6,
    });
  }
}

// Generate aliens grid
function initAliens() {
  aliens = [];
  const rows = 4;
  const cols = 8;
  const startX = 40;
  const startY = 40;
  const spacingX = 32;
  const spacingY = 24;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let type = 0;
      let points = 10;
      if (r === 0) { type = 2; points = 30; } // top row: 30pts
      else if (r < 3) { type = 1; points = 20; } // mid rows: 20pts

      aliens.push({
        x: startX + c * spacingX,
        y: startY + r * spacingY,
        width: 20,
        height: 14,
        type,
        points,
        alive: true,
        animFrame: 0,
      });
    }
  }
  alienDirection = 1;
  alienSpeed = 0.5 + level * 0.15;
}

// Generate destructible shield bunkers
function initBunkers() {
  bunkers = [];
  const bunkerX = [50, 165, 275]; // X center for the three bunkers
  const bunkerY = 270;

  bunkerX.forEach(bx => {
    // Generate a small archway shape made of 6x6 pixel blocks
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        // Skip middle hollow arch space
        if (row === 3 && (col === 2 || col === 3)) continue;

        bunkers.push({
          x: bx - 18 + col * 6,
          y: bunkerY + row * 6,
          width: 6,
          height: 6,
          alive: true,
        });
      }
    }
  });
}

// Collisions bounding boxes
function rectIntersect(r1, r2) {
  return r1.x < r2.x + r2.width &&
         r1.x + r1.width > r2.x &&
         r1.y < r2.y + r2.height &&
         r1.y + r1.height > r2.y;
}

// Reset state
function resetInvadersGame() {
  score = 0;
  lives = 3;
  level = 1;
  gameOver = false;
  gameWon = false;
  bullets = [];
  alienBullets = [];
  
  player.x = 165;
  player.y = 320;
  
  initStars();
  initAliens();
  initBunkers();
  updateUI();
}

function updateUI() {
  const scoreEl = document.getElementById('game-score');
  const highscoreEl = document.getElementById('game-highscore');
  if (scoreEl) scoreEl.textContent = String(score).padStart(4, '0');
  if (highscoreEl) highscoreEl.textContent = String(highscore).padStart(4, '0');
}

function spawnNextLevel() {
  level++;
  bullets = [];
  alienBullets = [];
  player.x = 165;
  initAliens();
  initBunkers();
}

// Update game physics and input
function updateGame() {
  if (gameOver || gameWon) return;

  // Update stars background
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > 360) {
      s.y = 0;
      s.x = Math.random() * 360;
    }
  });

  // Handle player inputs (Keyboard WASD/arrows + Touch controls)
  if (keysPressed['ArrowLeft'] || keysPressed['a'] || touchLeft) {
    player.x = Math.max(10, player.x - player.speed);
  }
  if (keysPressed['ArrowRight'] || keysPressed['d'] || touchRight) {
    player.x = Math.min(350 - player.width, player.x + player.speed);
  }
  if ((keysPressed[' '] || touchShoot) && Date.now() - lastShotTime > 400) {
    bullets.push({
      x: player.x + player.width / 2 - 1,
      y: player.y - 8,
      width: 2,
      height: 10,
    });
    lastShotTime = Date.now();
  }

  // Update player lasers
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y -= 6;
    if (b.y < 0) {
      bullets.splice(i, 1);
    }
  }

  // Update alien lasers
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    const ab = alienBullets[i];
    ab.y += 3.5;
    if (ab.y > 360) {
      alienBullets.splice(i, 1);
    }
  }

  // Update aliens movement
  alienMoveTimer++;
  let aliveAliens = aliens.filter(a => a.alive);
  if (aliveAliens.length === 0) {
    spawnNextLevel();
    return;
  }

  // Adjust alien speed interval based on how many are remaining
  let activeInterval = Math.max(2, Math.floor(alienMoveInterval * (aliveAliens.length / 32)));

  if (alienMoveTimer >= activeInterval) {
    alienMoveTimer = 0;
    let shiftDown = false;

    // Check bounds
    aliveAliens.forEach(a => {
      a.animFrame = 1 - a.animFrame; // toggle sprite frame
      let nextX = a.x + alienDirection * alienSpeed * 10;
      if (nextX <= 10 || nextX + a.width >= 350) {
        shiftDown = true;
      }
    });

    if (shiftDown) {
      alienDirection *= -1;
      aliveAliens.forEach(a => {
        a.y += 14;
        // Check if aliens reached player level
        if (a.y + a.height >= player.y) {
          gameOver = true;
        }
      });
    } else {
      aliveAliens.forEach(a => {
        a.x += alienDirection * alienSpeed * 10;
      });
    }
  }

  // Aliens shooting back
  if (Math.random() < alienFireProbability && aliveAliens.length > 0) {
    // Choose a random alien to fire from
    const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
    // Make sure no alien is directly under it to look realistic
    const blockUnder = aliveAliens.some(a => a !== shooter && Math.abs(a.x - shooter.x) < 10 && a.y > shooter.y);
    if (!blockUnder) {
      alienBullets.push({
        x: shooter.x + shooter.width / 2 - 1,
        y: shooter.y + shooter.height,
        width: 2,
        height: 8,
      });
    }
  }

  // Check bullet collisions (Player bullets vs Aliens)
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    let hit = false;
    for (let j = 0; j < aliens.length; j++) {
      const a = aliens[j];
      if (a.alive && rectIntersect(b, a)) {
        a.alive = false;
        score += a.points;
        if (score > highscore) {
          highscore = score;
          localStorage.setItem('invaders-highscore', highscore);
        }
        updateUI();
        hit = true;
        break;
      }
    }
    if (hit) {
      bullets.splice(i, 1);
    }
  }

  // Bullet collisions vs Bunkers (both player and alien bullets damage bunkers)
  bunkers.filter(bk => bk.alive).forEach(bk => {
    // Player bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (rectIntersect(bullets[i], bk)) {
        bk.alive = false;
        bullets.splice(i, 1);
        return; // handle next block
      }
    }
    // Alien bullets
    for (let i = alienBullets.length - 1; i >= 0; i--) {
      if (rectIntersect(alienBullets[i], bk)) {
        bk.alive = false;
        alienBullets.splice(i, 1);
        return;
      }
    }
  });

  // Check alien bullets vs Player
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    const ab = alienBullets[i];
    if (rectIntersect(ab, player)) {
      alienBullets.splice(i, 1);
      lives--;
      if (lives <= 0) {
        gameOver = true;
      }
      break;
    }
  }
}

// Draw game frame
function drawGame() {
  if (!ctx || !canvas) return;

  // Clear canvas
  ctx.fillStyle = '#050c18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw stars
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  stars.forEach(s => {
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  // Draw bunkers (shields)
  ctx.fillStyle = '#00ff88'; // green shield blocks
  bunkers.forEach(bk => {
    if (bk.alive) {
      ctx.fillRect(bk.x, bk.y, bk.width, bk.height);
    }
  });

  // Draw player spaceship
  ctx.fillStyle = '#00d4ff'; // cyan player
  // Body
  ctx.fillRect(player.x, player.y + 6, player.width, player.height - 6);
  // Nose tip
  ctx.fillRect(player.x + player.width / 2 - 4, player.y, 8, 6);
  // Turret tip
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(player.x + player.width / 2 - 1, player.y - 2, 2, 2);

  // Draw player bullets
  ctx.fillStyle = '#ffff55';
  bullets.forEach(b => {
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });

  // Draw alien bullets
  ctx.fillStyle = '#ff5533';
  alienBullets.forEach(ab => {
    ctx.fillRect(ab.x, ab.y, ab.width, ab.height);
  });

  // Draw aliens (custom vector look)
  aliens.forEach(a => {
    if (!a.alive) return;
    
    if (a.type === 2) ctx.fillStyle = '#ff44aa'; // pink top row
    else if (a.type === 1) ctx.fillStyle = '#f5a623'; // gold mid rows
    else ctx.fillStyle = '#6c63ff'; // indigo base rows

    // Draw retro blocky alien shapes depending on type and animation frame
    ctx.fillRect(a.x + 2, a.y + 2, a.width - 4, a.height - 4);
    
    // Draw tiny eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(a.x + 5, a.y + 5, 2, 2);
    ctx.fillRect(a.x + a.width - 7, a.y + 5, 2, 2);
    
    // Draw legs depending on animation frame
    if (a.type === 0) {
      ctx.fillStyle = '#6c63ff';
      if (a.animFrame === 0) {
        ctx.fillRect(a.x, a.y + a.height - 3, 3, 3);
        ctx.fillRect(a.x + a.width - 3, a.y + a.height - 3, 3, 3);
      } else {
        ctx.fillRect(a.x + 3, a.y + a.height - 3, 3, 3);
        ctx.fillRect(a.x + a.width - 6, a.y + a.height - 3, 3, 3);
      }
    }
  });

  // Draw lives indicator
  ctx.fillStyle = '#00d4ff';
  ctx.font = "0.55rem 'Space Mono', monospace";
  ctx.fillText("LIVES: ", 12, 350);
  for (let i = 0; i < lives; i++) {
    ctx.fillRect(48 + i * 15, 344, 10, 6);
  }

  // Draw current level
  ctx.fillStyle = 'var(--text-secondary)';
  ctx.font = "0.55rem 'Space Mono', monospace";
  ctx.fillText("LEVEL: " + level, 305, 350);

  // Overlay screen for Game Over or Win
  if (gameOver) {
    ctx.fillStyle = 'rgba(2, 6, 16, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "1.1rem 'Space Mono', monospace";
    ctx.fillStyle = '#ff3333';
    ctx.textAlign = 'center';
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 15);

    ctx.font = "0.75rem 'Space Mono', monospace";
    ctx.fillStyle = 'var(--text-secondary)';
    ctx.fillText("FINAL SCORE: " + score, canvas.width / 2, canvas.height / 2 + 15);
    ctx.fillText("PULSA 'REINICIAR' PARA INTENTARLO", canvas.width / 2, canvas.height / 2 + 35);
  }
}

// Game Loop Tick
function gameTick() {
  updateGame();
  drawGame();
}

// Bind mobile touch actions
function setupTouchEvents() {
  const leftBtn = document.getElementById('btn-invaders-left');
  const rightBtn = document.getElementById('btn-invaders-right');
  const shootBtn = document.getElementById('btn-invaders-shoot');

  if (leftBtn) {
    leftBtn.addEventListener('touchstart', e => { e.preventDefault(); touchLeft = true; });
    leftBtn.addEventListener('touchend', e => { e.preventDefault(); touchLeft = false; });
    leftBtn.addEventListener('mousedown', () => touchLeft = true);
    leftBtn.addEventListener('mouseup', () => touchLeft = false);
    leftBtn.addEventListener('mouseleave', () => touchLeft = false);
  }
  if (rightBtn) {
    rightBtn.addEventListener('touchstart', e => { e.preventDefault(); touchRight = true; });
    rightBtn.addEventListener('touchend', e => { e.preventDefault(); touchRight = false; });
    rightBtn.addEventListener('mousedown', () => touchRight = true);
    rightBtn.addEventListener('mouseup', () => touchRight = false);
    rightBtn.addEventListener('mouseleave', () => touchRight = false);
  }
  if (shootBtn) {
    shootBtn.addEventListener('touchstart', e => { e.preventDefault(); touchShoot = true; });
    shootBtn.addEventListener('touchend', e => { e.preventDefault(); touchShoot = false; });
    shootBtn.addEventListener('mousedown', () => touchShoot = true);
    shootBtn.addEventListener('mouseup', () => touchShoot = false);
    shootBtn.addEventListener('mouseleave', () => touchShoot = false);
  }
}

// PUBLIC API
export function initInvadersGame() {
  // Stop existing loop
  if (gameInterval) clearInterval(gameInterval);

  canvas = document.getElementById('invaders-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  // Reset
  resetInvadersGame();
  setupTouchEvents();

  // Bind Keyboard Listeners - safely remove duplicate events first
  keysPressed = {};
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Hook restart button
  const restartBtn = document.getElementById('restart-game-btn');
  if (restartBtn) {
    restartBtn.onclick = () => initInvadersGame();
  }

  // Start loop
  gameInterval = setInterval(gameTick, 1000 / 60);
}

function handleKeyDown(e) {
  // Prevent window scroll on arrow keys or space when panel is active
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)) {
    const isPanelActive = document.getElementById('panel').classList.contains('active');
    if (isPanelActive) e.preventDefault();
  }
  keysPressed[e.key] = true;
  keysPressed[e.key.toLowerCase()] = true;
}

function handleKeyUp(e) {
  keysPressed[e.key] = false;
  keysPressed[e.key.toLowerCase()] = false;
}

export function destroyInvadersGame() {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
}
