import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FLOOR_HEIGHT } from './mapData';
import { DoorSpec, ItemId } from './types';

export interface ThreatModelHandle {
  group: THREE.Group;
  spectralSilhouette: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  head: THREE.Group;
  jaw: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  eyeMat: THREE.MeshStandardMaterial;
}

export interface DoorModelHandle {
  group: THREE.Group;
  leafPivot: THREE.Group;
  leafPivotRight?: THREE.Group;
  chainGroup?: THREE.Group;
  padlockMesh?: THREE.Mesh;
  statusLedMat?: THREE.MeshStandardMaterial;
}

export interface LockerModelHandle {
  group: THREE.Group;
  doorPivot: THREE.Group;
}

export interface BreakerModelHandle {
  group: THREE.Group;
  ledMat: THREE.MeshStandardMaterial;
  lever: THREE.Group;
}

export interface SteamValveHandle {
  group: THREE.Group;
  attachedWheel: THREE.Group;
  steamPlume: THREE.Mesh;
}

function mergeBakedGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(normalized, false);
  geos.forEach((g) => g.dispose());
  normalized.forEach((g) => g.dispose());
  return merged;
}

function paintGeo(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
  if (nonIndexed !== geo) geo.dispose();
  const count = nonIndexed.attributes.position.count;
  const col = new THREE.Color(hex);
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = col.r;
    arr[i * 3 + 1] = col.g;
    arr[i * 3 + 2] = col.b;
  }
  nonIndexed.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return nonIndexed;
}

function mergeColoredGeos(parts: Array<{ geo: THREE.BufferGeometry; color: number }>): THREE.BufferGeometry {
  const painted = parts.map((p) => paintGeo(p.geo, p.color));
  const merged = mergeGeometries(painted, false);
  painted.forEach((g) => g.dispose());
  return merged;
}

function translatedBox(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function translatedCyl(
  rt: number,
  rb: number,
  h: number,
  seg: number,
  x: number,
  y: number,
  z: number,
  rx = 0,
  rz = 0
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (rx !== 0) g.rotateX(rx);
  if (rz !== 0) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

export function createContactShadowDisc(
  shadowTex: THREE.Texture,
  radius: number,
  opacity = 0.5
): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 14);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.014;
  return mesh;
}

/**
 * Functional 2-Story Wooden Staircase (1 merged draw call).
 * Climbs from (z = +run/2, y = 0) up to (z = -run/2, y = rise).
 */
export function createStaircaseFlightMesh(
  rise = 3.5,
  run = 6.0,
  width = 1.92,
  numSteps = 14
): THREE.Mesh {
  const parts: Array<{ geo: THREE.BufferGeometry; color: number }> = [];
  const stepRun = run / numSteps;
  const stepRise = rise / numSteps;

  for (let i = 0; i < numSteps; i++) {
    const zCenter = run / 2 - (i + 0.5) * stepRun;
    const yTop = (i + 1) * stepRise;
    // Step tread + riser backing
    parts.push({
      geo: translatedBox(width - 0.14, 0.16, stepRun + 0.06, 0, yTop - 0.08, zCenter),
      color: i % 2 === 0 ? 0x4b3829 : 0x3f2f22,
    });
    parts.push({
      geo: translatedBox(width - 0.16, stepRise, 0.06, 0, yTop - stepRise * 0.5, zCenter + stepRun * 0.45),
      color: 0x2b2017,
    });
  }

  // Left & Right sloped stringers + handrails
  const slopeLen = Math.hypot(run, rise);
  const slopeAngle = Math.atan2(rise, run);
  const sideOffset = width * 0.5 - 0.06;

  [-sideOffset, sideOffset].forEach((sx) => {
    const stringer = new THREE.BoxGeometry(0.1, 0.24, slopeLen);
    stringer.rotateX(slopeAngle);
    stringer.translate(sx, rise * 0.5 - 0.1, 0);
    parts.push({ geo: stringer, color: 0x31241a });

    const rail = new THREE.BoxGeometry(0.07, 0.07, slopeLen);
    rail.rotateX(slopeAngle);
    rail.translate(sx, rise * 0.5 + 0.85, 0);
    parts.push({ geo: rail, color: 0x523e2e });

    // Newel posts at bottom, middle, top
    [
      [0, run * 0.5 - 0.15],
      [rise * 0.5, 0],
      [rise, -run * 0.5 + 0.15],
    ].forEach(([py, pz]) => {
      parts.push({
        geo: translatedBox(0.08, 0.94, 0.08, sx, py + 0.44, pz),
        color: 0x31241a,
      });
    });
  });

  const geo = mergeColoredGeos(parts);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.84,
    metalness: 0.06,
  });
  return new THREE.Mesh(geo, mat);
}

/**
 * Floor 1 Kitchen Island Counter + Overhead Dish Rack (blocks line of sight for looping!).
 */
