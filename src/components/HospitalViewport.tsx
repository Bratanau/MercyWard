import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HorrorAudioEngine } from '../game/audio';
import {
  BREAKER_BOX_POS,
  CREAKY_FLOORS,
  ENDLESS_CORRIDOR_BOUNDS,
  FLOOR1_GRID,
  FLOOR2_GRID,
  FLOOR2_Y,
  FLOOR_HEIGHT,
  GRID_COLS,
  GRID_ROWS,
  HIDE_SPOTS,
  INITIAL_DOORS,
  INITIAL_GLASS_SHARDS,
  INITIAL_KNOCKABLES,
  isBallroomCell,
  isShiftManagedCell,
  ITEM_SPAWN_POINTS,
  SHIFT_MANAGED_CELLS,
  skipsInterFloorSlab,
  STEAM_VALVE_POS,
  TILE_SIZE,
} from '../game/mapData';
import {
  BreakerModelHandle,
  createBedGeometry,
  createBoilerModel,
  createBookshelfGeometry,
  createBreakerBoxModel,
  createChandelierModel,
  createDoorAssembly,
  createEchoCorpseModel,
  createGlassShardModel,
  createKitchenIslandModel,
  createKnockableModel,
  createLockerDoorHandle,
  createLockerShellGeometry,
  createMarblePillarGeometry,
  createMezzanineRailingGeometry,
  createPhantomSilhouetteModel,
  createPickupModel,
  createRedShiftDoorModel,
  createSheetedFurnitureGeometry,
  createStaircaseFlightMesh,
  createSteamValveModel,
  createThreatModel,
  createWardrobeDoorHandle,
  createWardrobeShellGeometry,
  DoorModelHandle,
  LockerModelHandle,
  SteamValveHandle,
  ThreatModelHandle,
} from '../game/models';
import {
  buildHudSnapshot,
  createInitialSimulation,
  isWallCell,
  SimulationState,
  stepSimulation,
} from '../game/rules';
import {
  createBloodDragDecalTexture,
  createCeilingTexture,
  createCellarWallTextures,
  createContactShadowTexture,
  createFloorTextures,
  createHandprintDecalTexture,
  createSignTexture,
  createWallTextures,
  createWaterPuddleTexture,
  createWoodFloorTextures,
} from '../game/textures';
import { EchoRecord, GameHudSnapshot, GamePhase, ItemId } from '../game/types';

export interface MobileControlState {
  moveX: number; // -1..1
  moveY: number; // -1..1 (up = +1)
  sprint: boolean;
}

export interface HospitalController {
  startNewRun: (advanceLoop?: boolean, resetTimeline?: boolean) => void;
  setPhase: (phase: GamePhase) => void;
  toggleMute: () => boolean;
  triggerInteract: () => void;
  triggerCrouch: () => void;
  triggerGlasses: () => void;
  selectSlot: (slotIndex: number) => void;
}

interface HospitalViewportProps {
  autostart: boolean;
  mobileInputRef: React.MutableRefObject<MobileControlState>;
  controllerRef: React.MutableRefObject<HospitalController | null>;
  onHudUpdate: (snapshot: GameHudSnapshot) => void;
  onMuteChange: (muted: boolean) => void;
}

const TOUCH_SENSITIVITY = 0.003;
const TOUCH_SPIKE_LIMIT = 50;
const PITCH_CLAMP = 1.3;

