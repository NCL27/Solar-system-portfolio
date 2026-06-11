// solar.js — Three.js Solar System Scene with Shooting Stars

import * as THREE from 'three';
import { PLANETS } from './data.js';
import {
  createSunTexture,
  createRockyTexture,
  createCloudyTexture,
  createMarsTexture,
  createJupiterTexture,
  createEarthLikeTexture,
  createNebulaTexture,
  createRingTexture
} from './textures.js';

export class SolarSystem {
  constructor(container, onPlanetClick, onPlanetHover, onMoonClick) {
    this.container = container;
    this.onPlanetClick = onPlanetClick;
    this.onPlanetHover = onPlanetHover;
    this.onMoonClick = onMoonClick;

    this.planetMeshes = [];
    this.orbitGroups = [];
    this.orbitAngles = [];
    this.animating = true;
    this.clock = new THREE.Clock();

    // Drag / orbit state
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };
    this.spherical = new THREE.Spherical(45, Math.PI / 3.5, 0);
    this.targetSpherical = new THREE.Spherical(45, Math.PI / 3.5, 0);

    // Focus state (camera tracking)
    this.focusPlanetId = 'about';
    this.focusPlanetMesh = null;
    this.currentCameraTarget = new THREE.Vector3(0, 0, 0);

    // Pinch zoom state
    this.lastPinchDist = 0;

    // Shooting stars
    this.shootingStars = [];