export function createKitchenIslandModel(width = 3.2, depth = 3.4): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.78,
    metalness: 0.1,
  });
  const geo = mergeColoredGeos([
    { geo: translatedBox(width, 0.9, depth, 0, 0.45, 0), color: 0x3d332a },
    { geo: translatedBox(width + 0.1, 0.08, depth + 0.1, 0, 0.94, 0), color: 0x626b64 },
    { geo: translatedBox(width * 0.78, 0.68, 0.34, 0, 1.3, 0), color: 0x2c332f },
  ]);
  group.add(new THREE.Mesh(geo, mat));
  return group;
}

/**
 * "The Resident": Elongated, emaciated stalker (~2.12m) with burlap/bandaged face,
 * one sunken glowing eye, twisted neck, and a rusted surgical blade dragging on the floor.
 */
export function createThreatModel(shadowTex: THREE.Texture): ThreatModelHandle {
  const group = new THREE.Group();

  const shroudMat = new THREE.MeshStandardMaterial({
    color: 0x3b4039,
    roughness: 0.9,
    metalness: 0.04,
  });
  const bodyVertexMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.04,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x7b7f71,
    roughness: 0.72,
    metalness: 0.04,
  });
  const rustBladeMat = new THREE.MeshStandardMaterial({
    color: 0x7c685c,
    roughness: 0.4,
    metalness: 0.8,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xf4ffad,
    emissive: 0xc2e655,
    emissiveIntensity: 2.2,
    roughness: 0.15,
  });

  group.add(createContactShadowDisc(shadowTex, 0.82, 0.58));

  const torsoPts = [
    new THREE.Vector2(0.24, 0.2),
    new THREE.Vector2(0.21, 0.72),
    new THREE.Vector2(0.15, 1.18),
    new THREE.Vector2(0.22, 1.68),
    new THREE.Vector2(0.12, 1.82),
  ];
  const shoulders = new THREE.BoxGeometry(0.64, 0.16, 0.26);
  shoulders.rotateZ(-0.09);
  shoulders.translate(0, 1.78, -0.04);

  const torsoGeo = mergeColoredGeos([
    { geo: new THREE.LatheGeometry(torsoPts, 10), color: 0x3b4039 },
    { geo: translatedBox(0.32, 0.56, 0.24, 0, 1.38, -0.04), color: 0x746b58 },
    { geo: translatedBox(0.2, 0.42, 0.04, 0.03, 1.32, -0.17), color: 0x6b1414 },
    { geo: shoulders, color: 0x3b4039 },
  ]);
  group.add(new THREE.Mesh(torsoGeo, bodyVertexMat));

  const head = new THREE.Group();
  head.position.set(0, 1.88, -0.09);
  head.rotation.z = 0.22;

  const cranium = new THREE.SphereGeometry(0.18, 10, 8);
  cranium.scale(0.86, 1.24, 0.96);
  cranium.translate(0, 0.22, 0);

  const bandage = new THREE.CylinderGeometry(0.168, 0.168, 0.11, 10);
  bandage.rotateZ(0.16);
  bandage.translate(0, 0.26, -0.01);

  const headGeo = mergeColoredGeos([
    { geo: translatedCyl(0.065, 0.085, 0.18, 8, 0, 0.05, 0), color: 0x7b7f71 },
    { geo: cranium, color: 0x746b58 },
    { geo: bandage, color: 0x3b4039 },
  ]);
  const singleEye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMat);
  singleEye.position.set(0.058, 0.24, -0.158);
  head.add(new THREE.Mesh(headGeo, bodyVertexMat), singleEye);

  const jaw = new THREE.Group();
  jaw.position.set(0, 0.12, -0.08);
  const jawGeo = mergeColoredGeos([
    { geo: translatedBox(0.13, 0.08, 0.12, 0, -0.02, -0.03), color: 0x6b1414 },
    { geo: translatedBox(0.18, 0.09, 0.16, 0, -0.05, -0.02), color: 0x746b58 },
  ]);
  jaw.add(new THREE.Mesh(jawGeo, bodyVertexMat));
  head.add(jaw);
  group.add(head);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.34, 1.76, -0.04);
  const lMerged = mergeBakedGeos([
    translatedCyl(0.048, 0.038, 0.56, 8, 0, -0.28, 0),
    translatedCyl(0.036, 0.026, 0.52, 8, 0, -0.78, -0.06, -0.25, 0),
    translatedBox(0.06, 0.14, 0.04, 0, -1.04, -0.13),
  ]);
  leftArm.add(new THREE.Mesh(lMerged, skinMat));
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.34, 1.76, -0.04);
  const rLimb = mergeBakedGeos([
    translatedCyl(0.048, 0.038, 0.58, 8, 0, -0.29, 0),
    translatedCyl(0.036, 0.028, 0.56, 8, 0, -0.82, 0),
  ]);
  const bladeMetal = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.88), rustBladeMat);
  bladeMetal.position.set(0, -1.32, -0.34);
  bladeMetal.rotation.x = 0.56;
  rightArm.add(new THREE.Mesh(rLimb, shroudMat), bladeMetal);
  group.add(rightArm);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.12, 0.72, 0);
  const lLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.038, 0.72, 8), shroudMat);
  lLegMesh.position.y = -0.36;
  leftLeg.add(lLegMesh);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.12, 0.72, 0);
  const rLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.038, 0.72, 8), shroudMat);
  rLegMesh.position.y = -0.36;
  rightLeg.add(rLegMesh);
  group.add(leftLeg, rightLeg);

  // Spectral Glasses X-Ray Silhouette (renders through ALL walls & floors when Glasses active)
  const xrayMat = new THREE.MeshBasicMaterial({
    color: 0x4df5ff,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
    depthWrite: false,
    fog: false,
  });
  const xrayHead = new THREE.SphereGeometry(0.19, 8, 8);
  xrayHead.scale(0.88, 1.25, 0.96);
  xrayHead.translate(0, 2.08, -0.09);
  const xrayGeo = mergeBakedGeos([
    translatedCyl(0.24, 0.28, 1.15, 8, 0, 1.32, 0),
    xrayHead,
    translatedCyl(0.05, 0.04, 0.95, 6, -0.34, 1.25, -0.04),
    translatedCyl(0.05, 0.04, 0.95, 6, 0.34, 1.25, -0.04),
    translatedBox(0.03, 0.14, 0.88, 0.34, 0.45, -0.34),
  ]);
  const spectralSilhouette = new THREE.Mesh(xrayGeo, xrayMat);
  spectralSilhouette.renderOrder = 999;
  spectralSilhouette.visible = false;
  group.add(spectralSilhouette);

  return {
    group,
    spectralSilhouette,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    head,
    jaw,
    bodyMat: shroudMat,
    eyeMat,
  };
}

