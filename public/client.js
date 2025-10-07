let ws, scene, camera, renderer, me, others = {}, chaserMesh;
let keys = {};

document.getElementById('startBtn').onclick = () => {
  const name = document.getElementById('name').value || 'Player';
  document.getElementById('menu').remove();

  ws = new WebSocket(`wss://${window.location.host}`);
  ws.onopen = () => ws.send(JSON.stringify({ type: 'join', name }));

  ws.onmessage = e => {
    const data = JSON.parse(e.data);
    if (data.type === 'welcome') me = { id: data.id, x: 0, z: 0 };
    if (data.type === 'players') updatePlayers(data.players);
    if (data.type === 'chaser') updateChaser(data.chaser);
  };

  setupScene();
  animate();
};

function setupScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
  camera.position.y = 5;
  camera.position.z = 10;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 10, 10);
  scene.add(light);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x202020 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  me.mesh = new THREE.Mesh(geometry, material);
  scene.add(me.mesh);

  chaserMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xff0000 }));
  scene.add(chaserMesh);

  addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
}

function updatePlayers(list) {
  const ids = new Set(list.map(p => p.id));
  for (const id of Object.keys(others)) {
    if (!ids.has(id)) {
      scene.remove(others[id].mesh);
      delete others[id];
    }
  }
  list.forEach(p => {
    if (p.id === me.id) return;
    if (!others[p.id]) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x0000ff })
      );
      scene.add(mesh);
      others[p.id] = { ...p, mesh };
    } else {
      others[p.id].mesh.position.set(p.x, 0.5, p.z);
    }
  });
}

function updateChaser(c) {
  chaserMesh.position.set(c.x, 0.5, c.z);
}

function animate() {
  requestAnimationFrame(animate);
  if (me && me.mesh) {
    const speed = 0.1;
    if (keys['w']) me.z -= speed;
    if (keys['s']) me.z += speed;
    if (keys['a']) me.x -= speed;
    if (keys['d']) me.x += speed;
    me.mesh.position.set(me.x, 0.5, me.z);
    ws?.send(JSON.stringify({ type: 'state', x: me.x, z: me.z }));
    camera.position.x = me.x;
    camera.position.z = me.z + 5;
    camera.lookAt(me.x, 0, me.z);
  }
  renderer.render(scene, camera);
}
