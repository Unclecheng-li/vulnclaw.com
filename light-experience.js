/* ============================================================
   VulnClaw Hero — Three.js interactive light experience
   Ported from HTML-Light-Demo (MORS² light study)
   Uses three@0.185.1 + three-html-render (CDN)
   ============================================================ */

import * as THREE from 'three';
import { InteractionManager } from 'three/addons/interaction/InteractionManager.js';
import { installHtmlInCanvasPolyfill, getHtmlRenderer } from 'three-html-render';

const CONCEPTS = {
  Reason: '分析全图，提出探索方向，以 Intent 驱动下一轮渗透。',
  Explore: '领取 Intent，调用 Skill / MCP 工具链执行真实探测。',
  Fact: '证据级验证，逐字符确认 flag 与工具输出，写回黑板图。',
  Reflect: '失败按 L0-L4 升级策略反思，跨周期记忆避免原地打转。'
};

const COLOR_PRESETS = ['#ffd2a3', '#ff9a5c', '#ff2a2a', '#ffad7a', '#ff4d4d'];

const INITIAL_LIGHT = {
  enabled: true,
  angle: 38,
  brightness: 1450,
  color: '#ffd2a3'
};

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const BASE_LIGHT_DIRECTION = DOWN.clone();

function installThreeHtmlTextureCompatibility() {
  if (!window.__HTML_IN_CANVAS_POLYFILL__) return;
  const constructors = [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext];
  for (const ctor of constructors) {
    if (!ctor) continue;
    const proto = ctor.prototype;
    const upload = proto.texElementImage2D;
    if (!upload || upload.length !== 3) continue;
    Object.defineProperty(proto, 'texElementImage2D', {
      configurable: true,
      writable: true,
      value: function texElementImage2D(target, level, internalFormat, format, type, source) {
        upload.call(this, target, level, internalFormat, format, type, source);
      }
    });
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToUpper(hex) {
  return hex.toUpperCase();
}

(function init() {
  const canvas = document.getElementById('lightCanvas');
  const pageSource = document.getElementById('pageSource');
  const statusEl = document.getElementById('sceneStatus');
  const errorEl = document.getElementById('sceneError');

  if (!canvas || !pageSource) return;

  canvas.setAttribute('layoutsubtree', '');

  installHtmlInCanvasPolyfill();
  installThreeHtmlTextureCompatibility();

  // --- Performance hardening for the HTML-in-Canvas polyfill ---
  // Full-surface rasterization is the interaction bottleneck: by default the
  // polyfill embeds EVERY document stylesheet (including cross-origin sheets
  // it re-fetches, with megabytes of font data URIs) into each SVG snapshot.
  // Measured cost here: >10s for the first repaint, 1.2-1.8s per repaint
  // afterwards, which freezes the page during any pointer interaction.
  // Fix: feed the rasterizer a curated stylesheet containing only the rules
  // that match the page source (system fonts instead of embedded webfonts),
  // and rate-limit repaints.
  const htmlRenderer = getHtmlRenderer();
  htmlRenderer.pixelRatio = 1;

  function buildTextureStyles() {
    const out = [];
    const seen = new Set();
    const PSEUDO = /::?(?:hover|active|focus(?:-visible|-within)?|before|after|first-child|last-child|first-of-type|last-of-type|nth-child\([^)]*\)|nth-of-type\([^)]*\)|checked|disabled|placeholder|selection|marker)\b/g;
    const matchesPage = (selectorText) =>
      selectorText.split(',').some((raw) => {
        const sel = raw.trim();
        if (!sel) return false;
        if (sel === ':root' || /^(?:html|body)\b/.test(sel)) return true;
        const test = sel.replace(PSEUDO, '*');
        try {
          return pageSource.matches(test) || !!pageSource.querySelector(test);
        } catch {
          return true; // keep rules we cannot test
        }
      });
    const push = (cssText) => {
      if (!seen.has(cssText)) {
        seen.add(cssText);
        out.push(cssText);
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // skip cross-origin sheets (bootstrap / font-awesome / webfonts)
      }
      for (const rule of Array.from(rules || [])) {
        if (rule instanceof CSSStyleRule) {
          if (matchesPage(rule.selectorText)) push(rule.cssText);
        } else if (rule instanceof CSSKeyframesRule) {
          push(rule.cssText);
        } else if (rule instanceof CSSMediaRule) {
          const inner = [];
          for (const sub of Array.from(rule.cssRules)) {
            if (sub instanceof CSSStyleRule && matchesPage(sub.selectorText)) inner.push(sub.cssText);
            else if (sub instanceof CSSKeyframesRule) inner.push(sub.cssText);
          }
          if (inner.length) push(`@media ${rule.conditionText} { ${inner.join('\n')} }`);
        }
      }
    }
    return [
      '*,*::before,*::after{box-sizing:border-box}',
      'html,body{margin:0;padding:0;background:transparent}',
      'p,h1,h2,h3,figure{margin:0}',
      'button{font:inherit;background:none;border:0;padding:0;cursor:pointer}',
      'img{display:block;max-width:100%}',
      'input{font:inherit}',
      ...out
    ].join('\n');
  }

  const textureStylesPromise = Promise.resolve().then(buildTextureStyles);
  htmlRenderer.getPageStylesCss = () => textureStylesPromise;

  const rasterizeElement = htmlRenderer.update.bind(htmlRenderer);
  const RASTER_MIN_INTERVAL = 120;
  let lastRasterAt = -Infinity;
  let trailingRepaintTimer = 0;
  htmlRenderer.update = async (element) => {
    const now = performance.now();
    const wait = RASTER_MIN_INTERVAL - (now - lastRasterAt);
    if (wait > 0) {
      // Skip this repaint, but guarantee the texture converges to the latest
      // state shortly after the burst ends.
      if (!trailingRepaintTimer) {
        trailingRepaintTimer = window.setTimeout(() => {
          trailingRepaintTimer = 0;
          canvas.requestPaint?.();
        }, wait + 16);
      }
      return htmlRenderer.getCanvas(element);
    }
    lastRasterAt = now;
    return rasterizeElement(element);
  };

  // Create a visible preview clone of the page source. The HTML-in-Canvas
  // polyfill rasterizes via SVG foreignObject, which only renders reliably
  // when the source element is present in the visible DOM. The interactive
  // original stays in place for three.js to move into the canvas.
  const previewShell = document.createElement('div');
  previewShell.className = 'scene-preview';
  previewShell.setAttribute('aria-hidden', 'true');
  previewShell.setAttribute('inert', '');
  const previewSource = pageSource.cloneNode(true);
  previewSource.removeAttribute('id');
  previewSource.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  previewShell.appendChild(previewSource);
  canvas.parentNode.insertBefore(previewShell, canvas.nextSibling);

  const conceptLabel = document.getElementById('conceptLabel');
  const conceptDesc = document.getElementById('conceptDesc');
  const powerToggle = document.getElementById('powerToggle');
  const beamInput = document.getElementById('beamInput');
  const beamOutput = document.getElementById('beamOutput');
  const brightnessInput = document.getElementById('brightnessInput');
  const brightnessOutput = document.getElementById('brightnessOutput');
  const colorOutput = document.getElementById('colorOutput');
  const colorOptions = document.getElementById('colorOptions');
  const customColor = document.getElementById('customColor');
  const resetLightBtn = document.getElementById('resetLight');
  const conceptButtons = pageSource.querySelectorAll('.concept-list button');

  let disposed = false;
  let lighting = { ...INITIAL_LIGHT };
  let concept = 'Reason';
  let ready = false;

  const activeColor = new THREE.Color();

  // Renderer
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.error(err);
    if (errorEl) errorEl.textContent = 'This experience needs WebGL to render the VulnClaw light study.';
    if (statusEl) statusEl.classList.add('is-hidden');
    return;
  }

  // Diagnostic logging for HTML-in-Canvas support
  const gl = renderer.getContext();
  const diag = [
    `HTMLTexture: ${typeof THREE.HTMLTexture}`,
    `texElementImage2D: ${'texElementImage2D' in gl}`,
    `layoutsubtree: ${canvas.hasAttribute('layoutsubtree')}`,
    `parentIsCanvas: ${pageSource.parentNode === canvas}`,
    `requestPaint: ${typeof canvas.requestPaint}`,
    `polyfill: ${!!window.__HTML_IN_CANVAS_POLYFILL__}`
  ].join(' | ');
  console.log('[VulnClaw Light]', diag);
  if (errorEl) errorEl.textContent = diag;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x010204, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010204);

  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 80);
  camera.position.set(0, 0.2, 13.6);

  const pageGroup = new THREE.Group();
  pageGroup.position.set(0, -0.35, 0);
  scene.add(pageGroup);

  const pageTexture = new THREE.HTMLTexture(pageSource);
  pageTexture.colorSpace = THREE.SRGBColorSpace;
  pageTexture.minFilter = THREE.LinearFilter;
  pageTexture.magFilter = THREE.LinearFilter;
  pageTexture.generateMipmaps = false;

  const pageGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  const pageMaterial = new THREE.MeshStandardMaterial({
    map: pageTexture,
    color: 0xc5cad4,
    roughness: 0.96,
    metalness: 0,
    transparent: true,
    alphaTest: 0.005,
    side: THREE.FrontSide
  });
  const pageMesh = new THREE.Mesh(pageGeometry, pageMaterial);
  pageGroup.add(pageMesh);

  const backingMaterial = new THREE.MeshStandardMaterial({
    color: 0x080a10,
    roughness: 0.9,
    metalness: 0.03
  });
  const backing = new THREE.Mesh(new THREE.PlaneGeometry(1.018, 1.028), backingMaterial);
  backing.position.z = -0.035;
  pageGroup.add(backing);

  const ambient = new THREE.HemisphereLight(0x8b5a4a, 0x151118, 0.58);
  scene.add(ambient);

  const fillLight = new THREE.DirectionalLight(0xc8a091, 0.24);
  fillLight.position.set(-4.8, 5.6, 7.4);
  scene.add(fillLight);

  const lampRoot = new THREE.Group();
  scene.add(lampRoot);

  const ceilingCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.3, 0.11, 24),
    new THREE.MeshStandardMaterial({ color: 0x101218, roughness: 0.64, metalness: 0.7 })
  );
  scene.add(ceilingCap);

  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 1, 10),
    new THREE.MeshStandardMaterial({ color: 0x121318, roughness: 0.5, metalness: 0.55 })
  );
  scene.add(cable);

  const shadeGroup = new THREE.Group();
  lampRoot.add(shadeGroup);

  const shadeProfile = [
    new THREE.Vector2(0.08, 0.08),
    new THREE.Vector2(0.18, 0.02),
    new THREE.Vector2(0.43, -0.1),
    new THREE.Vector2(0.82, -0.25),
    new THREE.Vector2(1.08, -0.36),
    new THREE.Vector2(1.1, -0.41)
  ];
  const shadeMaterial = new THREE.MeshStandardMaterial({
    color: 0x101116,
    roughness: 0.36,
    metalness: 0.74,
    side: THREE.DoubleSide
  });
  const shade = new THREE.Mesh(new THREE.LatheGeometry(shadeProfile, 48), shadeMaterial);
  shadeGroup.add(shade);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.095, 0.027, 8, 48),
    new THREE.MeshStandardMaterial({ color: 0x17191f, roughness: 0.28, metalness: 0.82 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.397;
  shadeGroup.add(rim);

  const undersideMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(INITIAL_LIGHT.color).multiplyScalar(0.18),
    emissive: INITIAL_LIGHT.color,
    emissiveIntensity: 0.42,
    roughness: 0.92,
    side: THREE.DoubleSide
  });
  const underside = new THREE.Mesh(new THREE.CircleGeometry(1.055, 48), undersideMaterial);
  underside.rotation.x = Math.PI / 2;
  underside.position.y = -0.385;
  shadeGroup.add(underside);

  const connector = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.12, 0.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x9c6744, roughness: 0.44, metalness: 0.66 })
  );
  connector.position.y = 0.08;
  shadeGroup.add(connector);

  const bulbMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd7ad,
    emissive: INITIAL_LIGHT.color,
    emissiveIntensity: 3.2,
    roughness: 0.2
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12), bulbMaterial);
  bulb.scale.y = 1.2;
  bulb.position.y = -0.33;
  shadeGroup.add(bulb);

  function createGlowTexture() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 64;
    textureCanvas.height = 64;
    const ctx = textureCanvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.16, 'rgba(255,222,172,.8)');
      gradient.addColorStop(0.46, 'rgba(255,170,94,.22)');
      gradient.addColorStop(1, 'rgba(255,140,70,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const glowTexture = createGlowTexture();
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: INITIAL_LIGHT.color,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const glow = new THREE.Sprite(glowMaterial);
  glow.position.y = -0.36;
  glow.scale.set(0.96, 0.96, 0.96);
  shadeGroup.add(glow);

  const spot = new THREE.SpotLight(
    INITIAL_LIGHT.color,
    1,
    18,
    THREE.MathUtils.degToRad(INITIAL_LIGHT.angle),
    0.88,
    2
  );
  spot.power = INITIAL_LIGHT.brightness;
  spot.position.set(0, -0.35, 0);
  spot.target.position.set(0, -7, 0);
  shadeGroup.add(spot, spot.target);

  const bulbLight = new THREE.PointLight(INITIAL_LIGHT.color, 1, 3.2, 2);
  bulbLight.power = 36;
  bulbLight.position.set(0, -0.35, 0);
  shadeGroup.add(bulbLight);

  const interactions = new InteractionManager();
  interactions.connect(renderer, camera);
  interactions.add(pageMesh);

  // Physics state
  const fixedStep = 1 / 120;
  const ropeLength = 1.22;
  const pageTopToAnchor = 1.18;
  const gravity = new THREE.Vector3(0, -9.81, 0);
  const anchor = new THREE.Vector3(0, 4.72, 1.18);
  const position = new THREE.Vector3(0.16, anchor.y - ropeLength, anchor.z + 0.08);
  const previous = position.clone().add(new THREE.Vector3(0.018, 0, -0.012));
  const aimTarget = new THREE.Vector3(0, 0.3, 0.08);
  const pointerVelocity = new THREE.Vector3();
  const lastPointerTarget = aimTarget.clone();

  const temp = new THREE.Vector3();
  const tempB = new THREE.Vector3();
  const tempC = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const ropeDirection = new THREE.Vector3();
  const lightDirection = new THREE.Vector3();
  const currentLightDirection = BASE_LIGHT_DIRECTION.clone();
  const midpoint = new THREE.Vector3();
  const swingQuaternion = new THREE.Quaternion();
  const lampQuaternion = new THREE.Quaternion();
  const cableQuaternion = new THREE.Quaternion();
  const pointer = new THREE.Vector2();
  const lampNdc = new THREE.Vector3();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.08);
  const raycaster = new THREE.Raycaster();

  let frame = 0;
  let animationFrame = 0;
  let resizeFrame = 0;
  let lastTime = performance.now();
  let accumulator = 0;
  let stableFrames = 0;
  let pulling = false;
  let pullPointerId = -1;
  let lastPointerTime = 0;
  let pullStrength = 0;
  let beamPointerId = -1;
  let beamStartX = 0;
  let beamStartY = 0;
  let beamStartAngle = INITIAL_LIGHT.angle;
  let beamDragged = false;

  function resize() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, width < 760 ? 1.25 : 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const sourceWidth = pageSource.offsetWidth || 1440;
    const sourceHeight = pageSource.offsetHeight || 810;
    const portrait = height > width * 1.16;
    const pageWidth = portrait ? 8.3 : 14.6;
    const pageHeight = pageWidth * (sourceHeight / sourceWidth);
    pageMesh.scale.set(pageWidth, pageHeight, 1);
    backing.scale.set(pageWidth, pageHeight, 1);

    pageGroup.position.y = portrait ? -0.62 : -0.38;
    anchor.set(0, pageGroup.position.y + pageHeight / 2 + pageTopToAnchor, portrait ? 1.1 : 1.18);
    ceilingCap.position.copy(anchor);
    ceilingCap.position.y += 0.08;

    if (!pulling) {
      const constrained = temp.copy(position).sub(anchor);
      if (constrained.lengthSq() < 0.001) constrained.copy(DOWN);
      constrained.normalize().multiplyScalar(ropeLength);
      position.copy(anchor).add(constrained);
      previous.copy(position);
    }

    const fitHeight = pageHeight + 2.35;
    const fitWidth = pageWidth + 0.7;
    const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
    const distanceForHeight = fitHeight / (2 * Math.tan(halfFov));
    const distanceForWidth = fitWidth / (2 * Math.tan(halfFov) * camera.aspect);
    const cameraDistance = Math.max(distanceForHeight, distanceForWidth);
    const cameraDrop = portrait ? 0.78 : 0.62;
    const upwardTarget = portrait ? -0.04 : 0.06;
    camera.position.set(0, pageGroup.position.y - cameraDrop, cameraDistance);
    camera.lookAt(0, pageGroup.position.y + upwardTarget, 0);
    camera.updateMatrixWorld();
    interactions.update();
    canvas.requestPaint?.();
    wake();
  }

  function updateRig() {
    ropeDirection.copy(position).sub(anchor).normalize();
    midpoint.copy(anchor).add(position).multiplyScalar(0.5);
    cable.position.copy(midpoint);
    cable.scale.set(1, ropeLength, 1);
    cableQuaternion.setFromUnitVectors(UP, ropeDirection);
    cable.quaternion.copy(cableQuaternion);

    if (pulling) {
      lightDirection.copy(aimTarget).sub(position).normalize();
      currentLightDirection.lerp(lightDirection, 0.32).normalize();
    } else {
      swingQuaternion.setFromUnitVectors(DOWN, ropeDirection);
      lightDirection.copy(BASE_LIGHT_DIRECTION).applyQuaternion(swingQuaternion).normalize();
      currentLightDirection.lerp(lightDirection, 0.14).normalize();
    }
    lampQuaternion.setFromUnitVectors(DOWN, currentLightDirection);
    lampRoot.position.copy(position);
    lampRoot.quaternion.copy(lampQuaternion);
  }

  function stepPhysics() {
    velocity.copy(position).sub(previous).multiplyScalar(pulling ? 0.985 : 0.9948);
    previous.copy(position);
    position.add(velocity).addScaledVector(gravity, fixedStep * fixedStep);

    if (pulling) {
      tempB.copy(aimTarget).sub(anchor).normalize();
      tempB.lerp(DOWN, 1 - pullStrength * 0.82).normalize();
      tempC.copy(tempB).multiplyScalar(ropeLength).add(anchor).sub(position);
      temp.copy(position).sub(anchor).normalize();
      tempC.addScaledVector(temp, -tempC.dot(temp));
      position.addScaledVector(tempC, 52 * fixedStep * fixedStep);
    }

    temp.copy(position).sub(anchor);
    if (temp.lengthSq() < 1e-8) temp.copy(DOWN);
    temp.normalize().multiplyScalar(ropeLength);
    position.copy(anchor).add(temp);

    velocity.copy(position).sub(previous);
    if (pulling) {
      stableFrames = 0;
    } else if (velocity.lengthSq() < 0.000000014) {
      stableFrames += 1;
    } else {
      stableFrames = 0;
    }
  }

  function animate(time) {
    animationFrame = 0;
    if (disposed) return;

    const delta = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    accumulator = Math.min(accumulator + delta, fixedStep * 5);
    while (accumulator >= fixedStep) {
      stepPhysics();
      accumulator -= fixedStep;
    }

    updateRig();
    interactions.update();
    renderer.render(scene, camera);
    frame += 1;

    if (pulling || stableFrames < 80 || frame < 4) {
      animationFrame = requestAnimationFrame(animate);
    }
  }

  function wake() {
    stableFrames = 0;
    if (!animationFrame && !disposed) {
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(animate);
    }
  }

  function pointerNdc(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }

  function updatePointerTarget(event) {
    pointerNdc(event);
    if (!raycaster.ray.intersectPlane(interactionPlane, aimTarget)) return false;

    lampNdc.copy(position).project(camera);
    const distanceX = (pointer.x - lampNdc.x) * camera.aspect;
    const distanceY = pointer.y - lampNdc.y;
    const pointerDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    pullStrength = THREE.MathUtils.smoothstep(pointerDistance, 0.08, 1.15);
    return true;
  }

  function onPointerDown(event) {
    if (event.button === 2) {
      beamPointerId = event.pointerId;
      beamStartX = event.clientX;
      beamStartY = event.clientY;
      beamStartAngle = lighting.angle;
      beamDragged = false;
      pageSource.classList.add('is-adjusting-beam');
      return;
    }
    if (event.button !== 0 || beamPointerId !== -1) return;
    if (!updatePointerTarget(event)) return;

    pulling = true;
    pullPointerId = event.pointerId;
    lastPointerTime = performance.now();
    lastPointerTarget.copy(aimTarget);
    pointerVelocity.set(0, 0, 0);
    canvas.classList.add('is-pulling-light');
    wake();
  }

  function onPointerMove(event) {
    if (event.pointerId === beamPointerId) {
      const movementX = event.clientX - beamStartX;
      const movementY = event.clientY - beamStartY;
      if (!beamDragged && Math.hypot(movementX, movementY) >= 4) beamDragged = true;
      if (beamDragged) {
        const nextAngle = clamp(Math.round(beamStartAngle + movementX * 0.14), 16, 58);
        if (lighting.angle !== nextAngle) {
          lighting.angle = nextAngle;
          updateLightDOM();
          wake();
        }
      }
      return;
    }
    if (!pulling || event.pointerId !== pullPointerId) return;
    if (!updatePointerTarget(event)) return;
    const now = performance.now();
    const elapsed = Math.max(0.008, Math.min(0.05, (now - lastPointerTime) / 1000));
    temp.copy(aimTarget).sub(lastPointerTarget).multiplyScalar(1 / elapsed);
    pointerVelocity.lerp(temp, 0.34);
    lastPointerTarget.copy(aimTarget);
    lastPointerTime = now;
    wake();
  }

  function onPointerUp(event) {
    if (event.pointerId === beamPointerId) {
      const shouldCycleColor = !beamDragged && event.type !== 'pointercancel';
      beamPointerId = -1;
      beamDragged = false;
      pageSource.classList.remove('is-adjusting-beam');
      if (shouldCycleColor) {
        const currentIndex = COLOR_PRESETS.findIndex((c) => c === lighting.color.toLowerCase());
        const nextColor = COLOR_PRESETS[(currentIndex + 1) % COLOR_PRESETS.length];
        lighting.color = nextColor;
        updateLightDOM();
      }
      wake();
      return;
    }
    if (!pulling || event.pointerId !== pullPointerId) return;

    velocity.copy(position).sub(previous).multiplyScalar(1 / fixedStep);
    temp.copy(position).sub(anchor).normalize();
    pointerVelocity.addScaledVector(temp, -pointerVelocity.dot(temp)).clampLength(0, 6);
    const pointerTransfer = lerp(0.055, 0.12, pullStrength);
    velocity.addScaledVector(pointerVelocity, pointerTransfer);

    tempB.copy(anchor).addScaledVector(DOWN, ropeLength).sub(position);
    tempB.addScaledVector(temp, -tempB.dot(temp));
    if (tempB.lengthSq() > 0.0001) {
      tempB.normalize();
      const returnImpulse = lerp(0.32, 1.6, pullStrength);
      velocity.addScaledVector(tempB, returnImpulse);
    }
    velocity.clampLength(0, 4.25);
    previous.copy(position).addScaledVector(velocity, -fixedStep);

    pulling = false;
    pullPointerId = -1;
    pullStrength = 0;
    canvas.classList.remove('is-pulling-light');
    wake();
  }

  function resetMotion() {
    pulling = false;
    pullPointerId = -1;
    pullStrength = 0;
    position.copy(anchor).addScaledVector(DOWN, ropeLength);
    previous.copy(position);
    pointerVelocity.set(0, 0, 0);
    currentLightDirection.copy(BASE_LIGHT_DIRECTION);
    canvas.classList.remove('is-pulling-light');
    beamPointerId = -1;
    beamDragged = false;
    pageSource.classList.remove('is-adjusting-beam');
    wake();
  }

  function onResize() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  }

  function applyHitRegion() {
    // The polyfill moves pageSource into an invisible interactive overlay that
    // covers the canvas. Real pointer events on it toggle pseudo-* classes,
    // which schedule expensive full-surface repaints on every hover boundary.
    // Restrict real hit-testing to the actual controls; empty areas fall
    // through to the overlay host, which forwards to the canvas listeners
    // without scheduling repaints.
    if (pageSource.style.pointerEvents !== 'none') pageSource.style.setProperty('pointer-events', 'none');
    pageSource.querySelectorAll('[data-interactive]').forEach((el) => {
      if (el.style.pointerEvents !== 'none') el.style.setProperty('pointer-events', 'none');
    });
    pageSource.querySelectorAll('[data-interactive] button, [data-interactive] input, [data-interactive] label').forEach((el) => {
      if (el.style.pointerEvents !== 'auto') el.style.setProperty('pointer-events', 'auto');
    });
  }

  function onPaint() {
    applyHitRegion();
    wake();
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('dblclick', resetMotion);
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('resize', onResize, { passive: true });
  canvas.addEventListener('paint', onPaint);

  // Controls
  function updateLightRig() {
    const color = activeColor.set(lighting.color);
    const effectiveBrightness = lighting.enabled ? lighting.brightness : 0;

    spot.color.copy(color);
    spot.power = effectiveBrightness;
    spot.angle = THREE.MathUtils.degToRad(lighting.angle);

    bulbLight.color.copy(color);
    bulbLight.power = lighting.enabled ? Math.max(18, lighting.brightness * 0.026) : 0;

    bulbMaterial.emissive.copy(color);
    bulbMaterial.emissiveIntensity = lighting.enabled ? 2.4 + lighting.brightness / 850 : 0.04;

    glowMaterial.color.copy(color);
    glowMaterial.opacity = lighting.enabled ? 0.52 + lighting.brightness / 4200 : 0;

    undersideMaterial.color.copy(color).multiplyScalar(0.18);
    undersideMaterial.emissive.copy(color);
    undersideMaterial.emissiveIntensity = lighting.enabled ? 0.22 + lighting.brightness / 7250 : 0.03;

    pageSource.style.setProperty('--lamp-color', lighting.color);
    canvas.requestPaint?.();
    wake();
  }

  function updateLightDOM() {
    if (beamInput) beamInput.value = lighting.angle;
    if (beamOutput) beamOutput.textContent = lighting.angle + '°';
    if (brightnessInput) brightnessInput.value = lighting.brightness;
    if (brightnessOutput) brightnessOutput.textContent = lighting.brightness + ' lm';
    if (colorOutput) colorOutput.textContent = hexToUpper(lighting.color);
    if (customColor) customColor.value = lighting.color;

    if (powerToggle) {
      powerToggle.classList.toggle('is-on', lighting.enabled);
      powerToggle.setAttribute('aria-pressed', String(lighting.enabled));
      powerToggle.setAttribute('aria-label', lighting.enabled ? 'Turn spotlight off' : 'Turn spotlight on');
      const indicator = powerToggle.querySelector('span');
      if (indicator) {
        powerToggle.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) node.textContent = lighting.enabled ? 'ON' : 'OFF';
        });
      } else {
        powerToggle.textContent = lighting.enabled ? 'ON' : 'OFF';
      }
    }

    if (colorOptions) {
      colorOptions.querySelectorAll('button[data-color]').forEach((btn) => {
        const active = btn.getAttribute('data-color').toLowerCase() === lighting.color.toLowerCase();
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }

    updateLightRig();
  }

  function setConcept(next) {
    concept = next;
    if (conceptLabel) conceptLabel.textContent = next;
    if (conceptDesc) conceptDesc.textContent = CONCEPTS[next];
    conceptButtons.forEach((btn) => {
      const active = btn.getAttribute('data-concept') === next;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    canvas.requestPaint?.();
  }

  conceptButtons.forEach((btn) => {
    btn.addEventListener('click', () => setConcept(btn.getAttribute('data-concept')));
  });

  if (powerToggle) {
    powerToggle.addEventListener('click', () => {
      lighting.enabled = !lighting.enabled;
      updateLightDOM();
    });
  }

  if (beamInput) {
    beamInput.addEventListener('input', () => {
      lighting.angle = parseInt(beamInput.value, 10);
      updateLightDOM();
    });
  }

  if (brightnessInput) {
    brightnessInput.addEventListener('input', () => {
      lighting.brightness = parseInt(brightnessInput.value, 10);
      updateLightDOM();
    });
  }

  if (colorOptions) {
    colorOptions.querySelectorAll('button[data-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lighting.color = btn.getAttribute('data-color');
        updateLightDOM();
      });
    });
  }

  if (customColor) {
    customColor.addEventListener('input', () => {
      lighting.color = customColor.value;
      updateLightDOM();
    });
  }

  if (resetLightBtn) {
    resetLightBtn.addEventListener('click', () => {
      lighting = { ...INITIAL_LIGHT };
      resetMotion();
      updateLightDOM();
    });
  }

  function onVisibilityChange() {
    if (document.hidden) {
      stableFrames = 9999;
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    } else {
      wake();
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  void document.fonts.ready.then(() => {
    if (disposed) return;
    canvas.requestPaint?.();
    resize();
    updateRig();
    updateLightDOM();
    ready = true;
    if (statusEl) statusEl.classList.add('is-hidden');
    if (errorEl) errorEl.textContent = '';
    if (previewShell) previewShell.classList.add('is-hidden');
    canvas.classList.add('is-ready');
    wake();
  });

  // Initial state
  updateLightDOM();
  updateRig();

  // Cleanup on page hide/navigate
  window.addEventListener('beforeunload', () => {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    cancelAnimationFrame(resizeFrame);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    interactions.disconnect();
    pageTexture.dispose();
    pageGeometry.dispose();
    pageMaterial.dispose();
    backing.geometry.dispose();
    backingMaterial.dispose();
    shade.geometry.dispose();
    shadeMaterial.dispose();
    rim.geometry.dispose();
    rim.material.dispose();
    underside.geometry.dispose();
    undersideMaterial.dispose();
    connector.geometry.dispose();
    connector.material.dispose();
    bulb.geometry.dispose();
    bulbMaterial.dispose();
    cable.geometry.dispose();
    cable.material.dispose();
    ceilingCap.geometry.dispose();
    ceilingCap.material.dispose();
    glowTexture.dispose();
    glowMaterial.dispose();
    renderer.dispose();
  });
})();