/**
 * Shared Wardrobe Shell Geometry (for instancing) & Hinged Door Leaf.
 */
export function createWardrobeShellGeometry(): THREE.BufferGeometry {
  return mergeBakedGeos([
    translatedBox(1.06, 2.2, 0.07, 0, 1.1, 0.38),
    translatedBox(0.07, 2.2, 0.82, -0.49, 1.1, 0),
    translatedBox(0.07, 2.2, 0.82, 0.49, 1.1, 0),
    translatedBox(1.12, 0.12, 0.88, 0, 2.21, 0),
  ]);
}

export function createWardrobeDoorHandle(): LockerModelHandle {
  const group = new THREE.Group();
  const doorMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.46, 0, -0.39);
  const doorGeo = mergeColoredGeos([
    { geo: translatedBox(0.92, 2.08, 0.06, 0.46, 1.06, 0), color: 0x453224 },
    { geo: translatedBox(0.5, 0.22, 0.08, 0.46, 1.7, 0), color: 0x100c09 },
  ]);
  doorPivot.add(new THREE.Mesh(doorGeo, doorMat));
  group.add(doorPivot);
  return { group, doorPivot };
}

/**
 * Combined Iron & Oak Bed Geometry (for instancing in Floor 2 Cabin 1 & Master Bedroom).
 */
export function createBedGeometry(): THREE.BufferGeometry {
  return mergeColoredGeos([
    { geo: translatedBox(1.75, 0.1, 2.3, 0, 0.68, 0), color: 0x2d3330 },
    { geo: translatedBox(1.78, 1.22, 0.08, 0, 0.64, -1.14), color: 0x2d3330 },
    { geo: translatedCyl(0.04, 0.04, 0.7, 8, -0.82, 0.35, -1.1), color: 0x2d3330 },
    { geo: translatedCyl(0.04, 0.04, 0.7, 8, 0.82, 0.35, -1.1), color: 0x2d3330 },
    { geo: translatedCyl(0.04, 0.04, 0.7, 8, -0.82, 0.35, 1.1), color: 0x2d3330 },
    { geo: translatedCyl(0.04, 0.04, 0.7, 8, 0.82, 0.35, 1.1), color: 0x2d3330 },
    { geo: translatedBox(1.62, 0.2, 2.15, 0, 0.83, 0), color: 0x767266 },
    { geo: translatedBox(1.68, 0.22, 1.42, 0, 0.84, 0.34), color: 0x415246 },
  ]);
}

/**
 * Floor 1 Boiler Tank (2 draw calls: shell+pipe merged + glowing grate).
 */
