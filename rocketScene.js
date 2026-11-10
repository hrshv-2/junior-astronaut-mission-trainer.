/**
 * ============================================================
 * ORBITAL FRONTIER — Landing Page 3D Rocket Scene (rocketScene.js)
 * ============================================================
 * Creates a realistic 3D rocket on a launchpad using Three.js.
 * Includes launchpad gantry, lighting, atmospheric smoke effects,
 * camera motion, and a simulated launch ignition sequence!
 * ============================================================
 */

const RocketScene = (function () {
  'use strict';

  let scene, camera, renderer, rocketGroup, smokeParticles = [], flameParticles = [];
  let animationFrameId = null;
  let isActive = false;
  let isLaunching = false;
  let launchSpeed = 0;
  let time = 0;
  let engineFlameLight = null;

  /**
   * Initialize the 3D rocket scene
   */
  function init(containerId) {
    const container = document.getElementById(containerId);
    if (!container || typeof THREE === 'undefined') {
      console.warn('RocketScene: Three.js or container not available, using CSS fallback');
      createCSSFallback(container);
      return;
    }

    try {
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x0a0e17, 0.015);

      camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
      camera.position.set(5, 4, 12);
      camera.lookAt(0, 4.5, 0);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.85;
      container.appendChild(renderer.domElement);

      createLighting();

      rocketGroup = new THREE.Group();
      createRocket();
      scene.add(rocketGroup);

      createLaunchpad();
      createGround();
      createStars();
      createSmokeSystem();

      window.addEventListener('resize', onResize);

      isActive = true;
      animate();
    } catch (error) {
      console.warn('RocketScene: WebGL initialization failed, using CSS fallback', error);
      createCSSFallback(container);
    }
  }

  function createLighting() {
    const ambientLight = new THREE.AmbientLight(0x1a2744, 0.45);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 0.85);
    keyLight.position.set(8, 10, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x4488cc, 0.35);
    fillLight.position.set(-5, 6, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x00d4ff, 0.4);
    rimLight.position.set(0, 3, -8);
    scene.add(rimLight);

    const padLight1 = new THREE.PointLight(0xff8800, 0.6, 15);
    padLight1.position.set(3, 0.5, 3);
    scene.add(padLight1);

    const padLight2 = new THREE.PointLight(0xff6600, 0.5, 12);
    padLight2.position.set(-3, 0.5, 2);
    scene.add(padLight2);

    // Dynamic Engine Flame Light (intensifies on launch)
    engineFlameLight = new THREE.PointLight(0xff4400, 0.2, 10);
    engineFlameLight.position.set(0, 0, 0);
    scene.add(engineFlameLight);
  }

  function createRocket() {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      metalness: 0.35,
      roughness: 0.35,
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.5,
      roughness: 0.3,
    });

    const orangeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      metalness: 0.2,
      roughness: 0.4,
    });

    // Main fuselage
    const bodyGeom = new THREE.CylinderGeometry(0.65, 0.72, 8, 32);
    const body = new THREE.Mesh(bodyGeom, bodyMaterial);
    body.position.y = 5;
    body.castShadow = true;
    rocketGroup.add(body);

    // Aerodynamic Nose cone
    const noseGeom = new THREE.ConeGeometry(0.65, 2.2, 32);
    const nose = new THREE.Mesh(noseGeom, bodyMaterial);
    nose.position.y = 10.1;
    nose.castShadow = true;
    rocketGroup.add(nose);

    // Nose escape tower tip
    const noseTipGeom = new THREE.ConeGeometry(0.18, 0.8, 16);
    const noseTip = new THREE.Mesh(noseTipGeom, darkMaterial);
    noseTip.position.y = 11.4;
    rocketGroup.add(noseTip);

    // Decorative aerospace stripes
    for (let i = 0; i < 3; i++) {
      const bandGeom = new THREE.CylinderGeometry(0.67 + i * 0.01, 0.7 + i * 0.01, 0.18, 32);
      const band = new THREE.Mesh(bandGeom, i === 1 ? orangeMaterial : darkMaterial);
      band.position.y = 3.2 + i * 2.6;
      rocketGroup.add(band);
    }

    // Command module porthole window
    const windowGeom = new THREE.CircleGeometry(0.18, 16);
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      emissive: 0x005577,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.1,
    });
    const windowMesh = new THREE.Mesh(windowGeom, windowMat);
    windowMesh.position.set(0, 7.8, 0.67);
    rocketGroup.add(windowMesh);

    // Engine skirt & nozzles
    const engineBaseGeom = new THREE.CylinderGeometry(0.72, 0.95, 1.4, 32);
    const engineBase = new THREE.Mesh(engineBaseGeom, darkMaterial);
    engineBase.position.y = 0.7;
    engineBase.castShadow = true;
    rocketGroup.add(engineBase);

    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.75,
      roughness: 0.25,
    });

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const nozzleGeom = new THREE.CylinderGeometry(0.14, 0.22, 0.6, 16);
      const nozzle = new THREE.Mesh(nozzleGeom, nozzleMat);
      nozzle.position.set(Math.cos(angle) * 0.42, 0.02, Math.sin(angle) * 0.42);
      rocketGroup.add(nozzle);
    }

    // 4 Stabilizer aerodynamic fins
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(1.3, 0);
    finShape.lineTo(0.3, 2.2);
    finShape.lineTo(0, 2.2);
    finShape.closePath();

    const finGeom = new THREE.ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: false });
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finGeom, orangeMaterial);
      fin.rotation.y = (i / 4) * Math.PI * 2;
      fin.position.y = 0.2;
      fin.castShadow = true;
      rocketGroup.add(fin);
    }
  }

  function createLaunchpad() {
    const platformGeom = new THREE.CylinderGeometry(3.2, 3.8, 0.35, 32);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.6,
      roughness: 0.4,
    });
    const platform = new THREE.Mesh(platformGeom, platformMat);
    platform.position.y = -0.18;
    platform.receiveShadow = true;
    scene.add(platform);

    // Gantry tower structures
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.5 });
    for (let i = 0; i < 4; i++) {
      const beamGeom = new THREE.BoxGeometry(0.1, 13, 0.1);
      const beam = new THREE.Mesh(beamGeom, towerMat);
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      beam.position.set(Math.cos(angle) * 1.8 - 2.8, 6.5, Math.sin(angle) * 0.4);
      beam.castShadow = true;
      scene.add(beam);
    }

    // Crew access arm
    const armGeom = new THREE.BoxGeometry(2.2, 0.12, 0.2);
    const arm = new THREE.Mesh(armGeom, towerMat);
    arm.position.set(-1.4, 7.8, 0);
    scene.add(arm);
  }

  function createGround() {
    const groundGeom = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.95,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.35;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  function createStars() {
    const starsGeom = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < 2400; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 50 + Math.random() * 60;
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) + 10,
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    starsGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.16,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });
    scene.add(new THREE.Points(starsGeom, starsMat));
  }

  function createSmokeSystem() {
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.16,
    });

    for (let i = 0; i < 35; i++) {
      const size = 0.35 + Math.random() * 0.6;
      const smokeGeom = new THREE.SphereGeometry(size, 8, 8);
      const smoke = new THREE.Mesh(smokeGeom, smokeMat.clone());
      resetSmokeParticle(smoke);
      scene.add(smoke);
      smokeParticles.push(smoke);
    }
  }

  function resetSmokeParticle(particle) {
    const angle = Math.random() * Math.PI * 2;
    const radius = isLaunching ? Math.random() * 2 : 1 + Math.random() * 2;
    particle.position.set(
      Math.cos(angle) * radius,
      -0.1 + Math.random() * 0.2,
      Math.sin(angle) * radius
    );
    particle.userData.velocity = {
      x: (Math.random() - 0.5) * (isLaunching ? 0.08 : 0.02),
      y: (isLaunching ? 0.03 : 0.008) + Math.random() * 0.02,
      z: (Math.random() - 0.5) * (isLaunching ? 0.08 : 0.02)
    };
    particle.userData.life = 0;
    particle.userData.maxLife = 120 + Math.random() * 200;
    particle.material.opacity = 0;
    particle.scale.setScalar(0.4 + Math.random() * 0.5);
  }

  /**
   * Triggers the realistic Launch Sequence
   */
  function startLaunchSequence(onComplete) {
    isLaunching = true;
    launchSpeed = 0.002;
    if (engineFlameLight) {
      engineFlameLight.intensity = 2.5;
    }

    setTimeout(() => {
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, 4500);
  }

  function animate() {
    if (!isActive) return;
    animationFrameId = requestAnimationFrame(animate);
    time += 0.01;

    if (!isLaunching) {
      // Gentle camera orbit on landing page
      const cameraRadius = 14;
      camera.position.x = Math.sin(time * 0.15) * cameraRadius * 0.4 + 5;
      camera.position.y = 4.2 + Math.sin(time * 0.2) * 0.4;
      camera.position.z = Math.cos(time * 0.15) * cameraRadius * 0.8 + 3;
      camera.lookAt(0, 4.5, 0);

      if (rocketGroup) {
        rocketGroup.position.y = Math.sin(time * 0.5) * 0.03;
      }
    } else {
      // Launch Sequence Ascent
      launchSpeed += 0.006;
      if (rocketGroup) {
        rocketGroup.position.y += launchSpeed;
      }

      // Camera tilts upward to follow ascending rocket
      camera.lookAt(0, (rocketGroup ? rocketGroup.position.y : 5) + 2, 0);

      // Camera vibration / rumble
      camera.position.x += (Math.random() - 0.5) * 0.05;
      camera.position.y += (Math.random() - 0.5) * 0.05;
    }

    // Animate smoke particles
    smokeParticles.forEach(particle => {
      particle.userData.life++;
      const lifeRatio = particle.userData.life / particle.userData.maxLife;

      if (lifeRatio >= 1) {
        resetSmokeParticle(particle);
        return;
      }

      particle.position.x += particle.userData.velocity.x;
      particle.position.y += particle.userData.velocity.y;
      particle.position.z += particle.userData.velocity.z;

      if (lifeRatio < 0.2) {
        particle.material.opacity = lifeRatio * (isLaunching ? 0.6 : 0.4);
      } else if (lifeRatio > 0.6) {
        particle.material.opacity = (1 - lifeRatio) * 0.4;
      }
      particle.scale.addScalar(isLaunching ? 0.015 : 0.004);
    });

    renderer.render(scene, camera);
  }

  function onResize() {
    if (!renderer) return;
    const container = renderer.domElement.parentElement;
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function createCSSFallback(container) {
    if (!container) return;
    container.innerHTML = `
      <div style="position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 80%, #1a2744 0%, #0a0e17 70%); display: flex; align-items: center; justify-content: center;">
        <div style="font-size: 8rem; filter: drop-shadow(0 0 30px rgba(255, 102, 0, 0.4)); animation: rocketFloat 3s ease-in-out infinite;">🚀</div>
      </div>
      <style>@keyframes rocketFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }</style>
    `;
  }

  function destroy() {
    isActive = false;
    isLaunching = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (renderer) renderer.dispose();
    window.removeEventListener('resize', onResize);
  }

  return { init, destroy, startLaunchSequence };
})();

window.RocketScene = RocketScene;
