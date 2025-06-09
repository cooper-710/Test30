
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.148.0/build/three.module.js';

let scene, camera, renderer, pitchData = {}, balls = [];
let activeTypes = new Set(), playing = true;
let lastTime = 0;
const clock = new THREE.Clock();

async function loadPitchData() {
  const res = await fetch('./pitch_data.json');
  return await res.json();
}

function createHalfColorMaterial(pitchType) {
  const colorMap = {
    FF: '#FF0000', SL: '#0000FF', CH: '#008000', KC: '#4B0082',
    SI: '#FFA500', CU: '#800080', FC: '#808080', ST: '#008080',
    FS: '#00CED1', EP: '#FF69B4', KN: '#A9A9A9', SC: '#708090',
    SV: '#000000', CS: '#A52A2A', FO: '#DAA520'
  };
  const baseType = pitchType.split(' ')[0];
  const hex = colorMap[baseType] || '#888888';

  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 2, 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 1, 2, 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.4,
    metalness: 0.1
  });
}

function getSpinAxisVector(degrees) {
  const radians = THREE.MathUtils.degToRad(degrees);
  return new THREE.Vector3(Math.cos(radians), 0, Math.sin(radians)).normalize();
}

function setupScene() {
  const canvas = document.getElementById('three-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  const mound = new THREE.Mesh(
    new THREE.CylinderGeometry(2.0, 9, 2.0, 64),
    new THREE.MeshStandardMaterial({ color: 0x8B4513 })
  );
  mound.position.set(0, 0, 0);
  scene.add(mound);

  const rubber = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.05, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  rubber.position.set(0, 1.05, 0);
  scene.add(rubber);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 2.5, -65);
  camera.lookAt(0, 2.5, 0);
  scene.add(camera);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x8b4513, 0.4);
  scene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xfff0e5, 1.0);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const plate = new THREE.Mesh(
    new THREE.ShapeGeometry(
      new THREE.Shape()
        .moveTo(-0.85, 0).lineTo(0.85, 0).lineTo(0.85, 0.5)
        .lineTo(0, 1.0).lineTo(-0.85, 0.5).lineTo(-0.85, 0)
    ),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(0, 0.011, -60.5);
  scene.add(plate);

  const zone = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.42, 2.0)),
    new THREE.LineBasicMaterial({ color: 0xffffff })
  );
  zone.position.set(0, 2.5, -60.5);
  scene.add(zone);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x1e472d, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
}

function clearBalls() {
  for (let ball of balls) scene.remove(ball);
  balls = [];
  activeTypes.clear();
  document.getElementById('pitchCheckboxes').innerHTML = '';
}

function addCheckboxes(pitcherData) {
  const container = document.getElementById('pitchCheckboxes');
  container.innerHTML = '';

  const pitchGroups = {};
  for (const key in pitcherData) {
    const [pitchType, zone] = key.split(' ');
    if (!pitchGroups[pitchType]) pitchGroups[pitchType] = {};
    pitchGroups[pitchType][Number(zone)] = pitcherData[key];
  }

  for (const pitchType in pitchGroups) {
    const group = document.createElement('div');
    group.className = 'pitch-type-group';

    const title = document.createElement('div');
    title.className = 'pitch-type-title';
    title.textContent = pitchType;

    const grid = document.createElement('div');
    grid.className = 'checkbox-grid';

    for (let zone = 1; zone <= 9; zone++) {
      const combo = `${pitchType} ${zone}`;
      if (!pitchGroups[pitchType][zone]) continue;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = combo;

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          throwBall(pitchGroups[pitchType][zone], combo);
        } else {
          removeBallByType(combo);
        }
      });

      const label = document.createElement('label');
      label.htmlFor = combo;
      label.textContent = zone;

      const wrapper = document.createElement('div');
      wrapper.className = 'checkbox-group';
      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      grid.appendChild(wrapper);
    }

    group.appendChild(title);
    group.appendChild(grid);
    container.appendChild(group);
  }
}

function populateDropdowns(data) {
  const teamSelect = document.getElementById('teamSelect');
  const pitcherSelect = document.getElementById('pitcherSelect');

  for (let team in data) {
    const option = document.createElement('option');
    option.value = team;
    option.textContent = team;
    teamSelect.appendChild(option);
  }

  teamSelect.addEventListener('change', () => {
    pitcherSelect.innerHTML = '';
    const team = teamSelect.value;
    for (let pitcher in data[team]) {
      const opt = document.createElement('option');
      opt.value = pitcher;
      opt.textContent = pitcher;
      pitcherSelect.appendChild(opt);
    }
    pitcherSelect.dispatchEvent(new Event('change'));
  });

  pitcherSelect.addEventListener('change', () => {
    clearBalls();
    const team = teamSelect.value;
    const pitcher = pitcherSelect.value;
    addCheckboxes(data[team][pitcher]);
  });

  teamSelect.selectedIndex = 0;
  teamSelect.dispatchEvent(new Event('change'));
}

function throwBall(pitch, pitchType) {
  const ballGeo = new THREE.SphereGeometry(0.145, 32, 32);
  const mat = createHalfColorMaterial(pitchType);
  const ball = new THREE.Mesh(ballGeo, mat);
  ball.castShadow = true;

  const t0 = clock.getElapsedTime();
  ball.userData = {
    type: pitchType,
    t0,
    release: { x: -pitch.release_pos_x, y: pitch.release_pos_z + 0.65, z: -2.03 },
    velocity: { x: -pitch.vx0, y: pitch.vz0, z: pitch.vy0 },
    accel: { x: -pitch.ax, y: pitch.az, z: pitch.ay },
    spinRate: pitch.release_spin_rate || 0,
    spinAxis: getSpinAxisVector(pitch.spin_axis || 0)
  };

  ball.position.set(ball.userData.release.x, ball.userData.release.y, ball.userData.release.z);
  balls.push(ball);
  scene.add(ball);
}

function removeBallByType(pitchType) {
  balls = balls.filter(ball => {
    if (ball.userData.type === pitchType) {
      scene.remove(ball);
      return false;
    }
    return true;
  });
}

function animate() {
  requestAnimationFrame(animate);
  const now = clock.getElapsedTime();
  const delta = now - lastTime;
  lastTime = now;

  if (playing) {
    for (let ball of balls) {
      const { t0, release, velocity, accel, spinRate, spinAxis } = ball.userData;
      const t = now - t0;
      const z = release.z + velocity.z * t + 0.5 * accel.z * t * t;
      if (z <= -60.5) continue;
      ball.position.x = release.x + velocity.x * t + 0.5 * accel.x * t * t;
      ball.position.y = release.y + velocity.y * t + 0.5 * accel.y * t * t;
      ball.position.z = z;
      if (spinRate > 0) {
        const radPerSec = (spinRate / 60) * 2 * Math.PI;
        const angleDelta = radPerSec * delta;
        ball.rotateOnAxis(spinAxis.clone().normalize(), angleDelta);
      }
    }
  }
  renderer.render(scene, camera);
}

document.getElementById('toggleBtn').addEventListener('click', () => {
  playing = !playing;
  document.getElementById('toggleBtn').textContent = playing ? 'Pause' : 'Play';
});
document.getElementById('replayBtn').addEventListener('click', () => {
  const now = clock.getElapsedTime();
  for (let ball of balls) {
    ball.userData.t0 = now;
    ball.position.set(ball.userData.release.x, ball.userData.release.y, ball.userData.release.z);
  }
});

(async () => {
  setupScene();
  pitchData = await loadPitchData();
  populateDropdowns(pitchData);
  animate();
})();