export function createBoilerModel(): THREE.Group {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0.68 });
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xff6e38,
    emissive: 0xd93814,
    emissiveIntensity: 1.5,
    roughness: 0.3,
  });

  const cap = new THREE.SphereGeometry(0.78, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.translate(0, 1.85, 0);
  const tankAndPipeGeo = mergeColoredGeos([
    { geo: translatedCyl(0.78, 0.82, 1.8, 12, 0, 0.92, 0), color: 0x35322e },
    { geo: cap, color: 0x35322e },
    { geo: translatedCyl(0.11, 0.11, 1.5, 10, -0.78, 1.65, 0, 0, Math.PI / 2), color: 0x785239 },
  ]);
  const furnaceGrate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.12), emberMat);
  furnaceGrate.position.set(0, 0.45, 0.78);

  group.add(new THREE.Mesh(tankAndPipeGeo, metalMat), furnaceGrate);
  return group;
}

/**
 * Leaking Steam Pipe & Valve Socket (uses clean translucent cone plume — ZERO THREE.Points dots).
 */
export function createSteamValveModel(): SteamValveHandle {
  const group = new THREE.Group();
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x525954, roughness: 0.48, metalness: 0.76 });
  const valveMat = new THREE.MeshStandardMaterial({
    color: 0xb84a36,
    emissive: 0x3b120b,
    emissiveIntensity: 0.5,
    roughness: 0.45,
    metalness: 0.4,
  });

  const pipeGeo = mergeBakedGeos([
    translatedCyl(0.11, 0.11, 2.35, 10, 0, 1.18, 0),
    translatedCyl(0.18, 0.18, 0.14, 10, 0.15, 1.25, 0, 0, Math.PI / 2),
    translatedCyl(0.04, 0.04, 0.24, 8, 0.28, 1.25, 0, 0, Math.PI / 2),
  ]);
  group.add(new THREE.Mesh(pipeGeo, pipeMat));

  const attachedWheel = new THREE.Group();
  attachedWheel.position.set(0.38, 1.25, 0);
  attachedWheel.visible = false;
  const rim = new THREE.TorusGeometry(0.22, 0.032, 8, 14);
  rim.rotateY(Math.PI / 2);
  const wheelGeo = mergeBakedGeos([
    rim,
    translatedCyl(0.018, 0.018, 0.42, 6, 0, 0, 0),
    translatedCyl(0.018, 0.018, 0.42, 6, 0, 0, 0, Math.PI / 2, 0),
  ]);
  attachedWheel.add(new THREE.Mesh(wheelGeo, valveMat));
  group.add(attachedWheel);

  const plumeGeo = new THREE.CylinderGeometry(0.08, 0.45, 1.6, 10, 1, true);
  plumeGeo.rotateX(-Math.PI / 2);
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0x8ea6a0,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const steamPlume = new THREE.Mesh(plumeGeo, plumeMat);
  steamPlume.position.set(0, 1.15, -0.9);
  group.add(steamPlume);

  return { group, attachedWheel, steamPlume };
}

/**
 * Knockable noise-trap props (1 draw call each).
 */
export function createKnockableModel(kind: 'vase' | 'cart' | 'bucket'): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'vase') {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, metalness: 0.08 });
    const pts = [
      new THREE.Vector2(0.08, 0.65),
      new THREE.Vector2(0.18, 0.85),
      new THREE.Vector2(0.11, 1.08),
      new THREE.Vector2(0.14, 1.18),
    ];
    const geo = mergeColoredGeos([
      { geo: translatedCyl(0.22, 0.26, 0.65, 10, 0, 0.325, 0), color: 0x3a2c24 },
      { geo: new THREE.LatheGeometry(pts, 10), color: 0xaab5af },
    ]);
    group.add(new THREE.Mesh(geo, mat));
  } else if (kind === 'cart') {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x7b8682, roughness: 0.32, metalness: 0.82 });
    const cartGeo = mergeBakedGeos([
      translatedBox(0.68, 0.06, 0.46, 0, 0.78, 0),
      translatedCyl(0.02, 0.02, 0.78, 6, -0.28, 0.39, -0.18),
      translatedCyl(0.02, 0.02, 0.78, 6, 0.28, 0.39, -0.18),
      translatedCyl(0.02, 0.02, 0.78, 6, -0.28, 0.39, 0.18),
      translatedCyl(0.02, 0.02, 0.78, 6, 0.28, 0.39, 0.18),
    ]);
    group.add(new THREE.Mesh(cartGeo, steelMat));
  } else {
    const rustMat = new THREE.MeshStandardMaterial({ color: 0x665244, roughness: 0.65, metalness: 0.65 });
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.38, 10), rustMat);
    bucket.position.y = 0.19;
    group.add(bucket);
  }

  return group;
}

/**
 * Triangle Time-Loop Echo Corpse (2 draw calls + contact shadow).
 */
