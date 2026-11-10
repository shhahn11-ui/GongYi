// Shared engine for blocky "In this world" story Shorts
import * as THREE from 'three';
export { THREE };
export const W = 540, H = 960;
export const ease = x => { x = Math.min(1, Math.max(0, x)); return x*x*(3-2*x); };
export const lerp = (a,b,u) => a + (b-a)*u;
export const FONT = '"Noto Sans CJK KR","Noto Sans KR",sans-serif';
let seed = 5; export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const T = new Proxy({}, { get: (_, k) => window.T[k] });

export const mat = (c, o={}) => new THREE.MeshLambertMaterial({color:c, flatShading:true, ...o});
export function box(w,h,d,c,o){ const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), Array.isArray(c) ? c : mat(c,o)); m.castShadow = m.receiveShadow = true; return m; }
export function textCanvas(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return {c, g:c.getContext('2d'), t}; }
export function textTex(lines, {w=512, h=256, bg='#f4efe2', fg='#222', size=64, border=null}={}){
  const {g, t} = textCanvas(w, h);
  if (bg){ g.fillStyle = bg; g.fillRect(0,0,w,h); }
  if (border){ g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(8,8,w-16,h-16); }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${size}px ${FONT}`;
  lines.forEach((l,i) => g.fillText(l, w/2, h/2 + (i - (lines.length-1)/2) * size * 1.25));
  t.needsUpdate = true; return t;
}
export function plane(w, h, tex, o={}){ return new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({map:tex, transparent:true, ...o})); }
// floating label that faces the camera (numbers above heads etc.)
export function label(w=1.6, h=0.6){
  const {c, g, t} = textCanvas(512, 160);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:t, transparent:true, depthTest:false}));
  s.scale.set(w, h, 1); s.renderOrder = 20;
  s.userData.set = (txt, col='#ffffff', bg='rgba(10,12,30,0.75)') => {
    if (s.userData.last === txt + col) return; s.userData.last = txt + col;
    g.clearRect(0,0,512,160); g.fillStyle = bg; g.beginPath(); g.roundRect(6,14,500,132,40); g.fill();
    let fs = 96; g.font = `900 ${fs}px ${FONT}`; while (g.measureText(txt).width > 460 && fs > 30){ fs -= 4; g.font = `900 ${fs}px ${FONT}`; }
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 82); t.needsUpdate = true; };
  return s;
}

function faceTex(skin='#f2c38b'){
  const {g, t} = textCanvas(128, 128);
  g.fillStyle = skin; g.fillRect(0,0,128,128);
  g.fillStyle = '#1b1b1b'; g.fillRect(36,46,14,22); g.fillRect(78,46,14,22);
  g.fillRect(30,34,24,5); g.fillRect(74,34,24,5);
  g.lineWidth = 7; g.strokeStyle = '#1b1b1b'; g.beginPath(); g.moveTo(44,88); g.lineTo(64,96); g.lineTo(84,88); g.stroke();
  t.needsUpdate = true; return t;
}
const FACE = faceTex();
export function person({shirt=0x3b7ddd, pants=0x2b3346, hair=0x5a3a22, scale=1, skin=0xf2c38b}={}){
  const g = new THREE.Group();
  const sk = mat(skin), faceM = new THREE.MeshLambertMaterial({map:FACE});
  const head = box(0.9,0.9,0.9,[sk,sk,sk,sk,faceM,sk]); head.position.y = 2.45; g.add(head);
  const hr = box(0.98,0.32,0.98,hair); hr.position.y = 2.95; g.add(hr);
  const hb = box(0.98,0.6,0.25,hair); hb.position.set(0,2.6,-0.38); g.add(hb);
  const torso = box(1.1,1.1,0.55,shirt); torso.position.y = 1.5; g.add(torso);
  const arms = [], legs = [];
  for (const s of [-1,1]){
    const ap = new THREE.Group(); ap.position.set(s*0.78, 2.0, 0); const a = box(0.45,1.05,0.45,shirt); a.position.y = -0.45; const hnd = box(0.4,0.25,0.4,skin); hnd.position.y = -1.05; ap.add(a, hnd); g.add(ap); arms.push(ap);
    const lp = new THREE.Group(); lp.position.set(s*0.28, 0.95, 0); const l = box(0.5,0.95,0.5,pants); l.position.y = -0.475; lp.add(l); g.add(lp); legs.push(lp);
  }
  g.userData = {arms, legs, head}; g.scale.setScalar(scale); return g;
}
export function walk(p, t, speed=1, amp=0.6){ const s = Math.sin(t*7*speed)*amp; p.userData.legs[0].rotation.x = s; p.userData.legs[1].rotation.x = -s; p.userData.arms[0].rotation.x = -s; p.userData.arms[1].rotation.x = s; }
export function idle(p){ for (const x of [...p.userData.legs, ...p.userData.arms]) x.rotation.set(0,0,0); p.userData.head.rotation.set(0,0,0); }
export function armsUp(p, a=2.6){ p.userData.arms[0].rotation.x = -a; p.userData.arms[1].rotation.x = -a; }
export const hero = () => { const h = person({shirt:0x2f6fd8, pants:0x2b3346, hair:0x3a2414}); const sc = box(1.15,0.3,0.6,0xd83a3a); sc.position.y = 2.05; h.add(sc); return h; };
export const SHIRTS = [0xe05a4a, 0x4aa0e0, 0xf0c040, 0x6ac46a, 0xb070d0, 0xff8a3a];
export function crowdPerson(i, scale=0.9){ return person({shirt:SHIRTS[i%6], pants:[0x2b3346,0x5a4632,0x334a2b][i%3], hair:[0x2a1a10,0x6a4020,0xd8b060,0x1a1a1a][i%4], scale}); }

export function tree(big=1){ const t = new THREE.Group(); const tr = box(0.6*big,2*big,0.6*big,0x7a5232); tr.position.y = big; const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8*big,0), mat(0x3f9a45)); lf.position.y = 3.2*big; lf.castShadow = true; t.add(tr, lf); t.userData.leaf = lf; return t; }

// ---------- engine ----------
export function setup(){
  const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(); scene.fog = new THREE.Fog(0x070b1c, 40, 160);
  const camera = new THREE.PerspectiveCamera(55, W/H, 0.1, 600);
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x4a5a3a, 0.9); scene.add(hemi);
  const sunL = new THREE.DirectionalLight(0xfff1d0, 2.2); sunL.castShadow = true; sunL.shadow.mapSize.set(1024,1024);
  Object.assign(sunL.shadow.camera, {left:-35,right:35,top:35,bottom:-35,near:1,far:160}); scene.add(sunL, sunL.target);
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(9,16,12), new THREE.MeshBasicMaterial({color:0xffe08a, fog:false})); scene.add(sunBall);
  const sp = []; for (let i=0;i<900;i++){ const v = new THREE.Vector3(rnd()-.5, rnd()*.7+.03, rnd()-.5).normalize().multiplyScalar(300); sp.push(v.x,v.y,v.z); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp,3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({color:0xffffff, size:1.8, sizeAttenuation:false, transparent:true, fog:false})); scene.add(stars);
  const DAY = new THREE.Color(0x8fd0ff), DUSK = new THREE.Color(0xff9a5c), NIGHT = new THREE.Color(0x070b1c);
  const E = { renderer, scene, camera, hemi, sunL, sunBall, stars, origin: new THREE.Vector3(),
    sky(day, dusk=0){ const c = NIGHT.clone().lerp(DAY, day); c.lerp(DUSK, dusk * (1 - Math.abs(day - .5) * 2)); scene.background.copy(c); scene.fog.color.copy(c);
      hemi.intensity = lerp(0.2, 1.0, day); hemi.color.set(day > .3 ? 0xbfe3ff : 0x4a5a9a); sunL.intensity = lerp(0, 2.3, day); stars.material.opacity = 1 - Math.min(1, day * 2.5); },
    placeSun(a, ox=0, oz=0){ const p = new THREE.Vector3(Math.cos(a)*150 + ox, Math.sin(a)*95, -15 + oz); sunBall.position.copy(p); sunL.position.copy(p).sub(new THREE.Vector3(ox,0,oz)).multiplyScalar(0.4).add(new THREE.Vector3(ox,0,oz)); sunL.target.position.set(ox,0,oz); sunBall.visible = p.y > -5; },
    shot(t){ const s = T.shots; let k = 0; for (let i=0;i<s.length;i++) if (t >= s[i].t) k = i; return {name: s[k].name, u: t - s[k].t, len: (k+1 < s.length ? s[k+1].t : s[k].t + 6) - s[k].t}; },
    snap(info={}){ renderer.render(scene, camera); return { img: renderer.domElement.toDataURL('image/jpeg', 0.92), ...info }; },
  };
  return E;
}

// ---------- reusable sets ----------
export function buildTown(scene, {snowable=true}={}){
  const town = new THREE.Group(); scene.add(town);
  const groundMat = mat(0x6cbf55); const ground = new THREE.Mesh(new THREE.PlaneGeometry(200,200), groundMat); ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; town.add(ground);
  const road = box(200,0.05,6,0x55585e); road.position.y = 0.03; town.add(road);
  const winMats = [], HC = [0xe8d6b8, 0xd88a6a, 0x9fc3e0, 0xf0e3a0, 0xc4a3d8, 0xe0b0a0];
  for (let i=0;i<14;i++){
    const side = i % 2 ? 1 : -1, x = -32 + Math.floor(i/2)*10, z = side * 9, hh = 5 + (i%3);
    const h = box(7, hh, 6, HC[i%6]); h.position.set(x, hh/2, z); town.add(h);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.4, 3, 4), mat([0x9b3b32,0x3b5b9b,0x4a7a4a][i%3])); roof.rotation.y = Math.PI/4; roof.position.set(x, hh + 1.5, z); roof.castShadow = true; town.add(roof);
    const wm = new THREE.MeshLambertMaterial({color:0x29343f, emissive:0x000000}); winMats.push(wm);
    for (const dx of [-1.8, 1.8]){ const w = new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,0.1), wm); w.position.set(x+dx, 2.6, z - side*3.05); town.add(w); }
    const door = box(1.4,2.4,0.1,0x6b4a2e); door.position.set(x, 1.2, z - side*3.05); town.add(door);
  }
  const trees = [];
  for (let i=0;i<12;i++){ const t = tree(); t.position.set(-34 + i*7 + (i%2)*2, 0, (i%2 ? 1 : -1) * 4.6); town.add(t); trees.push(t.userData.leaf); }
  const lamps = [];
  for (let i=0;i<4;i++){ const x = -18 + i*12; const p = box(0.25,5,0.25,0x333333); p.position.set(x, 2.5, 3.6); const b = new THREE.Mesh(new THREE.SphereGeometry(0.45,8,6), new THREE.MeshBasicMaterial({color:0x888888})); b.position.set(x, 5.1, 3.6); town.add(p, b);
    const pl = new THREE.PointLight(0xffd890, 0, 16, 1.6); pl.position.set(x, 4.8, 3.6); town.add(pl); lamps.push([pl, b]); }
  return { group: town, groundMat,
    setNight(n){ winMats.forEach((m,i) => m.emissive.setHex(n > .5 && i % 3 ? 0xffc870 : 0x000000)); lamps.forEach(([pl,b]) => { pl.intensity = n > .5 ? 25 : 0; b.material.color.setHex(n > .5 ? 0xffe6a0 : 0x888888); }); },
    gray(g){ groundMat.color.setHex(0x6cbf55).lerp(new THREE.Color(0x8a8f86), g); trees.forEach(l => l.material.color.setHex(0x3f9a45).lerp(new THREE.Color(0x6f7a6a), g)); } };
}
export function buildRoom(scene, x0){
  const room = new THREE.Group(); room.position.set(x0, 0, 0); scene.add(room);
  const side = THREE.BackSide;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 12), [mat(0xd8c8a8,{side}), mat(0xd8c8a8,{side}), mat(0xeee6d6,{side}), mat(0x8a6a4a,{side}), mat(0xcdbd9d,{side}), mat(0xcdbd9d,{side})]);
  walls.position.y = 4; walls.receiveShadow = true; room.add(walls);
  const light = new THREE.PointLight(0xfff0d0, 0, 30, 1.2); light.position.set(0, 7, 2); room.add(light);
  return { group: room, light };
}
export function snowField(scene, n=900){
  const pos = new Float32Array(n*3), base = []; for (let i=0;i<n;i++) base.push([(rnd()-.5)*40, rnd()*30, (rnd()-.5)*40]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({color:0xffffff, size:3, sizeAttenuation:false})); scene.add(p); p.visible = false;
  p.userData.update = (t, fall=2.2) => { for (let i=0;i<n;i++){ const b = base[i]; pos[i*3] = b[0] + Math.sin(t*0.8+i)*0.4; pos[i*3+1] = ((b[1] - t*fall) % 30 + 30) % 30 - 10; pos[i*3+2] = b[2]; } g.attributes.position.needsUpdate = true; };
  return p;
}

// ---- expressive faces ----
const _faces = {};
export function faceKind(kind, skin='#f2c38b'){
  const key = kind + skin; if (_faces[key]) return _faces[key];
  const {g, t} = textCanvas(128, 128); const K = '#1b1b1b';
  g.fillStyle = skin; g.fillRect(0, 0, 128, 128); g.fillStyle = K; g.strokeStyle = K; g.lineCap = 'round';
  const arcEyes = (up=true) => { g.lineWidth = 7; for (const x of [43, 85]){ g.beginPath(); up ? g.arc(x, 62, 10, Math.PI * 1.1, Math.PI * 1.9) : g.arc(x, 50, 10, Math.PI * 0.1, Math.PI * 0.9); g.stroke(); } };
  const dotEyes = () => { g.fillRect(36, 46, 14, 22); g.fillRect(78, 46, 14, 22); };
  if (kind === 'happy'){ arcEyes(true); g.beginPath(); g.moveTo(40, 84); g.quadraticCurveTo(64, 116, 88, 84); g.closePath(); g.fill(); g.fillStyle = '#e86a6a'; g.fillRect(52, 96, 24, 8); }
  else if (kind === 'sad'){ dotEyes(); g.lineWidth = 6; g.beginPath(); g.moveTo(28, 40); g.lineTo(52, 34); g.moveTo(100, 40); g.lineTo(76, 34); g.stroke(); g.beginPath(); g.arc(64, 108, 16, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.fillStyle = '#5ab4ff'; g.fillRect(40, 70, 8, 22); }
  else if (kind === 'angry'){ dotEyes(); g.lineWidth = 8; g.beginPath(); g.moveTo(28, 32); g.lineTo(54, 44); g.moveTo(100, 32); g.lineTo(74, 44); g.stroke(); g.fillRect(44, 88, 40, 10); g.fillStyle = '#fff'; g.fillRect(48, 90, 32, 4); }
  else if (kind === 'shock'){ g.fillStyle = '#fff'; g.fillRect(30, 40, 26, 30); g.fillRect(72, 40, 26, 30); g.fillStyle = K; g.fillRect(38, 48, 10, 12); g.fillRect(80, 48, 10, 12); g.beginPath(); g.ellipse(64, 96, 10, 14, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 5; g.beginPath(); g.moveTo(30, 30); g.lineTo(54, 26); g.moveTo(98, 30); g.lineTo(74, 26); g.stroke(); }
  else if (kind === 'blush'){ arcEyes(true); g.fillStyle = 'rgba(255,110,130,.75)'; g.fillRect(22, 74, 22, 12); g.fillRect(84, 74, 22, 12); g.fillStyle = K; g.lineWidth = 6; g.beginPath(); g.arc(64, 84, 10, 0.2, Math.PI - 0.2); g.stroke(); }
  else if (kind === 'smirk'){ g.fillRect(34, 54, 18, 10); g.fillRect(76, 54, 18, 10); g.lineWidth = 5; g.beginPath(); g.moveTo(30, 46); g.lineTo(54, 48); g.moveTo(74, 48); g.lineTo(98, 44); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(48, 92); g.quadraticCurveTo(70, 98, 86, 84); g.stroke(); }
  else if (kind === 'determined'){ dotEyes(); g.lineWidth = 7; g.beginPath(); g.moveTo(28, 36); g.lineTo(54, 42); g.moveTo(100, 36); g.lineTo(74, 42); g.stroke(); g.lineWidth = 7; g.beginPath(); g.moveTo(46, 92); g.lineTo(82, 92); g.stroke(); }
  else if (kind === 'soot'){ g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, 128, 128); g.fillStyle = skin; g.fillRect(20, 70, 30, 20); g.fillStyle = '#fff'; g.fillRect(30, 40, 26, 30); g.fillRect(72, 40, 26, 30); g.fillStyle = K; g.fillRect(40, 50, 8, 10); g.fillRect(80, 50, 8, 10); g.fillStyle = '#111'; g.beginPath(); g.ellipse(64, 98, 12, 9, 0, 0, Math.PI * 2); g.fill(); }
  else if (kind === 'wink'){ g.fillRect(36, 46, 14, 22); g.lineWidth = 7; g.beginPath(); g.arc(85, 56, 10, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(44, 86); g.quadraticCurveTo(64, 102, 84, 86); g.stroke(); }
  else { dotEyes(); g.fillRect(30, 34, 24, 5); g.fillRect(74, 34, 24, 5); g.lineWidth = 7; g.beginPath(); g.moveTo(44, 88); g.lineTo(64, 96); g.lineTo(84, 88); g.stroke(); }
  t.needsUpdate = true; _faces[key] = t; return t;
}
export function setFace(p, kind, skin){ const m = p.userData.head.material[4]; const t = faceKind(kind, skin); if (m.map !== t){ m.map = t; m.needsUpdate = true; } }
