import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Loader2 } from 'lucide-react';

/**
 * Interactive 3D sticker sheet (browsing/preview only: the editor never uses this, it uses the flat individual files).
 * - the sheet is a frosted clear-plastic slab (rounded rectangle, thickness + bevel) lit by a built-in studio environment
 * - every sticker is its own textured plane attached to the FRONT face, so from behind you see it through the plastic
 * - drag = rotate (all directions), wheel / pinch = zoom, right-drag / two fingers = pan, double-click a sticker = zoom to it
 * Imperative API (ref): focus(stickerId), reset(), flip().
 */
const SHEET_W = 2;
const DEPTH = 0.035;
const BEVEL = 0.012;
const FRONT_Z = DEPTH / 2 + BEVEL + 0.0015;
const FOV = 35;

// ---- look & feel knobs (tweak these to taste)
const BG_COLOR = 0x000000;        // page/canvas background (pure black)
const ENV_INTENSITY = 0.3;        // overall image-based lighting (was 1.0)
const HEMI_INTENSITY = 0.2;       // ambient fill (was 0.55)
const KEY_INTENSITY = 0.35;       // main light (was 1.0)
const RIM_INTENSITY = 0.15;       // back light (was 0.6)
const GLASS_OPACITY = 0.16;       // plastic slab opacity (was 0.34)
const GLASS_ENV = 0.45;           // reflections on the plastic (was 1.4)
const GLASS_CLEARCOAT = 0.35;     // glossy highlight on the plastic (was 1)
const STICKER_EMISSIVE = 0.3;     // keeps sticker colors visible in low light (was 0.45)
const STICKER_ENV = 0.15;         // sheen on stickers (was 0.6)
const GLASS_OPACITY_BG = 0.45;    // frosted look of the sheet when a background picture is set
const BG_FIT = 1.4;               // camera margin when a background is set (sheet floats inside the picture)

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - ((-2 * k + 2) ** 3) / 2);
const now = () => performance.now() / 1000;
// WebGL needs CORS-mode image requests. If the same file was already shown by a plain <img> / CSS background (no CORS),
// the browser cache can hand that header-less copy back and block the texture. A distinct URL forces a fresh CORS request.
const corsUrl = (u) => `${u}${u.includes('?') ? '&' : '?'}cors=1`;
const fitDistance = (W, H, aspect, margin = 1.18) => {
  const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  return Math.max(H / 2 / t, W / 2 / (t * aspect)) * margin;
};

function disposeTree(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => { m.map?.dispose(); m.emissiveMap?.dispose(); m.dispose(); });
  });
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** The physical sheet. Replace this ONE function to use a GLB/GLTF model instead (keep the same return shape). */
function buildSheetBody(W, H, hasBg = false) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(W, H, 0.16), {
    depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 4, curveSegments: 14,
  });
  geo.center();
  const glass = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: hasBg ? GLASS_OPACITY_BG : GLASS_OPACITY, roughness: 0.25, metalness: 0,
    clearcoat: GLASS_CLEARCOAT, clearcoatRoughness: 0.2, envMapIntensity: GLASS_ENV, depthWrite: false, side: THREE.DoubleSide,
  }));
  const rim = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 30),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  const group = new THREE.Group();
  group.add(glass, rim);
  return { group, parts: [glass, rim] };
}

function buildFloorShadow(W, H) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(20,20,20,0.38)');
  grd.addColorStop(1, 'rgba(20,20,20,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 1.25, W * 0.55),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -H / 2 - 0.3;
  mesh.renderOrder = -1;
  return mesh;
}

function buildSticker(st, tex, W, H, i) {
  const sw = (st.w / 100) * W;
  const sh = sw * st.ar;
  const geo = new THREE.PlaneGeometry(sw, sh);
  const group = new THREE.Group();
  group.position.set((st.x / 100 - 0.5) * W, (0.5 - st.y / 100) * H, FRONT_Z + i * 0.0004);
  group.rotation.z = -THREE.MathUtils.degToRad(st.rot || 0);

  // soft silhouette under the sticker (front side only) so it reads as attached to the sheet
  const shadow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: tex, color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false, alphaTest: 0.02,
  }));
  shadow.position.set(0.012, -0.018, -0.0008);
  shadow.renderOrder = 1 + i * 0.01;

  // the sticker itself: keeps its real colors and transparency, with a little vinyl sheen
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: tex, transparent: true, alphaTest: 0.02, roughness: 0.65, metalness: 0,
    emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: STICKER_EMISSIVE, envMapIntensity: STICKER_ENV, side: THREE.DoubleSide,
  }));
  mesh.renderOrder = 1 + i * 0.01 + 0.005;
  mesh.userData.stickerId = st.id;

  group.add(shadow, mesh);
  return { group, mesh, info: { x: group.position.x, y: group.position.y, w: sw, h: sh } };
}