export function createEchoCorpseModel(shadowTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84 });
  const noteMat = new THREE.MeshStandardMaterial({
    color: 0xe8e0c5,
    emissive: 0x5c5538,
    emissiveIntensity: 0.85,
    roughness: 0.7,
  });

  group.add(createContactShadowDisc(shadowTex, 0.85, 0.55));
  const headGeo = new THREE.SphereGeometry(0.14, 8, 8);
  headGeo.translate(0.05, 0.16, -0.52);
  const bodyGeo = mergeColoredGeos([
    { geo: translatedBox(0.48, 0.22, 0.86, 0, 0.14, 0), color: 0x333f39 },
    { geo: headGeo, color: 0xa6b0a3 },
  ]);
  const note = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.32), noteMat);
  note.position.set(-0.32, 0.03, -0.46);
  note.rotation.y = -0.3;
  group.add(new THREE.Mesh(bodyGeo, bodyMat), note);
  return group;
}

/**
 * Triangle Time-Loop Phantom Echo silhouette (1 merged draw call).
 */
export function createPhantomSilhouetteModel(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0x0b120e,
    transparent: true,
    opacity: 0.8,
  });
  const head = new THREE.SphereGeometry(0.15, 8, 8);
  head.translate(0, 1.66, 0);
  const geo = mergeBakedGeos([
    translatedCyl(0.18, 0.24, 1.35, 8, 0, 0.82, 0),
    head,
  ]);
  group.add(new THREE.Mesh(geo, mat));
  return group;
}

/**
 * Steel Locker Shared Shell Geometry (for instancing) & Hinged Door Leaf.
 */
export function createLockerShellGeometry(): THREE.BufferGeometry {
  return mergeBakedGeos([
    translatedBox(0.94, 2.15, 0.06, 0, 1.075, 0.38),
    translatedBox(0.06, 2.15, 0.8, -0.44, 1.075, 0),
    translatedBox(0.06, 2.15, 0.8, 0.44, 1.075, 0),
    translatedBox(0.94, 0.07, 0.82, 0, 2.15, 0),
  ]);
}

export function createLockerDoorHandle(): LockerModelHandle {
  const group = new THREE.Group();
  const doorMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0.52 });

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.43, 0, -0.39);
  const doorGeo = mergeColoredGeos([
    { geo: translatedBox(0.86, 2.06, 0.05, 0.43, 1.05, 0), color: 0x35443c },
    { geo: translatedBox(0.46, 0.14, 0.07, 0.43, 1.72, 0), color: 0x0a0f0c },
  ]);
  doorPivot.add(new THREE.Mesh(doorGeo, doorMat));
  group.add(doorPivot);
  return { group, doorPivot };
}

/**
 * Industrial Main Breaker Box mounted on wall.
 */
export function createBreakerBoxModel(): BreakerModelHandle {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0.65 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x161b18, roughness: 0.8, metalness: 0.3 });
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xc93b3b,
    emissive: 0xc93b3b,
    emissiveIntensity: 1.9,
    roughness: 0.25,
  });

  const casingGeo = mergeColoredGeos([
    { geo: translatedBox(0.75, 0.96, 0.22, 0, 1.32, 0), color: 0x37413b },
    { geo: translatedCyl(0.04, 0.04, 1.0, 8, -0.18, 2.1, 0), color: 0x37413b },
    { geo: translatedCyl(0.04, 0.04, 1.0, 8, 0.18, 2.1, 0), color: 0x37413b },
    { geo: translatedBox(0.32, 0.34, 0.06, -0.1, 1.32, 0.11), color: 0x161b18 },
  ]);
  const statusLed = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), ledMat);
  statusLed.position.set(0.2, 1.58, 0.12);

  const lever = new THREE.Group();
  lever.position.set(0.22, 1.28, 0.11);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), darkMat);
  arm.position.y = 0.12;
  lever.add(arm);
  lever.rotation.x = 0.55;

  group.add(new THREE.Mesh(casingGeo, bodyMat), statusLed, lever);
  return { group, ledMat, lever };
}

/**
 * Framed Doorway Assembly with merged jamb/transom frame & handprint decal.
 */
