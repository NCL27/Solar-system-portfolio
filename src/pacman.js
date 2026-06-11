// pacman.js — Space Pacman Game Engine (retro canvas implementation)
// Pacman is the Sun, and Ghosts are the planets (Mars, Venus, Neptune, Jupiter)

let gameInterval = null;
let canvas = null;
let ctx = null;

// Game stats
let score = 0;
let highscore = localStorage.getItem('space_pacman_highscore') || 0;
let lives = 3;
let gameOver = false;
let gameWon = false;
let level = 1;

// Tile size and layout
const TILE_SIZE = 24;
const GRID_COLS = 15;
const GRID_ROWS = 15;

// Map template: 1 = Wall, 2 = Star (dot), 3 = Supernova (power pellet), 0 = Path, 4 = Spawner
// Side portals at row 7 (wrap around)
let currentMap = [];
const MAP_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,2,2,1,2,2,2,2,2,3,1],
  [1,2,1,1,2,1,2,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,2,1,0,0,0,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,1,2,1,0,0,0], // Warp tunnel row
  [1,1,1,1,2,1,1,1,1,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,1,1,2,1,1,2,1],
  [1,2,2,1,2,2,2,1,2,2,2,1,2,2,1],
  [1,1,2,1,1,1,2,1,2,1,1,1,2,1,1],
  [1,3,2,2,2,2,2,2,2,2,2,2,2,3,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Entities
let pacman = null;
let planets = [];

// Supernova / Frightened State timer
let supernovaTimer = 0;
let supernovaActive = false;

// Directions: 0 = Up, 1 = Right, 2 = Down, 3 = Left, -1 = None
const DIR_X = [0, 1, 0, -1];
const DIR_Y = [-1, 0, 1, 0];

// Game loop control
let keysPressed = {};
let lastFrameTime = 0;
let mouthAngle = 0;
let mouthSpeed = 0.2;

class Pacman {
  constructor() {
    this.reset();
  }

  reset() {
    this.gridX = 7;
    this.gridY = 9;
    this.x = this.gridX * TILE_SIZE + TILE_SIZE / 2;
    this.y = this.gridY * TILE_SIZE + TILE_SIZE / 2;
    this.dir = -1;
    this.nextDir = -1;
    this.speed = 2; // px per frame
  }

  update() {
    // Check if aligned to grid for direction change
    const inCenterX = (this.x - TILE_SIZE / 2) % TILE_SIZE === 0;
    const inCenterY = (this.y - TILE_SIZE / 2) % TILE_SIZE === 0;

    if (inCenterX && inCenterY) {
      this.gridX = Math.floor(this.x / TILE_SIZE);
      this.gridY = Math.floor(this.y / TILE_SIZE);

      // Check next direction
      if (this.nextDir !== -1) {
        const nextGridX = this.gridX + DIR_X[this.nextDir];
        const nextGridY = this.gridY + DIR_Y[this.nextDir];
        if (this.isValidMove(nextGridX, nextGridY)) {
          this.dir = this.nextDir;
          this.nextDir = -1;
        }
      }

      // Check block in current direction
      if (this.dir !== -1) {
        const nextGridX = this.gridX + DIR_X[this.dir];
        const nextGridY = this.gridY + DIR_Y[this.dir];
        if (!this.isValidMove(nextGridX, nextGridY)) {
          this.dir = -1; // stop
        }
      }
    }

    // Perform movement
    if (this.dir !== -1) {
      this.x += DIR_X[this.dir] * this.speed;
      this.y += DIR_Y[this.dir] * this.speed;

      // Wrap-around coordinate clamps
      const minX = -TILE_SIZE / 2;
      const maxX = GRID_COLS * TILE_SIZE + TILE_SIZE / 2;
      if (this.x < minX) {
        this.x = maxX - (minX - this.x);
        this.gridX = GRID_COLS - 1;
      } else if (this.x > maxX) {
        this.x = minX + (this.x - maxX);
        this.gridX = 0;
      }

      // Animate mouth
      mouthAngle += mouthSpeed;
      if (mouthAngle > 0.45 || mouthAngle < 0.05) {
        mouthSpeed = -mouthSpeed;
      }
    } else {
      mouthAngle = 0.2; // default slightly open
    }

    // Collision with items (only when close to center)
    const currentGridX = Math.floor(this.x / TILE_SIZE);
    const currentGridY = Math.floor(this.y / TILE_SIZE);

    if (currentGridX >= 0 && currentGridX < GRID_COLS && currentGridY >= 0 && currentGridY < GRID_ROWS) {
      const tileValue = currentMap[currentGridY][currentGridX];
      if (tileValue === 2) {
        // Star
        currentMap[currentGridY][currentGridX] = 0;
        score += 10;
        checkLevelCleared();
      } else if (tileValue === 3) {
        // Supernova
        currentMap[currentGridY][currentGridX] = 0;
        score += 50;
        triggerSupernova();
        checkLevelCleared();
      }
    }
  }

  isValidMove(gx, gy) {
    // Warp tunnel bounds
    if (gy === 7 && (gx < 0 || gx >= GRID_COLS)) return true;
    if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return false;
    return currentMap[gy][gx] !== 1;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Mouth rotation based on direction
    let angleOffset = 0;
    if (this.dir === 0) angleOffset = -Math.PI / 2; // Up
    else if (this.dir === 2) angleOffset = Math.PI / 2;  // Down
    else if (this.dir === 3) angleOffset = Math.PI;       // Left

    ctx.rotate(angleOffset);

    // Sunglow glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f5a623';

    // Body
    ctx.beginPath();
    ctx.arc(0, 0, TILE_SIZE / 2 - 1, mouthAngle, Math.PI * 2 - mouthAngle);
    ctx.lineTo(0, 0);
    ctx.fillStyle = '#ffdd44'; // Sun Yellow
    ctx.fill();

    // Eye
    ctx.beginPath();
    ctx.arc(1.5, -4, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    ctx.restore();
  }
}

class PlanetGhost {
  constructor(name, color, startX, startY, isRings = false) {
    this.name = name;
    this.color = color;
    this.startX = startX;
    this.startY = startY;
    this.isRings = isRings;
    this.reset();
  }

  reset() {
    this.gridX = this.startX;
    this.gridY = this.startY;
    this.x = this.gridX * TILE_SIZE + TILE_SIZE / 2;
    this.y = this.gridY * TILE_SIZE + TILE_SIZE / 2;
    this.dir = 0; // Up to leave house
    this.speed = 1.5;
    this.state = 'normal'; // normal, frightened, eaten
  }

  changeState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    // Snap to grid to prevent alignment bugs when speed changes
    this.x = this.gridX * TILE_SIZE + TILE_SIZE / 2;
    this.y = this.gridY * TILE_SIZE + TILE_SIZE / 2;
  }

  update() {
    // Center alignment check for direction choice
    const inCenterX = (this.x - TILE_SIZE / 2) % TILE_SIZE === 0;
    const inCenterY = (this.y - TILE_SIZE / 2) % TILE_SIZE === 0;

    if (inCenterX && inCenterY) {
      this.gridX = Math.floor(this.x / TILE_SIZE);
      this.gridY = Math.floor(this.y / TILE_SIZE);

      // Check if returning to spawn and reached
      if (this.state === 'eaten' && this.gridX === this.startX && this.gridY === this.startY) {
        this.changeState('normal');
      }

      this.chooseNextDirection();
    }

    // Perform movement
    let currentSpeed = this.speed;
    if (this.state === 'frightened') {
      currentSpeed = 1.0; // slower
    } else if (this.state === 'eaten') {
      currentSpeed = 4.0; // very fast eyes returning
    }

    this.x += DIR_X[this.dir] * currentSpeed;
    this.y += DIR_Y[this.dir] * currentSpeed;

    // Wrap-around coordinate clamps
    const minX = -TILE_SIZE / 2;
    const maxX = GRID_COLS * TILE_SIZE + TILE_SIZE / 2;
    if (this.x < minX) {
      this.x = maxX - (minX - this.x);
      this.gridX = GRID_COLS - 1;
    } else if (this.x > maxX) {
      this.x = minX + (this.x - maxX);
      this.gridX = 0;
    }
  }

  chooseNextDirection() {
    const validDirs = [];
    const oppositeDir = (this.dir + 2) % 4;

    for (let d = 0; d < 4; d++) {
      // Don't turn immediately backward unless forced
      if (d === oppositeDir) continue;

      const nextGX = this.gridX + DIR_X[d];
      const nextGY = this.gridY + DIR_Y[d];

      if (this.isValidGhostMove(nextGX, nextGY)) {
        validDirs.push(d);
      }
    }

    // If dead-end, allow turning back
    if (validDirs.length === 0) {
      const nextGX = this.gridX + DIR_X[oppositeDir];
      const nextGY = this.gridY + DIR_Y[oppositeDir];
      if (this.isValidGhostMove(nextGX, nextGY)) {
        validDirs.push(oppositeDir);
      }
    }

    if (validDirs.length > 0) {
      if (this.state === 'eaten') {
        // Path find directly back to spawn house using Manhattan distance
        let bestDir = validDirs[0];
        let minDist = Infinity;
        for (const d of validDirs) {
          const gx = this.gridX + DIR_X[d];
          const gy = this.gridY + DIR_Y[d];
          const dist = Math.abs(gx - this.startX) + Math.abs(gy - this.startY);
          if (dist < minDist) {
            minDist = dist;
            bestDir = d;
          }
        }
        this.dir = bestDir;
      } else if (this.state === 'frightened') {
        // Run away / completely random choices
        this.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
      } else {
        // Standard chase intelligence (70% chase Pacman, 30% random)
        if (Math.random() < 0.7 && pacman) {
          let bestDir = validDirs[0];
          let minDist = Infinity;
          for (const d of validDirs) {
            const gx = this.gridX + DIR_X[d];
            const gy = this.gridY + DIR_Y[d];
            const dist = Math.abs(gx - pacman.gridX) + Math.abs(gy - pacman.gridY);
            if (dist < minDist) {
              minDist = dist;
              bestDir = d;
            }
          }
          this.dir = bestDir;
        } else {
          this.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
        }
      }
    }
  }

  isValidGhostMove(gx, gy) {
    // Warp tunnel wraps
    if (gy === 7 && (gx < 0 || gx >= GRID_COLS)) return true;
    if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return false;
    return currentMap[gy][gx] !== 1;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.state === 'eaten') {
      // Just draw eyes returning to base
      ctx.beginPath();
      ctx.arc(-4, 0, 3, 0, Math.PI * 2);
      ctx.arc(4, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(-4 + DIR_X[this.dir]*1.5, DIR_Y[this.dir]*1.5, 1.2, 0, Math.PI * 2);
      ctx.arc(4 + DIR_X[this.dir]*1.5, DIR_Y[this.dir]*1.5, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#6c63ff';
      ctx.fill();
    } else if (this.state === 'frightened') {
      // Scared blue dwarf planet
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00d4ff';

      ctx.beginPath();
      ctx.arc(0, 0, TILE_SIZE / 2 - 1, 0, Math.PI * 2);
      ctx.fillStyle = '#02385c';
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      // Scared wiggly mouth and eyes
      ctx.fillStyle = '#00d4ff';
      ctx.beginPath();
      ctx.arc(-3, -2, 1.5, 0, Math.PI * 2);
      ctx.arc(3, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, 4);
      ctx.lineTo(-3, 2);
      ctx.lineTo(-1, 4);
      ctx.lineTo(1, 2);
      ctx.lineTo(3, 4);
      ctx.lineTo(5, 2);
      ctx.stroke();
    } else {
      // Normal Planet rendering
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;

      // Outer rings if Mars/Saturn-like
      if (this.isRings) {
        ctx.save();
        ctx.scale(1.5, 0.45);
        ctx.rotate(-Math.PI / 12);
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // Planet sphere
      ctx.beginPath();
      ctx.arc(0, 0, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      // Draw subtle details (bands on Jupiter, craters on Mars, etc.)
      if (this.name === 'Jupiter') {
        // Bands
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-7, -3); ctx.lineTo(7, -3);
        ctx.moveTo(-9, 2); ctx.lineTo(9, 2);
        ctx.stroke();
      } else if (this.name === 'Neptuno') {
        // Spots
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(4, 2, 2.5, 0, Math.PI*2); ctx.fill();
      }

      // Planet eyes
      ctx.beginPath();
      ctx.arc(-3.5, -1, 3, 0, Math.PI * 2);
      ctx.arc(3.5, -1, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(-3.5 + DIR_X[this.dir]*1.2, -1 + DIR_Y[this.dir]*1.2, 1.2, 0, Math.PI * 2);
      ctx.arc(3.5 + DIR_X[this.dir]*1.2, -1 + DIR_Y[this.dir]*1.2, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
    }

    ctx.restore();
  }
}

// Map rendering
function drawMap() {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const tile = currentMap[r][c];
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;

      if (tile === 1) {
        // Draw grid wall (Cyberpunk style)
        ctx.strokeStyle = '#6c63ff'; // neon purple
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        
        ctx.fillStyle = 'rgba(108, 99, 255, 0.08)';
        ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
      } else if (tile === 2) {
        // Draw space dust star
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (tile === 3) {
        // Draw Supernova pulsing pellet
        const pulse = 4.5 + Math.sin(Date.now() * 0.008) * 1.5;
        ctx.shadowBlur = pulse * 2.2;
        ctx.shadowColor = '#ff6b35';
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }
}

function triggerSupernova() {
  supernovaActive = true;
  supernovaTimer = 300; // 5 seconds at 60fps
  planets.forEach(p => {
    if (p.state !== 'eaten') p.changeState('frightened');
  });
}

function checkLevelCleared() {
  // Check if any stars or supernovas remain
  let itemsLeft = false;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (currentMap[r][c] === 2 || currentMap[r][c] === 3) {
        itemsLeft = true;
        break;
      }
    }
  }

  if (!itemsLeft) {
    // Next level
    level++;
    resetMapData();
    pacman.reset();
    planets.forEach(p => p.reset());
    supernovaActive = false;
  }
}

function resetMapData() {
  currentMap = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    currentMap.push([...MAP_TEMPLATE[r]]);
  }
}

// Collision checks between Pacman and Ghosts
function checkEntityCollisions() {
  planets.forEach(p => {
    const dx = pacman.x - p.x;
    const dy = pacman.y - p.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < TILE_SIZE * 0.75) {
      if (p.state === 'frightened') {
        // Pacman eats planet
        p.changeState('eaten');
        score += 200;
      } else if (p.state === 'normal') {
        // Planet eats Pacman
        lives--;
        if (lives <= 0) {
          gameOver = true;
          if (score > highscore) {
            highscore = score;
            localStorage.setItem('space_pacman_highscore', highscore);
          }
        } else {
          // Soft reset positioning
          pacman.reset();
          planets.forEach(pl => pl.reset());
        }
      }
    }
  });
}

function updateGame() {
  if (gameOver || gameWon) return;

  // Key direction handling (case-insensitive for WASD)
  if (keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['W']) pacman.nextDir = 0;
  else if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) pacman.nextDir = 1;
  else if (keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['S']) pacman.nextDir = 2;
  else if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) pacman.nextDir = 3;

  pacman.update();

  planets.forEach(p => p.update());

  // Handle supernova timer
  if (supernovaActive) {
    supernovaTimer--;
    if (supernovaTimer <= 0) {
      supernovaActive = false;
      planets.forEach(p => {
        if (p.state === 'frightened') p.changeState('normal');
      });
    }
  }

  checkEntityCollisions();
}