// The glass must be drawn BEFORE the stickers when seen from the front and AFTER them when seen from behind.
const applyOrder = (c) => c.bodyParts.forEach((o) => { o.renderOrder = c.front ? 0 : 3; });

function focusSticker(c, id) {
  const st = c?.stickers.get(id);
  if (!st) return;
  const d = Math.max(0.8, st.h * 2.3, (st.w * 2.3) / c.camera.aspect);
  c.goTo(new THREE.Vector3(st.x, st.y, d + FRONT_Z), new THREE.Vector3(st.x, st.y, FRONT_Z), 0.9);
}

const SheetViewer3D = forwardRef(function SheetViewer3D({ sheet, className = '', onFocusSticker }, ref) {
  const mountRef = useRef(null);
  const ctx = useRef(null);
  const cbRef = useRef(onFocusSticker);
  cbRef.current = onFocusSticker;
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: (id) => focusSticker(ctx.current, id),
    reset: () => {
      const c = ctx.current;
      if (!c) return;
      c.goTo(new THREE.Vector3(0, 0, c.fit), new THREE.Vector3(0, 0, 0), 0.8);
      c.sway = !c.reduce;
    },
    flip: () => {
      const c = ctx.current;
      if (!c) return;
      const off = c.camera.position.clone().sub(c.controls.target);
      c.tween = { t0: now(), dur: 1.1, orbit: { target: c.controls.target.clone(), sph: new THREE.Spherical().setFromVector3(off), dth: Math.PI } };
      c.sway = false;
    },
  }), []);

  // ---- scene, camera, controls, render loop (created once)
  useEffect(() => {
    const el = mountRef.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); } catch { setFailed(true); return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(BG_COLOR, 1);
    const canvas = renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
    el.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLOR);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = ENV_INTENSITY; // r163+; harmless on older versions
    scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, HEMI_INTENSITY));
    const key = new THREE.DirectionalLight(0xffffff, KEY_INTENSITY); key.position.set(2.5, 3.5, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, RIM_INTENSITY); rim.position.set(-3, 1, -4); scene.add(rim);

    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);
    camera.position.set(0, 0, 6);
    const controls = new OrbitControls(camera, canvas);
    Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, screenSpacePanning: true, rotateSpeed: 0.9, zoomSpeed: 0.9, minDistance: 0.6 });

    const sheetGroup = new THREE.Group();
    scene.add(sheetGroup);
    const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const c = {
      renderer, scene, camera, controls, sheetGroup, reduce, tween: null, sway: !reduce, front: true,
      stickers: new Map(), pickables: [], bodyParts: [], fit: 6, bgTex: null,
      // keeps the background picture "cover"-fitted (no stretching) whatever the viewport shape
      fitCover() {
        const t = c.bgTex;
        const img = t?.image;
        if (!img || !img.width || !img.height) return;
        const ia = img.width / img.height;
        const va = camera.aspect;
        if (va > ia) { t.repeat.set(1, ia / va); t.offset.set(0, (1 - ia / va) / 2); }
        else { t.repeat.set(va / ia, 1); t.offset.set((1 - va / ia) / 2, 0); }
      },
      goTo(pos, target, dur = 0.9) {
        c.tween = { t0: now(), dur, fp: camera.position.clone(), ft: controls.target.clone(), tp: pos, tt: target };
        c.sway = false;
      },
    };
    ctx.current = c;

    const onStart = () => { c.sway = false; c.tween = null; canvas.style.cursor = 'grabbing'; };
    const onUp = () => { canvas.style.cursor = 'grab'; };
    controls.addEventListener('start', onStart);
    canvas.addEventListener('pointerup', onUp);

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onDouble = (e) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(c.pickables, false)[0];
      if (hit) { const id = hit.object.userData.stickerId; focusSticker(c, id); cbRef.current?.(id); }
    };
    canvas.addEventListener('dblclick', onDouble);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      c.fitCover();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const tmp = new THREE.Vector3();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = now();
      const tw = c.tween;
      if (tw) {
        const k = Math.min(1, (t - tw.t0) / tw.dur);
        const e = easeInOut(k);
        if (tw.orbit) {
          const s = tw.orbit.sph.clone();
          s.theta += tw.orbit.dth * e;
          camera.position.setFromSpherical(s).add(tw.orbit.target);
        } else {
          camera.position.lerpVectors(tw.fp, tw.tp, e);
          controls.target.lerpVectors(tw.ft, tw.tt, e);
        }
        if (k >= 1) c.tween = null;
      }
      if (c.sway) { // gentle idle motion until the visitor touches it
        sheetGroup.rotation.y = Math.sin(t * 0.7) * 0.42;
        sheetGroup.rotation.x = Math.sin(t * 0.5) * 0.07;
        sheetGroup.position.y = Math.sin(t * 1.1) * 0.03;
      } else {
        sheetGroup.rotation.y = THREE.MathUtils.lerp(sheetGroup.rotation.y, 0, 0.12);
        sheetGroup.rotation.x = THREE.MathUtils.lerp(sheetGroup.rotation.x, 0, 0.12);
        sheetGroup.position.y = THREE.MathUtils.lerp(sheetGroup.position.y, 0, 0.12);
      }
      controls.update();
      tmp.copy(camera.position);
      sheetGroup.worldToLocal(tmp);
      const front = tmp.z >= 0;
      if (front !== c.front) { c.front = front; applyOrder(c); }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.removeEventListener('start', onStart);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('dblclick', onDouble);
      controls.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      ctx.current = null;
    };
  }, []);

  // ---- (re)build the sheet whenever the sheet data changes
  useEffect(() => {
    const c = ctx.current;
    if (!c || !sheet) return undefined;
    let cancelled = false;
    const W = SHEET_W;
    const H = SHEET_W * (sheet.ratio || 1.35);

    const content = new THREE.Group();
    const body = buildSheetBody(W, H, !!sheet.background);
    content.add(body.group);
    c.bodyParts = body.parts;
    const floor = buildFloorShadow(W, H);
    c.scene.add(floor);
    c.sheetGroup.add(content);
    c.stickers = new Map();
    c.pickables = [];

    const list = [...(sheet.stickers || [])].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    setProgress({ done: 0, total: list.length });
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous'); // media is served by the API origin (CORS is enabled there)
    const aniso = c.renderer.capabilities.getMaxAnisotropy();
    list.forEach((st, i) => {
      loader.load(
        corsUrl(st.src),
        (tex) => {
          if (cancelled) { tex.dispose(); return; }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = aniso;
          const built = buildSticker(st, tex, W, H, i);
          content.add(built.group);
          c.pickables.push(built.mesh);
          c.stickers.set(st.id, built.info);
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        },
        undefined,
        () => { if (!cancelled) setProgress((p) => ({ ...p, done: p.done + 1 })); },
      );
    });

    c.fit = fitDistance(W, H, c.camera.aspect || 1, sheet.background ? BG_FIT : 1.18);
    c.controls.maxDistance = c.fit * 2.2;
    c.camera.position.set(0, 0, c.fit);
    c.controls.target.set(0, 0, 0);
    c.tween = null;
    c.sway = !c.reduce;
    c.front = true;
    applyOrder(c);

    return () => {
      cancelled = true;
      c.sheetGroup.remove(content);
      c.scene.remove(floor);
      disposeTree(content);
      disposeTree(floor);
      c.stickers = new Map();
      c.pickables = [];
    };
  }, [sheet]);

  // ---- the sheet's background picture (full-page backdrop behind the frosted sheet; black when none)
  useEffect(() => {
    const c = ctx.current;
    if (!c) return undefined;
    const url = sheet?.background;
    c.scene.background = new THREE.Color(BG_COLOR);
    if (!url) return undefined;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(corsUrl(url), (tex) => {
      if (cancelled) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = c.renderer.capabilities.getMaxAnisotropy();
      c.bgTex = tex;
      c.scene.background = tex;
      c.fitCover();
    });
    return () => {
      cancelled = true;
      if (c.bgTex) { c.bgTex.dispose(); c.bgTex = null; }
      c.scene.background = new THREE.Color(BG_COLOR);
    };
  }, [sheet?.background]);

  // ---- background opacity: fades the picture toward the black behind it (three r163+: scene.backgroundIntensity)
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    const o = sheet?.backgroundOpacity;
    c.scene.backgroundIntensity = typeof o === 'number' ? Math.min(1, Math.max(0, o)) : 1;
  }, [sheet?.backgroundOpacity, sheet?.background]);

  return (
    <div className={`relative bg-black ${className}`}>
      <div ref={mountRef} className="absolute inset-0" />
      {failed && <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-sm font-bold text-white">3D preview isn’t supported on this device.</p>}
      {!failed && progress.done < progress.total && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center" role="status">
          <span className="flex items-center gap-2 rounded-full border-[3px] border-brand-ink bg-white px-3 py-1 text-xs font-bold">
            <Loader2 className="animate-spin" size={14} aria-hidden /> Loading stickers {progress.done}/{progress.total}
          </span>
        </div>
      )}
    </div>
  );
});

export default SheetViewer3D;