export function createDoorAssembly(
  spec: DoorSpec,
  tileSize: number,
  ceilingHeight = FLOOR_HEIGHT,
  handprintTex?: THREE.Texture
): DoorModelHandle {
  const group = new THREE.Group();
  const totalWidth = spec.widthTiles * tileSize;
  const doorHeight = Math.min(2.38, ceilingHeight - 0.18);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x242c27, roughness: 0.58, metalness: 0.45 });
  const leafColor =
    spec.initialState === 'locked_exit'
      ? 0x35483d
      : spec.initialState === 'locked_key'
        ? 0x4f3d2e
        : 0x4a544c;
  const leafCombinedMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.58,
    metalness: 0.35,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x8aa395,
    roughness: 0.18,
    metalness: 0.18,
    transparent: true,
    opacity: 0.36,
  });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xb6a468, roughness: 0.28, metalness: 0.85 });

  const transomH = Math.max(0.18, ceilingHeight - doorHeight);
  const frameGeo = mergeBakedGeos([
    translatedBox(0.16, ceilingHeight, 0.32, -totalWidth / 2 + 0.08, ceilingHeight / 2, 0),
    translatedBox(0.16, ceilingHeight, 0.32, totalWidth / 2 - 0.08, ceilingHeight / 2, 0),
    translatedBox(totalWidth, transomH, 0.32, 0, doorHeight + transomH / 2, 0),
  ]);
  group.add(new THREE.Mesh(frameGeo, frameMat));

  const buildSingleLeaf = (leafWidth: number, hingeLeft: boolean, addGlass: boolean, addHandprint: boolean) => {
    const pivot = new THREE.Group();
    const xEdge = hingeLeft ? -leafWidth / 2 : leafWidth / 2;
    pivot.position.set(xEdge, 0, 0);
    const dir = hingeLeft ? 1 : -1;

    const leafGeo = mergeColoredGeos([
      {
        geo: translatedBox(leafWidth - 0.06, doorHeight - 0.04, 0.1, dir * (leafWidth / 2), doorHeight / 2, 0),
        color: leafColor,
      },
      {
        geo: translatedBox(leafWidth * 0.62, 0.06, 0.16, dir * (leafWidth * 0.5), 1.02, 0),
        color: 0xb6a468,
      },
    ]);
    pivot.add(new THREE.Mesh(leafGeo, leafCombinedMat));

    if (addGlass) {
      const windowPane = new THREE.Mesh(new THREE.BoxGeometry(leafWidth * 0.4, 0.58, 0.115), glassMat);
      windowPane.position.set(dir * (leafWidth * 0.5), doorHeight * 0.66, 0);
      pivot.add(windowPane);
    }

    if (addHandprint && handprintTex) {
      const decalMat = new THREE.MeshBasicMaterial({
        map: handprintTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), decalMat);
      decal.position.set(dir * (leafWidth * 0.56), 1.24, 0.062);
      pivot.add(decal);
    }

    return pivot;
  };

  const innerSpan = totalWidth - 0.32;
  const hasHandprint = spec.id === 'security_door' || spec.id === 'master_door';
  const hasGlass = spec.id === 'kitchen_north_door' || spec.id === 'east_hall_door' || spec.id === 'exit_doors';
  const leafPivot = buildSingleLeaf(innerSpan, true, hasGlass, hasHandprint);
  leafPivot.position.x = -innerSpan / 2;
  group.add(leafPivot);

  if (spec.initialState === 'locked_exit') {
    const chainGroup = new THREE.Group();
    const chainGeo = mergeColoredGeos([
      {
        geo: translatedCyl(0.025, 0.025, innerSpan * 0.92, 6, 0, 1.08, 0.09, 0, Math.PI / 2 - 0.14),
        color: 0x3b403e,
      },
      {
        geo: translatedCyl(0.025, 0.025, innerSpan * 0.92, 6, 0, 1.08, -0.09, 0, Math.PI / 2 + 0.14),
        color: 0x3b403e,
      },
      { geo: translatedBox(0.18, 0.24, 0.24, 0, 1.02, 0), color: 0xb6a468 },
    ]);
    chainGroup.add(new THREE.Mesh(chainGeo, leafCombinedMat));

    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xd13d3d,
      emissive: 0xd13d3d,
      emissiveIntensity: 1.8,
      roughness: 0.25,
    });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.22), ledMat);
    led.position.set(0, doorHeight + 0.16, 0);

    group.add(chainGroup, led);
    return {
      group,
      leafPivot,
      chainGroup,
      statusLedMat: ledMat,
    };
  }

  let padlockMesh: THREE.Mesh | undefined;
  if (spec.initialState === 'locked_key') {
    padlockMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.2), handleMat);
    padlockMesh.position.set(innerSpan * 0.35, 1.02, 0);
    group.add(padlockMesh);
  }

  return { group, leafPivot, padlockMesh };
}

/**
 * Multi-part Pickups (1 draw call each except fuse core glow).
 */
