const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

const players = new Map();
let chaser = { x: 5, z: 5, speed: 2.5 };

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const c of wss.clients)
    if (c.readyState === WebSocket.OPEN) c.send(msg);
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

wss.on('connection', ws => {
  const id = uuidv4();
  ws._id = id;

  ws.send(JSON.stringify({ type: 'welcome', id }));

  ws.on('message', msg => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }

    if (data.type === 'join') {
      players.set(id, { id, name: data.name || id.slice(0, 6), x: 0, z: 0 });
      broadcast({ type: 'players', players: Array.from(players.values()) });
    }

    if (data.type === 'state' && players.has(id)) {
      const p = players.get(id);
      p.x = data.x;
      p.z = data.z;
    }
  });

  ws.on('close', () => {
    players.delete(id);
    broadcast({ type: 'players', players: Array.from(players.values()) });
  });
});

setInterval(() => {
  const arr = Array.from(players.values());
  if (arr.length > 0) {
    let nearest = arr[0];
    let best = dist2(chaser, nearest);
    for (const p of arr) {
      const d = dist2(chaser, p);
      if (d < best) { best = d; nearest = p; }
    }
    const dx = nearest.x - chaser.x;
    const dz = nearest.z - chaser.z;
    const len = Math.hypot(dx, dz) || 1;
    chaser.x += (dx / len) * (chaser.speed / 20);
    chaser.z += (dz / len) * (chaser.speed / 20);
  }
  broadcast({ type: 'chaser', chaser });
}, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
