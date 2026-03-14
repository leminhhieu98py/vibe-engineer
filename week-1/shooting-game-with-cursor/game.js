import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

// Basic timing helpers
let lastTime = performance.now();

const GameState = {
  MENU: "menu",
  PLAYING: "playing",
  WON: "won",
  LOST: "lost",
};

const keys = new Set();
let shootPressedFrame = false;

// DOM references
const container = document.getElementById("game-container");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayBody = document.getElementById("overlay-body");
const overlayButton = document.getElementById("overlay-button");
const statusMessage = document.getElementById("status-message");
const playerHealthEl = document.getElementById("player-health");
const enemyHealthEl = document.getElementById("enemy-health");

// Three.js basics
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040612);

const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.1,
  100,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// Arena
const arenaSize = 16;

const floorGeo = new THREE.PlaneGeometry(arenaSize, arenaSize);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x111629,
  roughness: 0.9,
  metalness: 0.05,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const wallHeight = 3;
const wallThickness = 0.3;
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x1f2937,
  roughness: 0.8,
});

function makeWall(width, depth) {
  const geo = new THREE.BoxGeometry(width, wallHeight, depth);
  const mesh = new THREE.Mesh(geo, wallMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const half = arenaSize / 2;

const wallNorth = makeWall(arenaSize, wallThickness);
wallNorth.position.set(0, wallHeight / 2, -half);

const wallSouth = makeWall(arenaSize, wallThickness);
wallSouth.position.set(0, wallHeight / 2, half);

const wallWest = makeWall(wallThickness, arenaSize);
wallWest.position.set(-half, wallHeight / 2, 0);

const wallEast = makeWall(wallThickness, arenaSize);
wallEast.position.set(half, wallHeight / 2, 0);

scene.add(wallNorth, wallSouth, wallWest, wallEast);

// Lights
const hemi = new THREE.HemisphereLight(0x8ec5fc, 0x111111, 0.7);
scene.add(hemi);

const spot = new THREE.SpotLight(0xffffff, 1.2, 40, Math.PI / 4, 0.5);
spot.position.set(0, 12, 8);
spot.castShadow = true;
scene.add(spot);

// Player and enemy
const player = {
  position: new THREE.Vector3(0, 1.5, 4),
  rotation: 0, // yaw
  speed: 7,
  turnSpeed: 2.5,
  health: 3,
};

const enemyGeom = new THREE.CapsuleGeometry(0.6, 1.0, 10, 16);
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xff4b82 });
const enemyMesh = new THREE.Mesh(enemyGeom, enemyMat);
enemyMesh.castShadow = true;
enemyMesh.receiveShadow = true;
scene.add(enemyMesh);

const enemy = {
  position: new THREE.Vector3(0, 1.5, -4),
  speed: 4.5,
  state: "chase",
  health: 3,
  shootCooldown: 0,
};

// Simple gun model
const gunGeo = new THREE.BoxGeometry(0.15, 0.15, 0.5);
const gunMat = new THREE.MeshStandardMaterial({ color: 0x4cc9f0 });
const gun = new THREE.Mesh(gunGeo, gunMat);
scene.add(gun);

// Projectiles
const bullets = [];