export function createPickupModel(id: ItemId): THREE.Group {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.15;

  if (id === 'ward_key') {
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xdcb252,
      emissive: 0x6b4f14,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.88,
    });
    const bow = new THREE.TorusGeometry(0.09, 0.022, 6, 12);
    bow.rotateX(Math.PI / 2);
    bow.translate(0, 0, 0.12);
    const keyGeo = mergeBakedGeos([
      bow,
      translatedCyl(0.018, 0.018, 0.24, 6, 0, 0, 0, Math.PI / 2, 0),
      translatedBox(0.06, 0.02, 0.035, 0.03, 0, -0.08),
      translatedBox(0.045, 0.02, 0.03, 0.025, 0, -0.02),
    ]);
    bodyGroup.add(new THREE.Mesh(keyGeo, brassMat));
  } else if (id === 'valve_wheel') {
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0xc95e43,
      emissive: 0x5c2214,
      emissiveIntensity: 0.85,
      roughness: 0.38,
      metalness: 0.65,
    });
    const rim = new THREE.TorusGeometry(0.16, 0.028, 6, 14);
    rim.rotateX(Math.PI / 2);
    const wheelGeo = mergeBakedGeos([
      rim,
      translatedCyl(0.016, 0.016, 0.3, 6, 0, 0, 0, 0, Math.PI / 2),
      translatedCyl(0.016, 0.016, 0.3, 6, 0, 0, 0, Math.PI / 2, 0),
      translatedCyl(0.04, 0.04, 0.06, 8, 0, 0, 0),
    ]);
    bodyGroup.add(new THREE.Mesh(wheelGeo, wheelMat));
  } else if (id === 'power_fuse') {
    const capMat = new THREE.MeshStandardMaterial({ color: 0xc29e4c, roughness: 0.25, metalness: 0.9 });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x7df0c4,
      emissive: 0x39b589,
      emissiveIntensity: 1.25,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 10), coreMat);
    body.rotation.z = Math.PI / 2;
    const caps = mergeBakedGeos([
      translatedCyl(0.062, 0.062, 0.06, 10, -0.12, 0, 0, 0, Math.PI / 2),
      translatedCyl(0.062, 0.062, 0.06, 10, 0.12, 0, 0, 0, Math.PI / 2),
    ]);
    bodyGroup.add(body, new THREE.Mesh(caps, capMat));
  } else {
    const cutterMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: 0x260b08,
      emissiveIntensity: 0.4,
      roughness: 0.45,
      metalness: 0.4,
    });
    const geo = mergeColoredGeos([
      { geo: translatedCyl(0.022, 0.024, 0.42, 6, -0.07, 0, 0.1, Math.PI / 2, 0.18), color: 0xba453c },
      { geo: translatedCyl(0.022, 0.024, 0.42, 6, 0.07, 0, 0.1, Math.PI / 2, -0.18), color: 0xba453c },
      { geo: translatedBox(0.055, 0.03, 0.16, -0.035, 0, -0.16), color: 0xa2adb0 },
      { geo: translatedBox(0.055, 0.03, 0.16, 0.035, 0, -0.16), color: 0xa2adb0 },
    ]);
    bodyGroup.add(new THREE.Mesh(geo, cutterMat));
  }

  group.add(bodyGroup);
  return group;
}

/**
 * Grand Ballroom Broken Hanging Chandelier (2 draw calls: wrought-iron frame + dusty crystal glow).
 */
export function createChandelierModel(): THREE.Group {
  const group = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.55, metalness: 0.75 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xd6d1ad,
    emissive: 0x5c5330,
    emissiveIntensity: 0.75,
    roughness: 0.35,
  });

  const rim = new THREE.TorusGeometry(0.95, 0.04, 6, 16);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, -1.15, 0);

  const upperRim = new THREE.TorusGeometry(0.55, 0.03, 6, 12);
  upperRim.rotateX(Math.PI / 2);
  upperRim.translate(0, -0.68, 0);

  const frameGeo = mergeBakedGeos([
    translatedCyl(0.035, 0.035, 1.35, 6, 0, -0.68, 0),
    rim,
    upperRim,
    translatedBox(1.9, 0.04, 0.04, 0, -1.15, 0),
    translatedBox(0.04, 0.04, 1.9, 0, -1.15, 0),
  ]);
  group.add(new THREE.Mesh(frameGeo, ironMat));

  const bulbs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    bulbs.push(translatedCyl(0.03, 0.04, 0.14, 6, Math.cos(a) * 0.95, -1.04, Math.sin(a) * 0.95));
  }
  group.add(new THREE.Mesh(mergeBakedGeos(bulbs), bulbMat));
  return group;
}

/**
 * Grand Ballroom Fluted Marble Structural Column (for InstancedMesh).
 */
export function createMarblePillarGeometry(height = 6.0): THREE.BufferGeometry {
  return mergeColoredGeos([
    { geo: translatedBox(0.95, 0.32, 0.95, 0, 0.16, 0), color: 0x3b413d },
    { geo: translatedCyl(0.34, 0.38, height - 0.64, 10, 0, height * 0.5, 0), color: 0x4f5650 },
    { geo: translatedBox(0.98, 0.32, 0.98, 0, height - 0.16, 0), color: 0x3b413d },
  ]);
}

/**
 * Grand Ballroom Dusty Furniture Draped in Pale Dust Sheets (for InstancedMesh).
 */