    this._init();
    this._buildScene();
    this._addStarfield();
    this._addShootingStarSystem();
    this._buildPlanets();
    this._buildAsteroid();
    this._buildSpaceship();
    this._setupEvents();
    this._animate();
  }

  _init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020818, 0.005);

    // Camera
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 600);
    this._updateCameraFromSpherical();

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Star sprite texture (round glow)
    this.starSprite = this._createStarSprite();
  }

  _createStarSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.15, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.4, 'rgba(200,220,255,0.3)');
    grad.addColorStop(0.7, 'rgba(100,150,255,0.05)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }

  _updateCameraFromSpherical() {
    this.camera.position.setFromSpherical(this.targetSpherical);
    this.camera.lookAt(0, 0, 0);
  }

  _buildScene() {
    // Ambient light — gentle fill
    const ambient = new THREE.AmbientLight(0x0a0a22, 2.0);
    this.scene.add(ambient);

    // Sun point light — warm glow
    const sunLight = new THREE.PointLight(0xffdd88, 5, 100, 1.2);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);

    // Secondary sun light for wider reach
    const sunLight2 = new THREE.PointLight(0xffaa44, 2, 200, 1.5);
    sunLight2.position.set(0, 0, 0);
    this.scene.add(sunLight2);

    // Subtle hemisphere light for depth
    const hemi = new THREE.HemisphereLight(0x112244, 0x000000, 0.5);
    this.scene.add(hemi);
  }

  // ============================
  // STARFIELD — Multi-layer
  // ============================
  _addStarfield() {
    // Layer 1: Distant small stars
    this._addStarLayer(5000, 140, 350, 0.4, 0.85);
    // Layer 2: Closer brighter stars
    this._addStarLayer(800, 100, 250, 1.2, 1.0);
    // Layer 3: Very bright highlight stars
    this._addStarLayer(120, 110, 300, 2.5, 1.0);

    // Nebula clouds
    this._addNebulae();
  }

  _addStarLayer(count, minR, maxR, size, opacity) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = minR + Math.random() * (maxR - minR);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Spectral class colors
      const type = Math.random();
      if (type < 0.45) {
        // White
        colors[i * 3] = 0.92 + Math.random() * 0.08;
        colors[i * 3 + 1] = 0.92 + Math.random() * 0.08;
        colors[i * 3 + 2] = 1.0;
      } else if (type < 0.65) {
        // Blue-white (type B/A stars)
        colors[i * 3] = 0.6 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.2;
        colors[i * 3 + 2] = 1.0;
      } else if (type < 0.8) {
        // Yellow (type G like our sun)
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 0.6 + Math.random() * 0.2;
      } else if (type < 0.92) {
        // Orange (type K)
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.3 + Math.random() * 0.2;
      } else {
        // Red (type M)
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.35 + Math.random() * 0.15;
        colors[i * 3 + 2] = 0.3 + Math.random() * 0.15;
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size,
      map: this.starSprite,
      vertexColors: true,
      transparent: true,
      opacity,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.scene.add(new THREE.Points(geo, mat));
  }

  // ============================
  // NEBULA CLOUDS
  // ============================
  _addNebulae() {
    this.nebulaMeshes = [];
    const defs = [
      { c1: '#6633aa', c2: '#220066' },
      { c1: '#0088bb', c2: '#003355' },
      { c1: '#992244', c2: '#440011' },
      { c1: '#117755', c2: '#003322' },
      { c1: '#553388', c2: '#110044' },
    ];

    defs.forEach((def, i) => {
      const tex = createNebulaTexture(def.c1, def.c2);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const size = 120 + Math.random() * 140;
      const geo = new THREE.PlaneGeometry(size, size);
      const mesh = new THREE.Mesh(geo, mat);

      const dist = 130 + Math.random() * 40;
      const angle = (i / defs.length) * Math.PI * 2 + Math.random() * 0.6;
      mesh.position.set(
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 80,
        Math.sin(angle) * dist
      );
      mesh.lookAt(0, 0, 0);
      this.scene.add(mesh);
      this.nebulaMeshes.push(mesh);
    });
  }

  // ============================
  // SHOOTING STARS SYSTEM
  // ============================
  _addShootingStarSystem() {
    // Pool of reusable shooting star line meshes
    this.shootingStarPool = [];
    this.nextShootingStarTime = 2 + Math.random() * 3;

    for (let i = 0; i < 5; i++) {
      const geo = new THREE.BufferGeometry();
      // Trail: 20 segments with fading opacity
      const trailLen = 20;
      const positions = new Float32Array(trailLen * 3);
      const alphas = new Float32Array(trailLen);
      for (let j = 0; j < trailLen; j++) {
        alphas[j] = 1 - j / trailLen;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(0.9, 0.95, 1.0) },
          opacity: { value: 1.0 },
        },
        vertexShader: `
          attribute float alpha;
          varying float vAlpha;
          void main() {
            vAlpha = alpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float opacity;
          varying float vAlpha;
          void main() {
            gl_FragColor = vec4(color, vAlpha * opacity);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.userData = {
        active: false,
        origin: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        speed: 0,
        life: 0,
        maxLife: 0,
        trailLen,
      };
      this.scene.add(line);
      this.shootingStarPool.push(line);
    }
  }

  _spawnShootingStar() {
    // Find inactive star
    const star = this.shootingStarPool.find(s => !s.userData.active);
    if (!star) return;

    const ud = star.userData;
    ud.active = true;
    star.visible = true;

    // Random origin position in the sky dome
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.6 + 0.2;
    const r = 80 + Math.random() * 60;
    ud.origin.setFromSphericalCoords(r, phi, theta);

    // Direction: roughly toward center with random offset
    ud.direction.copy(ud.origin).negate().normalize();
    // Add some cross-direction randomness
    const cross = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    ud.direction.addScaledVector(cross, 0.3).normalize();

    ud.speed = 60 + Math.random() * 80;
    ud.life = 0;
    ud.maxLife = 0.6 + Math.random() * 0.8;

    // Randomize color slightly
    const hue = Math.random();
    if (hue < 0.6) {
      star.material.uniforms.color.value.set(0.95, 0.97, 1.0); // white-blue
    } else if (hue < 0.85) {
      star.material.uniforms.color.value.set(1.0, 0.9, 0.7);   // warm
    } else {
      star.material.uniforms.color.value.set(0.7, 0.85, 1.0);   // blue
    }
  }

  _updateShootingStars(delta) {
    this.nextShootingStarTime -= delta;
    if (this.nextShootingStarTime <= 0) {
      this._spawnShootingStar();
      this.nextShootingStarTime = 2 + Math.random() * 5; // every 2-7 seconds
    }

    for (const star of this.shootingStarPool) {
      if (!star.userData.active) continue;
      const ud = star.userData;
      ud.life += delta;

      if (ud.life >= ud.maxLife) {
        ud.active = false;
        star.visible = false;
        continue;
      }

      // Fade opacity
      const lifeFrac = ud.life / ud.maxLife;
      const fadeIn = Math.min(lifeFrac * 5, 1);
      const fadeOut = 1 - Math.pow(lifeFrac, 2);
      star.material.uniforms.opacity.value = fadeIn * fadeOut;

      // Update trail positions
      const posAttr = star.geometry.getAttribute('position');
      const head = ud.origin.clone().addScaledVector(ud.direction, ud.speed * ud.life);
      for (let j = 0; j < ud.trailLen; j++) {
        const t = j / ud.trailLen;
        const trailPos = head.clone().addScaledVector(ud.direction, -t * 4);
        posAttr.setXYZ(j, trailPos.x, trailPos.y, trailPos.z);
      }
      posAttr.needsUpdate = true;
    }
  }

  // ============================
  // PLANETS
  // ============================
  _buildPlanets() {
    PLANETS.forEach((def, i) => {
      // Generate high-quality procedural texture
      let texture = null;
      if (def.isSun) {
        texture = createSunTexture();
      } else {
        switch (def.id) {
          case 'skills':
            texture = createRockyTexture();
            break;
          case 'experience':
            texture = createCloudyTexture('#062845', '#00ccee');
            break;
          case 'projects':
            texture = createMarsTexture();
            break;
          case 'education':
            texture = createJupiterTexture();
            break;
          case 'contact':
            texture = createEarthLikeTexture();
            break;
        }
      }

      // Higher detail sphere for planets
      const segments = def.isSun ? 64 : 48;
      const geo = new THREE.SphereGeometry(def.size, segments, segments);
      const mat = def.isSun
        ? new THREE.MeshStandardMaterial({
          map: texture,
          emissiveMap: texture,
          emissive: new THREE.Color(def.glowColor),
          emissiveIntensity: 2.0,
          roughness: 0.3,
          metalness: 0.0,
        })
        : new THREE.MeshStandardMaterial({
          map: texture,
          emissive: new THREE.Color(def.glowColor),
          emissiveIntensity: 0.15,
          roughness: 0.5,
          metalness: 0.1,
        });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { planetId: def.id, planetDef: def };

      // Atmosphere glow shell
      if (!def.isSun) {
        // Inner glow
        const glowGeo = new THREE.SphereGeometry(def.size * 1.12, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(def.glowColor),
          transparent: true,
          opacity: 0.12,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide
        });
        mesh.add(new THREE.Mesh(glowGeo, glowMat));

        // Outer faint atmosphere
        const atmoGeo = new THREE.SphereGeometry(def.size * 1.25, 32, 32);
        const atmoMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(def.glowColor),
          transparent: true,
          opacity: 0.05,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide
        });
        mesh.add(new THREE.Mesh(atmoGeo, atmoMat));
      }

      // Saturn-like rings with texture
      if (def.rings) {
        const ringTex = createRingTexture();
        const ringGeo = new THREE.RingGeometry(def.size * 1.4, def.size * 2.4, 64);
        // Fix UVs for ring texture mapping
        const uvs = ringGeo.attributes.uv;
        const ringPos = ringGeo.attributes.position;
        for (let j = 0; j < uvs.count; j++) {
          const x = ringPos.getX(j);
          const z = ringPos.getY(j);
          const dist = Math.sqrt(x * x + z * z);
          const u = (dist - def.size * 1.4) / (def.size * 1.0);
          uvs.setXY(j, u, 0.5);
        }
        const ringMat = new THREE.MeshBasicMaterial({
          map: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
          blending: THREE.NormalBlending,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.3;
        mesh.add(ring);
      }

      // Sun corona layers
      if (def.isSun) {
        for (let layer = 0; layer < 3; layer++) {
          const scale = 1.2 + layer * 0.15;
          const coronaGeo = new THREE.SphereGeometry(def.size * scale, 32, 32);
          const coronaMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(def.glowColor),
            transparent: true,
            opacity: 0.08 - layer * 0.02,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
          });
          this.scene.add(new THREE.Mesh(coronaGeo, coronaMat));
        }
      }

      // Initial position
      const angle = Math.random() * Math.PI * 2;
      this.orbitAngles[i] = angle;

      if (def.isSun) {
        mesh.position.set(0, 0, 0);
        this.scene.add(mesh);
        this.orbitGroups.push(null);
      } else {
        // Create an orbit group for inclination and ascending node angle
        const orbitGroup = new THREE.Group();
        orbitGroup.rotation.x = (def.inclination || 0) * Math.PI / 180;
        orbitGroup.rotation.y = i * 0.7; // vary orientation
        this.scene.add(orbitGroup);
        this.orbitGroups.push(orbitGroup);

        // Draw elliptical orbit path line
        const points = [];
        const segments = 128;
        const a = def.orbitRadius;
        const e = def.eccentricity || 0;
        for (let j = 0; j <= segments; j++) {
          const E_val = (j / segments) * Math.PI * 2;
          const x = a * (Math.cos(E_val) - e);
          const z = a * Math.sqrt(1 - e * e) * Math.sin(E_val);
          points.push(new THREE.Vector3(x, 0, z));
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
        const orbitMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(def.glowColor),
          transparent: true,
          opacity: 0.15,
          blending: THREE.AdditiveBlending,
        });
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        orbitGroup.add(orbitLine);

        // Keplerian position initial calculation
        let E = angle;
        for (let step = 0; step < 5; step++) {
          E = E - (E - e * Math.sin(E) - angle) / (1 - e * Math.cos(E));
        }
        const x = a * (Math.cos(E) - e);
        const z = a * Math.sqrt(1 - e * e) * Math.sin(E);
        mesh.position.set(x, 0, z);

        // Add planet mesh as child of the inclined orbit group
        orbitGroup.add(mesh);

        // If education, add the interactive moon
        if (def.id === 'education') {
          const moonGeo = new THREE.SphereGeometry(0.24, 24, 24);
          const moonMat = new THREE.MeshStandardMaterial({
            color: 0x8892b0,
            emissive: 0x111122,
            roughness: 0.95,
          });
          const moonMesh = new THREE.Mesh(moonGeo, moonMat);
          moonMesh.userData = { isMoon: true, parentPlanetId: 'education' };
          moonMesh.position.set(2.3, 0.1, 0);
          mesh.add(moonMesh);
          this.educationMoon = moonMesh;
        }
      }

      this.planetMeshes.push(mesh);
    });
  }

  // ============================
  // ASTEROID (CV Download)
  // ============================
  _buildAsteroid() {
    // Irregular rock shape using DodecahedronGeometry with noise displacement
    const geo = new THREE.DodecahedronGeometry(0.55, 1);
    const posAttr = geo.attributes.position;
    const seed = 42;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const noise = 0.82 + Math.sin(x * 7.3 + seed) * Math.cos(y * 5.1 + seed) * Math.sin(z * 8.7 + seed) * 0.18;
      posAttr.setXYZ(i, x * noise, y * noise, z * noise);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xc87840,
      roughness: 0.75,
      metalness: 0.05,
      emissive: new THREE.Color(0xff6a10),
      emissiveIntensity: 0.55,
    });

    this.asteroidMesh = new THREE.Mesh(geo, mat);
    this.asteroidMesh.userData = { isAsteroid: true };

    // Inner hot-core glow (tight, intense orange-white)
    const glowGeo = new THREE.SphereGeometry(0.82, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xff9030),
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    this.asteroidMesh.add(new THREE.Mesh(glowGeo, glowMat));

    // Mid glow shell (warm orange)
    const midGeo = new THREE.SphereGeometry(1.15, 16, 16);
    const midMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xff5500),
      transparent: true,
      opacity: 0.10,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    this.asteroidMesh.add(new THREE.Mesh(midGeo, midMat));

    // Outer fainter aura
    const auraGeo = new THREE.SphereGeometry(1.55, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xff3300),
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    this.asteroidMesh.add(new THREE.Mesh(auraGeo, auraMat));

    // Orbit parameters — between experience (13) and projects (19)
    this.asteroidOrbit = {
      radius: 16,
      eccentricity: 0.28,
      inclination: 12,
      speed: 0.42,
      angle: Math.random() * Math.PI * 2,
    };

    // Inclined orbit group
    this.asteroidGroup = new THREE.Group();
    this.asteroidGroup.rotation.x = this.asteroidOrbit.inclination * Math.PI / 180;
    this.asteroidGroup.rotation.y = 2.4; // vary orientation
    this.scene.add(this.asteroidGroup);

    // Draw orbit path (dashed gold tint)
    const points = [];
    const segs = 128;
    const a = this.asteroidOrbit.radius;
    const e = this.asteroidOrbit.eccentricity;
    for (let j = 0; j <= segs; j++) {
      const E_val = (j / segs) * Math.PI * 2;
      const x = a * (Math.cos(E_val) - e);
      const z = a * Math.sqrt(1 - e * e) * Math.sin(E_val);
      points.push(new THREE.Vector3(x, 0, z));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0xf5a623),
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
    });
    this.asteroidGroup.add(new THREE.Line(orbitGeo, orbitMat));

    // Initial position
    const ang0 = this.asteroidOrbit.angle;
    const E0 = ang0;
    const x0 = a * (Math.cos(E0) - e);
    const z0 = a * Math.sqrt(1 - e * e) * Math.sin(E0);
    this.asteroidMesh.position.set(x0, 0, z0);
    this.asteroidGroup.add(this.asteroidMesh);

    // Push into planetMeshes so raycaster picks it up
    this.planetMeshes.push(this.asteroidMesh);
  }

  // ============================
  // SPACESHIP (Space Invaders Game)
  // ============================
  _buildSpaceship() {
    this.spaceshipMesh = new THREE.Group();

    // 1. Body: Cylinder
    const bodyGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.8, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.2,
      metalness: 0.8,
      emissive: new THREE.Color(0x111122),
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2; // point forward along Z axis
    this.spaceshipMesh.add(body);

    // 2. Nose Cone: Cone
    const noseGeo = new THREE.ConeGeometry(0.12, 0.3, 8);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xff3333, // red nose
      roughness: 0.4,
      metalness: 0.5,
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = -Math.PI / 2; // point forward along Z
    nose.position.z = 0.55; // offset forward
    this.spaceshipMesh.add(nose);

    // 3. Cockpit Windshield (Glass Dome)
    const cockpitGeo = new THREE.SphereGeometry(0.08, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      roughness: 0.1,
      metalness: 0.9,
      emissive: new THREE.Color(0x005577),
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.12, 0.1);
    cockpit.scale.set(1.0, 0.6, 2.0); // stretched forward
    cockpit.rotation.x = 0.15; // angled forward
    this.spaceshipMesh.add(cockpit);

    // 4. Wings / Fins
    const wingGeo = new THREE.BoxGeometry(0.7, 0.03, 0.35);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x6c63ff, // indigo wings
      roughness: 0.3,
      metalness: 0.6,
    });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.z = -0.15; // offset backward
    this.spaceshipMesh.add(wings);

    const verticalFinGeo = new THREE.BoxGeometry(0.03, 0.3, 0.2);
    const verticalFin = new THREE.Mesh(verticalFinGeo, wingMat);
    verticalFin.position.y = 0.15;
    verticalFin.position.z = -0.2;
    this.spaceshipMesh.add(verticalFin);

    // 5. Laser Cannons on Wingtips
    const cannonGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8);
    const cannonMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.8,
      roughness: 0.3,
    });
    
    const leftCannon = new THREE.Mesh(cannonGeo, cannonMat);
    leftCannon.rotation.x = Math.PI / 2;
    leftCannon.position.set(-0.35, 0, 0.05);
    
    const rightCannon = new THREE.Mesh(cannonGeo, cannonMat);
    rightCannon.rotation.x = Math.PI / 2;
    rightCannon.position.set(0.35, 0, 0.05);
    
    const tipGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const leftTip = new THREE.Mesh(tipGeo, tipMat);
    leftTip.position.y = 0.14; // forward end of cylinder
    leftCannon.add(leftTip);
    
    const rightTip = new THREE.Mesh(tipGeo, tipMat);
    rightTip.position.y = 0.14; // forward end of cylinder
    rightCannon.add(rightTip);
    
    this.spaceshipMesh.add(leftCannon);
    this.spaceshipMesh.add(rightCannon);

    // 6. Blinking Wingtip Lights
    const redLight = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    redLight.position.set(-0.35, 0.03, -0.15);
    this.spaceshipMesh.add(redLight);
    
    const greenLight = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    greenLight.position.set(0.35, 0.03, -0.15);
    this.spaceshipMesh.add(greenLight);
    
    this.wingtipLights = [redLight, greenLight];

    // 7. Side Boosters
    const leftBooster = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.35, 8), bodyMat);
    leftBooster.rotation.x = Math.PI / 2;
    leftBooster.position.set(-0.18, -0.05, -0.22);
    this.spaceshipMesh.add(leftBooster);

    const rightBooster = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.35, 8), bodyMat);
    rightBooster.rotation.x = Math.PI / 2;
    rightBooster.position.set(0.18, -0.05, -0.22);
    this.spaceshipMesh.add(rightBooster);

    // 8. Booster Flames
    const sideFlameGeo = new THREE.ConeGeometry(0.04, 0.18, 8);
    const sideFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff6600, // orange side flame
      transparent: true,
      opacity: 0.75,
    });
    
    const leftFlame = new THREE.Mesh(sideFlameGeo, sideFlameMat);
    leftFlame.rotation.x = Math.PI;
    leftFlame.position.set(0, -0.25, 0); // relative to booster
    leftBooster.add(leftFlame);
    
    const rightFlame = new THREE.Mesh(sideFlameGeo, sideFlameMat);
    rightFlame.rotation.x = Math.PI;
    rightFlame.position.set(0, -0.25, 0); // relative to booster
    rightBooster.add(rightFlame);
    
    this.spaceshipSideFlames = [leftFlame, rightFlame];
    
    // 9. Main Thruster Flame (Orange Outer + White Core)
    const thrusterGeo = new THREE.ConeGeometry(0.08, 0.25, 8);
    const thrusterMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.85,
    });
    const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.z = -0.52; // offset backward
    
    const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    innerFlame.position.y = 0.04; // offset forward along its local Y
    thruster.add(innerFlame);
    
    this.spaceshipMesh.add(thruster);
    this.spaceshipThruster = thruster;
    
    this.spaceshipMesh.scale.set(1.6, 1.6, 1.6);
    this.spaceshipMesh.userData = { isSpaceship: true };
    
    // Orbit parameters
    this.spaceshipOrbit = {
      radius: 22.5,
      eccentricity: 0.15,
      inclination: -18,
      speed: 0.18,
      angle: Math.random() * Math.PI * 2,
    };

    this.spaceshipGroup = new THREE.Group();
    this.spaceshipGroup.rotation.x = this.spaceshipOrbit.inclination * Math.PI / 180;
    this.spaceshipGroup.rotation.y = -1.2;
    this.scene.add(this.spaceshipGroup);

    const points = [];
    const segs = 128;
    const a = this.spaceshipOrbit.radius;
    const e = this.spaceshipOrbit.eccentricity;
    for (let j = 0; j <= segs; j++) {
      const E_val = (j / segs) * Math.PI * 2;
      const x = a * (Math.cos(E_val) - e);
      const z = a * Math.sqrt(1 - e * e) * Math.sin(E_val);
      points.push(new THREE.Vector3(x, 0, z));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x00d4ff),
      transparent: true,
      opacity: 0.08,
    });
    this.spaceshipGroup.add(new THREE.Line(orbitGeo, orbitMat));

    const ang0 = this.spaceshipOrbit.angle;
    const E0 = ang0;
    const x0 = a * (Math.cos(E0) - e);
    const z0 = a * Math.sqrt(1 - e * e) * Math.sin(E0);
    this.spaceshipMesh.position.set(x0, 0, z0);

    this.spaceshipGroup.add(this.spaceshipMesh);
    this.planetMeshes.push(this.spaceshipMesh);
  }

  // ============================
  // EVENTS
  // ============================
  _setupEvents() {
    const el = this.renderer.domElement;

    el.addEventListener('mousedown', e => this._onDragStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => this._onDragMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => this._onDragEnd());

    el.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY * 0.04;
      this.targetSpherical.radius = Math.max(10, Math.min(100, this.targetSpherical.radius + delta));
    }, { passive: false });

    el.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        this._onDragStart(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        this.lastPinchDist = this._pinchDist(e);
      }
    }, { passive: true });

    el.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1) {
        this._onDragMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        const dist = this._pinchDist(e);
        const delta = (this.lastPinchDist - dist) * 0.15;
        this.targetSpherical.radius = Math.max(10, Math.min(100, this.targetSpherical.radius + delta));
        this.lastPinchDist = dist;
      }
    }, { passive: false });

    el.addEventListener('touchend', e => {
      if (e.changedTouches.length === 1 && !this.wasDragging) {
        this._handleClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
      this._onDragEnd();
    });

    el.addEventListener('click', e => {
      if (!this.wasDragging) this._handleClick(e.clientX, e.clientY);
    });

    el.addEventListener('mousemove', e => this._handleHover(e.clientX, e.clientY));
    window.addEventListener('resize', () => this._onResize());
  }

  _pinchDist(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _onDragStart(x, y) { this.isDragging = true; this.wasDragging = false; this.prevMouse = { x, y }; }

  _onDragMove(x, y) {
    if (!this.isDragging) return;
    const dx = x - this.prevMouse.x;
    const dy = y - this.prevMouse.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) this.wasDragging = true;
    this.targetSpherical.theta -= dx * 0.008;
    this.targetSpherical.phi = Math.max(0.15, Math.min(Math.PI / 2.2, this.targetSpherical.phi + dy * 0.005));
    this.prevMouse = { x, y };
  }

  _onDragEnd() { this.isDragging = false; }

  _handleClick(x, y) {
    this.mouse.x = (x / window.innerWidth) * 2 - 1;
    this.mouse.y = -(y / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.planetMeshes, true);
    if (hits.length > 0) {
      const obj = hits[0].object;

      // Detect asteroid click
      if (obj.userData.isAsteroid || obj.parent?.userData.isAsteroid) {
        if (this.onAsteroidClick) this.onAsteroidClick();
        return;
      }

      // Detect spaceship click
      if (obj.userData.isSpaceship || obj.parent?.userData.isSpaceship || obj.parent?.parent?.userData.isSpaceship) {
        if (this.onSpaceshipClick) this.onSpaceshipClick();
        return;
      }

      // Detect moon click
      if (obj.userData.isMoon || obj.parent?.userData.isMoon) {
        const parentId = obj.userData.parentPlanetId || obj.parent?.userData.parentPlanetId;
        if (parentId && this.onMoonClick) {
          this.onMoonClick(parentId);
          return;
        }
      }

      const id = obj.userData.planetId || obj.parent?.userData.planetId;
      if (id && this.onPlanetClick) {
        this.onPlanetClick(id);
      }
    }
  }

  _handleHover(x, y) {
    this.mouse.x = (x / window.innerWidth) * 2 - 1;
    this.mouse.y = -(y / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.planetMeshes, true);
    if (hits.length > 0) {
      const obj = hits[0].object;

      // Detect asteroid hover
      if (obj.userData.isAsteroid || obj.parent?.userData.isAsteroid) {
        this.renderer.domElement.style.cursor = 'pointer';
        this.onPlanetHover({ id: 'asteroid', emoji: '☄️', name: 'Asteroide CV', hint: 'Descarga mi Curriculum Vitae' }, x, y);
        return;
      }

      // Detect spaceship hover
      if (obj.userData.isSpaceship || obj.parent?.userData.isSpaceship || obj.parent?.parent?.userData.isSpaceship) {
        this.renderer.domElement.style.cursor = 'pointer';
        this.onPlanetHover({ id: 'spaceship', emoji: '🚀', name: 'Nave Espacial', hint: '¡Click para jugar Space Invaders!' }, x, y);
        return;
      }

      // Detect moon hover
      if (obj.userData.isMoon || obj.parent?.userData.isMoon) {
        this.renderer.domElement.style.cursor = 'pointer';
        const moonDef = {
          id: 'moon',
          emoji: '🌕',
          name: 'Luna de Júpiter',
          hint: '¡Click para jugar Space Pacman!'
        };
        this.onPlanetHover(moonDef, x, y);
        return;
      }

      const def = obj.userData.planetDef || obj.parent?.userData.planetDef;
      if (def) {
        this.renderer.domElement.style.cursor = 'pointer';
        this.onPlanetHover(def, x, y);
        return;
      }
    }
    this.renderer.domElement.style.cursor = 'grab';
    this.onPlanetHover(null, x, y);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ============================
  // ANIMATION LOOP
  // ============================
  _animate() {
    if (!this.animating) return;
    requestAnimationFrame(() => this._animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Orbit planets
    PLANETS.forEach((def, i) => {
      if (def.isSun) {
        this.planetMeshes[i].rotation.y += delta * 0.15;
        return;
      }

      // Keplerian motion update
      this.orbitAngles[i] += delta * def.speed * 0.3;
      const M = this.orbitAngles[i];
      const e = def.eccentricity || 0;

      // Solve Kepler's Equation: M = E - e * sin(E)
      let E = M;
      for (let step = 0; step < 5; step++) {
        E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      }

      // Position relative to the parent orbital plane group (inclined)
      const a = def.orbitRadius;
      const x = a * (Math.cos(E) - e);
      const z = a * Math.sqrt(1 - e * e) * Math.sin(E);

      this.planetMeshes[i].position.set(x, 0, z);
      this.planetMeshes[i].rotation.y += delta * 0.4;

      // Subtle emissive pulse
      const emissive = 0.15 + Math.sin(elapsed * 1.5 + i * 1.2) * 0.05;
      this.planetMeshes[i].material.emissiveIntensity = emissive;
    });

    // Animate asteroid (CV)
    if (this.asteroidMesh && this.asteroidOrbit) {
      const ao = this.asteroidOrbit;
      ao.angle += delta * ao.speed * 0.3;
      const M_a = ao.angle;
      const e_a = ao.eccentricity;
      let E_a = M_a;
      for (let step = 0; step < 5; step++) {
        E_a = E_a - (E_a - e_a * Math.sin(E_a) - M_a) / (1 - e_a * Math.cos(E_a));
      }
      const xa = ao.radius * (Math.cos(E_a) - e_a);
      const za = ao.radius * Math.sqrt(1 - e_a * e_a) * Math.sin(E_a);
      this.asteroidMesh.position.set(xa, 0, za);
      // Tumble rotation on all axes for a realistic asteroid feel
      this.asteroidMesh.rotation.x += delta * 0.7;
      this.asteroidMesh.rotation.y += delta * 0.45;
      this.asteroidMesh.rotation.z += delta * 0.3;
      // Pulse emissive — hot white-orange core
      this.asteroidMesh.material.emissiveIntensity = 0.18 + Math.sin(elapsed * 2.2) * 0.06;

    }

    // Animate education moon (slower)
    if (this.educationMoon) {
      const moonAngle = elapsed * 0.45;
      const dist = 2.3;
      this.educationMoon.position.set(Math.cos(moonAngle) * dist, 0.1, Math.sin(moonAngle) * dist);
      this.educationMoon.rotation.y += delta * 0.8;
    }

    // Animate spaceship
    if (this.spaceshipMesh && this.spaceshipOrbit) {
      const so = this.spaceshipOrbit;
      so.angle += delta * so.speed * 0.3;
      const M_s = so.angle;
      const e_s = so.eccentricity;
      let E_s = M_s;
      for (let step = 0; step < 5; step++) {
        E_s = E_s - (E_s - e_s * Math.sin(E_s) - M_s) / (1 - e_s * Math.cos(E_s));
      }
      const xs = so.radius * (Math.cos(E_s) - e_s);
      const zs = so.radius * Math.sqrt(1 - e_s * e_s) * Math.sin(E_s);
      this.spaceshipMesh.position.set(xs, 0, zs);

      // Face the direction of travel (next position)
      const M_next = so.angle + 0.02;
      let E_next = M_next;
      for (let step = 0; step < 5; step++) {
        E_next = E_next - (E_next - e_s * Math.sin(E_next) - M_next) / (1 - e_s * Math.cos(E_next));
      }
      const xs_next = so.radius * (Math.cos(E_next) - e_s);
      const zs_next = so.radius * Math.sqrt(1 - e_s * e_s) * Math.sin(E_next);
      this.spaceshipMesh.lookAt(new THREE.Vector3(xs_next, 0, zs_next));

      // Flicker thruster flames
      if (this.spaceshipThruster) {
        this.spaceshipThruster.scale.set(1, 1, 0.8 + Math.random() * 0.4);
      }
      if (this.spaceshipSideFlames) {
        const factor = 0.8 + Math.random() * 0.4;
        this.spaceshipSideFlames.forEach(flame => {
          flame.scale.set(1, 1, factor);
        });
      }
      // Blink wingtip lights
      if (this.wingtipLights) {
        const visible = Math.floor(elapsed * 4) % 2 === 0;
        this.wingtipLights.forEach(light => {
          light.visible = visible;
        });
      }
    }

    // Rotate nebulae
    if (this.nebulaMeshes) {
      this.nebulaMeshes.forEach((mesh, idx) => {
        mesh.rotation.z += delta * 0.008 * (idx % 2 === 0 ? 1 : -1);
      });
    }

    // Shooting stars
    this._updateShootingStars(delta);

    // Smooth camera target tracking & lerp
    const targetPos = new THREE.Vector3();
    if (this.focusPlanetId !== 'about' && this.focusPlanetMesh) {
      this.focusPlanetMesh.getWorldPosition(targetPos);
    }
    this.currentCameraTarget.lerp(targetPos, 0.08);

    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * 0.08;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * 0.08;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * 0.08;

    // Position camera relative to current target
    const relativePos = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.currentCameraTarget).add(relativePos);
    this.camera.lookAt(this.currentCameraTarget);

    this.renderer.render(this.scene, this.camera);
  }

  // ============================
  // PUBLIC API
  // ============================
  getAsteroidScreenPos() {
    if (!this.asteroidMesh) return null;
    const pos = new THREE.Vector3();
    this.asteroidMesh.getWorldPosition(pos);
    pos.project(this.camera);
    return {
      x: (pos.x * 0.5 + 0.5) * window.innerWidth,
      y: (-pos.y * 0.5 + 0.5) * window.innerHeight,
      z: pos.z,
    };
  }

  getPlanetScreenPos(planetId) {
    if (planetId === 'spaceship') {
      if (!this.spaceshipMesh) return null;
      const pos = new THREE.Vector3();
      this.spaceshipMesh.getWorldPosition(pos);
      const distance = pos.length();

      const r = distance;
      const a = this.spaceshipOrbit.radius;
      const velocity = this.spaceshipOrbit.speed * Math.sqrt(Math.max(0.1, 2.0 / r - 1.0 / a)) * 38;

      pos.project(this.camera);
      return {
        x: (pos.x * 0.5 + 0.5) * window.innerWidth,
        y: (-pos.y * 0.5 + 0.5) * window.innerHeight,
        z: pos.z,
        distance,
        velocity
      };
    }

    if (planetId === 'asteroid') {
      if (!this.asteroidMesh) return null;
      const pos = new THREE.Vector3();
      this.asteroidMesh.getWorldPosition(pos);
      const distance = pos.length();

      const r = distance;
      const a = this.asteroidOrbit.radius;
      const velocity = this.asteroidOrbit.speed * Math.sqrt(Math.max(0.1, 2.0 / r - 1.0 / a)) * 38;

      pos.project(this.camera);
      return {
        x: (pos.x * 0.5 + 0.5) * window.innerWidth,
        y: (-pos.y * 0.5 + 0.5) * window.innerHeight,
        z: pos.z,
        distance,
        velocity
      };
    }

    if (planetId === 'education-moon') {
      if (!this.educationMoon) return null;
      const pos = new THREE.Vector3();
      this.educationMoon.getWorldPosition(pos);
      pos.project(this.camera);
      return {
        x: (pos.x * 0.5 + 0.5) * window.innerWidth,
        y: (-pos.y * 0.5 + 0.5) * window.innerHeight,
        z: pos.z,
        distance: 0,
        velocity: 0
      };
    }

    const idx = PLANETS.findIndex(p => p.id === planetId);
    if (idx < 0) return null;
    const mesh = this.planetMeshes[idx];
    const def = PLANETS[idx];
    const pos = new THREE.Vector3();
    mesh.getWorldPosition(pos);

    // Distance from world center (Sun position is 0,0,0)
    const distance = pos.length();

    // Keplerian orbital velocity approximation: v = C * sqrt(2/r - 1/a)
    let velocity = 0;
    if (!def.isSun && def.orbitRadius > 0) {
      const r = distance;
      const a = def.orbitRadius;
      velocity = def.speed * Math.sqrt(Math.max(0.1, 2.0 / r - 1.0 / a)) * 38;
    }

    pos.project(this.camera);
    return {
      x: (pos.x * 0.5 + 0.5) * window.innerWidth,
      y: (-pos.y * 0.5 + 0.5) * window.innerHeight,
      z: pos.z,
      distance,
      velocity
    };
  }

  getAllPlanetScreenPositions() {
    return PLANETS.map(def => ({
      id: def.id,
      name: def.name,
      emoji: def.emoji,
      ...this.getPlanetScreenPos(def.id),
    }));
  }

  focusPlanet(planetId) {
    this.focusPlanetId = planetId;
    if (planetId === 'asteroid') {
      this.focusPlanetMesh = this.asteroidMesh;
      this.targetSpherical.radius = 8;
    } else if (planetId === 'spaceship') {
      this.focusPlanetMesh = this.spaceshipMesh;
      this.targetSpherical.radius = 8;
    } else {
      const idx = PLANETS.findIndex(p => p.id === planetId);
      if (idx >= 0) {
        this.focusPlanetMesh = this.planetMeshes[idx];
        const def = PLANETS[idx];
        if (def.isSun) {
          this.targetSpherical.radius = 45;
        } else {
          this.targetSpherical.radius = Math.max(8, def.size * 8.5);
        }
      } else {
        this.focusPlanetMesh = null;
        this.targetSpherical.radius = 45;
      }
    }

    // Sync dropdown if listener is registered (will be handled by main.js)
    if (window.syncFocusDropdown) {
      window.syncFocusDropdown(planetId);
    }
  }

  resetCamera() {
    this.focusPlanet('about');
    this.targetSpherical.set(45, Math.PI / 3.5, 0);
  }

  dispose() {
    this.animating = false;
    this.renderer.dispose();
  }
}