export const HospitalViewport: React.FC<HospitalViewportProps> = ({
  autostart,
  mobileInputRef,
  controllerRef,
  onHudUpdate,
  onMuteChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onMuteChangeRef = useRef(onMuteChange);
  onHudUpdateRef.current = onHudUpdate;
  onMuteChangeRef.current = onMuteChange;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Software-WebGL probe (for automated headless render verification pacing)
    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 60 FPS Mobile Optimization: cap pixel ratio <= 1.2, disable shadow maps
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: isSoftwareGl,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    // Clean Three.js built-in darkness (no post-processing, no white particle dots)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070a);
    scene.fog = new THREE.FogExp2(0x05070a, 0.08);

    const camera = new THREE.PerspectiveCamera(68, width / height, 0.1, 48);
    camera.rotation.order = 'YXZ';

    const audio = new HorrorAudioEngine();
    const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    // Minimal ambient light + single camera-attached Flashlight SpotLight
    const ambientLight = new THREE.AmbientLight(0x111622, 0.2);
    scene.add(ambientLight);

    const flashlight = new THREE.SpotLight(0xeef6ff, 22, 14, Math.PI / 6, 0.6, 1.4);
    flashlight.castShadow = false;
    flashlight.position.set(0.12, -0.08, 0);
    flashlight.target.position.set(0, -0.04, -5);
    camera.add(flashlight);
    camera.add(flashlight.target);
    scene.add(camera);

    // Procedural Textures & Shared Materials
    const foyerFloorTex = createFloorTextures(maxAniso);
    foyerFloorTex.map.repeat.set(11.5, 11.5);
    foyerFloorTex.bumpMap.repeat.set(11.5, 11.5);

    const woodFloorTex = createWoodFloorTextures(maxAniso);
    woodFloorTex.map.repeat.set(1, 1);
    woodFloorTex.bumpMap.repeat.set(1, 1);

    const wallTex = createWallTextures(maxAniso);
    const cellarWallTex = createCellarWallTextures(maxAniso);
    const ceilingTex = createCeilingTexture(maxAniso);
    ceilingTex.repeat.set(11, 11);

    const shadowTex = createContactShadowTexture();
    const bloodDecalTex = createBloodDragDecalTexture();
    const handprintTex = createHandprintDecalTexture();
    const puddleTex = createWaterPuddleTexture();

    const f1FloorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: foyerFloorTex.map,
      bumpMap: foyerFloorTex.bumpMap,
      bumpScale: 0.02,
      roughness: 0.7,
      metalness: 0.08,
    });
    const f2SlabMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodFloorTex.map,
      bumpMap: woodFloorTex.bumpMap,
      bumpScale: 0.024,
      roughness: 0.85,
      metalness: 0.04,
    });
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: wallTex.map,
      bumpMap: wallTex.bumpMap,
      bumpScale: 0.025,
      roughness: 0.86,
      metalness: 0.04,
    });
    const boilerWallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cellarWallTex.map,
      bumpMap: cellarWallTex.bumpMap,
      bumpScale: 0.025,
      roughness: 0.8,
      metalness: 0.06,
    });
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: ceilingTex,
      roughness: 0.94,
      metalness: 0.02,
    });

    // 2-Story Sprawling Estate Architecture (46m x 46m, 2.0m narrow corridors, Grand Ballroom & 2-Story Library)
    const worldSpan = GRID_COLS * TILE_SIZE;
    const f1Floor = new THREE.Mesh(new THREE.PlaneGeometry(worldSpan, worldSpan), f1FloorMat);
    f1Floor.rotation.x = -Math.PI / 2;
    f1Floor.position.set(worldSpan / 2, 0, worldSpan / 2);
    scene.add(f1Floor);

    // Top ceiling at Y = FLOOR2_Y + FLOOR_HEIGHT (6.3m)
    const f2Ceiling = new THREE.Mesh(new THREE.PlaneGeometry(worldSpan, worldSpan), ceilingMat);
    f2Ceiling.rotation.x = Math.PI / 2;
    f2Ceiling.position.set(worldSpan / 2, FLOOR2_Y + FLOOR_HEIGHT, worldSpan / 2);
    scene.add(f2Ceiling);

    // Inter-story slab (Y = 2.8m .. 3.5m) skipped over Stairs, Grand Ballroom & Library Open Atrium (1 InstancedMesh!)
    const slabThickness = FLOOR2_Y - FLOOR_HEIGHT; // 0.7m
    const slabCoords: Array<{ col: number; row: number }> = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (!skipsInterFloorSlab(c, r)) {
          slabCoords.push({ col: c, row: r });
        }
      }
    }
    const slabGeo = new THREE.BoxGeometry(TILE_SIZE, slabThickness, TILE_SIZE);
    const slabInst = new THREE.InstancedMesh(slabGeo, f2SlabMat, slabCoords.length);
    const m4 = new THREE.Matrix4();
    slabCoords.forEach((cell, idx) => {
      m4.makeTranslation(
        (cell.col + 0.5) * TILE_SIZE,
        FLOOR_HEIGHT + slabThickness * 0.5,
        (cell.row + 0.5) * TILE_SIZE
      );
      slabInst.setMatrixAt(idx, m4);
    });
    slabInst.instanceMatrix.needsUpdate = true;
    slabInst.computeBoundingSphere();
    scene.add(slabInst);

    // Static Walls via 3 InstancedMesh draw calls (Shift-managed cells & Ballroom air void excluded!)
    const f1StandardWalls: Array<{ col: number; row: number }> = [];
    const f1BoilerWalls: Array<{ col: number; row: number }> = [];
    const f2Walls: Array<{ col: number; row: number }> = [];

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (FLOOR1_GRID[r][c] === '#' && !isShiftManagedCell(0, c, r)) {
          if (c <= 6 && r <= 12) f1BoilerWalls.push({ col: c, row: r });
          else f1StandardWalls.push({ col: c, row: r });
        }
        if (FLOOR2_GRID[r][c] === '#' && !isBallroomCell(c, r) && !isShiftManagedCell(1, c, r)) {
          f2Walls.push({ col: c, row: r });
        }
      }
    }

    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, FLOOR_HEIGHT, TILE_SIZE);
    const buildWallInst = (
      coords: Array<{ col: number; row: number }>,
      baseY: number,
      mat: THREE.Material
    ) => {
      if (coords.length === 0) return;
      const inst = new THREE.InstancedMesh(wallGeo, mat, coords.length);
      coords.forEach((cell, idx) => {
        m4.makeTranslation(
          (cell.col + 0.5) * TILE_SIZE,
          baseY + FLOOR_HEIGHT * 0.5,
          (cell.row + 0.5) * TILE_SIZE
        );
        inst.setMatrixAt(idx, m4);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      scene.add(inst);
    };
    buildWallInst(f1StandardWalls, 0, wallMat);
    buildWallInst(f1BoilerWalls, 0, boilerWallMat);
    buildWallInst(f2Walls, FLOOR2_Y, wallMat);

    // Dynamic Architecture Shift Wall Meshes (toggled live by sim.shifts.gridOverrides)
    const shiftWallMeshes = new Map<string, { floor: 0 | 1; col: number; row: number; mesh: THREE.Mesh }>();
    SHIFT_MANAGED_CELLS.forEach((sc) => {
      const mat = sc.floor === 0 && sc.col <= 6 ? boilerWallMat : wallMat;
      const mesh = new THREE.Mesh(wallGeo, mat);
      const baseY = sc.floor === 1 ? FLOOR2_Y : 0;
      mesh.position.set(
        (sc.col + 0.5) * TILE_SIZE,
        baseY + FLOOR_HEIGHT * 0.5,
        (sc.row + 0.5) * TILE_SIZE
      );
      scene.add(mesh);
      shiftWallMeshes.set(`${sc.floor}:${sc.col},${sc.row}`, {
        floor: sc.floor,
        col: sc.col,
        row: sc.row,
        mesh,
      });
    });

    // Non-Euclidean Red Door inside Endless Corridor (Floor 2, Row 1, Col 9)
    const redShiftDoor = createRedShiftDoorModel(TILE_SIZE, FLOOR_HEIGHT);
    redShiftDoor.position.set(
      (ENDLESS_CORRIDOR_BOUNDS.redDoorGridX + 0.5) * TILE_SIZE,
      FLOOR2_Y,
      (ENDLESS_CORRIDOR_BOUNDS.redDoorGridZ + 0.5) * TILE_SIZE
    );
    redShiftDoor.rotation.y = Math.PI / 2;
    redShiftDoor.visible = false;
    scene.add(redShiftDoor);

    // 3 Functional Wooden Staircases (Y=0 <-> Y=3.5)
    // 1. Main Staircase: col 11, z in [12, 18] (South z=18 Y=0 -> North z=12 Y=3.5)
    const mainStairs = createStaircaseFlightMesh(FLOOR2_Y, 6.0, 1.92, 14);
    mainStairs.position.set(11.5 * TILE_SIZE, 0, 15.0);
    scene.add(mainStairs);

    // 2. West Service / Cellar Staircase: col 2, z in [18, 24] (North z=18 Y=0 -> South z=24 Y=3.5)
    const westStairs = createStaircaseFlightMesh(FLOOR2_Y, 6.0, 1.92, 14);
    westStairs.position.set(2.5 * TILE_SIZE, 0, 21.0);
    westStairs.rotation.y = Math.PI;
    scene.add(westStairs);

    // 3. Library Grand Staircase: col 21, z in [24, 30] (South z=30 Y=0 -> North z=24 Y=3.5)
    const libraryStairs = createStaircaseFlightMesh(FLOOR2_Y, 6.0, 1.92, 14);
    libraryStairs.position.set(21.5 * TILE_SIZE, 0, 27.0);
    scene.add(libraryStairs);

    // Reused Matrix Helpers
    const bp = new THREE.Vector3();
    const bq = new THREE.Quaternion();
    const bs = new THREE.Vector3();
    const bm = new THREE.Matrix4();
    const rotEuler = new THREE.Euler();

    // Grand Room 1: THE GRAND BALLROOM (Double-Height Y=6.0m Chandeliers, Pillars & Sheeted Furniture)
    const chandelierPositions = [
      { x: 11.5 * TILE_SIZE, y: 6.25, z: 12.8 * TILE_SIZE },
      { x: 11.5 * TILE_SIZE, y: 6.25, z: 16.0 * TILE_SIZE },
    ];
    chandelierPositions.forEach((cp) => {
      const ch = createChandelierModel();
      ch.position.set(cp.x, cp.y, cp.z);
      scene.add(ch);
    });

    const pillarCoords = [
      [9.55 * TILE_SIZE, 12.55 * TILE_SIZE],
      [13.45 * TILE_SIZE, 12.55 * TILE_SIZE],
      [9.55 * TILE_SIZE, 16.45 * TILE_SIZE],
      [13.45 * TILE_SIZE, 16.45 * TILE_SIZE],
    ];
    const pillarInst = new THREE.InstancedMesh(
      createMarblePillarGeometry(FLOOR2_Y + FLOOR_HEIGHT),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.08 }),
      pillarCoords.length
    );
    bq.identity();
    pillarCoords.forEach(([px, pz], idx) => {
      bp.set(px, 0, pz);
      bs.set(1, 1, 1);
      bm.compose(bp, bq, bs);
      pillarInst.setMatrixAt(idx, bm);
    });
    pillarInst.instanceMatrix.needsUpdate = true;
    scene.add(pillarInst);

    const sheetPlacements = [
      { x: 11.5 * TILE_SIZE, z: 14.5 * TILE_SIZE, sx: 1.2, sy: 1.0, sz: 1.2, rotY: 0 },
      { x: 9.25 * TILE_SIZE, z: 14.65 * TILE_SIZE, sx: 0.9, sy: 0.95, sz: 1.35, rotY: 0.1 },
      { x: 13.75 * TILE_SIZE, z: 14.65 * TILE_SIZE, sx: 0.9, sy: 0.95, sz: 1.35, rotY: -0.1 },
    ];
    const sheetInst = new THREE.InstancedMesh(
      createSheetedFurnitureGeometry(1.8, 1.05, 1.6),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02 }),
      sheetPlacements.length
    );
    sheetPlacements.forEach((s, idx) => {
      bp.set(s.x, 0, s.z);
      rotEuler.set(0, s.rotY, 0);
      bq.setFromEuler(rotEuler);
      bs.set(s.sx, s.sy, s.sz);
      bm.compose(bp, bq, bs);
      sheetInst.setMatrixAt(idx, bm);
    });
    sheetInst.instanceMatrix.needsUpdate = true;
    scene.add(sheetInst);

    // Grand Room 2: THE 2-STORY DECAYED LIBRARY (Floor 1 Tall Bookshelves + Floor 2 Mezzanine Railings)
    const shelfPlacements = [
      { x: 18.55 * TILE_SIZE, z: 12.0 * TILE_SIZE, sx: 1.0, sz: 1.15, rotY: 0 },
      { x: 18.55 * TILE_SIZE, z: 14.0 * TILE_SIZE, sx: 1.0, sz: 1.15, rotY: 0 },
      { x: 18.55 * TILE_SIZE, z: 16.0 * TILE_SIZE, sx: 1.0, sz: 1.15, rotY: 0 },
      { x: 20.55 * TILE_SIZE, z: 13.5 * TILE_SIZE, sx: 1.25, sz: 1.4, rotY: Math.PI / 2 },
    ];
    const shelfInst = new THREE.InstancedMesh(
      createBookshelfGeometry(4.2, 2.55, 0.9),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.06 }),
      shelfPlacements.length
    );
    shelfPlacements.forEach((sh, idx) => {
      bp.set(sh.x, 0, sh.z);
      rotEuler.set(0, sh.rotY, 0);
      bq.setFromEuler(rotEuler);
      bs.set(sh.sx, 1, sh.sz);
      bm.compose(bp, bq, bs);
      shelfInst.setMatrixAt(idx, bm);
    });
    shelfInst.instanceMatrix.needsUpdate = true;
    scene.add(shelfInst);

    // Library Floor 2 Mezzanine Guardrails (boxing open Atrium void cols 17..19, rows 12..15)
    const railMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.06 });
    const ewRailGeo = createMezzanineRailingGeometry(6.0);
    const nsRailGeo = createMezzanineRailingGeometry(8.0);
    const railNorth = new THREE.Mesh(ewRailGeo, railMat);
    railNorth.position.set(18.5 * TILE_SIZE, FLOOR2_Y, 12.04 * TILE_SIZE);
    const railSouth = new THREE.Mesh(ewRailGeo, railMat);
    railSouth.position.set(18.5 * TILE_SIZE, FLOOR2_Y, 15.96 * TILE_SIZE);
    const railWest = new THREE.Mesh(nsRailGeo, railMat);
    railWest.rotation.y = Math.PI / 2;
    railWest.position.set(17.04 * TILE_SIZE, FLOOR2_Y, 14.0 * TILE_SIZE);
    const railEast = new THREE.Mesh(nsRailGeo, railMat);
    railEast.rotation.y = Math.PI / 2;
    railEast.position.set(19.96 * TILE_SIZE, FLOOR2_Y, 14.0 * TILE_SIZE);
    const stairSideRailGeo = createMezzanineRailingGeometry(6.0);
    const railLibraryStair = new THREE.Mesh(stairSideRailGeo, railMat);
    railLibraryStair.rotation.y = Math.PI / 2;
    railLibraryStair.position.set(20.96 * TILE_SIZE, FLOOR2_Y, 13.5 * TILE_SIZE);
    scene.add(railNorth, railSouth, railWest, railEast, railLibraryStair);

    // Creaky wood floorboard visual strips (Instanced)
    const creakMat = new THREE.MeshStandardMaterial({
      color: 0x5c442d,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const creakGeo = new THREE.PlaneGeometry(1, 1);
    creakGeo.rotateX(-Math.PI / 2);
    const creakInst = new THREE.InstancedMesh(creakGeo, creakMat, CREAKY_FLOORS.length);
    bq.identity();
    CREAKY_FLOORS.forEach((cf, idx) => {
      const baseY = cf.floor === 1 ? FLOOR2_Y : 0;
      bp.set((cf.minX + cf.maxX) / 2, baseY + 0.015, (cf.minZ + cf.maxZ) / 2);
      bs.set(cf.maxX - cf.minX, 1, cf.maxZ - cf.minZ);
      bm.compose(bp, bq, bs);
      creakInst.setMatrixAt(idx, bm);
    });
    creakInst.instanceMatrix.needsUpdate = true;
    scene.add(creakInst);

    // Exit backdrop outside South Exit Door (11, 22)
    const exitBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE_SIZE * 1.4, FLOOR_HEIGHT),
      new THREE.MeshBasicMaterial({ color: 0x050907 })
    );
    exitBackdrop.position.set(11.5 * TILE_SIZE, FLOOR_HEIGHT / 2, 22.95 * TILE_SIZE);
    exitBackdrop.rotation.y = Math.PI;
    scene.add(exitBackdrop);

    // Blood drag & water puddle decals (Instanced)
    const decalPlane = new THREE.PlaneGeometry(1, 1);
    decalPlane.rotateX(-Math.PI / 2);
    const bloodDecalMat = new THREE.MeshBasicMaterial({
      map: bloodDecalTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const bloodSpots = [
      { x: 11.5 * TILE_SIZE, y: 0, z: 19.6 * TILE_SIZE, w: 1.1, h: 2.2, rot: 0.08 },
      { x: 12.2 * TILE_SIZE, y: 0, z: 14.5 * TILE_SIZE, w: 1.3, h: 2.8, rot: 0.35 },
      { x: 18.5 * TILE_SIZE, y: 0, z: 13.0 * TILE_SIZE, w: 1.1, h: 2.3, rot: Math.PI / 2 },
      { x: 13.5 * TILE_SIZE, y: FLOOR2_Y, z: 1.5 * TILE_SIZE, w: 1.1, h: 2.3, rot: Math.PI / 2 },
    ];
    const bloodInst = new THREE.InstancedMesh(decalPlane, bloodDecalMat, bloodSpots.length);
    bloodSpots.forEach((b, idx) => {
      bp.set(b.x, b.y + 0.02, b.z);
      rotEuler.set(0, b.rot, 0);
      bq.setFromEuler(rotEuler);
      bs.set(b.w, 1, b.h);
      bm.compose(bp, bq, bs);
      bloodInst.setMatrixAt(idx, bm);
    });
    bloodInst.instanceMatrix.needsUpdate = true;
    scene.add(bloodInst);

    const puddleMat = new THREE.MeshStandardMaterial({
      map: puddleTex,
      transparent: true,
      roughness: 0.08,
      metalness: 0.5,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const puddleCoords = [
      [3.4 * TILE_SIZE, 0, 2.6 * TILE_SIZE, 1.9],
      [11.4 * TILE_SIZE, 0, 12.2 * TILE_SIZE, 1.8],
      [3.5 * TILE_SIZE, 0, 9.5 * TILE_SIZE, 2.1],
      [16.5 * TILE_SIZE, FLOOR2_Y, 10.8 * TILE_SIZE, 1.4],
    ];
    const puddleInst = new THREE.InstancedMesh(decalPlane, puddleMat, puddleCoords.length);
    bq.identity();
    puddleCoords.forEach(([px, py, pz, sz], idx) => {
      bp.set(px, py + 0.02, pz);
      bs.set(sz, 1, sz);
      bm.compose(bp, bq, bs);
      puddleInst.setMatrixAt(idx, bm);
    });
    puddleInst.instanceMatrix.needsUpdate = true;
    scene.add(puddleInst);

    // Diegetic Zone Signs
    const signConfigs = [
      {
        text: 'EXIT — FLOOR 1',
        x: 11.5 * TILE_SIZE,
        y: 2.48,
        z: 22.18 * TILE_SIZE,
        rotY: Math.PI,
        bg: '#16241a',
        fg: '#89f29a',
        border: '#4ea860',
        w: 1.5,
        h: 0.36,
      },
      {
        text: 'GRAND BALLROOM',
        x: 11.5 * TILE_SIZE,
        y: 2.45,
        z: 18.2 * TILE_SIZE,
        rotY: 0,
        bg: '#1d1915',
        fg: '#e0ccb0',
        border: '#7a6548',
        w: 1.55,
        h: 0.36,
      },
      {
        text: 'BOILER UTILITY',
        x: 3.5 * TILE_SIZE,
        y: 2.38,
        z: 5.78 * TILE_SIZE,
        rotY: 0,
        bg: '#2b1614',
        fg: '#f09589',
        border: '#9c3e35',
        w: 1.45,
        h: 0.34,
      },
      {
        text: 'DECAYED LIBRARY',
        x: 15.22 * TILE_SIZE,
        y: 2.38,
        z: 14.5 * TILE_SIZE,
        rotY: -Math.PI / 2,
        bg: '#1c1814',
        fg: '#e0c692',
        border: '#7d623b',
        w: 1.5,
        h: 0.34,
      },
    ];
    const signTextures: THREE.Texture[] = [];
    signConfigs.forEach((sc) => {
      const tex = createSignTexture(sc.text, sc.bg, sc.fg, sc.border, maxAniso);
      signTextures.push(tex);
      const signMesh = new THREE.Mesh(
        new THREE.BoxGeometry(sc.w, sc.h, 0.06),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: tex,
          emissive: sc.text.startsWith('EXIT') ? 0x2f7d3a : 0x161a18,
          emissiveIntensity: sc.text.startsWith('EXIT') ? 0.9 : 0.35,
          roughness: 0.45,
        })
      );
      signMesh.position.set(sc.x, sc.y, sc.z);
      signMesh.rotation.y = sc.rotY;
      scene.add(signMesh);
    });

    // Static contact shadows pool
    const staticShadows: Array<{ x: number; y: number; z: number; r: number }> = [];

    // Floor 1 Kitchen Island Counter (loop around to break sight!)
    const kitchenCounter = createKitchenIslandModel(3.1, 3.4);
    kitchenCounter.position.set(2.95 * TILE_SIZE, 0, 19.0 * TILE_SIZE);
    scene.add(kitchenCounter);
    staticShadows.push({ x: 2.95 * TILE_SIZE, y: 0, z: 19.0 * TILE_SIZE, r: 1.8 });

    // Floor 1 Boiler Tank + Steam Valve + Main Breaker Box
    const boilerUnit = createBoilerModel();
    boilerUnit.position.set(2.2 * TILE_SIZE, 0, 2.0 * TILE_SIZE);
    scene.add(boilerUnit);
    staticShadows.push({ x: 2.2 * TILE_SIZE, y: 0, z: 2.0 * TILE_SIZE, r: 1.4 });

    const steamValveHandle: SteamValveHandle = createSteamValveModel();
    steamValveHandle.group.position.set(STEAM_VALVE_POS.x, STEAM_VALVE_POS.y, STEAM_VALVE_POS.z);
    scene.add(steamValveHandle.group);

    const breakerHandle: BreakerModelHandle = createBreakerBoxModel();
    breakerHandle.group.position.set(BREAKER_BOX_POS.x, BREAKER_BOX_POS.y, BREAKER_BOX_POS.z);
    breakerHandle.group.rotation.y = Math.PI / 2;
    scene.add(breakerHandle.group);

    // Floor 2 Cabin 1 Bed & Master Bedroom Bed (1 InstancedMesh!)
    const bedPlacements = [
      { x: 1.9 * TILE_SIZE, y: FLOOR2_Y, z: 4.8 * TILE_SIZE, rotY: Math.PI / 2 },
      { x: 21.0 * TILE_SIZE, y: FLOOR2_Y, z: 19.7 * TILE_SIZE, rotY: 0 },
    ];
    const bedInst = new THREE.InstancedMesh(
      createBedGeometry(),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.2 }),
      bedPlacements.length
    );
    bedPlacements.forEach((b, idx) => {
      bp.set(b.x, b.y, b.z);
      rotEuler.set(0, b.rotY, 0);
      bq.setFromEuler(rotEuler);
      bs.set(1, 1, 1);
      bm.compose(bp, bq, bs);
      bedInst.setMatrixAt(idx, bm);
      staticShadows.push({ x: b.x, y: b.y, z: b.z, r: 1.45 });
    });
    bedInst.instanceMatrix.needsUpdate = true;
    scene.add(bedInst);

    // Instanced Pedestal Tables under all Item Spawns + Glass Shard Spawns (2 draw calls total!)
    const allPedestals = [
      ...ITEM_SPAWN_POINTS.map((p) => ({ x: p.x, y: p.y, z: p.z, surfaceY: p.surfaceY })),
      ...INITIAL_GLASS_SHARDS.map((s) => ({ x: s.x, y: s.y, z: s.z, surfaceY: s.surfaceY })),
    ];
    const tableWoodMat = new THREE.MeshStandardMaterial({ color: 0x3b3229, roughness: 0.84, metalness: 0.05 });
    const tableTopInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.84, 0.06, 0.68),
      tableWoodMat,
      allPedestals.length
    );
    const tableLegInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.07, 1, 0.07),
      tableWoodMat,
      allPedestals.length * 4
    );
    const tm = new THREE.Matrix4();
    const tp = new THREE.Vector3();
    const tq = new THREE.Quaternion();
    const ts = new THREE.Vector3();
    let legIdx = 0;
    allPedestals.forEach((sp, idx) => {
      tp.set(sp.x, sp.surfaceY - 0.03, sp.z);
      ts.set(1, 1, 1);
      tm.compose(tp, tq, ts);
      tableTopInst.setMatrixAt(idx, tm);

      const legH = sp.surfaceY - sp.y - 0.06;
      [
        [-0.34, -0.26],
        [0.34, -0.26],
        [-0.34, 0.26],
        [0.34, 0.26],
      ].forEach(([lx, lz]) => {
        tp.set(sp.x + lx, sp.y + legH / 2, sp.z + lz);
        ts.set(1, legH, 1);
        tm.compose(tp, tq, ts);
        tableLegInst.setMatrixAt(legIdx++, tm);
      });
    });
    tableTopInst.instanceMatrix.needsUpdate = true;
    tableLegInst.instanceMatrix.needsUpdate = true;
    scene.add(tableTopInst, tableLegInst);

    // Hiding Spots (Instanced Locker & Wardrobe Shells + Door Pivots)
    const lockerHandles = new Map<string, LockerModelHandle>();
    const lockerSpots = HIDE_SPOTS.filter((s) => s.kind === 'locker');
    const wardrobeSpots = HIDE_SPOTS.filter((s) => s.kind === 'wardrobe');

    if (lockerSpots.length > 0) {
      const lockerShellInst = new THREE.InstancedMesh(
        createLockerShellGeometry(),
        new THREE.MeshStandardMaterial({ color: 0x35443c, roughness: 0.55, metalness: 0.62 }),
        lockerSpots.length
      );
      lockerSpots.forEach((spot, idx) => {
        bp.set(spot.x, spot.y, spot.z);
        rotEuler.set(0, spot.facingAngle, 0);
        bq.setFromEuler(rotEuler);
        bs.set(1, 1, 1);
        bm.compose(bp, bq, bs);
        lockerShellInst.setMatrixAt(idx, bm);
        staticShadows.push({ x: spot.x, y: spot.y, z: spot.z, r: 0.68 });

        const handle = createLockerDoorHandle();
        handle.group.position.set(spot.x, spot.y, spot.z);
        handle.group.rotation.y = spot.facingAngle;
        scene.add(handle.group);
        lockerHandles.set(spot.id, handle);
      });
      lockerShellInst.instanceMatrix.needsUpdate = true;
      scene.add(lockerShellInst);
    }

    if (wardrobeSpots.length > 0) {
      const wardrobeShellInst = new THREE.InstancedMesh(
        createWardrobeShellGeometry(),
        new THREE.MeshStandardMaterial({ color: 0x453224, roughness: 0.82, metalness: 0.05 }),
        wardrobeSpots.length
      );
      wardrobeSpots.forEach((spot, idx) => {
        bp.set(spot.x, spot.y, spot.z);
        rotEuler.set(0, spot.facingAngle, 0);
        bq.setFromEuler(rotEuler);
        bs.set(1, 1, 1);
        bm.compose(bp, bq, bs);
        wardrobeShellInst.setMatrixAt(idx, bm);
        staticShadows.push({ x: spot.x, y: spot.y, z: spot.z, r: 0.75 });

        const handle = createWardrobeDoorHandle();
        handle.group.position.set(spot.x, spot.y, spot.z);
        handle.group.rotation.y = spot.facingAngle;
        scene.add(handle.group);
        lockerHandles.set(spot.id, handle);
      });
      wardrobeShellInst.instanceMatrix.needsUpdate = true;
      scene.add(wardrobeShellInst);
    }

    // Knockable Props across Floor 1 & Floor 2
    const knockableMeshes = new Map<string, THREE.Group>();
    INITIAL_KNOCKABLES.forEach((kp) => {
      const kind = kp.id.startsWith('cart') ? 'cart' : kp.id.startsWith('bucket') ? 'bucket' : 'vase';
      const mesh = createKnockableModel(kind);
      mesh.position.set(kp.x, kp.y, kp.z);
      scene.add(mesh);
      knockableMeshes.set(kp.id, mesh);
      staticShadows.push({ x: kp.x, y: kp.y, z: kp.z, r: 0.42 });
    });

    // Single InstancedMesh for ALL static furniture contact shadows (1 draw call)
    const staticShadowGeo = new THREE.CircleGeometry(1, 14);
    staticShadowGeo.rotateX(-Math.PI / 2);
    const staticShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    const staticShadowInst = new THREE.InstancedMesh(staticShadowGeo, staticShadowMat, staticShadows.length);
    bq.identity();
    staticShadows.forEach((s, idx) => {
      bp.set(s.x, s.y + 0.014, s.z);
      bs.set(s.r, 1, s.r);
      bm.compose(bp, bq, bs);
      staticShadowInst.setMatrixAt(idx, bm);
    });
    staticShadowInst.instanceMatrix.needsUpdate = true;
    scene.add(staticShadowInst);

    // Doors across Floor 1 & Floor 2
    const doorHandles = new Map<string, DoorModelHandle>();
    INITIAL_DOORS.forEach((spec) => {
      const handle = createDoorAssembly(spec, TILE_SIZE, FLOOR_HEIGHT, handprintTex);
      const cx = (spec.gridX + (spec.orientation === 'ew' ? spec.widthTiles * 0.5 : 0.5)) * TILE_SIZE;
      const cz = (spec.gridZ + (spec.orientation === 'ns' ? spec.widthTiles * 0.5 : 0.5)) * TILE_SIZE;
      const dy = spec.floor === 1 ? FLOOR2_Y : 0;
      handle.group.position.set(cx, dy, cz);
      if (spec.orientation === 'ns') {
        handle.group.rotation.y = Math.PI / 2;
      }
      scene.add(handle.group);
      doorHandles.set(spec.id, handle);
    });

    // 4 Randomized Puzzle Pickups
    const itemMeshes = new Map<ItemId, { group: THREE.Group; baseY: number }>();
    (['ward_key', 'valve_wheel', 'power_fuse', 'bolt_cutters'] as ItemId[]).forEach((id) => {
      const model = createPickupModel(id);
      scene.add(model);
      itemMeshes.set(id, { group: model, baseY: 0.85 });
    });

    // Collectible Glass Shards for Spectral Glasses
    const shardMeshes = new Map<string, { group: THREE.Group; baseY: number }>();
    INITIAL_GLASS_SHARDS.forEach((sh) => {
      const model = createGlassShardModel();
      model.position.set(sh.x, sh.surfaceY, sh.z);
      scene.add(model);
      shardMeshes.set(sh.id, { group: model, baseY: sh.surfaceY });
    });

    // The Resident (with Spectral X-Ray Silhouette) + Triangle Echo Corpse + Phantom Echo
    const threatModel: ThreatModelHandle = createThreatModel(shadowTex);
    scene.add(threatModel.group);

    const echoCorpseModel = createEchoCorpseModel(shadowTex);
    echoCorpseModel.visible = false;
    scene.add(echoCorpseModel);

    const phantomModel = createPhantomSilhouetteModel();
    phantomModel.visible = false;
    scene.add(phantomModel);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Simulation & Input State
    let loopCounter = 1;
    let savedEcho: EchoRecord | null = null;
    let sim: SimulationState = createInitialSimulation({
      autostart,
      loopCount: loopCounter,
      seed: Math.floor(Date.now() % 90000) + 137,
      previousEcho: savedEcho,
    });
    document.body.dataset.state = sim.phase;

    const keysPressed = new Set<string>();
    let pendingYawDelta = 0;
    let pendingPitchDelta = 0;
    let interactQueued = false;
    let crouchQueued = false;
    let glassesQueued = false;

    let isPointerDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    // Strict Touch-Look State (prevents 180° flips & multi-touch jumps)
    let activeLookTouchId: number | null = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let lastTouchTime = 0;

    let smoothedYaw = sim.player.yaw;
    let smoothedPitch = sim.player.pitch;
    let cameraTrauma = 0;
    let quakeBlackoutTimer = 0;
    let currentEyeHeight = 1.62;
    let currentFov = 68;
    let lastHudEmitTime = 0;
    let lastHudKey = '';
    let disposed = false;
    let frameId = 0;

    const emitHud = (force = false) => {
      const snap = buildHudSnapshot(sim);
      const key = `${snap.phase}|${snap.victory}|${snap.loopCount}|${snap.strikesRemaining}|${snap.stamina}|${snap.crouching}|${snap.hiding}|${snap.currentFloor}|${snap.steamShutOff}|${snap.powerRestored}|${snap.inventory.join(',')}|${snap.selectedSlot}|${snap.currentZone}|${snap.promptText}|${snap.objectiveText}|${snap.statusBanner}|${snap.echoNoteText}|${snap.glassesActive}|${Math.ceil(snap.glassesCooldownLeft)}|${snap.glassShardsCollected}|${snap.quakeTriggered}|${snap.endlessLoopActive}|${Math.round(snap.dangerLevel * 20)}`;
      const now = performance.now();
      if (force || key !== lastHudKey || now - lastHudEmitTime >= 160) {
        lastHudKey = key;
        lastHudEmitTime = now;
        document.body.dataset.state = sim.phase;
        onHudUpdateRef.current(snap);
      }
    };

    const syncVisualStateToSim = () => {
      for (const item of sim.items) {
        const entry = itemMeshes.get(item.id);
        if (entry) {
          entry.group.visible = !item.collected;
          entry.group.position.x = item.x;
          entry.group.position.z = item.z;
          entry.baseY = item.surfaceY;
        }
      }
      for (const shard of sim.shards) {
        const entry = shardMeshes.get(shard.id);
        if (entry) {
          entry.group.visible = !shard.collected;
          entry.baseY = shard.surfaceY;
        }
      }

      // Sync Shift-Managed Wall Meshes & Doors
      shiftWallMeshes.forEach((entry) => {
        entry.mesh.visible = isWallCell(entry.col, entry.row, entry.floor, sim.shifts.gridOverrides);
      });
      redShiftDoor.visible =
        sim.shifts.endlessLoopActive && sim.shifts.redDoorAppeared && !sim.shifts.endlessLoopSolved;

      for (const door of sim.doors) {
        const handle = doorHandles.get(door.id);
        if (!handle) continue;
        if (door.id === 'cabin3_door') {
          handle.group.visible = !sim.shifts.cabin3Sealed;
        }
        if (handle.chainGroup) {
          handle.chainGroup.visible = door.state === 'locked_exit';
        }
        if (handle.padlockMesh) {
          handle.padlockMesh.visible = door.state === 'locked_key' || door.state === 'locked_exit';
        }
        if (handle.statusLedMat) {
          const isGreen = sim.powerRestored && door.state === 'open';
          const isAmber = sim.powerRestored && door.state !== 'open';
          const col = isGreen ? 0x4ce07a : isAmber ? 0xe5b84c : 0xd13d3d;
          handle.statusLedMat.color.setHex(col);
          handle.statusLedMat.emissive.setHex(col);
        }
      }

      // Spectral Glasses X-Ray Silhouette visibility
      threatModel.spectralSilhouette.visible = sim.glasses.active;

      steamValveHandle.attachedWheel.visible = sim.steamShutOff;
      steamValveHandle.steamPlume.visible = !sim.steamShutOff;

      const bCol = sim.powerRestored ? 0x4ce07a : 0xc93b3b;
      breakerHandle.ledMat.color.setHex(bCol);
      breakerHandle.ledMat.emissive.setHex(bCol);
      breakerHandle.lever.rotation.x = sim.powerRestored ? -0.55 : 0.55;

      if (sim.echoRecord) {
        echoCorpseModel.visible = true;
        echoCorpseModel.position.set(sim.echoRecord.deathX, sim.echoRecord.deathY, sim.echoRecord.deathZ);
      } else {
        echoCorpseModel.visible = false;
      }
    };

    const startNewRun = (advanceLoop = false, resetTimeline = false) => {
      audio.unlock();
      if (resetTimeline) {
        loopCounter = 1;
        savedEcho = null;
      } else if (advanceLoop) {
        loopCounter += 1;
      }

      sim = createInitialSimulation({
        autostart: true,
        loopCount: loopCounter,
        seed: Math.floor(performance.now() * 17 + loopCounter * 4099) >>> 0,
        previousEcho: savedEcho,
      });
      keysPressed.clear();
      pendingYawDelta = 0;
      pendingPitchDelta = 0;
      interactQueued = false;
      crouchQueued = false;
      glassesQueued = false;
      activeLookTouchId = null;
      smoothedYaw = sim.player.yaw;
      smoothedPitch = sim.player.pitch;
      cameraTrauma = 0;
      quakeBlackoutTimer = 0;
      currentEyeHeight = 1.62;
      currentFov = 68;
      camera.fov = 68;
      camera.updateProjectionMatrix();

      knockableMeshes.forEach((mesh) => {
        mesh.rotation.set(0, 0, 0);
      });

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      audio.setAmbienceActive(true);
      audio.setSpectralGlassesActive(false);
      syncVisualStateToSim();
      emitHud(true);
    };

    const setPhase = (nextPhase: GamePhase) => {
      if (nextPhase === 'playing') {
        audio.unlock();
        audio.setAmbienceActive(true);
        audio.setSpectralGlassesActive(sim.glasses.active);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      } else {
        keysPressed.clear();
        activeLookTouchId = null;
        audio.setAmbienceActive(false);
        if (document.pointerLockElement) {
          document.exitPointerLock?.();
        }
      }
      sim.phase = nextPhase;
      emitHud(true);
    };

    controllerRef.current = {
      startNewRun,
      setPhase,
      toggleMute: () => {
        audio.unlock();
        const next = !audio.isMuted();
        audio.setMuted(next);
        onMuteChangeRef.current(next);
        return next;
      },
      triggerInteract: () => {
        audio.unlock();
        interactQueued = true;
      },
      triggerCrouch: () => {
        audio.unlock();
        crouchQueued = true;
      },
      triggerGlasses: () => {
        audio.unlock();
        glassesQueued = true;
      },
      selectSlot: (slotIndex: number) => {
        if (slotIndex >= 0 && slotIndex < sim.inventory.length) {
          sim.selectedSlot = slotIndex;
          emitHud(true);
        }
      },
    };

    syncVisualStateToSim();
    emitHud(true);

    // Keyboard & Pointer Events
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        const next = controllerRef.current?.toggleMute();
        if (next !== undefined) onMuteChangeRef.current(next);
        return;
      }
      if (sim.phase === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startNewRun(false, false);
        }
        return;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (sim.phase === 'playing') {
          e.preventDefault();
          setPhase('paused');
          return;
        } else if (sim.phase === 'paused') {
          e.preventDefault();
          setPhase('playing');
          return;
        }
      }
      if (e.code === 'KeyR' && (sim.phase === 'playing' || sim.phase === 'paused' || sim.phase === 'gameover')) {
        e.preventDefault();
        startNewRun(false, false);
        return;
      }
      if (sim.phase !== 'playing') return;

      keysPressed.add(e.code);
      if ((e.code === 'KeyE' || e.code === 'Space') && !e.repeat) {
        e.preventDefault();
        audio.unlock();
        interactQueued = true;
      }
      if ((e.code === 'KeyC' || e.code === 'ControlLeft') && !e.repeat) {
        crouchQueued = true;
      }
      if (e.code === 'KeyG' && !e.repeat) {
        e.preventDefault();
        audio.unlock();
        glassesQueued = true;
      }
      if (e.code === 'Digit1') controllerRef.current?.selectSlot(0);
      if (e.code === 'Digit2') controllerRef.current?.selectSlot(1);
      if (e.code === 'Digit3') controllerRef.current?.selectSlot(2);
      if (e.code === 'Digit4') controllerRef.current?.selectSlot(3);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };
    const onWindowBlur = () => {
      keysPressed.clear();
      isPointerDragging = false;
      activeLookTouchId = null;
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        keysPressed.clear();
        isPointerDragging = false;
        activeLookTouchId = null;
      }
    };

    const canvas = renderer.domElement;
    const onMouseDown = (e: MouseEvent) => {
      if (sim.phase !== 'playing') return;
      if (performance.now() - lastTouchTime < 600) return;
      audio.unlock();
      isPointerDragging = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      if (e.button === 0 && !isSoftwareGl && document.pointerLockElement !== canvas) {
        try {
          canvas.requestPointerLock?.();
        } catch {
          // fallback drag-look
        }
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (sim.phase !== 'playing') return;
      if (performance.now() - lastTouchTime < 600) return;
      if (document.pointerLockElement === canvas) {
        if (Math.abs(e.movementX) > 120 || Math.abs(e.movementY) > 120) return;
        pendingYawDelta -= e.movementX * 0.0024;
        pendingPitchDelta -= e.movementY * 0.002;
      } else if (isPointerDragging) {
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        if (Math.abs(dx) > 65 || Math.abs(dy) > 65) return;
        pendingYawDelta -= dx * TOUCH_SENSITIVITY;
        pendingPitchDelta -= dy * TOUCH_SENSITIVITY;
      }
    };
    const onMouseUp = () => {
      isPointerDragging = false;
    };

    // Fixed Touch Camera Look: strict identifier tracking + >50px jump rejection + 0.003 sensitivity
    const onTouchStart = (e: TouchEvent) => {
      lastTouchTime = performance.now();
      if (sim.phase !== 'playing') return;
      if (e.target !== canvas) return;
      audio.unlock();
      if (activeLookTouchId === null && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        activeLookTouchId = t.identifier;
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        lastTouchX = touchStartX;
        lastTouchY = touchStartY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      lastTouchTime = performance.now();
      if (sim.phase !== 'playing' || activeLookTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === activeLookTouchId) {
          const deltaX = t.clientX - lastTouchX;
          const deltaY = t.clientY - lastTouchY;
          lastTouchX = t.clientX;
          lastTouchY = t.clientY;
          if (Math.abs(deltaX) > TOUCH_SPIKE_LIMIT || Math.abs(deltaY) > TOUCH_SPIKE_LIMIT) {
            continue;
          }
          pendingYawDelta -= deltaX * TOUCH_SENSITIVITY;
          pendingPitchDelta -= deltaY * TOUCH_SENSITIVITY;
        }
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      lastTouchTime = performance.now();
      if (activeLookTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeLookTouchId) {
          activeLookTouchId = null;
        }
      }
    };

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    const onContextLost = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onResize);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    canvas.addEventListener('webglcontextlost', onContextLost);

    // Main Render & Simulation Loop
    let prevTime = performance.now();
    let elapsedTotal = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 16);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const rawDt = (now - prevTime) / 1000;
      prevTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      elapsedTotal += dt;

      // Pickup & Glass Shard gentle bob & rotation
      itemMeshes.forEach((entry, id) => {
        if (entry.group.visible) {
          entry.group.position.y = entry.baseY + Math.sin(elapsedTotal * 2.5 + id.length) * 0.032;
          entry.group.rotation.y = elapsedTotal * 0.85;
        }
      });
      shardMeshes.forEach((entry, id) => {
        if (entry.group.visible) {
          entry.group.position.y = entry.baseY + Math.sin(elapsedTotal * 3.1 + id.length) * 0.04;
          entry.group.rotation.y = elapsedTotal * 1.4;
        }
      });

      if (sim.phase === 'title') {
        // Eerie sweep inside Entrance Hall peering into the cavernous Grand Ballroom!
        const zTravel = 20.1 * TILE_SIZE - ((elapsedTotal * 0.25) % (2.0 * TILE_SIZE));
        camera.position.set(
          11.5 * TILE_SIZE + Math.sin(elapsedTotal * 0.45) * 0.16,
          1.64 + Math.sin(elapsedTotal * 1.1) * 0.02,
          zTravel
        );
        camera.rotation.set(0.02, Math.sin(elapsedTotal * 0.35) * 0.12, 0);
        flashlight.intensity = 22;
        threatModel.group.position.set(sim.threat.x, sim.threat.y, sim.threat.z);
        threatModel.group.rotation.y = sim.threat.yaw;
      } else if (sim.phase === 'jumpscare') {
        const events = stepSimulation(
          sim,
          {
            moveForward: 0,
            moveRight: 0,
            sprint: false,
            crouchToggle: false,
            interactPressed: false,
            yawDelta: 0,
            pitchDelta: 0,
          },
          dt
        );
        if (events.defeated) {
          const snapZone = buildHudSnapshot(sim).currentZone;
          savedEcho = {
            loopNumber: sim.loopCount,
            deathX: sim.player.x,
            deathY: sim.player.y,
            deathZ: sim.player.z,
            noteText: `Loop #${sim.loopCount}: She cornered me near ${snapZone.replace('_', ' ')}. Close doors behind you.`,
            inspected: false,
          };
          audio.setAmbienceActive(false);
          if (document.pointerLockElement) {
            document.exitPointerLock?.();
          }
        }

        const p = sim.jumpscareProgress;
        const lungeDist = 1.0 - p * 0.44;
        const fx = -Math.sin(sim.player.yaw);
        const fz = -Math.cos(sim.player.yaw);
        threatModel.group.position.set(
          sim.player.x + fx * lungeDist,
          sim.player.y,
          sim.player.z + fz * lungeDist
        );
        threatModel.group.rotation.y = sim.player.yaw + Math.PI;
        threatModel.head.rotation.z = Math.sin(elapsedTotal * 48) * 0.25;
        threatModel.jaw.rotation.x = 0.58;
        threatModel.rightArm.rotation.x = -1.6 + Math.sin(elapsedTotal * 30) * 0.3;
        threatModel.eyeMat.emissiveIntensity = 4.2;

        const jitterX = Math.sin(elapsedTotal * 70) * 0.04;
        const jitterY = Math.cos(elapsedTotal * 63) * 0.04;
        camera.position.set(sim.player.x + jitterX, sim.player.y + 1.62 + jitterY, sim.player.z);
        camera.lookAt(
          threatModel.group.position.x,
          sim.player.y + 2.02,
          threatModel.group.position.z
        );
        flashlight.intensity = 18;
        emitHud(true);
      } else if (sim.phase === 'playing') {
        let moveForward =
          (keysPressed.has('KeyW') || keysPressed.has('ArrowUp') ? 1 : 0) -
          (keysPressed.has('KeyS') || keysPressed.has('ArrowDown') ? 1 : 0);
        let moveRight =
          (keysPressed.has('KeyD') || keysPressed.has('ArrowRight') ? 1 : 0) -
          (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft') ? 1 : 0);

        const mobile = mobileInputRef.current;
        if (Math.abs(mobile.moveY) > 0.05) moveForward += mobile.moveY;
        if (Math.abs(mobile.moveX) > 0.05) moveRight += mobile.moveX;
        const sprint = keysPressed.has('ShiftLeft') || keysPressed.has('ShiftRight') || mobile.sprint;

        const events = stepSimulation(
          sim,
          {
            moveForward: Math.max(-1, Math.min(1, moveForward)),
            moveRight: Math.max(-1, Math.min(1, moveRight)),
            sprint,
            crouchToggle: crouchQueued,
            interactPressed: interactQueued,
            glassesToggle: glassesQueued,
            yawDelta: pendingYawDelta,
            pitchDelta: pendingPitchDelta,
          },
          dt
        );
        pendingYawDelta = 0;
        pendingPitchDelta = 0;
        interactQueued = false;
        crouchQueued = false;
        glassesQueued = false;

        // Audio & Spatial triggers (42m estate-wide acoustic radius!)
        const floorAtten = Math.abs(sim.threat.y - sim.player.y) > 2.0 ? 0.52 : 1.0;

        if (events.footstepPlayer) {
          audio.playPlayerFootstep(sim.player.crouching, sim.player.sprinting);
        }
        if (events.footstepThreat) {
          const sp = audio.computeSpatial(
            sim.player.x,
            sim.player.z,
            sim.player.yaw,
            sim.threat.x,
            sim.threat.z,
            42
          );
          audio.playThreatStepAndBlade(sp.pan, sp.atten * floorAtten);
        }
        if (events.creakyBoard) audio.playCreakyBoard();
        if (events.propKnocked) audio.playPropCrash();
        if (events.pickup || events.shardPickup) audio.playPickup();
        if (events.glassesToggled) audio.setSpectralGlassesActive(sim.glasses.active);
        if (events.midnightQuake) {
          audio.playMidnightQuake();
          cameraTrauma = 1.25;
          quakeBlackoutTimer = 0.75;
        } else if (events.architectureShift) {
          audio.playArchitectureShift();
        }
        if (events.doorOpened) audio.playDoorCreak(false);
        if (events.doorSlammed) audio.playDoorCreak(true);
        if (events.doorUnlocked) audio.playUnlock();
        if (events.doorLockedRattle) audio.playLockedRattle();
        if (events.steamShutOff) audio.playSteamShutOff();
        if (events.breakerRestored) audio.playBreakerOn();
        if (events.hideToggle || events.lockerTornOpen) audio.playDoorCreak(events.lockerTornOpen);
        if (events.threatSniff) {
          const sp = audio.computeSpatial(
            sim.player.x,
            sim.player.z,
            sim.player.yaw,
            sim.threat.x,
            sim.threat.z,
            34
          );
          audio.playSpatialWhisper(sp.pan, sp.atten * floorAtten);
        }
        if (events.threatAlerted) audio.playThreatAlert();
        if (events.playerHit) {
          audio.playHit();
          cameraTrauma = 1.0;
        }
        if (events.jumpscareStarted) {
          audio.playJumpscareScreech();
        }
        if (events.escaped) {
          audio.playVictory();
          audio.setAmbienceActive(false);
        }

        syncVisualStateToSim();

        // Animate Doors
        for (const door of sim.doors) {
          const handle = doorHandles.get(door.id);
          if (!handle) continue;
          const angle = door.openProgress * (Math.PI * 0.48);
          handle.leafPivot.rotation.y = angle;
        }

        // Animate Lockers & Wardrobes
        HIDE_SPOTS.forEach((spot) => {
          const handle = lockerHandles.get(spot.id);
          if (!handle) return;
          const targetAngle = sim.player.hidingSpotId === spot.id ? 0.18 : 0;
          handle.doorPivot.rotation.y += (targetAngle - handle.doorPivot.rotation.y) * Math.min(1, dt * 10);
        });

        // Animate Knockables
        sim.knockables.forEach((kp) => {
          const mesh = knockableMeshes.get(kp.id);
          if (!mesh) return;
          const targetRot = kp.knocked ? 1.48 : 0;
          mesh.rotation.z += (targetRot - mesh.rotation.z) * Math.min(1, dt * 9);
        });

        // Animate Phantom Echo
        if (sim.phantomEcho.active) {
          phantomModel.visible = true;
          phantomModel.position.set(sim.phantomEcho.x, sim.phantomEcho.y, sim.phantomEcho.z);
          phantomModel.rotation.y = sim.phantomEcho.yaw;
        } else {
          phantomModel.visible = false;
        }

        // Animate The Resident (including inspect_room slow look & door-smashing lunge)
        const limpPhase = sim.threat.stepAccum * 4.5;
        const swing = sim.threat.mode === 'inspect_room' ? 0 : Math.sin(limpPhase) * 0.46;
        const limpDrop =
          sim.threat.mode === 'smash_door' || sim.threat.mode === 'inspect_room'
            ? 0
            : Math.max(0, Math.sin(limpPhase)) * 0.08;
        threatModel.group.position.set(sim.threat.x, sim.threat.y - limpDrop, sim.threat.z);
        threatModel.group.rotation.y = sim.threat.yaw;
        threatModel.leftLeg.rotation.x = swing;
        threatModel.rightLeg.rotation.x = -swing * 0.65;
        threatModel.leftArm.rotation.x =
          sim.threat.mode === 'smash_door' ? -1.1 + Math.sin(elapsedTotal * 14) * 0.45 : -swing * 0.7;
        threatModel.rightArm.rotation.x =
          sim.threat.mode === 'smash_door'
            ? -1.2 + Math.cos(elapsedTotal * 14) * 0.45
            : sim.threat.mode === 'chase'
              ? -0.55 + swing * 0.25
              : 0.15;
        const twitch = Math.sin(elapsedTotal * 23) * Math.cos(elapsedTotal * 37) > 0.85 ? 0.18 : 0;
        threatModel.head.rotation.z =
          0.22 + sim.threat.headTilt + twitch + Math.sin(elapsedTotal * (sim.threat.mode === 'chase' ? 10 : 2.5)) * 0.06;
        threatModel.jaw.rotation.x = sim.threat.mode === 'chase' || sim.threat.mode === 'smash_door' ? 0.24 : 0.04;
        threatModel.eyeMat.emissiveIntensity = sim.threat.mode === 'chase' ? 3.1 : 1.9;

        // Smooth First-person Camera + Vertical Floor Elevation + Hiding Peek
        const hideSpot = sim.player.hidingSpotId
          ? HIDE_SPOTS.find((h) => h.id === sim.player.hidingSpotId)
          : null;
        const targetEyeOffset = hideSpot
          ? hideSpot.eyeHeight
          : sim.player.crouching
            ? 0.96
            : 1.62;
        currentEyeHeight += (targetEyeOffset - currentEyeHeight) * (1 - Math.exp(-12 * dt));

        const targetFov = hideSpot ? 52 : sim.glasses.active ? 73 : 68;
        currentFov += (targetFov - currentFov) * (1 - Math.exp(-9 * dt));
        if (Math.abs(camera.fov - currentFov) > 0.06) {
          camera.fov = currentFov;
          camera.updateProjectionMatrix();
        }

        const lookLerp = 1 - Math.exp(-32 * dt);
        smoothedYaw += (sim.player.yaw - smoothedYaw) * lookLerp;
        smoothedPitch = Math.max(
          -PITCH_CLAMP,
          Math.min(PITCH_CLAMP, smoothedPitch + (sim.player.pitch - smoothedPitch) * lookLerp)
        );

        const bobAmp = hideSpot ? 0 : sim.player.sprinting ? 0.05 : 0.026;
        const bobOffset = Math.sin(sim.player.stepAccum * Math.PI * 2) * bobAmp;

        cameraTrauma = Math.max(0, cameraTrauma - dt * 1.45);
        const shake = cameraTrauma * cameraTrauma;
        camera.position.set(sim.player.x, sim.player.y + currentEyeHeight + bobOffset, sim.player.z);
        camera.rotation.set(
          Math.max(-PITCH_CLAMP, Math.min(PITCH_CLAMP, smoothedPitch + Math.sin(elapsedTotal * 47) * 0.05 * shake)),
          smoothedYaw + Math.cos(elapsedTotal * 39) * 0.04 * shake,
          Math.sin(elapsedTotal * 53) * 0.06 * shake
        );

        const hudSnap = buildHudSnapshot(sim);

        // Flashlight flicker near Threat OR momentary blackout on Midnight Quake
        if (quakeBlackoutTimer > 0) {
          quakeBlackoutTimer = Math.max(0, quakeBlackoutTimer - dt);
          flashlight.intensity = quakeBlackoutTimer > 0.3 ? 1.2 : Math.sin(elapsedTotal * 55) > 0 ? 18 : 2.5;
        } else {
          const batDip =
            Math.sin(elapsedTotal * 31) * Math.cos(elapsedTotal * 19) >
            (hudSnap.dangerLevel > 0.5 ? 0.62 : 0.9)
              ? 0.55
              : 1.0;
          flashlight.intensity = (hideSpot ? 14 : 22) * batDip;
        }

        audio.updateAdaptiveScore(dt, hudSnap.dangerLevel, sim.threat.mode === 'chase');
        emitHud(
          events.escaped ||
            events.defeated ||
            events.playerHit ||
            Boolean(events.pickup) ||
            events.shardPickup ||
            events.glassesToggled ||
            events.midnightQuake ||
            Boolean(events.architectureShift) ||
            events.doorUnlocked ||
            events.steamShutOff ||
            events.breakerRestored ||
            events.echoInspected
        );
      }

      renderer.render(scene, camera);

      (window as unknown as { __MERCY_RENDER_STATS__?: { calls: number; triangles: number } }).__MERCY_RENDER_STATS__ = {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      };

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);

      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      canvas.removeEventListener('webglcontextlost', onContextLost);

      audio.dispose();
      foyerFloorTex.map.dispose();
      foyerFloorTex.bumpMap.dispose();
      woodFloorTex.map.dispose();
      woodFloorTex.bumpMap.dispose();
      wallTex.map.dispose();
      wallTex.bumpMap.dispose();
      cellarWallTex.map.dispose();
      cellarWallTex.bumpMap.dispose();
      ceilingTex.dispose();
      shadowTex.dispose();
      bloodDecalTex.dispose();
      handprintTex.dispose();
      puddleTex.dispose();
      signTextures.forEach((t) => t.dispose());

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });

      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, [autostart, controllerRef, mobileInputRef]);

  return (
    <div
      ref={mountRef}
      data-testid="hospital-viewport"
      className="fixed inset-0 w-full h-full bg-[#05070a] touch-none"
    />
  );
};