function drawGame() {
  ctx.fillStyle = '#020614'; // space deep black
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Background star grid dots (static)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let x = 12; x < canvas.width; x += 24) {
    for (let y = 12; y < canvas.height; y += 24) {
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  drawMap();

  pacman.draw();
  planets.forEach(p => p.draw());

  // UI score sync
  document.getElementById('game-score').textContent = String(score).padStart(4, '0');
  document.getElementById('game-highscore').textContent = String(highscore).padStart(4, '0');

  // Game over screen
  if (gameOver) {
    ctx.fillStyle = 'rgba(2, 6, 20, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "bold 1.25rem 'Space Mono', monospace";
    ctx.fillStyle = '#ff7070';
    ctx.textAlign = 'center';
    ctx.fillText("¡PLANETAS VENCEN AL SOL!", canvas.width / 2, canvas.height / 2 - 10);

    ctx.font = "0.75rem 'Space Mono', monospace";
    ctx.fillStyle = 'var(--text-secondary)';
    ctx.fillText("PUNTUACIÓN: " + score, canvas.width / 2, canvas.height / 2 + 18);
    ctx.fillText("PULSA 'REINICIAR' PARA INTENTARLO", canvas.width / 2, canvas.height / 2 + 38);
  }
}

// Game loop tick
function gameTick() {
  updateGame();
  drawGame();
}

export function initPacmanGame() {
  // Stop existing loop
  if (gameInterval) clearInterval(gameInterval);

  canvas = document.getElementById('pacman-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  // Reset metrics
  score = 0;
  lives = 3;
  level = 1;
  gameOver = false;
  gameWon = false;
  supernovaActive = false;
  supernovaTimer = 0;

  // Initialize entities
  resetMapData();
  pacman = new Pacman();

  // Create the 4 planet ghosts
  planets = [
    new PlanetGhost('Mars', '#ff6b35', 6, 7),        // Mars red
    new PlanetGhost('Venus', '#00d4ff', 7, 7, true),  // Venus cyan with rings
    new PlanetGhost('Neptuno', '#00ff88', 8, 7),     // Neptune cyan-green
    new PlanetGhost('Jupiter', '#f5a623', 7, 6),     // Jupiter yellow
  ];

  // Setup control listeners - safely remove duplicates before registering
  keysPressed = {};
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Setup restart button hook
  const restartBtn = document.getElementById('restart-game-btn');
  if (restartBtn) {
    restartBtn.onclick = () => initPacmanGame();
  }

  // Start loop
  gameInterval = setInterval(gameTick, 1000 / 60); // 60 fps
}

function handleKeyDown(e) {
  // Prevent window scroll on arrow keys or space when panel is active
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
    const isPanelActive = document.getElementById('panel').classList.contains('active');
    if (isPanelActive) e.preventDefault();
  }
  keysPressed[e.key] = true;
  keysPressed[e.key.toLowerCase()] = true; // lowercase fallback for WASD/Caps Lock
}

function handleKeyUp(e) {
  keysPressed[e.key] = false;
  keysPressed[e.key.toLowerCase()] = false;
}

// Cleanup listeners on tab switch or panel close
export function destroyPacmanGame() {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
}