function createBullet(isEnemy, origin, direction) {
  const geo = new THREE.SphereGeometry(0.12, 12, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0xff8a65 : 0x4cc9f0,
    emissive: isEnemy ? 0x5c1a0a : 0x10354e,
    emissiveIntensity: 0.8,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.position.copy(origin);
  scene.add(mesh);

  bullets.push({
    mesh,
    isEnemy,
    velocity: direction.clone().multiplyScalar(14),
    life: 1.8,
  });
}

// Game state
let state = GameState.MENU;

function resetGame() {
  player.position.set(0, 1.5, 4);
  player.rotation = Math.PI;
  player.health = 3;

  enemy.position.set(0, 1.5, -4);
  enemy.health = 3;
  enemy.state = "chase";
  enemy.shootCooldown = 0;

  bullets.forEach((b) => scene.remove(b.mesh));
  bullets.length = 0;

  playerHealthEl.textContent = String(player.health);
  enemyHealthEl.textContent = String(enemy.health);

  statusMessage.textContent = "Press Enter to start";
  overlayTitle.textContent = "3D Arena Duel";
  overlayBody.textContent =
    "Defeat the enemy in this 1v1 arena duel. Arrow keys to move, space bar to shoot.";
  overlayButton.textContent = "Press Enter to start";
  overlay.classList.remove("hidden");

  state = GameState.MENU;
}

resetGame();

// Input
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
  }
  keys.add(e.code);

  if (e.code === "Enter") {
    if (state === GameState.MENU || state === GameState.WON || state === GameState.LOST) {
      startPlaying();
    }
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

overlayButton.addEventListener("click", () => {
  if (state !== GameState.PLAYING) startPlaying();
});

function startPlaying() {
  overlay.classList.add("hidden");
  statusMessage.textContent = "Duel in progress…";
  state = GameState.PLAYING;
}

// Resize handling
window.addEventListener("resize", () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// Utility
function clampToArena(v) {
  const pad = 0.9;
  const limit = arenaSize / 2 - pad;
  v.x = Math.max(-limit, Math.min(limit, v.x));
  v.z = Math.max(-limit, Math.min(limit, v.z));
}

function updatePlayer(dt) {
  const forward = keys.has("ArrowUp");
  const backward = keys.has("ArrowDown");
  const left = keys.has("ArrowLeft");
  const right = keys.has("ArrowRight");

  if (left) player.rotation += player.turnSpeed * dt;
  if (right) player.rotation -= player.turnSpeed * dt;

  const dir = new THREE.Vector3(
    Math.sin(player.rotation),
    0,
    Math.cos(player.rotation),
  );

  if (forward) {
    player.position.addScaledVector(dir, -player.speed * dt);
  } else if (backward) {
    player.position.addScaledVector(dir, player.speed * dt);
  }

  clampToArena(player.position);

  // Camera and gun placement
  camera.position.copy(player.position);
  camera.position.y = 1.6;
  camera.lookAt(
    player.position.x + dir.x * 4,
    1.6,
    player.position.z + dir.z * 4,
  );

  gun.position
    .copy(camera.position)
    .add(dir.clone().multiplyScalar(0.6))
    .add(new THREE.Vector3(0.1, -0.2, 0));
  gun.rotation.y = -player.rotation;
}

function updateEnemy(dt) {
  const toPlayer = player.position.clone().sub(enemy.position);
  const distance = toPlayer.length();
  toPlayer.normalize();

  if (distance > 3) {
    // chase
    enemy.position.addScaledVector(toPlayer, enemy.speed * dt);
  } else if (distance < 2) {
    // back off slightly
    enemy.position.addScaledVector(toPlayer, -enemy.speed * dt);
  } else {
    // strafe
    const strafe = new THREE.Vector3(toPlayer.z, 0, -toPlayer.x);
    const dirSign = Math.sin(performance.now() * 0.001) > 0 ? 1 : -1;
    enemy.position.addScaledVector(strafe, dirSign * enemy.speed * 0.6 * dt);
  }

  clampToArena(enemy.position);

  enemyMesh.position.copy(enemy.position);

  // Enemy shooting
  enemy.shootCooldown -= dt;
  if (enemy.shootCooldown <= 0 && distance < 10) {
    const enemyToPlayer = player.position.clone().sub(enemy.position).normalize();
    const facing = enemyToPlayer.clone();
    const inFront =
      enemyToPlayer.dot(facing) > 0.8; // always true but keeps structure if we add facing later

    if (inFront) {
      // add a bit of inaccuracy
      enemyToPlayer.x += (Math.random() - 0.5) * 0.1;
      enemyToPlayer.z += (Math.random() - 0.5) * 0.1;
      enemyToPlayer.normalize();

      const origin = enemy.position.clone();
      origin.y = 1.5;
      createBullet(true, origin, enemyToPlayer);

      enemy.shootCooldown = 1.1 + Math.random() * 0.7;
    }
  }
}

function handleShooting() {
  const spaceDown = keys.has("Space");
  if (spaceDown && !shootPressedFrame) {
    const dir = new THREE.Vector3(
      Math.sin(player.rotation),
      0,
      Math.cos(player.rotation),
    );
    const origin = player.position.clone();
    origin.y = 1.5;
    createBullet(false, origin, dir.clone().negate());
  }
  shootPressedFrame = spaceDown;
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    b.life -= dt;
    b.mesh.position.addScaledVector(b.velocity, dt);

    if (b.life <= 0) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
      continue;
    }

    // Collision with target
    if (!b.isEnemy) {
      const d = b.mesh.position.distanceTo(enemy.position);
      if (d < 0.8 && enemy.health > 0) {
        enemy.health -= 1;
        enemyHealthEl.textContent = String(enemy.health);
        enemyMesh.material.emissive = new THREE.Color(0xff6b9b);
        setTimeout(() => {
          enemyMesh.material.emissive = new THREE.Color(0x000000);
        }, 80);
        scene.remove(b.mesh);
        bullets.splice(i, 1);
        if (enemy.health <= 0) {
          onWin();
        }
        continue;
      }
    } else {
      const d = b.mesh.position.distanceTo(player.position);
      if (d < 0.8 && player.health > 0) {
        player.health -= 1;
        playerHealthEl.textContent = String(player.health);
        statusMessage.textContent = "You were hit!";
        scene.remove(b.mesh);
        bullets.splice(i, 1);
        if (player.health <= 0) {
          onLose();
        }
        continue;
      }
    }
  }
}

function onWin() {
  if (state !== GameState.PLAYING) return;
  state = GameState.WON;
  statusMessage.textContent = "You won the duel!";
  overlayTitle.textContent = "Victory";
  overlayBody.textContent = "Nice aim. Press Enter or click to play again.";
  overlayButton.textContent = "Play again";
  overlay.classList.remove("hidden");
}

function onLose() {
  if (state !== GameState.PLAYING) return;
  state = GameState.LOST;
  statusMessage.textContent = "You lost the duel.";
  overlayTitle.textContent = "Defeat";
  overlayBody.textContent = "The enemy bested you. Press Enter or click to retry.";
  overlayButton.textContent = "Try again";
  overlay.classList.remove("hidden");
}

function gameLoop() {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (state === GameState.PLAYING) {
    updatePlayer(dt);
    updateEnemy(dt);
    handleShooting();
    updateBullets(dt);
  } else {
    // still keep camera bound to player when not playing
    updatePlayer(0);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(gameLoop);
}

// Initial sizing tweak and start loop
window.dispatchEvent(new Event("resize"));
gameLoop();