export function createSheetedFurnitureGeometry(w = 1.8, h = 1.05, d = 1.6): THREE.BufferGeometry {
  return mergeColoredGeos([
    { geo: translatedBox(w, h * 0.85, d, 0, h * 0.425, 0), color: 0x9aa39b },
    { geo: translatedBox(w * 0.92, h * 0.24, d * 0.92, 0, h * 0.88, 0), color: 0xadb5ad },
    { geo: translatedBox(w * 1.04, 0.16, d * 1.04, 0, 0.08, 0), color: 0x6f7770 },
  ]);
}

/**
 * Decayed Tall Library Bookshelf filled with faded leather volumes (for InstancedMesh).
 */
export function createBookshelfGeometry(w = 4.2, h = 2.55, d = 0.9): THREE.BufferGeometry {
  const parts: Array<{ geo: THREE.BufferGeometry; color: number }> = [
    { geo: translatedBox(w, h, 0.08, 0, h * 0.5, 0), color: 0x2c2017 },
    { geo: translatedBox(0.1, h, d, -w * 0.5 + 0.05, h * 0.5, 0), color: 0x3b2b1e },
    { geo: translatedBox(0.1, h, d, w * 0.5 - 0.05, h * 0.5, 0), color: 0x3b2b1e },
  ];
  const shelfHeights = [0.16, 0.72, 1.32, 1.92, 2.5];
  shelfHeights.forEach((sy, idx) => {
    parts.push({ geo: translatedBox(w, 0.08, d, 0, sy, 0), color: 0x3b2b1e });
    if (idx < shelfHeights.length - 1) {
      parts.push({
        geo: translatedBox(w * 0.82, 0.42, d * 0.68, -w * 0.04, sy + 0.25, 0),
        color: idx % 2 === 0 ? 0x4b3830 : 0x354038,
      });
    }
  });
  return mergeColoredGeos(parts);
}

/**
 * Floor 2 Library Mezzanine Open Balcony Wooden Balustrade Railing.
 */
export function createMezzanineRailingGeometry(length: number): THREE.BufferGeometry {
  const parts: Array<{ geo: THREE.BufferGeometry; color: number }> = [
    { geo: translatedBox(length, 0.09, 0.12, 0, 0.96, 0), color: 0x4d3929 },
    { geo: translatedBox(length, 0.07, 0.1, 0, 0.05, 0), color: 0x36281c },
  ];
  const posts = Math.max(2, Math.round(length / 0.75));
  for (let i = 0; i <= posts; i++) {
    const px = -length * 0.5 + (i / posts) * length;
    parts.push({
      geo: translatedBox(0.07, 0.92, 0.07, px, 0.48, 0),
      color: i === 0 || i === posts ? 0x31241a : 0x453324,
    });
  }
  return mergeColoredGeos(parts);
}

/**
 * Collectible Occult Glass Shard (recharges Spectral Glasses).
 */
export function createGlassShardModel(): THREE.Group {
  const group = new THREE.Group();
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0x6ef7ff,
    emissive: 0x1eb8d4,
    emissiveIntensity: 1.5,
    roughness: 0.12,
    metalness: 0.3,
  });
  const crystal = new THREE.OctahedronGeometry(0.14, 0);
  crystal.scale(0.65, 1.55, 0.65);
  const mesh = new THREE.Mesh(crystal, shardMat);
  mesh.position.y = 0.2;
  group.add(mesh);
  return group;
}

/**
 * P.T. / Endless Corridor Eerie Crimson Red Door (appears behind player).
 */
export function createRedShiftDoorModel(tileSize: number, ceilingHeight = FLOOR_HEIGHT): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x240b0b, roughness: 0.65 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x7a1717,
    emissive: 0x290404,
    emissiveIntensity: 0.75,
    roughness: 0.42,
    metalness: 0.2,
  });
  const knobMat = new THREE.MeshStandardMaterial({ color: 0xd4b56a, roughness: 0.25, metalness: 0.9 });

  const doorH = Math.min(2.38, ceilingHeight - 0.18);
  const transomH = Math.max(0.18, ceilingHeight - doorH);
  const frameGeo = mergeBakedGeos([
    translatedBox(0.18, ceilingHeight, 0.34, -tileSize / 2 + 0.09, ceilingHeight / 2, 0),
    translatedBox(0.18, ceilingHeight, 0.34, tileSize / 2 - 0.09, ceilingHeight / 2, 0),
    translatedBox(tileSize, transomH, 0.34, 0, doorH + transomH / 2, 0),
  ]);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(tileSize - 0.34, doorH, 0.12), leafMat);
  leaf.position.y = doorH / 2;

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), knobMat);
  knob.position.set(0.55, 1.05, 0);

  group.add(new THREE.Mesh(frameGeo, frameMat), leaf, knob);
  return group;
}
