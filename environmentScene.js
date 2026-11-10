/**
 * ============================================================
 * ORBITAL FRONTIER — 3D Environment Scene (Moon & Mars Outpost)
 * ============================================================
 * Creates an interactive 3D view of the player's outpost on
 * either the lunar or Martian surface using Three.js.
 * ============================================================
 */

const EnvironmentScene = (function () {
  'use strict';

  let scene, camera, renderer, outpostGroup;
  let animationFrameId = null;
  let isActive = false;
  let time = 0;
  let currentType = 'moon';
  let buildings = {};

  function init(canvasId, missionType) {
    currentType = missionType || 'moon';
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof THREE === 'undefined') {
      console.warn('EnvironmentScene: Three.js or canvas not available');
      createCSSFallback(canvasId);
      return;
    }

    const container = canvas.parentElement;

    try {
      scene = new THREE.Scene();

      if (currentType === 'moon') {
        scene.background = new THREE.Color(0x050508);
        scene.fog = new THREE.FogExp2(0x050508, 0.008);
      } else {
        scene.background = new THREE.Color(0x1a0a04);
        scene.fog = new THREE.FogExp2(0x2a1008, 0.012);
      }

      camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 500);
      camera.position.set(15, 10, 15);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = currentType === 'moon' ? 0.7 : 0.9;

      createLighting();
      createTerrain();
      createOutpost();
      createSkybox();

      window.addEventListener('resize', onResize);

      isActive = true;
      animate();
    } catch (error) {
      console.warn('EnvironmentScene: WebGL failed, using CSS fallback', error);
      createCSSFallback(canvasId);
    }
  }

  function createLighting() {
    if (currentType === 'moon') {
      // Harsh sunlight on the Moon (no atmosphere)
      const sunLight = new THREE.DirectionalLight(0xffeedd, 1.0);
      sunLight.position.set(20, 15, 10);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      scene.add(sunLight);

      const ambientLight = new THREE.AmbientLight(0x222244, 0.2);
      scene.add(ambientLight);

      // Earth-shine (faint blue)
      const earthLight = new THREE.DirectionalLight(0x4477cc, 0.15);
      earthLight.position.set(-10, 10, -5);
      scene.add(earthLight);
    } else {
      // Mars - dimmer sun, reddish ambient
      const sunLight = new THREE.DirectionalLight(0xffccaa, 0.7);
      sunLight.position.set(15, 12, 8);
      sunLight.castShadow = true;
      scene.add(sunLight);

      const ambientLight = new THREE.AmbientLight(0x442211, 0.3);
      scene.add(ambientLight);

      // Atmospheric scattering (reddish)
      const scatterLight = new THREE.HemisphereLight(0xcc8855, 0x331100, 0.2);
      scene.add(scatterLight);
    }
  }

  function createTerrain() {
    // Ground plane
    const groundGeom = new THREE.PlaneGeometry(100, 100, 64, 64);

    // Add terrain displacement
    const vertices = groundGeom.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const z = vertices.getY(i); // Before rotation, Y is what will become Z
      let height = 0;
      // Simple noise-like terrain
      height += Math.sin(x * 0.3) * Math.cos(z * 0.2) * 0.8;
      height += Math.sin(x * 0.7 + 1) * Math.sin(z * 0.5 + 2) * 0.4;
      height += Math.cos(x * 1.1 + z * 0.9) * 0.2;

      // Flatten the center for the outpost
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 8) {
        height *= distFromCenter / 8;
      }

      vertices.setZ(i, height);
    }
    groundGeom.computeVertexNormals();

    const groundColor = currentType === 'moon' ? 0x888890 : 0x8B4513;
    const groundMat = new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Craters (Moon) or rocks (Mars)
    const craterCount = currentType === 'moon' ? 8 : 5;
    for (let i = 0; i < craterCount; i++) {
      const radius = 0.5 + Math.random() * 1.5;
      const craterGeom = currentType === 'moon'
        ? new THREE.RingGeometry(radius * 0.7, radius, 16)
        : new THREE.DodecahedronGeometry(radius * 0.5, 0);

      const craterMat = new THREE.MeshStandardMaterial({
        color: currentType === 'moon' ? 0x666670 : 0x6B3410,
        roughness: 1,
        flatShading: true,
      });
      const crater = new THREE.Mesh(craterGeom, craterMat);

      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 20;
      if (currentType === 'moon') {
        crater.rotation.x = -Math.PI / 2;
        crater.position.set(Math.cos(angle) * dist, 0.05, Math.sin(angle) * dist);
      } else {
        crater.position.set(Math.cos(angle) * dist, radius * 0.3, Math.sin(angle) * dist);
        crater.rotation.set(Math.random(), Math.random(), Math.random());
      }
      scene.add(crater);
    }
  }

  function createOutpost() {
    outpostGroup = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.5,
      roughness: 0.4,
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x444455,
      metalness: 0.4,
      roughness: 0.5,
    });

    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1a3a6a,
      metalness: 0.7,
      roughness: 0.2,
    });

    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x22aa44,
      metalness: 0.1,
      roughness: 0.6,
      transparent: true,
      opacity: 0.7,
    });

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00ddff,
      transparent: true,
      opacity: 0.4,
    });

    // ---- HABITAT MODULE ----
    const habitatGroup = new THREE.Group();
    // Main dome
    const domeGeom = new THREE.SphereGeometry(2.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeom, metalMat);
    dome.castShadow = true;
    habitatGroup.add(dome);

    // Base ring
    const baseGeom = new THREE.CylinderGeometry(2.5, 2.7, 0.5, 24);
    const base = new THREE.Mesh(baseGeom, darkMat);
    base.position.y = -0.25;
    habitatGroup.add(base);

    // Windows (glowing)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const winGeom = new THREE.PlaneGeometry(0.4, 0.3);
      const win = new THREE.Mesh(winGeom, glowMat);
      win.position.set(Math.cos(angle) * 2.45, 0.8, Math.sin(angle) * 2.45);
      win.lookAt(0, 0.8, 0);
      win.rotateY(Math.PI);
      habitatGroup.add(win);
    }

    // Airlock
    const airlockGeom = new THREE.BoxGeometry(1, 1.5, 1);
    const airlock = new THREE.Mesh(airlockGeom, darkMat);
    airlock.position.set(2.8, 0.3, 0);
    airlock.castShadow = true;
    habitatGroup.add(airlock);

    habitatGroup.position.set(0, 0.5, 0);
    buildings.habitat = habitatGroup;
    outpostGroup.add(habitatGroup);

    // ---- SOLAR PANELS ----
    const solarGroup = new THREE.Group();
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const panelGroup = new THREE.Group();

        // Panel surface
        const surfGeom = new THREE.BoxGeometry(1.8, 0.05, 1.2);
        const surface = new THREE.Mesh(surfGeom, panelMat);
        surface.castShadow = true;
        panelGroup.add(surface);

        // Panel frame
        const frameGeom = new THREE.BoxGeometry(1.9, 0.02, 1.3);
        const frame = new THREE.Mesh(frameGeom, darkMat);
        frame.position.y = -0.03;
        panelGroup.add(frame);

        // Support pole
        const poleGeom = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
        const pole = new THREE.Mesh(poleGeom, metalMat);
        pole.position.y = -0.8;
        panelGroup.add(pole);

        panelGroup.position.set(
          -6 + col * 2.2,
          1.5,
          3 + row * 1.8
        );
        panelGroup.rotation.x = -0.3; // Tilted toward sun
        solarGroup.add(panelGroup);
      }
    }
    buildings.solar = solarGroup;
    outpostGroup.add(solarGroup);

    // ---- GREENHOUSE ----
    const greenhouseGroup = new THREE.Group();

    // Glass dome structure
    const ghDomeGeom = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 8);
    const ghBase = new THREE.Mesh(ghDomeGeom, darkMat);
    greenhouseGroup.add(ghBase);

    const ghTopGeom = new THREE.SphereGeometry(1.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const ghTop = new THREE.Mesh(ghTopGeom, new THREE.MeshStandardMaterial({
      color: 0xaaddaa,
      metalness: 0.1,
      roughness: 0.3,
      transparent: true,
      opacity: 0.35,
    }));
    ghTop.position.y = 0.05;
    greenhouseGroup.add(ghTop);

    // Plants inside (green spheres)
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 1;
      const plantGeom = new THREE.SphereGeometry(0.15 + Math.random() * 0.15, 8, 8);
      const plant = new THREE.Mesh(plantGeom, greenMat);
      plant.position.set(Math.cos(angle) * dist, 0.2 + Math.random() * 0.3, Math.sin(angle) * dist);
      greenhouseGroup.add(plant);
    }

    // Interior light
    const ghLight = new THREE.PointLight(0x44ff44, 0.3, 5);
    ghLight.position.set(0, 1, 0);
    greenhouseGroup.add(ghLight);

    greenhouseGroup.position.set(4, 0.3, 3);
    buildings.greenhouse = greenhouseGroup;
    outpostGroup.add(greenhouseGroup);

    // ---- RESEARCH LAB ----
    const labGroup = new THREE.Group();
    const labGeom = new THREE.BoxGeometry(3, 1.8, 2);
    const lab = new THREE.Mesh(labGeom, metalMat);
    lab.castShadow = true;
    labGroup.add(lab);

    // Lab roof details
    const labRoofGeom = new THREE.BoxGeometry(3.2, 0.1, 2.2);
    const labRoof = new THREE.Mesh(labRoofGeom, darkMat);
    labRoof.position.y = 0.95;
    labGroup.add(labRoof);

    // Lab windows
    for (let i = 0; i < 3; i++) {
      const labWinGeom = new THREE.PlaneGeometry(0.5, 0.4);
      const labWin = new THREE.Mesh(labWinGeom, glowMat);
      labWin.position.set(-1 + i * 1, 0.3, 1.01);
      labGroup.add(labWin);
    }

    // Lab antenna
    const labAntGeom = new THREE.CylinderGeometry(0.02, 0.02, 1, 6);
    const labAnt = new THREE.Mesh(labAntGeom, metalMat);
    labAnt.position.set(1, 1.5, 0);
    labGroup.add(labAnt);

    labGroup.position.set(-4, 0.9, -3);
    buildings.lab = labGroup;
    outpostGroup.add(labGroup);

    // ---- COMMUNICATION ANTENNA ----
    const commGroup = new THREE.Group();

    // Dish base
    const dishBaseGeom = new THREE.CylinderGeometry(0.3, 0.4, 0.3, 8);
    const dishBase = new THREE.Mesh(dishBaseGeom, darkMat);
    commGroup.add(dishBase);

    // Pole
    const dishPoleGeom = new THREE.CylinderGeometry(0.08, 0.08, 4, 8);
    const dishPole = new THREE.Mesh(dishPoleGeom, metalMat);
    dishPole.position.y = 2;
    commGroup.add(dishPole);

    // Dish
    const dishGeom = new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3);
    const dishMesh = new THREE.Mesh(dishGeom, metalMat);
    dishMesh.position.y = 4;
    dishMesh.rotation.x = -0.3;
    dishMesh.castShadow = true;
    commGroup.add(dishMesh);

    // Dish feed
    const feedGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6);
    const feed = new THREE.Mesh(feedGeom, darkMat);
    feed.position.set(0, 4.3, 0.6);
    feed.rotation.x = -0.5;
    commGroup.add(feed);

    commGroup.position.set(5, 0.15, -3);
    buildings.comm = commGroup;
    outpostGroup.add(commGroup);

    // ---- RADIATION SHELTER ----
    const shelterGroup = new THREE.Group();
    const shelterGeom = new THREE.BoxGeometry(2.5, 1.2, 2.5);
    const shelterMat = new THREE.MeshStandardMaterial({
      color: 0x666677,
      metalness: 0.3,
      roughness: 0.7,
    });
    const shelter = new THREE.Mesh(shelterGeom, shelterMat);
    shelter.castShadow = true;
    shelterGroup.add(shelter);

    // Shelter marking
    const markGeom = new THREE.PlaneGeometry(0.6, 0.6);
    const markCanvas = document.createElement('canvas');
    markCanvas.width = 64;
    markCanvas.height = 64;
    const mctx = markCanvas.getContext('2d');
    mctx.fillStyle = '#ff8800';
    mctx.beginPath();
    mctx.moveTo(32, 8);
    mctx.lineTo(56, 56);
    mctx.lineTo(8, 56);
    mctx.closePath();
    mctx.fill();
    mctx.fillStyle = '#000000';
    mctx.font = 'bold 24px Arial';
    mctx.textAlign = 'center';
    mctx.fillText('☢', 32, 46);
    const markTexture = new THREE.CanvasTexture(markCanvas);
    const markMaterial = new THREE.MeshBasicMaterial({ map: markTexture, transparent: true });
    const markMesh = new THREE.Mesh(markGeom, markMaterial);
    markMesh.position.set(0, 0.3, 1.26);
    shelterGroup.add(markMesh);

    // Thick walls
    const wallGeom = new THREE.BoxGeometry(2.7, 1.4, 2.7);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x555566,
      metalness: 0.2,
      roughness: 0.8,
      wireframe: false,
    });
    const outerWall = new THREE.Mesh(wallGeom, wallMat);
    outerWall.material.transparent = true;
    outerWall.material.opacity = 0.3;
    shelterGroup.add(outerWall);

    shelterGroup.position.set(0, 0.6, -5);
    buildings.shelter = shelterGroup;
    outpostGroup.add(shelterGroup);

    // ---- ROVER ----
    const roverGroup = new THREE.Group();
    const roverBodyGeom = new THREE.BoxGeometry(1.2, 0.4, 0.8);
    const roverBody = new THREE.Mesh(roverBodyGeom, metalMat);
    roverGroup.add(roverBody);

    // Wheels
    const wheelGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const wheelPositions = [[-0.5, -0.2, 0.45], [0.5, -0.2, 0.45], [-0.5, -0.2, -0.45], [0.5, -0.2, -0.45]];
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.position.set(...pos);
      wheel.rotation.x = Math.PI / 2;
      roverGroup.add(wheel);
    });

    // Solar panel on rover
    const roverPanelGeom = new THREE.BoxGeometry(0.8, 0.02, 0.5);
    const roverPanel = new THREE.Mesh(roverPanelGeom, panelMat);
    roverPanel.position.set(0, 0.35, 0);
    roverGroup.add(roverPanel);

    // Antenna
    const roverAntGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6);
    const roverAnt = new THREE.Mesh(roverAntGeom, metalMat);
    roverAnt.position.set(0.4, 0.45, 0);
    roverGroup.add(roverAnt);

    roverGroup.position.set(6, 0.2, 1);
    roverGroup.rotation.y = -0.5;
    buildings.rover = roverGroup;
    outpostGroup.add(roverGroup);

    // ---- Connecting paths between buildings ----
    const pathMat = new THREE.MeshStandardMaterial({
      color: currentType === 'moon' ? 0x777780 : 0x7a4020,
      roughness: 1,
    });

    const paths = [
      [0, 0, 4, 3],     // Habitat to greenhouse
      [0, 0, -4, -3],   // Habitat to lab
      [0, 0, 5, -3],    // Habitat to comm
      [0, 0, 0, -5],    // Habitat to shelter
      [0, 0, -6, 3],    // Habitat to solar
    ];

    paths.forEach(([x1, z1, x2, z2]) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.sqrt(dx * dx + dz * dz);
      const pathGeom = new THREE.PlaneGeometry(0.4, length);
      const path = new THREE.Mesh(pathGeom, pathMat);
      path.rotation.x = -Math.PI / 2;
      path.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
      path.rotation.z = -Math.atan2(dz, dx) + Math.PI / 2;
      outpostGroup.add(path);
    });

    scene.add(outpostGroup);
  }

  function createSkybox() {
    if (currentType === 'moon') {
      // Stars + Earth in sky
      const starGeom = new THREE.BufferGeometry();
      const positions = [];
      for (let i = 0; i < 3000; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.8; // Mostly above horizon
        const r = 80;
        positions.push(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi) + 5,
          r * Math.sin(phi) * Math.sin(theta)
        );
      }
      starGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, sizeAttenuation: true });
      scene.add(new THREE.Points(starGeom, starMat));

      // Earth
      const earthGeom = new THREE.SphereGeometry(3, 24, 24);
      const earthCanvas = document.createElement('canvas');
      earthCanvas.width = 128;
      earthCanvas.height = 128;
      const ectx = earthCanvas.getContext('2d');
      // Simple earth representation
      const grad = ectx.createRadialGradient(64, 64, 10, 64, 64, 64);
      grad.addColorStop(0, '#4488ff');
      grad.addColorStop(0.5, '#3366cc');
      grad.addColorStop(0.8, '#2244aa');
      grad.addColorStop(1, '#112266');
      ectx.fillStyle = grad;
      ectx.beginPath();
      ectx.arc(64, 64, 64, 0, Math.PI * 2);
      ectx.fill();
      // Continents
      ectx.fillStyle = '#33aa55';
      ectx.beginPath(); ectx.ellipse(50, 45, 15, 12, 0.3, 0, Math.PI * 2); ectx.fill();
      ectx.beginPath(); ectx.ellipse(80, 55, 10, 8, -0.2, 0, Math.PI * 2); ectx.fill();
      ectx.beginPath(); ectx.ellipse(45, 70, 8, 10, 0.5, 0, Math.PI * 2); ectx.fill();
      // Clouds
      ectx.fillStyle = 'rgba(255,255,255,0.3)';
      ectx.beginPath(); ectx.ellipse(40, 35, 20, 5, 0.2, 0, Math.PI * 2); ectx.fill();
      ectx.beginPath(); ectx.ellipse(70, 60, 18, 4, -0.3, 0, Math.PI * 2); ectx.fill();

      const earthTexture = new THREE.CanvasTexture(earthCanvas);
      const earthMat = new THREE.MeshBasicMaterial({ map: earthTexture });
      const earth = new THREE.Mesh(earthGeom, earthMat);
      earth.position.set(-30, 35, -40);
      scene.add(earth);

      // Atmosphere glow
      const atmosGeom = new THREE.SphereGeometry(3.3, 24, 24);
      const atmosMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
      });
      const atmos = new THREE.Mesh(atmosGeom, atmosMat);
      atmos.position.copy(earth.position);
      scene.add(atmos);

    } else {
      // Mars sky - reddish/pinkish
      const starGeom = new THREE.BufferGeometry();
      const positions = [];
      for (let i = 0; i < 1000; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.5;
        const r = 80;
        positions.push(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi) + 5,
          r * Math.sin(phi) * Math.sin(theta)
        );
      }
      starGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0xffddbb,
        size: 0.15,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true
      });
      scene.add(new THREE.Points(starGeom, starMat));

      // Mars atmosphere dome (reddish haze)
      const hazeGeom = new THREE.SphereGeometry(70, 16, 16);
      const hazeMat = new THREE.MeshBasicMaterial({
        color: 0x884422,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
      });
      scene.add(new THREE.Mesh(hazeGeom, hazeMat));

      // Small sun in Mars sky
      const sunGeom = new THREE.SphereGeometry(1.5, 16, 16);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xffeecc });
      const sun = new THREE.Mesh(sunGeom, sunMat);
      sun.position.set(30, 25, -20);
      scene.add(sun);

      // Sun glow
      const sunGlowGeom = new THREE.SphereGeometry(3, 16, 16);
      const sunGlowMat = new THREE.MeshBasicMaterial({
        color: 0xffcc88,
        transparent: true,
        opacity: 0.1,
      });
      const sunGlow = new THREE.Mesh(sunGlowGeom, sunGlowMat);
      sunGlow.position.copy(sun.position);
      scene.add(sunGlow);
    }
  }

  function animate() {
    if (!isActive) return;
    animationFrameId = requestAnimationFrame(animate);
    time += 0.005;

    // Slow camera orbit
    const radius = 18;
    camera.position.x = Math.sin(time * 0.3) * radius;
    camera.position.z = Math.cos(time * 0.3) * radius;
    camera.position.y = 8 + Math.sin(time * 0.5) * 2;
    camera.lookAt(0, 0.5, 0);

    // Animate comm dish rotation
    if (buildings.comm) {
      buildings.comm.children.forEach(child => {
        if (child.geometry && child.geometry.type === 'SphereGeometry') {
          // Don't rotate everything, just subtle dish movement
        }
      });
      buildings.comm.rotation.y = Math.sin(time * 0.2) * 0.3;
    }

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

  function highlightBuilding(name) {
    // Could add highlight effect
    if (buildings[name]) {
      // Brief scale pulse
      const b = buildings[name];
      b.scale.setScalar(1.1);
      setTimeout(() => b.scale.setScalar(1), 300);
    }
  }

  function createCSSFallback(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.style.display = 'none';

    const isMoon = currentType === 'moon';
    const fallback = document.createElement('div');
    fallback.style.cssText = `
      width: 100%; height: 100%;
      background: ${isMoon
      ? 'linear-gradient(180deg, #050510 0%, #0a0a20 40%, #555560 80%, #888890 100%)'
      : 'linear-gradient(180deg, #1a0a04 0%, #2a1510 40%, #8B4513 80%, #A0522D 100%)'};
      display: flex; align-items: center; justify-content: center;
      font-size: 3rem; position: relative;
    `;
    fallback.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 4rem; margin-bottom: 8px;">${isMoon ? '🌙' : '🔴'}</div>
        <div style="font-size: 1.5rem;">🏠 🔬 ☀️ 🌱</div>
        <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 8px; font-family: var(--font-display); letter-spacing: 0.1em;">
          ${isMoon ? 'LUNAR' : 'MARTIAN'} OUTPOST
        </div>
      </div>
    `;
    container.appendChild(fallback);
  }

  function destroy() {
    isActive = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (renderer) {
      renderer.dispose();
    }
    window.removeEventListener('resize', onResize);
    buildings = {};
  }

  return { init, destroy, highlightBuilding };
})();

window.EnvironmentScene = EnvironmentScene;
