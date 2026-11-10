/**
 * ============================================================================
 * ORBITAL FRONTIER — Cinematic Third-Person Astronaut Experience
 * ============================================================================
 * AAA-inspired 3D character-based spaceflight prologue and simulation.
 * Features:
 *  - Fully articulated procedural 3D PBR Astronaut character
 *  - Real third-person over-the-shoulder follow camera with collision dampening
 *  - Responsive character movement (WASD, Sprint, Jump, Turn, Smooth Kinematics)
 *  - Detailed Spaceport Complex: Pad 39B, crawler-transporter, LOX cryo tanks,
 *    flame trench, animated ground personnel, launch tower, working gantry elevator
 *  - Tower Crew Access Arm and White Room boarding bridge
 *  - Fully modeled spacecraft interior with functional cockpit displays (MFRDs),
 *    windows, dual launch couches, overhead controls, and seating animation
 *  - Cinematic multi-staged rocket launch with volumetric exhaust plumes, smoke,
 *    camera vibration, dynamic sky-to-space transition, and SRB separation
 *  - Microgravity orbit phase with Earth panorama and contextual Flight Computer
 *  - Spatial Web Audio soundscape (wind, footsteps, radio comms, hatch servos, launch rumble)
 *  - Educational NASA scientific inspection hotspots
 * ============================================================================
 */

window.AstronautExperience = (function () {
  'use strict';

  // --- MODULE STATE ---
  let container = null;
  let scene = null;
  let camera = null;
  let renderer = null;
  let animFrameId = null;
  let isRunning = false;
  let missionConfig = {
    missionType: 'moon',
    difficulty: 'explorer',
    commanderName: 'Alex',
    avatar: '🧑‍🚀',
    onCompleteLaunchToOrbit: null
  };

  // Stage flags
  // 0: Arrival / Launchpad walk
  // 1: Tower Elevator ascending
  // 2: Crew Access Arm / White Room
  // 3: Spacecraft Interior / Cabin
  // 4: Seated in Cockpit / Launch Countdown
  // 5: Launch In-Flight
  // 6: Orbit Achieved / Microgravity
  let currentStage = 0;

  // --- THREE.JS OBJECT REFERENCES ---
  let astronaut = null;
  let rocketGroup = null;
  let towerGroup = null;
  let elevatorGroup = null;
  let cabinGroup = null;
  let hatchDoor = null;
  let cockpitScreens = [];
  let earthMesh = null;
  let destinationPlanet = null;
  let starsMesh = null;
  let groundPersonnel = [];
  let exhaustPlumes = [];
  let smokeParticles = [];
  let cloudLayers = [];
  let sunLight = null;
  let ambientLight = null;
  let padSpotlights = [];
  let cockpitInteriorLight = null;

  // Camera settings & state
  const cameraState = {
    yaw: 0,
    pitch: 0.2,
    distance: 4.8,
    targetDistance: 4.8,
    heightOffset: 1.6,
    shoulderOffset: 0.55,
    damping: 0.1,
    shakeIntensity: 0,
    viewMode: 'third' // 'third', 'cockpit', 'exterior_launch', 'cinematic'
  };

  // Character controller state
  const playerState = {
    pos: null,
    velocity: null,
    heading: Math.PI,
    targetHeading: Math.PI,
    isMoving: false,
    isSprinting: false,
    isGrounded: true,
    inElevator: false,
    insideCapsule: false,
    isSeated: false,
    inOrbit: false,
    strideTime: 0,
    animTime: 0
  };

  // Input state
  const keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    shift: false,
    space: false,
    e: false
  };

  let pointerLocked = false;
  let isPointerDown = false;
  let prevMousePos = { x: 0, y: 0 };

  // Audio subsystem
  let audioCtx = null;
  let audioMuted = false;
  let activeAudioNodes = {
    windGain: null,
    humGain: null,
    rumbleGain: null,
    rumbleOsc: null,
    rumbleFilter: null
  };

  // Inspection hotspot registry
  let hotspots = [];
  let activeHotspot = null;

  // Launch progression timer
  let launchTimer = 0;
  let launchDuration = 22; // seconds of cinematic ascent

  // =========================================================================
  // 1. INITIALIZATION & LIFECYCLE
  // =========================================================================

  function start(config) {
    if (config) {
      missionConfig = Object.assign(missionConfig, config);
    }
    currentStage = 0;
    groundPersonnel = [];
    exhaustPlumes = [];
    smokeParticles = [];
    cloudLayers = [];
    padSpotlights = [];
    cockpitScreens = [];
    hotspots = [];
    activeHotspot = null;

    playerState.pos = new THREE.Vector3(0, 0, 32);
    playerState.velocity = new THREE.Vector3();
    playerState.heading = Math.PI;
    playerState.targetHeading = Math.PI;
    playerState.isMoving = false;
    playerState.isSprinting = false;
    playerState.isGrounded = true;
    playerState.inElevator = false;
    playerState.insideCapsule = false;
    playerState.isSeated = false;
    playerState.inOrbit = false;
    playerState.strideTime = 0;
    playerState.animTime = 0;

    cameraState.yaw = 0;
    cameraState.pitch = 0.2;
    cameraState.distance = 4.8;
    cameraState.targetDistance = 4.8;
    cameraState.shoulderOffset = 0.55;
    cameraState.shakeIntensity = 0;
    cameraState.viewMode = 'third';

    container = document.getElementById('astronaut-canvas-container');
    if (!container) {
      console.error('AstronautExperience: container #astronaut-canvas-container not found.');
      return;
    }

    // Reset DOM UI overlays
    setupUI();

    // Init WebGL Scene
    initThree();

    // Build World
    buildSkyAndAtmosphere();
    buildLaunchComplex();
    buildRocket();
    buildSpacecraftInterior();
    buildAstronautCharacter();
    buildGroundPersonnel();
    buildInspectionHotspots();
    buildSpaceEnvironment();

    // Setup Audio
    initAudio();

    // Bind Controls
    bindInputHandlers();

    // Start Loop
    isRunning = true;
    prevTime = performance.now();
    animate(prevTime);

    // Initial cinematic entrance
    playEntranceSequence();
  }

  function stop() {
    isRunning = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    stopAudio();
    unbindInputHandlers();

    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
    scene = null;
    camera = null;
  }

  // =========================================================================
  // 2. THREE.JS PIPELINE & RENDERER SETUP
  // =========================================================================

  let prevTime = 0;

  function initThree() {
    container.innerHTML = '';

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x8cb5df, 0.0035); // Atmospheric haze

    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(52, aspect, 0.1, 8000);
    camera.position.set(0, 3, 38);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputEncoding = THREE.sRGBEncoding;

    container.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);
  }

  function onWindowResize() {
    if (!renderer || !camera || !container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  // =========================================================================
  // 3. LIGHTING, ATMOSPHERE & SKY DOME
  // =========================================================================

  let skyMesh = null;

  function buildSkyAndAtmosphere() {
    // Dynamic Sky Dome
    const skyGeo = new THREE.SphereGeometry(2500, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x6ba8e5,
      side: THREE.BackSide
    });
    skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    // Warm directional sunlight
    sunLight = new THREE.DirectionalLight(0xfff7e6, 1.4);
    sunLight.position.set(120, 180, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 450;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    // Ambient fill
    ambientLight = new THREE.AmbientLight(0x7da4d4, 0.65);
    scene.add(ambientLight);

    // Launchpad Floodlights
    createPadFloodlight(18, 12, 18, 0xffeedd, 1.2, 70);
    createPadFloodlight(-18, 12, 18, 0xffeedd, 1.2, 70);
    createPadFloodlight(18, 12, -18, 0x99ccff, 0.9, 70);
    createPadFloodlight(-18, 12, -18, 0x99ccff, 0.9, 70);

    // High altitude cloud layers for launch ascent
    const cloudGeo = new THREE.PlaneGeometry(600, 600, 8, 8);
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 512;
    cloudCanvas.height = 512;
    const cctx = cloudCanvas.getContext('2d');
    const grad = cctx.createRadialGradient(256, 256, 20, 256, 256, 240);
    grad.addColorStop(0, 'rgba(255,255,255,0.75)');
    grad.addColorStop(0.5, 'rgba(240,245,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    cctx.fillStyle = grad;
    cctx.fillRect(0, 0, 512, 512);

    const cloudTex = new THREE.CanvasTexture(cloudCanvas);
    cloudTex.wrapS = THREE.RepeatWrapping;
    cloudTex.wrapT = THREE.RepeatWrapping;
    cloudTex.repeat.set(4, 4);

    const cloudMat = new THREE.MeshBasicMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 4; i++) {
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.rotation.x = Math.PI / 2;
      cloud.position.y = 220 + i * 40;
      scene.add(cloud);
      cloudLayers.push(cloud);
    }
  }

  function createPadFloodlight(x, y, z, color, intensity, distance) {
    const light = new THREE.PointLight(color, intensity, distance, 1.5);
    light.position.set(x, y, z);
    scene.add(light);
    padSpotlights.push(light);

    // Visible floodlight fixture
    const fixtureGeo = new THREE.CylinderGeometry(0.5, 0.8, 1.2, 8);
    const fixtureMat = new THREE.MeshStandardMaterial({
      color: 0x222225,
      metalness: 0.8,
      roughness: 0.3
    });
    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixture.position.set(x, y, z);
    fixture.rotation.x = Math.PI / 4;
    scene.add(fixture);

    // Glowing lens
    const lensGeo = new THREE.CircleGeometry(0.7, 12);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(x, y - 0.5, z + 0.3);
    lens.rotation.x = Math.PI / 3;
    scene.add(lens);
  }

  // =========================================================================
  // 4. SPACEPORT LAUNCH FACILITY & PAD COMPLEX
  // =========================================================================

  function buildLaunchComplex() {
    // 1. Reinforced Concrete Launch Apron Ground
    const groundGeo = new THREE.PlaneGeometry(350, 350, 32, 32);
    const groundTex = createConcreteTexture();
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(24, 24);

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.85,
      metalness: 0.15
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Hazard yellow safety boundary ring
    const hazardRingGeo = new THREE.RingGeometry(22, 23.5, 48);
    const hazardTex = createHazardStripeTexture();
    hazardTex.wrapS = THREE.RepeatWrapping;
    hazardTex.wrapT = THREE.RepeatWrapping;
    hazardTex.repeat.set(36, 1);
    const hazardMat = new THREE.MeshBasicMaterial({ map: hazardTex, side: THREE.DoubleSide });
    const hazardRing = new THREE.Mesh(hazardRingGeo, hazardMat);
    hazardRing.rotation.x = -Math.PI / 2;
    hazardRing.position.y = 0.02;
    scene.add(hazardRing);

    // 2. Launch Mount / Elevated Flame Deflector Deck
    const mountGeo = new THREE.BoxGeometry(32, 4.5, 32);
    const mountMat = new THREE.MeshStandardMaterial({
      color: 0x3a424e,
      roughness: 0.7,
      metalness: 0.4
    });
    const mount = new THREE.Mesh(mountGeo, mountMat);
    mount.position.set(0, 2.25, 0);
    mount.receiveShadow = true;
    mount.castShadow = true;
    scene.add(mount);

    // Deep Flame Trench beneath rocket base
    const trenchCutoutGeo = new THREE.CylinderGeometry(7, 7, 5, 24, 1, true);
    const trenchMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1f,
      roughness: 0.95,
      side: THREE.BackSide
    });
    const trench = new THREE.Mesh(trenchCutoutGeo, trenchMat);
    trench.position.set(0, 2.5, 0);
    scene.add(trench);

    // Cryogenic Sound Suppression Water Deluge Pipes
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const pipeGeo = new THREE.CylinderGeometry(0.65, 0.65, 12, 16);
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.7, roughness: 0.3 });
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.position.set(Math.cos(angle) * 11, 2.5, Math.sin(angle) * 11);
      pipe.rotation.z = Math.PI / 3 * (i % 2 === 0 ? 1 : -1);
      scene.add(pipe);
    }

    // 3. Giant Steel Launch Gantry Service Tower
    towerGroup = new THREE.Group();
    towerGroup.position.set(-13, 0, 0);
    scene.add(towerGroup);

    // Multi-tiered red-and-gray steel truss tower (85m high)
    const towerHeight = 92;
    const towerBaseGeo = new THREE.BoxGeometry(8, towerHeight, 8);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0xa83232, // NASA Launch Tower Industrial Red
      roughness: 0.5,
      metalness: 0.6
    });

    // Create lattice truss beams structure
    const towerLegGeo = new THREE.CylinderGeometry(0.35, 0.35, towerHeight, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333339, metalness: 0.7, roughness: 0.4 });
    const offsets = [
      [-3.8, -3.8],
      [3.8, -3.8],
      [-3.8, 3.8],
      [3.8, 3.8]
    ];
    offsets.forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(towerLegGeo, legMat);
      leg.position.set(ox, towerHeight / 2, oz);
      leg.castShadow = true;
      towerGroup.add(leg);
    });

    // Tower horizontal and cross-bracing platforms every 10 meters
    for (let y = 8; y <= towerHeight; y += 9) {
      const platGeo = new THREE.BoxGeometry(8.4, 0.45, 8.4);
      const plat = new THREE.Mesh(platGeo, towerMat);
      plat.position.set(0, y, 0);
      plat.castShadow = true;
      towerGroup.add(plat);

      // Yellow safety railing
      const railGeo = new THREE.BoxGeometry(8.6, 0.9, 8.6);
      const railMat = new THREE.MeshBasicMaterial({ color: 0xeab308, wireframe: true });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(0, y + 0.5, 0);
      towerGroup.add(rail);

      // Warning strobe lights
      if (y % 18 === 0) {
        const beacon = new THREE.PointLight(0xff3300, 0.8, 15);
        beacon.position.set(4, y + 1, 4);
        towerGroup.add(beacon);
      }
    }

    // 4. High-Speed Gantry Elevator Shaft & Car
    const elevatorShaftGeo = new THREE.BoxGeometry(3, towerHeight, 3);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x22262e,
      wireframe: true
    });
    const shaft = new THREE.Mesh(elevatorShaftGeo, shaftMat);
    shaft.position.set(0, towerHeight / 2, 4.5);
    towerGroup.add(shaft);

    // Elevator Car (Starts at ground level Y=1.5, ascends to Level 320 at Y=76)
    elevatorGroup = new THREE.Group();
    elevatorGroup.position.set(0, 1.5, 4.5);
    towerGroup.add(elevatorGroup);

    const carFrameGeo = new THREE.BoxGeometry(2.8, 3.2, 2.8);
    const carFrameMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.8,
      roughness: 0.2
    });
    const carFrame = new THREE.Mesh(carFrameGeo, carFrameMat);
    carFrame.position.y = 1.6;
    elevatorGroup.add(carFrame);

    // Glass walls for panoramic ride up
    const glassGeo = new THREE.BoxGeometry(2.6, 2.6, 2.6);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xaaccff,
      transmission: 0.85,
      opacity: 0.45,
      transparent: true,
      roughness: 0.1,
      metalness: 0.1
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = 1.6;
    elevatorGroup.add(glass);

    // Elevator interior floor indicator light
    const elevLight = new THREE.PointLight(0x00d4ff, 0.9, 6);
    elevLight.position.set(0, 2.5, 0);
    elevatorGroup.add(elevLight);

    // 5. Crew Access Arm (Swing Arm) at High Level (Y = 76m)
    // Extends from the tower (X=-13) over to the rocket spacecraft hatch (X=0, Y=76, Z=2.8)
    const armGroup = new THREE.Group();
    armGroup.position.set(0, 76, 0);
    towerGroup.add(armGroup);

    // Walkway bridge
    const walkwayGeo = new THREE.BoxGeometry(11.5, 1.2, 2.6);
    const walkwayMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.4,
      metalness: 0.6
    });
    const walkway = new THREE.Mesh(walkwayGeo, walkwayMat);
    walkway.position.set(6, 0, 0);
    armGroup.add(walkway);

    // Walkway Handrails
    const armRailGeo = new THREE.BoxGeometry(11.5, 1.1, 2.7);
    const armRailMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true });
    const armRail = new THREE.Mesh(armRailGeo, armRailMat);
    armRail.position.set(6, 0.8, 0);
    armGroup.add(armRail);

    // The Famous White Room (Enclosed cleanroom at the spacecraft hatch entrance)
    const whiteRoomGeo = new THREE.BoxGeometry(3.6, 3.4, 3.6);
    const whiteRoomMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.2
    });
    const whiteRoom = new THREE.Mesh(whiteRoomGeo, whiteRoomMat);
    whiteRoom.position.set(11.5, 1.2, 0);
    armGroup.add(whiteRoom);

    // White room illuminated interior light
    const wrLight = new THREE.PointLight(0xffffff, 1.2, 8);
    wrLight.position.set(11.5, 2.2, 0);
    armGroup.add(wrLight);

    // 6. NASA Crawler-Transporter & Service Vehicles on Apron
    buildGroundEquipment();
  }

  function buildGroundEquipment() {
    // NASA Crawler-Transporter parked near apron edge
    const crawlerGroup = new THREE.Group();
    crawlerGroup.position.set(38, 0, 18);
    scene.add(crawlerGroup);

    const chassisGeo = new THREE.BoxGeometry(24, 3, 20);
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x827717, roughness: 0.8, metalness: 0.3 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 3.5;
    crawlerGroup.add(chassis);

    // 4 dual track assemblies
    const trackOffsets = [
      [-10, -9],
      [10, -9],
      [-10, 9],
      [10, 9]
    ];
    trackOffsets.forEach(([tx, tz]) => {
      const trackGeo = new THREE.BoxGeometry(6, 2.8, 3.5);
      const trackMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.95 });
      const track = new THREE.Mesh(trackGeo, trackMat);
      track.position.set(tx, 1.4, tz);
      crawlerGroup.add(track);
    });

    // Liquid Oxygen (LOX) Cryogenic Spherical Tank Farm
    const loxGroup = new THREE.Group();
    loxGroup.position.set(-36, 0, 24);
    scene.add(loxGroup);

    const loxSphereGeo = new THREE.SphereGeometry(6.5, 32, 24);
    const loxSphereMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.2,
      metalness: 0.6
    });
    const loxSphere = new THREE.Mesh(loxSphereGeo, loxSphereMat);
    loxSphere.position.y = 8;
    loxSphere.castShadow = true;
    loxGroup.add(loxSphere);

    // LOX Support tripod struts
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const legGeo = new THREE.CylinderGeometry(0.35, 0.45, 6, 8);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(Math.cos(angle) * 4.5, 3, Math.sin(angle) * 4.5);
      loxGroup.add(leg);
    }

    // Frosted Cryogenic Vapor Emitter over LOX tank
    createVaporPlume(-36, 12, 24, 0.4);
  }

  // =========================================================================
  // 5. THE ROCKET — ORBITAL FRONTIER HEAVY LAUNCH VEHICLE
  // =========================================================================

  function buildRocket() {
    rocketGroup = new THREE.Group();
    rocketGroup.position.set(0, 4.5, 0); // Sits on top of launch table
    scene.add(rocketGroup);

    // 1. Core Stage (Orange thermal insulation foam, 55m tall, 6.2m diameter)
    const coreHeight = 54;
    const coreRadius = 3.2;
    const coreGeo = new THREE.CylinderGeometry(coreRadius, coreRadius, coreHeight, 36);
    const coreTex = createInsulationFoamTexture();
    coreTex.wrapS = THREE.RepeatWrapping;
    coreTex.wrapT = THREE.RepeatWrapping;
    coreTex.repeat.set(6, 12);

    const coreMat = new THREE.MeshStandardMaterial({
      map: coreTex,
      roughness: 0.88,
      metalness: 0.12
    });
    const coreStage = new THREE.Mesh(coreGeo, coreMat);
    coreStage.position.y = coreHeight / 2;
    coreStage.castShadow = true;
    coreStage.receiveShadow = true;
    rocketGroup.add(coreStage);

    // Vertical plumbing feedlines down the core stage (LOX downcomer)
    const feedlineGeo = new THREE.CylinderGeometry(0.28, 0.28, coreHeight, 16);
    const feedlineMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
    const feedline = new THREE.Mesh(feedlineGeo, feedlineMat);
    feedline.position.set(coreRadius + 0.15, coreHeight / 2, 0);
    rocketGroup.add(feedline);

    // Core Stage RS-25 Engine Cluster (4 bell nozzles)
    const engineOffsets = [
      [-1.4, -1.4],
      [1.4, -1.4],
      [-1.4, 1.4],
      [1.4, 1.4]
    ];
    engineOffsets.forEach(([ex, ez]) => {
      const bellGeo = new THREE.ConeGeometry(0.85, 2.4, 24, 1, true);
      const bellMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.9,
        roughness: 0.2,
        side: THREE.DoubleSide
      });
      const bell = new THREE.Mesh(bellGeo, bellMat);
      bell.position.set(ex, -0.4, ez);
      bell.castShadow = true;
      rocketGroup.add(bell);

      // Gimbal actuator rods
      const actuatorGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8);
      const actuatorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
      const actuator = new THREE.Mesh(actuatorGeo, actuatorMat);
      actuator.position.set(ex * 1.2, 0.4, ez * 1.2);
      rocketGroup.add(actuator);
    });

    // 2. Twin Solid Rocket Boosters (SRBs) on Port & Starboard
    const srbRadius = 1.6;
    const srbHeight = 52;
    const srbMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.45
    });

    [-1, 1].forEach((dir) => {
      const srbGroup = new THREE.Group();
      srbGroup.position.set(dir * (coreRadius + srbRadius + 0.6), 0, 0);
      rocketGroup.add(srbGroup);

      // Booster cylinder
      const srbGeo = new THREE.CylinderGeometry(srbRadius, srbRadius, srbHeight, 32);
      const srb = new THREE.Mesh(srbGeo, srbMat);
      srb.position.y = srbHeight / 2;
      srb.castShadow = true;
      srbGroup.add(srb);

      // Segment casing bands
      for (let b = 8; b < srbHeight; b += 10) {
        const bandGeo = new THREE.TorusGeometry(srbRadius + 0.03, 0.08, 8, 32);
        const bandMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = b;
        band.rotation.x = Math.PI / 2;
        srbGroup.add(band);
      }

      // Aerodynamic forward nose cone
      const coneGeo = new THREE.ConeGeometry(srbRadius, 6, 32);
      const cone = new THREE.Mesh(coneGeo, srbMat);
      cone.position.y = srbHeight + 3;
      cone.castShadow = true;
      srbGroup.add(cone);

      // SRB Nozzle
      const nozzleGeo = new THREE.ConeGeometry(1.2, 2.8, 24, 1, true);
      const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 });
      const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
      nozzle.position.y = -0.6;
      srbGroup.add(nozzle);
    });

    // 3. Cryogenic Upper Stage & Interstage
    const interstageHeight = 9;
    const interstageGeo = new THREE.CylinderGeometry(2.9, coreRadius, interstageHeight, 36);
    const interstageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.5 });
    const interstage = new THREE.Mesh(interstageGeo, interstageMat);
    interstage.position.y = coreHeight + interstageHeight / 2;
    interstage.castShadow = true;
    rocketGroup.add(interstage);

    // 4. European Service Module (Radiator panels & solar array bay)
    const esmHeight = 6.5;
    const esmGeo = new THREE.CylinderGeometry(2.6, 2.9, esmHeight, 32);
    const esmMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.7 });
    const esm = new THREE.Mesh(esmGeo, esmMat);
    esm.position.y = coreHeight + interstageHeight + esmHeight / 2;
    esm.castShadow = true;
    rocketGroup.add(esm);

    // 5. Crew Command Module (Capsule Exterior, Y ~ 71.5m to 76m)
    const capsuleHeight = 4.8;
    const capsuleBaseRadius = 2.6;
    const capsuleTopRadius = 1.1;
    const capsuleGeo = new THREE.CylinderGeometry(capsuleTopRadius, capsuleBaseRadius, capsuleHeight, 32);
    const capsuleTex = createThermalTilesTexture();
    capsuleTex.wrapS = THREE.RepeatWrapping;
    capsuleTex.wrapT = THREE.RepeatWrapping;
    capsuleTex.repeat.set(8, 4);

    const capsuleMat = new THREE.MeshStandardMaterial({
      map: capsuleTex,
      roughness: 0.4,
      metalness: 0.5
    });
    const capsule = new THREE.Mesh(capsuleGeo, capsuleMat);
    capsule.position.y = coreHeight + interstageHeight + esmHeight + capsuleHeight / 2;
    capsule.castShadow = true;
    rocketGroup.add(capsule);

    // Ingress / Egress Exterior Spacecraft Hatch
    // Positioned at X = -capsuleBaseRadius * 0.9 (facing gantry tower White Room)
    const hatchFrameGeo = new THREE.BoxGeometry(0.35, 1.8, 1.3);
    const hatchFrameMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8, roughness: 0.2 });
    const hatchFrame = new THREE.Mesh(hatchFrameGeo, hatchFrameMat);
    hatchFrame.position.set(-2.2, coreHeight + interstageHeight + esmHeight + 2.2, 0);
    rocketGroup.add(hatchFrame);

    // Mechanical Hatch Door (rotates open upon interaction)
    const hatchDoorGeo = new THREE.BoxGeometry(0.2, 1.6, 1.1);
    const hatchDoorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.6
    });
    hatchDoor = new THREE.Mesh(hatchDoorGeo, hatchDoorMat);
    hatchDoor.position.set(-2.2, coreHeight + interstageHeight + esmHeight + 2.2, 0);
    rocketGroup.add(hatchDoor);

    // 6. Launch Abort System (LAS) Tower and Jettison Motors
    const lasTowerHeight = 12;
    const lasGeo = new THREE.CylinderGeometry(0.4, 0.9, lasTowerHeight, 16);
    const lasMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.5 });
    const las = new THREE.Mesh(lasGeo, lasMat);
    las.position.y = coreHeight + interstageHeight + esmHeight + capsuleHeight + lasTowerHeight / 2;
    las.castShadow = true;
    rocketGroup.add(las);

    // LAS Abort Motor Nozzles
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const nozzle = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 0.8, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 })
      );
      nozzle.position.set(
        Math.cos(angle) * 0.6,
        coreHeight + interstageHeight + esmHeight + capsuleHeight + 8,
        Math.sin(angle) * 0.6
      );
      nozzle.rotation.z = Math.PI / 4 * (i % 2 === 0 ? 1 : -1);
      rocketGroup.add(nozzle);
    }
  }

  // =========================================================================
  // 6. SPACECRAFT INTERIOR — COMMAND MODULE COCKPIT
  // =========================================================================

  let cockpitNavballMesh = null;
  let cockpitCanvas = null;
  let cockpitCanvasTexture = null;

  function buildSpacecraftInterior() {
    cabinGroup = new THREE.Group();
    // Capsule cabin interior positioned in local coordinates
    // When inside the capsule, the player moves inside this interior space!
    // World coordinates: X: 0, Y: 72.8, Z: 0
    cabinGroup.position.set(0, 72.8, 0);
    cabinGroup.visible = false; // Becomes visible when player enters spacecraft
    scene.add(cabinGroup);

    // Interior Capsule Hull (Curved composite pressurized pressure vessel)
    const cabinRadius = 2.4;
    const cabinHeight = 3.2;
    const hullGeo = new THREE.CylinderGeometry(cabinRadius * 0.8, cabinRadius, cabinHeight, 32, 4, true);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x1e2638,
      roughness: 0.6,
      metalness: 0.3,
      side: THREE.BackSide
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 1.6;
    cabinGroup.add(hull);

    // Floor deck
    const floorGeo = new THREE.CircleGeometry(cabinRadius, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7,
      metalness: 0.4
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.05;
    floor.receiveShadow = true;
    cabinGroup.add(floor);

    // Forward Viewport Windows (Allow looking out at launch tower / space)
    const windowFrameGeo = new THREE.BoxGeometry(0.1, 0.9, 1.4);
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const windowFrame = new THREE.Mesh(windowFrameGeo, windowFrameMat);
    windowFrame.position.set(-2.0, 1.9, 0);
    cabinGroup.add(windowFrame);

    const windowGlassGeo = new THREE.PlaneGeometry(1.2, 0.75);
    const windowGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transmission: 0.9,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05
    });
    const windowGlass = new THREE.Mesh(windowGlassGeo, windowGlassMat);
    windowGlass.position.set(-1.95, 1.9, 0);
    windowGlass.rotation.y = Math.PI / 2;
    cabinGroup.add(windowGlass);

    // Cockpit Main Instrument Panel & Multi-Function Flight Displays (MFRDs)
    const consoleGeo = new THREE.BoxGeometry(1.2, 1.5, 2.6);
    const consoleMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.4,
      metalness: 0.6
    });
    const mainConsole = new THREE.Mesh(consoleGeo, consoleMat);
    mainConsole.position.set(0.9, 1.2, 0);
    mainConsole.rotation.z = -Math.PI / 12; // Angled towards seated astronauts
    cabinGroup.add(mainConsole);

    // Dynamic High-Resolution HTML5 Canvas for Cockpit Glass Displays
    cockpitCanvas = document.createElement('canvas');
    cockpitCanvas.width = 1024;
    cockpitCanvas.height = 512;
    cockpitCanvasTexture = new THREE.CanvasTexture(cockpitCanvas);

    const screenGeo = new THREE.PlaneGeometry(1.4, 0.75);
    const screenMat = new THREE.MeshBasicMaterial({
      map: cockpitCanvasTexture
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0.28, 1.4, 0);
    screenMesh.rotation.y = -Math.PI / 2;
    screenMesh.rotation.z = -Math.PI / 12;
    cabinGroup.add(screenMesh);
    cockpitScreens.push(screenMesh);

    // 3D Miniature Attitude Director Indicator (Navball Sphere)
    const navballGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const navballTex = createNavballTexture();
    const navballMat = new THREE.MeshStandardMaterial({ map: navballTex, roughness: 0.2 });
    cockpitNavballMesh = new THREE.Mesh(navballGeo, navballMat);
    cockpitNavballMesh.position.set(0.4, 1.65, -0.6);
    cabinGroup.add(cockpitNavballMesh);

    // Dual Ergonomic Carbon-Fiber Astronaut Launch Couches (Commander & Pilot)
    // Reclined at 45 degrees for high-G acceleration
    buildLaunchCouches(cabinGroup);

    // Overhead switch breakers & hand grab rails
    for (let r = -1; r <= 1; r += 2) {
      const railGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 12);
      const railMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, metalness: 0.8, roughness: 0.2 });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(0, 2.8, r * 0.9);
      rail.rotation.x = Math.PI / 2;
      cabinGroup.add(rail);
    }

    // Dynamic interior lighting
    cockpitInteriorLight = new THREE.PointLight(0x38bdf8, 1.4, 8);
    cockpitInteriorLight.position.set(0, 2.4, 0);
    cabinGroup.add(cockpitInteriorLight);

    // Subtle red/amber emergency status beacon
    const cabinBeacon = new THREE.PointLight(0xff3b30, 0.4, 5);
    cabinBeacon.position.set(1.1, 2.6, 0);
    cabinGroup.add(cabinBeacon);
  }

  function buildLaunchCouches(parent) {
    [-0.65, 0.65].forEach((zPos, idx) => {
      const seatGroup = new THREE.Group();
      seatGroup.position.set(0, 0.6, zPos);
      parent.add(seatGroup);

      // Reclined backrest (45 degrees)
      const backGeo = new THREE.BoxGeometry(0.55, 1.1, 0.12);
      const backMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.6,
        metalness: 0.4
      });
      const back = new THREE.Mesh(backGeo, backMat);
      back.position.set(-0.25, 0.5, 0);
      back.rotation.z = Math.PI / 5;
      seatGroup.add(back);

      // Seat cushion base
      const seatGeo = new THREE.BoxGeometry(0.55, 0.15, 0.5);
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.set(0.1, 0.1, 0);
      seatGroup.add(seat);

      // Headrest with side support cushions
      const headGeo = new THREE.BoxGeometry(0.38, 0.28, 0.12);
      const head = new THREE.Mesh(headGeo, backMat);
      head.position.set(-0.55, 1.05, 0);
      head.rotation.z = Math.PI / 5;
      seatGroup.add(head);

      // 5-Point Safety Restraint Harness (Blue/Black straps with metal clasp)
      const strapGeo = new THREE.BoxGeometry(0.48, 0.8, 0.04);
      const strapMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.9 });
      const strap = new THREE.Mesh(strapGeo, strapMat);
      strap.position.set(-0.22, 0.52, 0);
      strap.rotation.z = Math.PI / 5;
      seatGroup.add(strap);

      // Rotational hand controller joystick beside seat
      const stickBaseGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.25, 12);
      const stickBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
      const stickBase = new THREE.Mesh(stickBaseGeo, stickBaseMat);
      stickBase.position.set(0.15, 0.3, idx === 0 ? -0.38 : 0.38);
      seatGroup.add(stickBase);

      const stickHandleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
      const stickHandleMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      const stickHandle = new THREE.Mesh(stickHandleGeo, stickHandleMat);
      stickHandle.position.set(0.15, 0.45, idx === 0 ? -0.38 : 0.38);
      seatGroup.add(stickHandle);
    });
  }

  // =========================================================================
  // 7. ASTRONAUT CHARACTER — FULL ARTICULATED PROCEDURAL PBR RIG
  // =========================================================================

  let astronautRig = {
    root: null,
    torso: null,
    chestPack: null,
    backpack: null,
    neck: null,
    head: null,
    visor: null,
    leftShoulder: null,
    leftArm: null,
    leftForearm: null,
    leftHand: null,
    rightShoulder: null,
    rightArm: null,
    rightForearm: null,
    rightHand: null,
    leftHip: null,
    leftThigh: null,
    leftCalf: null,
    leftFoot: null,
    rightHip: null,
    rightThigh: null,
    rightCalf: null,
    rightFoot: null,
    helmetLight: null
  };

  function buildAstronautCharacter() {
    astronaut = new THREE.Group();
    astronaut.position.copy(playerState.pos);
    scene.add(astronaut);

    // Realistic PBR Space Suit Fabric Material (White thermal weave)
    const suitFabricTex = createSuitFabricTexture();
    suitFabricTex.wrapS = THREE.RepeatWrapping;
    suitFabricTex.wrapT = THREE.RepeatWrapping;
    suitFabricTex.repeat.set(4, 4);

    const suitMat = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6,
      map: suitFabricTex,
      roughness: 0.55,
      metalness: 0.15
    });

    const darkSuitMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.65,
      metalness: 0.4
    });

    const jointRubberMat = new THREE.MeshStandardMaterial({
      color: 0x374151,
      roughness: 0.85,
      metalness: 0.1
    });

    // 1. Root / Pelvis (Hips)
    const hipsGeo = new THREE.CylinderGeometry(0.24, 0.21, 0.22, 16);
    const hips = new THREE.Mesh(hipsGeo, suitMat);
    hips.position.y = 0.95;
    hips.castShadow = true;
    astronaut.add(hips);
    astronautRig.root = hips;

    // 2. Torso (Chest & Pressure Garment)
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.48, 0.32);
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.y = 0.34;
    torso.castShadow = true;
    hips.add(torso);
    astronautRig.torso = torso;

    // Chest-mounted Display and Control Module (DCM)
    const dcmGeo = new THREE.BoxGeometry(0.3, 0.24, 0.08);
    const dcmMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.2 });
    const dcm = new THREE.Mesh(dcmGeo, dcmMat);
    dcm.position.set(0, 0.05, 0.18);
    torso.add(dcm);
    astronautRig.chestPack = dcm;

    // NASA Meatball & Mission Patch on chest
    const patchGeo = new THREE.PlaneGeometry(0.1, 0.1);
    const patchTex = createMissionPatchTexture(missionConfig.missionType);
    const patchMat = new THREE.MeshBasicMaterial({ map: patchTex, transparent: true });
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.position.set(-0.14, 0.12, 0.165);
    torso.add(patch);

    // Life Support Backpack (PLSS - Portable Life Support System)
    const plssGeo = new THREE.BoxGeometry(0.44, 0.62, 0.24);
    const plssMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.3 });
    const plss = new THREE.Mesh(plssGeo, plssMat);
    plss.position.set(0, 0.06, -0.25);
    plss.castShadow = true;
    torso.add(plss);
    astronautRig.backpack = plss;

    // Oxygen cylinders on backpack top
    [-0.11, 0.11].forEach((px) => {
      const oxyGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.38, 12);
      const oxyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.2 });
      const oxy = new THREE.Mesh(oxyGeo, oxyMat);
      oxy.position.set(px, 0.28, -0.25);
      torso.add(oxy);
    });

    // Flexible Umbilical hoses connecting backpack to chest
    const hoseCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.16, 0.1, -0.15),
      new THREE.Vector3(-0.25, 0.05, 0.0),
      new THREE.Vector3(-0.12, 0.02, 0.18)
    ]);
    const hoseGeo1 = new THREE.TubeGeometry(hoseCurve1, 12, 0.022, 8, false);
    const hoseMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
    const hose1 = new THREE.Mesh(hoseGeo1, hoseMat);
    torso.add(hose1);

    // 3. Neck & Helmet
    const neckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.1, 16);
    const neck = new THREE.Mesh(neckGeo, jointRubberMat);
    neck.position.y = 0.28;
    torso.add(neck);
    astronautRig.neck = neck;

    // Extravehicular Visor Assembly (EVVA) Helmet
    const helmetGeo = new THREE.SphereGeometry(0.24, 24, 20);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.2 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.y = 0.2;
    helmet.castShadow = true;
    neck.add(helmet);
    astronautRig.head = helmet;

    // Ultra-Reflective Gold Mirrored Visor
    const visorGeo = new THREE.SphereGeometry(0.22, 24, 16, 0, Math.PI, 0, Math.PI * 0.75);
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37, // Mirrored Astronaut Gold
      metalness: 0.95,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.rotation.x = -Math.PI / 8;
    visor.position.set(0, 0, 0.03);
    helmet.add(visor);
    astronautRig.visor = visor;

    // Dual Helmet-mounted EVA Spotlights
    const helmetLight = new THREE.SpotLight(0xffffff, 1.8, 25, Math.PI / 6, 0.3);
    helmetLight.position.set(0, 0.05, 0.25);
    helmetLight.target.position.set(0, 0.05, 10);
    helmet.add(helmetLight);
    helmet.add(helmetLight.target);
    astronautRig.helmetLight = helmetLight;

    // Small LED lamps on helmet sides
    [-0.24, 0.24].forEach((lx) => {
      const lampGeo = new THREE.BoxGeometry(0.04, 0.04, 0.08);
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(lx, 0.02, 0.12);
      helmet.add(lamp);
    });

    // 4. Arms & Hands Rigging
    // Left Arm
    const lShoulder = new THREE.Group();
    lShoulder.position.set(-0.31, 0.18, 0);
    torso.add(lShoulder);
    astronautRig.leftShoulder = lShoulder;

    const lUpperArmGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.3, 12);
    const lUpperArm = new THREE.Mesh(lUpperArmGeo, suitMat);
    lUpperArm.position.y = -0.15;
    lShoulder.add(lUpperArm);
    astronautRig.leftArm = lUpperArm;

    const lElbow = new THREE.Group();
    lElbow.position.y = -0.15;
    lUpperArm.add(lElbow);

    const lForearmGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.28, 12);
    const lForearm = new THREE.Mesh(lForearmGeo, suitMat);
    lForearm.position.y = -0.14;
    lElbow.add(lForearm);
    astronautRig.leftForearm = lElbow;

    const lHandGeo = new THREE.BoxGeometry(0.09, 0.12, 0.06);
    const lHand = new THREE.Mesh(lHandGeo, darkSuitMat);
    lHand.position.y = -0.18;
    lForearm.add(lHand);
    astronautRig.leftHand = lHand;

    // Right Arm
    const rShoulder = new THREE.Group();
    rShoulder.position.set(0.31, 0.18, 0);
    torso.add(rShoulder);
    astronautRig.rightShoulder = rShoulder;

    const rUpperArmGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.3, 12);
    const rUpperArm = new THREE.Mesh(rUpperArmGeo, suitMat);
    rUpperArm.position.y = -0.15;
    rShoulder.add(rUpperArm);
    astronautRig.rightArm = rUpperArm;

    const rElbow = new THREE.Group();
    rElbow.position.y = -0.15;
    rUpperArm.add(rElbow);

    const rForearmGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.28, 12);
    const rForearm = new THREE.Mesh(rForearmGeo, suitMat);
    rForearm.position.y = -0.14;
    rElbow.add(rForearm);
    astronautRig.rightForearm = rElbow;

    const rHandGeo = new THREE.BoxGeometry(0.09, 0.12, 0.06);
    const rHand = new THREE.Mesh(rHandGeo, darkSuitMat);
    rHand.position.y = -0.18;
    rForearm.add(rHand);
    astronautRig.rightHand = rHand;

    // 5. Legs & Boots Rigging
    // Left Leg
    const lHip = new THREE.Group();
    lHip.position.set(-0.14, -0.1, 0);
    hips.add(lHip);
    astronautRig.leftHip = lHip;

    const lThighGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.42, 12);
    const lThigh = new THREE.Mesh(lThighGeo, suitMat);
    lThigh.position.y = -0.21;
    lHip.add(lThigh);
    astronautRig.leftThigh = lThigh;

    const lKnee = new THREE.Group();
    lKnee.position.y = -0.21;
    lThigh.add(lKnee);

    const lCalfGeo = new THREE.CylinderGeometry(0.09, 0.085, 0.4, 12);
    const lCalf = new THREE.Mesh(lCalfGeo, suitMat);
    lCalf.position.y = -0.2;
    lKnee.add(lCalf);
    astronautRig.leftCalf = lKnee;

    const lFootGeo = new THREE.BoxGeometry(0.14, 0.12, 0.28);
    const lFoot = new THREE.Mesh(lFootGeo, darkSuitMat);
    lFoot.position.set(0, -0.24, 0.06);
    lFoot.castShadow = true;
    lCalf.add(lFoot);
    astronautRig.leftFoot = lFoot;

    // Right Leg
    const rHip = new THREE.Group();
    rHip.position.set(0.14, -0.1, 0);
    hips.add(rHip);
    astronautRig.rightHip = rHip;

    const rThighGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.42, 12);
    const rThigh = new THREE.Mesh(rThighGeo, suitMat);
    rThigh.position.y = -0.21;
    rHip.add(rThigh);
    astronautRig.rightThigh = rThigh;

    const rKnee = new THREE.Group();
    rKnee.position.y = -0.21;
    rThigh.add(rKnee);

    const rCalfGeo = new THREE.CylinderGeometry(0.09, 0.085, 0.4, 12);
    const rCalf = new THREE.Mesh(rCalfGeo, suitMat);
    rCalf.position.y = -0.2;
    rKnee.add(rCalf);
    astronautRig.rightCalf = rKnee;

    const rFootGeo = new THREE.BoxGeometry(0.14, 0.12, 0.28);
    const rFoot = new THREE.Mesh(rFootGeo, darkSuitMat);
    rFoot.position.set(0, -0.24, 0.06);
    rFoot.castShadow = true;
    rCalf.add(rFoot);
    astronautRig.rightFoot = rFoot;
  }

  // =========================================================================
  // 8. ANIMATED GROUND PERSONNEL
  // =========================================================================

  function buildGroundPersonnel() {
    const workerPositions = [
      { x: 6, z: 24, rot: 0.4, action: 'clipboard' },
      { x: -8, z: 20, rot: -0.6, action: 'patrol' },
      { x: 12, z: 12, rot: 1.8, action: 'wave' },
      { x: -14, z: 3.5, rot: 0.1, action: 'guard' }
    ];

    workerPositions.forEach((wp) => {
      const worker = new THREE.Group();
      worker.position.set(wp.x, 0, wp.z);
      worker.rotation.y = wp.rot;
      scene.add(worker);

      // Body (High-vis orange flight jacket & safety helmet)
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
      const vestMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });

      const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.25), vestMat);
      torsoMesh.position.y = 1.1;
      worker.add(torsoMesh);

      // White hard hat
      const hatMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
      );
      hatMesh.position.y = 1.62;
      worker.add(hatMesh);

      // Legs
      const legsMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.8, 0.22), bodyMat);
      legsMesh.position.y = 0.4;
      worker.add(legsMesh);

      groundPersonnel.push({
        group: worker,
        basePos: new THREE.Vector3(wp.x, 0, wp.z),
        action: wp.action,
        animOffset: Math.random() * Math.PI * 2
      });
    });
  }

  // =========================================================================
  // 9. EDUCATIONAL INTERACTIVE HOTSPOTS
  // =========================================================================

  function buildInspectionHotspots() {
    hotspots = [
      {
        id: 'hotspot-lox',
        title: 'LIQUID OXYGEN (LOX) CRYOGENIC FACILITY',
        subtitle: 'PROPELLANT STORAGE & TRANSFER',
        text: 'Stores over 540,000 gallons of supercooled liquid oxygen at -183°C (-297°F). Liquid oxygen serves as the oxidizer for the core RS-25 cryogenic engines. It is separate from the breathable life-support oxygen stored inside the astronaut crew capsule.',
        pos: new THREE.Vector3(-28, 1.6, 22),
        radius: 6.0,
        stageRequired: 0,
        type: 'inspect'
      },
      {
        id: 'hotspot-engines',
        title: 'RS-25 CRYOGENIC CORE ENGINE CLUSTER',
        subtitle: 'PROPULSION & GIMBAL SYSTEM',
        text: 'Four flight-proven RS-25 staged combustion engines paired with two 5-segment solid rocket boosters generate 8.8 million pounds of total liftoff thrust—15% more power than the historic Saturn V rocket.',
        pos: new THREE.Vector3(0, 2.5, 12),
        radius: 8.0,
        stageRequired: 0,
        type: 'inspect'
      },
      {
        id: 'hotspot-elevator',
        title: 'LAUNCH TOWER HIGH-SPEED ELEVATOR',
        subtitle: 'CREW ASCENT TO LEVEL 320',
        text: 'Ascends 320 feet (97 meters) to the Crew Access Arm in 40 seconds. Carries flight crew and close-out technicians directly to the spacecraft ingress level.',
        pos: new THREE.Vector3(-13, 1.5, 7.5),
        radius: 3.5,
        stageRequired: 0,
        actionPrompt: 'PRESS [E] — ENTER ELEVATOR TO CREW ACCESS ARM',
        type: 'elevator'
      },
      {
        id: 'hotspot-hatch',
        title: 'CREW ACCESS ARM & WHITE ROOM HATCH',
        subtitle: 'INGRESS & PRESSURE SEAL PROTOCOL',
        text: 'The White Room provides a sterile, cleanroom bridge across the launch tower to the spacecraft. Here, suit technicians perform final seal checks before sealing the spacecraft hatch for launch.',
        pos: new THREE.Vector3(-1.8, 77.2, 0),
        radius: 2.8,
        stageRequired: 2,
        actionPrompt: 'PRESS [E] — OPEN HATCH & ENTER SPACECRAFT',
        type: 'enter_spacecraft'
      },
      {
        id: 'hotspot-seat',
        title: 'COMMANDER LAUNCH COUCH',
        subtitle: 'FLIGHT CONTROLS & RESTRAINT HARNESS',
        text: 'Ergonomic carbon-composite couch reclined at 45 degrees to help the human body withstand 4.0 G of acceleration during ascent. Hands are positioned on the rotational hand controllers to monitor automated guidance.',
        pos: new THREE.Vector3(0.1, 73.8, -0.65),
        radius: 2.2,
        stageRequired: 3,
        actionPrompt: 'PRESS [E] — SIT IN COMMANDER SEAT & ARM LAUNCH',
        type: 'sit_seat'
      },
      {
        id: 'hotspot-flight-computer',
        title: 'MISSION WORKSTATION & OUTPOST OPS',
        subtitle: 'FLIGHT TELEMETRY & BASE COMMAND',
        text: 'Now in orbital cruise. Access the outpost telemetry computer to monitor life support reserves, manage crew assignments, and supervise research outpost systems.',
        pos: new THREE.Vector3(0.5, 74.0, 0),
        radius: 3.0,
        stageRequired: 6,
        actionPrompt: 'PRESS [E] — ACCESS OUTPOST COMMAND CONSOLE',
        type: 'access_dashboard'
      }
    ];

    // Create 3D floating holographic beacon markers in world
    hotspots.forEach((hs) => {
      const beaconGroup = new THREE.Group();
      beaconGroup.position.copy(hs.pos);
      scene.add(beaconGroup);

      // Rotating glowing cyan diamond
      const diamondGeo = new THREE.OctahedronGeometry(0.3, 0);
      const diamondMat = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        wireframe: true
      });
      const diamond = new THREE.Mesh(diamondGeo, diamondMat);
      beaconGroup.add(diamond);

      // Ground pulsing ring
      const ringGeo = new THREE.RingGeometry(0.4, 0.55, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.8;
      beaconGroup.add(ring);

      hs.meshGroup = beaconGroup;
      hs.diamondMesh = diamond;
    });
  }

  // =========================================================================
  // 10. SPACE & ORBIT ENVIRONMENT (ACHIEVED AFTER LAUNCH)
  // =========================================================================

  function buildSpaceEnvironment() {
    // 1. Earth Sphere (visible when in space)
    const earthGeo = new THREE.SphereGeometry(320, 48, 36);
    const earthTex = createEarthTexture();
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.65,
      metalness: 0.1
    });
    earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.set(0, -380, -200);
    earthMesh.visible = false;
    scene.add(earthMesh);

    // Glowing atmospheric limb ring around Earth
    const atmoGeo = new THREE.SphereGeometry(325, 48, 36);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x00a8ff,
      transparent: true,
      opacity: 0.28,
      side: THREE.BackSide
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    earthMesh.add(atmoMesh);

    // 2. Destination (Moon or Mars)
    const destGeo = new THREE.SphereGeometry(35, 32, 24);
    const destTex = missionConfig.missionType === 'mars' ? createMarsTexture() : createMoonTexture();
    const destMat = new THREE.MeshStandardMaterial({
      map: destTex,
      roughness: 0.9,
      metalness: 0.05
    });
    destinationPlanet = new THREE.Mesh(destGeo, destMat);
    destinationPlanet.position.set(220, 160, -450);
    destinationPlanet.visible = false;
    scene.add(destinationPlanet);

    // 3. Deep space starfield
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 3500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 4000;
      starPositions[i + 1] = Math.random() * 2000;
      starPositions[i + 2] = (Math.random() - 0.5) * 4000;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.0
    });
    starsMesh = new THREE.Points(starsGeo, starsMat);
    scene.add(starsMesh);
  }

  // =========================================================================
  // 11. SPATIAL WEB AUDIO ENGINE
  // =========================================================================

  function initAudio() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();

      // Master wind synthesizer (filtered pink/white noise)
      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }

      const noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const windFilter = audioCtx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.setValueAtTime(320, audioCtx.currentTime);

      const windGain = audioCtx.createGain();
      windGain.gain.setValueAtTime(0.04, audioCtx.currentTime);

      noiseSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(audioCtx.destination);
      noiseSource.start();

      activeAudioNodes.windGain = windGain;

      // Industrial machinery ground hum
      const humOsc = audioCtx.createOscillator();
      humOsc.type = 'sawtooth';
      humOsc.frequency.setValueAtTime(58, audioCtx.currentTime);

      const humFilter = audioCtx.createBiquadFilter();
      humFilter.type = 'lowpass';
      humFilter.frequency.setValueAtTime(110, audioCtx.currentTime);

      const humGain = audioCtx.createGain();
      humGain.gain.setValueAtTime(0.02, audioCtx.currentTime);

      humOsc.connect(humFilter);
      humFilter.connect(humGain);
      humGain.connect(audioCtx.destination);
      humOsc.start();

      activeAudioNodes.humGain = humGain;

      // Heavy Rocket Launch Engine Rumble Synthesizer
      const rumbleOsc = audioCtx.createOscillator();
      rumbleOsc.type = 'sawtooth';
      rumbleOsc.frequency.setValueAtTime(45, audioCtx.currentTime);

      const rumbleFilter = audioCtx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.setValueAtTime(160, audioCtx.currentTime);

      const rumbleGain = audioCtx.createGain();
      rumbleGain.gain.setValueAtTime(0.0, audioCtx.currentTime);

      rumbleOsc.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(audioCtx.destination);
      rumbleOsc.start();

      activeAudioNodes.rumbleOsc = rumbleOsc;
      activeAudioNodes.rumbleFilter = rumbleFilter;
      activeAudioNodes.rumbleGain = rumbleGain;
    } catch (e) {
      console.warn('AstronautExperience: Web Audio not supported or auto-play prevented', e);
    }
  }

  function playSoundEffect(type) {
    if (!audioCtx || audioMuted) return;
    try {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const now = audioCtx.currentTime;

      if (type === 'footstep') {
        // Suit boot clunk on pad / metal
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const freq = currentStage >= 2 ? 220 : 130;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'quindar') {
        // Authentic NASA Apollo/Artemis Quindar communication beep
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(2525, now); // Intro Quindar pitch
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.setValueAtTime(0.06, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'hatch') {
        // Pneumatic door release and seal hiss
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.7);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
      } else if (type === 'harness') {
        // Metallic clasp lock click
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'chime') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.0, now + 0.1); // A5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      // Audio fails gracefully
    }
  }

  function speakVoice(text) {
    if (audioMuted || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 0.95;
      utterance.volume = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // Graceful fallback
    }
  }

  function stopAudio() {
    try {
      if (activeAudioNodes.rumbleGain) {
        activeAudioNodes.rumbleGain.gain.setValueAtTime(0, audioCtx ? audioCtx.currentTime : 0);
      }
      if (activeAudioNodes.windGain) {
        activeAudioNodes.windGain.gain.setValueAtTime(0, audioCtx ? audioCtx.currentTime : 0);
      }
      if (activeAudioNodes.humGain) {
        activeAudioNodes.humGain.gain.setValueAtTime(0, audioCtx ? audioCtx.currentTime : 0);
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
  }

  // =========================================================================
  // 12. INPUT HANDLERS & THIRD-PERSON CAMERA CONTROLS
  // =========================================================================

  function bindInputHandlers() {
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);

    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', onMouseDown, false);
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('mouseup', onMouseUp, false);
    canvas.addEventListener('wheel', onMouseWheel, { passive: true });

    // Pointer Lock click toggle
    canvas.addEventListener('click', requestPointerLock, false);
    document.addEventListener('pointerlockchange', onPointerLockChange, false);

    // Mobile touch controls
    bindTouchControls();
  }

  function unbindInputHandlers() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    window.removeEventListener('resize', onWindowResize);
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (k === 'w' || e.key === 'ArrowUp') keys.w = true;
    if (k === 's' || e.key === 'ArrowDown') keys.s = true;
    if (k === 'a' || e.key === 'ArrowLeft') keys.a = true;
    if (k === 'd' || e.key === 'ArrowRight') keys.d = true;
    if (e.key === 'Shift') keys.shift = true;
    if (e.key === ' ') {
      keys.space = true;
      e.preventDefault();
    }
    if (k === 'e') {
      keys.e = true;
      triggerInteraction();
    }
    if (k === 'v') {
      // Toggle camera view during launch/orbit
      cycleViewMode();
    }
    if (k === 'escape') {
      closeInspectionCard();
    }
  }

  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === 'w' || e.key === 'ArrowUp') keys.w = false;
    if (k === 's' || e.key === 'ArrowDown') keys.s = false;
    if (k === 'a' || e.key === 'ArrowLeft') keys.a = false;
    if (k === 'd' || e.key === 'ArrowRight') keys.d = false;
    if (e.key === 'Shift') keys.shift = false;
    if (e.key === ' ') keys.space = false;
    if (k === 'e') keys.e = false;
  }

  function requestPointerLock() {
    if (currentStage === 4 || currentStage === 5) return; // In cinematic launch
    const canvas = renderer.domElement;
    if (canvas.requestPointerLock) {
      canvas.requestPointerLock();
    }
  }

  function onPointerLockChange() {
    pointerLocked = document.pointerLockElement === renderer.domElement;
  }

  function onMouseDown(e) {
    isPointerDown = true;
    prevMousePos = { x: e.clientX, y: e.clientY };
  }

  function onMouseMove(e) {
    if (pointerLocked) {
      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;
      cameraState.yaw -= movementX * 0.0028;
      cameraState.pitch = Math.max(-0.4, Math.min(1.2, cameraState.pitch + movementY * 0.0024));
    } else if (isPointerDown) {
      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;
      prevMousePos = { x: e.clientX, y: e.clientY };
      cameraState.yaw -= dx * 0.005;
      cameraState.pitch = Math.max(-0.4, Math.min(1.2, cameraState.pitch + dy * 0.004));
    }
  }

  function onMouseUp() {
    isPointerDown = false;
  }

  function onMouseWheel(e) {
    cameraState.targetDistance = Math.max(2.2, Math.min(9.0, cameraState.targetDistance + e.deltaY * 0.005));
  }

  function bindTouchControls() {
    const joyZone = document.getElementById('touch-joystick-zone');
    const touchLookZone = document.getElementById('touch-look-zone');
    if (!joyZone || !touchLookZone) return;

    let joyTouchId = null;
    let joyStart = { x: 0, y: 0 };
    const joyKnob = document.getElementById('touch-joystick-knob');

    joyZone.addEventListener('touchstart', (e) => {
      const touch = e.changedTouches[0];
      joyTouchId = touch.identifier;
      joyStart = { x: touch.clientX, y: touch.clientY };
      e.preventDefault();
    }, { passive: false });

    joyZone.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joyTouchId) {
          const dx = touch.clientX - joyStart.x;
          const dy = touch.clientY - joyStart.y;
          const dist = Math.min(45, Math.hypot(dx, dy));
          const angle = Math.atan2(dy, dx);
          const nx = Math.cos(angle) * dist;
          const ny = Math.sin(angle) * dist;

          if (joyKnob) {
            joyKnob.style.transform = `translate(${nx}px, ${ny}px)`;
          }

          keys.w = ny < -12;
          keys.s = ny > 12;
          keys.a = nx < -12;
          keys.d = nx > 12;
          keys.shift = dist > 35;
          e.preventDefault();
        }
      }
    }, { passive: false });

    const endJoy = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyTouchId) {
          joyTouchId = null;
          if (joyKnob) joyKnob.style.transform = 'translate(0px, 0px)';
          keys.w = false;
          keys.s = false;
          keys.a = false;
          keys.d = false;
          keys.shift = false;
        }
      }
    };
    joyZone.addEventListener('touchend', endJoy);
    joyZone.addEventListener('touchcancel', endJoy);

    // Touch look
    let lookTouchId = null;
    let lookPrev = { x: 0, y: 0 };

    touchLookZone.addEventListener('touchstart', (e) => {
      const touch = e.changedTouches[0];
      lookTouchId = touch.identifier;
      lookPrev = { x: touch.clientX, y: touch.clientY };
    });

    touchLookZone.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchId) {
          const dx = touch.clientX - lookPrev.x;
          const dy = touch.clientY - lookPrev.y;
          lookPrev = { x: touch.clientX, y: touch.clientY };

          cameraState.yaw -= dx * 0.007;
          cameraState.pitch = Math.max(-0.4, Math.min(1.2, cameraState.pitch + dy * 0.006));
        }
      }
    });

    const endLook = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId) {
          lookTouchId = null;
        }
      }
    };
    touchLookZone.addEventListener('touchend', endLook);
    touchLookZone.addEventListener('touchcancel', endLook);
  }

  // =========================================================================
  // 13. UI DOM OVERLAYS & HUD SETUP
  // =========================================================================

  function setupUI() {
    // Top story notification banner
    const banner = document.getElementById('astronaut-story-banner');
    if (banner) {
      const destName = missionConfig.missionType === 'mars' ? 'MARS' : 'THE MOON';
      banner.innerHTML = `
        <div class="banner-sub">MISSION 01 · EXPEDITION TO ${destName}</div>
        <div class="banner-title">Commander ${missionConfig.commanderName}, your journey begins now.</div>
      `;
      banner.classList.add('visible');
      setTimeout(() => {
        banner.classList.remove('visible');
      }, 7000);
    }

    // Controls hint
    const hint = document.getElementById('astronaut-controls-hint');
    if (hint) {
      hint.innerHTML = `
        <span>[W A S D] Move</span>
        <span>[SHIFT] Run</span>
        <span>[MOUSE] Look</span>
        <span>[E] Interact</span>
      `;
      hint.classList.add('visible');
    }

    // Action interaction pill
    const actionPill = document.getElementById('astronaut-action-prompt');
    if (actionPill) {
      actionPill.classList.remove('visible');
    }

    // Inspection Card
    const card = document.getElementById('astronaut-inspection-card');
    if (card) {
      card.classList.remove('visible');
    }

    // Top action bar buttons
    const muteBtn = document.getElementById('astro-sound-btn');
    if (muteBtn) {
      muteBtn.onclick = () => {
        audioMuted = !audioMuted;
        muteBtn.textContent = audioMuted ? '🔇' : '🔊';
        if (audioMuted) stopAudio();
      };
    }

    const camBtn = document.getElementById('astro-cam-btn');
    if (camBtn) {
      camBtn.onclick = () => {
        cycleViewMode();
      };
    }

    const exitBtn = document.getElementById('astro-exit-btn');
    if (exitBtn) {
      exitBtn.onclick = () => {
        if (confirm('Return to Mission Registration Launchpad?')) {
          stop();
          if (window.switchScreen) window.switchScreen('landing-screen');
        }
      };
    }

    const opsBtn = document.getElementById('astro-ops-btn');
    if (opsBtn) {
      opsBtn.onclick = () => {
        transitionToOutpostDashboard();
      };
    }
  }

  function cycleViewMode() {
    if (currentStage >= 4) {
      cameraState.viewMode = cameraState.viewMode === 'cockpit' ? 'exterior_launch' : 'cockpit';
      const camBtn = document.getElementById('astro-cam-btn');
      if (camBtn) {
        camBtn.textContent = cameraState.viewMode === 'cockpit' ? '🎥 Exterior Cam' : '🪟 Cockpit View';
      }
    }
  }

  function playEntranceSequence() {
    // Camera sweeps down from high elevation over the launch complex to behind the astronaut
    cameraState.pitch = 0.45;
    cameraState.yaw = Math.PI;
    cameraState.distance = 18;
    cameraState.targetDistance = 4.8;

    playSoundEffect('quindar');
    speakVoice(`Orbital Frontier flight control. Welcome, Commander ${missionConfig.commanderName}. Ground systems nominal.`);
  }

  // =========================================================================
  // 14. INTERACTION SYSTEM
  // =========================================================================

  function updateInteractionHotspots() {
    if (currentStage === 1 || currentStage === 4 || currentStage === 5) {
      // In elevator transit or launch flight: disable ground interactions
      hideActionPrompt();
      return;
    }

    let closest = null;
    let minDist = Infinity;

    hotspots.forEach((hs) => {
      // Rotate floating diamond marker
      if (hs.diamondMesh) {
        hs.diamondMesh.rotation.y += 0.02;
        hs.diamondMesh.rotation.x += 0.01;
      }

      // Check stage eligibility
      let eligible = false;
      if (hs.type === 'elevator' && currentStage === 0) eligible = true;
      else if (hs.type === 'enter_spacecraft' && currentStage === 2) eligible = true;
      else if (hs.type === 'sit_seat' && currentStage === 3) eligible = true;
      else if (hs.type === 'access_dashboard' && currentStage === 6) eligible = true;
      else if (hs.type === 'inspect' && currentStage === hs.stageRequired) eligible = true;

      if (!eligible) {
        if (hs.meshGroup) hs.meshGroup.visible = false;
        return;
      }

      if (hs.meshGroup) hs.meshGroup.visible = true;

      const d = playerState.pos.distanceTo(hs.pos);
      if (d < hs.radius && d < minDist) {
        minDist = d;
        closest = hs;
      }
    });

    if (closest) {
      activeHotspot = closest;
      const prompt = closest.actionPrompt || `PRESS [E] — INSPECT: ${closest.title}`;
      showActionPrompt(prompt);
    } else {
      activeHotspot = null;
      hideActionPrompt();
    }
  }

  function showActionPrompt(text) {
    const actionPill = document.getElementById('astronaut-action-prompt');
    if (actionPill) {
      actionPill.textContent = text;
      actionPill.classList.add('visible');
    }
  }

  function hideActionPrompt() {
    const actionPill = document.getElementById('astronaut-action-prompt');
    if (actionPill) {
      actionPill.classList.remove('visible');
    }
  }

  function triggerInteraction() {
    if (!activeHotspot) return;

    if (activeHotspot.type === 'elevator') {
      startElevatorAscent();
    } else if (activeHotspot.type === 'enter_spacecraft') {
      startSpacecraftIngress();
    } else if (activeHotspot.type === 'sit_seat') {
      startSitInCrewSeat();
    } else if (activeHotspot.type === 'access_dashboard') {
      transitionToOutpostDashboard();
    } else if (activeHotspot.type === 'inspect') {
      showInspectionCard(activeHotspot);
    }
  }

  function showInspectionCard(hs) {
    const card = document.getElementById('astronaut-inspection-card');
    const titleEl = document.getElementById('inspection-title');
    const subEl = document.getElementById('inspection-subtitle');
    const textEl = document.getElementById('inspection-text');
    if (!card || !titleEl || !textEl) return;

    titleEl.textContent = hs.title;
    if (subEl) subEl.textContent = hs.subtitle;
    textEl.textContent = hs.text;
    card.classList.add('visible');
    playSoundEffect('chime');

    const closeBtn = document.getElementById('inspection-close-btn');
    if (closeBtn) {
      closeBtn.onclick = closeInspectionCard;
    }
  }

  function closeInspectionCard() {
    const card = document.getElementById('astronaut-inspection-card');
    if (card) card.classList.remove('visible');
  }

  // =========================================================================
  // 15. SEQUENCED CINEMATIC TRANSITIONS
  // =========================================================================

  // STAGE 1: Elevator Ascent to Level 320
  function startElevatorAscent() {
    currentStage = 1;
    playerState.inElevator = true;
    playerState.pos.set(-13, 2.5, 4.5);
    playSoundEffect('chime');
    speakVoice('Elevator ascending to Level 320 crew access arm.');

    const banner = document.getElementById('astronaut-story-banner');
    if (banner) {
      banner.innerHTML = `
        <div class="banner-sub">LAUNCH GANTRY ELEVATOR</div>
        <div class="banner-title">Ascending to Level 320 · Crew Access Platform</div>
      `;
      banner.classList.add('visible');
      setTimeout(() => banner.classList.remove('visible'), 4000);
    }

    let elevY = 1.5;
    const targetY = 76.0;
    const elevTimer = setInterval(() => {
      elevY += 0.85;
      if (elevatorGroup) elevatorGroup.position.y = elevY;
      playerState.pos.y = elevY + 1.0;

      if (elevY >= targetY) {
        clearInterval(elevTimer);
        currentStage = 2; // Arrived at Crew Access Arm
        playerState.inElevator = false;
        playerState.pos.set(-7, 77.2, 0); // Placed on Crew Access walkway
        playSoundEffect('quindar');
        speakVoice('Level 320 reached. Walkway clear to White Room.');
      }
    }, 40);
  }

  // STAGE 2 -> 3: Spacecraft Ingress through White Room Hatch
  function startSpacecraftIngress() {
    currentStage = 3;
    playSoundEffect('hatch');
    speakVoice('Spacecraft hatch unlocked. Equalizing pressure. Welcome aboard the Command Module.');

    // Animate astronaut raising hand to turn hatch wheel and open hatch
    if (astronautRig.rightShoulder) {
      astronautRig.rightShoulder.rotation.x = -Math.PI / 3;
      astronautRig.rightForearm.rotation.x = -Math.PI / 4;
    }

    // Swing open hatch door
    let openAngle = 0;
    const hatchTimer = setInterval(() => {
      openAngle += 0.08;
      if (hatchDoor) {
        hatchDoor.rotation.y = -openAngle;
        hatchDoor.position.x = -2.2 - Math.sin(openAngle) * 0.5;
      }
      if (openAngle >= Math.PI / 2) {
        clearInterval(hatchTimer);
        // Step into capsule cabin
        playerState.insideCapsule = true;
        cabinGroup.visible = true;
        playerState.pos.set(-1.0, 72.8, 0); // Inside spacecraft cockpit
        cameraState.shoulderOffset = 0.35;
        cameraState.targetDistance = 3.2; // Tighter interior camera framing
        playSoundEffect('quindar');
      }
    }, 30);
  }

  // STAGE 3 -> 4: Seated in Commander Seat & Launch Countdown Arming
  function startSitInCrewSeat() {
    currentStage = 4;
    playerState.isSeated = true;
    hideActionPrompt();
    playSoundEffect('harness');
    speakVoice('Commander seated and secured. Safety harness locked. Terminal launch countdown armed.');

    // Reposition astronaut into Commander seat couch
    playerState.pos.set(0.1, 73.2, -0.65);
    playerState.heading = Math.PI / 2; // Facing the forward instrument console

    // Seat posture kinematics
    if (astronautRig.torso) astronautRig.torso.rotation.x = -Math.PI / 5;
    if (astronautRig.leftHip) astronautRig.leftHip.rotation.x = -Math.PI / 2.5;
    if (astronautRig.rightHip) astronautRig.rightHip.rotation.x = -Math.PI / 2.5;
    if (astronautRig.leftCalf) astronautRig.leftCalf.rotation.x = Math.PI / 3;
    if (astronautRig.rightCalf) astronautRig.rightCalf.rotation.x = Math.PI / 3;
    if (astronautRig.leftShoulder) astronautRig.leftShoulder.rotation.x = -Math.PI / 6;
    if (astronautRig.rightShoulder) astronautRig.rightShoulder.rotation.x = -Math.PI / 6;

    // Cockpit lights shift to launch alert cyan/amber
    if (cockpitInteriorLight) cockpitInteriorLight.color.setHex(0x00d4ff);

    // Show camera toggle button
    const camBtn = document.getElementById('astro-cam-btn');
    if (camBtn) camBtn.style.display = 'inline-flex';

    // Begin Countdown Sequence
    beginLaunchCountdown();
  }

  // STAGE 4 -> 5: Launch Countdown & Liftoff
  function beginLaunchCountdown() {
    let count = 10;
    const banner = document.getElementById('astronaut-story-banner');
    if (banner) {
      banner.innerHTML = `
        <div class="banner-sub">TERMINAL COUNTDOWN SEQUENCER</div>
        <div class="banner-title" id="astro-launch-countdown-num">T-10 SECONDS</div>
      `;
      banner.classList.add('visible');
    }

    const countdownInterval = setInterval(() => {
      count--;
      const numEl = document.getElementById('astro-launch-countdown-num');

      if (count > 0) {
        if (numEl) numEl.textContent = `T-${count} SECONDS`;
        playSoundEffect('quindar');

        if (count === 3) {
          speakVoice('3. 2. 1. Main engine ignition sequence start.');
          // Ignite engine plumes & pad steam deluge
          triggerEngineIgnition();
        }
      } else if (count === 0) {
        clearInterval(countdownInterval);
        if (numEl) numEl.textContent = 'LIFTOFF!';
        speakVoice('Booster ignition and LIFTOFF! Orbital Frontier has cleared the tower!');
        triggerLiftoffAscent();
      }
    }, 1000);
  }

  function triggerEngineIgnition() {
    // Heavy rumble begins
    if (activeAudioNodes.rumbleGain) {
      activeAudioNodes.rumbleGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      activeAudioNodes.rumbleFilter.frequency.setValueAtTime(280, audioCtx.currentTime);
    }
    cameraState.shakeIntensity = 0.08;

    // Build volumetric flame exhaust plumes under engines
    createRocketExhaustPlumes();
  }

  function triggerLiftoffAscent() {
    currentStage = 5; // Launch In-Flight
    launchTimer = 0;
    cameraState.shakeIntensity = 0.16;

    if (activeAudioNodes.rumbleGain) {
      activeAudioNodes.rumbleGain.gain.setValueAtTime(0.45, audioCtx.currentTime);
      activeAudioNodes.rumbleFilter.frequency.setValueAtTime(450, audioCtx.currentTime);
    }
  }

  // =========================================================================
  // 16. PARTICLE SYSTEMS — EXHAUST PLUMES, DELUGE STEAM, SMOKE
  // =========================================================================

  function createVaporPlume(x, y, z, scale) {
    const vaporGeo = new THREE.DodecahedronGeometry(scale, 1);
    const vaporMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35
    });
    for (let i = 0; i < 6; i++) {
      const v = new THREE.Mesh(vaporGeo, vaporMat);
      v.position.set(x + (Math.random() - 0.5) * 1.5, y + i * 0.8, z + (Math.random() - 0.5) * 1.5);
      scene.add(v);
      smokeParticles.push({
        mesh: v,
        vy: 0.04 + Math.random() * 0.03,
        baseScale: scale,
        life: 0
      });
    }
  }

  function createRocketExhaustPlumes() {
    // 1. High-velocity flame core
    const flameGeo = new THREE.ConeGeometry(2.4, 18, 16, 1, true);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      side: THREE.DoubleSide
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, -9, 0);
    flame.rotation.x = Math.PI;
    rocketGroup.add(flame);
    exhaustPlumes.push(flame);

    // Inner bright white/yellow jet
    const coreFlameGeo = new THREE.ConeGeometry(1.2, 14, 12, 1, true);
    const coreFlameMat = new THREE.MeshBasicMaterial({
      color: 0xfff7aa,
      side: THREE.DoubleSide
    });
    const coreFlame = new THREE.Mesh(coreFlameGeo, coreFlameMat);
    coreFlame.position.set(0, -7, 0);
    coreFlame.rotation.x = Math.PI;
    rocketGroup.add(coreFlame);
    exhaustPlumes.push(coreFlame);

    // Dynamic flame light illuminating pad
    const flameLight = new THREE.PointLight(0xff6600, 4.0, 120);
    flameLight.position.set(0, -3, 0);
    rocketGroup.add(flameLight);
  }

  // =========================================================================
  // 17. REAL-TIME SIMULATION & ANIMATION KINEMATICS LOOP
  // =========================================================================

  function animate(currentTime) {
    if (!isRunning) return;
    animFrameId = requestAnimationFrame(animate);

    const dt = Math.min((currentTime - prevTime) / 1000, 0.1);
    prevTime = currentTime;

    // 1. Update Character Movement Physics
    updateCharacterPhysics(dt);

    // 2. Update Skeletal Procedural Animations
    updateProceduralAnimations(dt);

    // 3. Update Camera Following & Vibration
    updateCamera(dt);

    // 4. Update Atmospheric Ascent or Orbital Stage
    updateFlightSequence(dt);

    // 5. Update Interactive Cockpit Displays & Hotspots
    updateCockpitCanvas(dt);
    updateInteractionHotspots();

    // 6. Render Frame
    renderer.render(scene, camera);
  }

  function updateCharacterPhysics(dt) {
    if (playerState.isSeated || playerState.inElevator) {
      // Stationed
      return;
    }

    // Determine movement direction relative to camera yaw
    let moveX = 0;
    let moveZ = 0;
    if (keys.w) moveZ -= 1;
    if (keys.s) moveZ += 1;
    if (keys.a) moveX -= 1;
    if (keys.d) moveX += 1;

    const isMoving = moveX !== 0 || moveZ !== 0;
    playerState.isMoving = isMoving;
    playerState.isSprinting = keys.shift && isMoving;

    if (isMoving) {
      const inputAngle = Math.atan2(moveX, moveZ);
      playerState.targetHeading = cameraState.yaw + inputAngle;

      const speed = playerState.isSprinting ? 6.8 : 3.4;
      const vx = Math.sin(playerState.targetHeading) * speed;
      const vz = Math.cos(playerState.targetHeading) * speed;

      playerState.velocity.x += (vx - playerState.velocity.x) * 10 * dt;
      playerState.velocity.z += (vz - playerState.velocity.z) * 10 * dt;

      // Footstep sound generation cadence
      playerState.strideTime += (playerState.isSprinting ? 14 : 9) * dt;
      if (playerState.strideTime >= Math.PI) {
        playerState.strideTime = 0;
        playSoundEffect('footstep');
      }
    } else {
      playerState.velocity.x *= 0.75;
      playerState.velocity.z *= 0.75;
      playerState.strideTime = 0;
    }

    // Integrate position with boundary clamping based on stage
    playerState.pos.x += playerState.velocity.x * dt;
    playerState.pos.z += playerState.velocity.z * dt;

    if (currentStage === 0) {
      // Ground launchpad bounds
      playerState.pos.y = 0;
      const padDist = Math.hypot(playerState.pos.x, playerState.pos.z);
      if (padDist > 65) {
        playerState.pos.setLength(65);
      }
    } else if (currentStage === 2) {
      // Crew Access Arm catwalk bounds (Y=77.2, X between -12 and 1, Z between -1.2 and 1.2)
      playerState.pos.y = 77.2;
      playerState.pos.x = Math.max(-12, Math.min(0.5, playerState.pos.x));
      playerState.pos.z = Math.max(-1.1, Math.min(1.1, playerState.pos.z));
    } else if (currentStage === 3) {
      // Inside capsule bounds (Y=72.8, circle radius 2.0)
      playerState.pos.y = 72.8;
      const capDist = Math.hypot(playerState.pos.x, playerState.pos.z);
      if (capDist > 1.9) {
        playerState.pos.x *= 1.9 / capDist;
        playerState.pos.z *= 1.9 / capDist;
      }
    }

    // Smooth heading rotation
    let angleDiff = playerState.targetHeading - playerState.heading;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    playerState.heading += angleDiff * 12 * dt;

    if (astronaut) {
      astronaut.position.copy(playerState.pos);
      astronaut.rotation.y = playerState.heading;
    }
  }

  function updateProceduralAnimations(dt) {
    if (playerState.isSeated) return;

    playerState.animTime += dt;
    const t = playerState.animTime;

    if (playerState.inOrbit) {
      // Microgravity floating animation
      if (astronautRig.torso) astronautRig.torso.rotation.x = Math.sin(t * 0.8) * 0.08;
      if (astronautRig.leftHip) astronautRig.leftHip.rotation.x = -0.3 + Math.sin(t * 0.9) * 0.06;
      if (astronautRig.rightHip) astronautRig.rightHip.rotation.x = -0.4 + Math.cos(t * 0.8) * 0.06;
      if (astronautRig.leftShoulder) astronautRig.leftShoulder.rotation.z = -0.3 + Math.sin(t * 0.7) * 0.08;
      if (astronautRig.rightShoulder) astronautRig.rightShoulder.rotation.z = 0.3 - Math.sin(t * 0.7) * 0.08;
      return;
    }

    if (playerState.isMoving) {
      // Walking / Sprinting Kinematics
      const cadence = playerState.isSprinting ? 14 : 9;
      const stride = playerState.isSprinting ? 0.75 : 0.45;
      const armSwing = playerState.isSprinting ? 0.65 : 0.38;

      const cycle = Math.sin(t * cadence);
      const cosCycle = Math.cos(t * cadence);

      // Leg swing (counter-phase)
      if (astronautRig.leftHip) astronautRig.leftHip.rotation.x = cycle * stride;
      if (astronautRig.rightHip) astronautRig.rightHip.rotation.x = -cycle * stride;

      // Knee flexion on back swing
      if (astronautRig.leftCalf) astronautRig.leftCalf.rotation.x = Math.max(0, -cycle * stride * 1.2);
      if (astronautRig.rightCalf) astronautRig.rightCalf.rotation.x = Math.max(0, cycle * stride * 1.2);

      // Natural arm counter-swing
      if (astronautRig.leftShoulder) astronautRig.leftShoulder.rotation.x = -cycle * armSwing;
      if (astronautRig.rightShoulder) astronautRig.rightShoulder.rotation.x = cycle * armSwing;

      // Torso slight forward lean and natural bounce
      if (astronautRig.torso) {
        astronautRig.torso.rotation.x = playerState.isSprinting ? 0.22 : 0.08;
        astronautRig.torso.position.y = 0.34 + Math.abs(cosCycle) * 0.04;
      }
    } else {
      // Idle Breathing & Slight Weight Shift
      const breath = Math.sin(t * 1.6);
      if (astronautRig.torso) {
        astronautRig.torso.rotation.x = 0.02 * breath;
        astronautRig.torso.position.y = 0.34 + breath * 0.008;
      }
      if (astronautRig.head) {
        astronautRig.head.rotation.y = Math.sin(t * 0.5) * 0.12;
      }
      if (astronautRig.leftHip) astronautRig.leftHip.rotation.x = 0;
      if (astronautRig.rightHip) astronautRig.rightHip.rotation.x = 0;
      if (astronautRig.leftCalf) astronautRig.leftCalf.rotation.x = 0;
      if (astronautRig.rightCalf) astronautRig.rightCalf.rotation.x = 0;
      if (astronautRig.leftShoulder) astronautRig.leftShoulder.rotation.x = 0;
      if (astronautRig.rightShoulder) astronautRig.rightShoulder.rotation.x = 0;
    }
  }

  function updateCamera(dt) {
    if (!camera) return;

    // Smooth distance dampening
    cameraState.distance += (cameraState.targetDistance - cameraState.distance) * 8 * dt;

    // Camera Vibration / Launch Shake
    let shakeX = 0;
    let shakeY = 0;
    if (cameraState.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * cameraState.shakeIntensity;
      shakeY = (Math.random() - 0.5) * cameraState.shakeIntensity;
    }

    if (cameraState.viewMode === 'cockpit' || (currentStage >= 4 && cameraState.viewMode === 'cockpit')) {
      // First-person / Inside Cockpit camera mounted in front of astronaut eyes
      const eyePos = new THREE.Vector3(0.0, 73.85, -0.65);
      camera.position.set(eyePos.x + shakeX, eyePos.y + shakeY, eyePos.z);
      // Look forward toward glass displays and windows
      camera.lookAt(eyePos.x + 2.5, eyePos.y - 0.2, eyePos.z);
      return;
    }

    if (cameraState.viewMode === 'exterior_launch') {
      // Dynamic Exterior Tracking Camera tracking the ascending rocket
      const rocketY = rocketGroup ? rocketGroup.position.y : 0;
      const camPos = new THREE.Vector3(38, rocketY + 12, 45);
      camera.position.set(camPos.x + shakeX, camPos.y + shakeY, camPos.z);
      camera.lookAt(0, rocketY + 35, 0);
      return;
    }

    // Default: Third-Person Shoulder Follow Camera
    const targetPos = playerState.pos.clone();
    targetPos.y += cameraState.heightOffset;

    // Right shoulder lateral offset
    const rightVec = new THREE.Vector3(Math.cos(cameraState.yaw), 0, -Math.sin(cameraState.yaw)).multiplyScalar(cameraState.shoulderOffset);
    targetPos.add(rightVec);

    // Compute backward camera position based on yaw and pitch
    const backDist = cameraState.distance;
    const cx = targetPos.x - Math.sin(cameraState.yaw) * Math.cos(cameraState.pitch) * backDist + shakeX;
    const cy = targetPos.y + Math.sin(cameraState.pitch) * backDist + shakeY;
    const cz = targetPos.z - Math.cos(cameraState.yaw) * Math.cos(cameraState.pitch) * backDist;

    camera.position.set(cx, Math.max(0.4, cy), cz);
    camera.lookAt(targetPos);
  }

  function updateFlightSequence(dt) {
    if (currentStage === 5) {
      // ASCENT IN PROGRESS
      launchTimer += dt;
      const progress = Math.min(1.0, launchTimer / launchDuration);

      // Rocket accelerates vertically
      const ascentSpeed = 15 + Math.pow(launchTimer, 1.8) * 8;
      if (rocketGroup) rocketGroup.position.y += ascentSpeed * dt;
      if (cabinGroup) cabinGroup.position.y = rocketGroup.position.y + 68.3;
      playerState.pos.y = cabinGroup.position.y + 0.4;

      // Animate exhaust plume pulsation
      exhaustPlumes.forEach((plume, i) => {
        plume.scale.set(1.0 + Math.sin(launchTimer * 30 + i) * 0.15, 1.0 + Math.cos(launchTimer * 25 + i) * 0.2, 1.0);
      });

      // Darken atmosphere from sunny blue to starry black space
      if (skyMesh) {
        const atmoBlue = Math.max(0.01, 1.0 - progress * 1.1);
        skyMesh.material.color.setRGB(0.42 * atmoBlue, 0.65 * atmoBlue, 0.9 * atmoBlue);
      }
      if (scene.fog) {
        scene.fog.density = Math.max(0.0, 0.0035 * (1.0 - progress * 1.2));
      }
      if (sunLight) {
        sunLight.intensity = Math.max(0.5, 1.4 - progress * 0.6);
      }

      // Fade in stars as we reach the upper atmosphere
      if (starsMesh) {
        starsMesh.material.opacity = Math.min(1.0, progress * 1.4);
      }

      // Check for booster staging & orbital insertion
      if (launchTimer >= launchDuration) {
        completeOrbitalInsertion();
      }
    }
  }

  function completeOrbitalInsertion() {
    currentStage = 6; // Orbit Achieved
    playerState.inOrbit = true;
    playerState.isSeated = false;
    cameraState.shakeIntensity = 0.0;

    // Cut engine plume and sound rumble
    exhaustPlumes.forEach((p) => (p.visible = false));
    if (activeAudioNodes.rumbleGain) {
      activeAudioNodes.rumbleGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    }
    if (activeAudioNodes.humGain) {
      activeAudioNodes.humGain.gain.setValueAtTime(0.008, audioCtx.currentTime);
    }

    // Make Earth and destination visible out the window
    if (earthMesh) earthMesh.visible = true;
    if (destinationPlanet) destinationPlanet.visible = true;

    // Show Orbit Achieved story banner
    const banner = document.getElementById('astronaut-story-banner');
    if (banner) {
      banner.innerHTML = `
        <div class="banner-sub">ORBIT ACHIEVED · TELEMETRY STABLE</div>
        <div class="banner-title">Welcome to Space, Commander ${missionConfig.commanderName}.</div>
      `;
      banner.classList.add('visible');
    }

    // Show Ops Dashboard button in top right
    const opsBtn = document.getElementById('astro-ops-btn');
    if (opsBtn) opsBtn.style.display = 'inline-flex';

    playSoundEffect('quindar');
    speakVoice('Flight Control confirms orbital insertion. Main engine cutoff. Vehicle is in stable orbit. Microgravity nominal.');
  }

  // STAGE 6 -> OUTPOST DASHBOARD
  function transitionToOutpostDashboard() {
    stop();
    // Fire callback to start the outpost simulation game engine and switch to dashboard
    if (typeof missionConfig.onCompleteLaunchToOrbit === 'function') {
      missionConfig.onCompleteLaunchToOrbit();
    } else if (window.switchScreen) {
      window.switchScreen('dashboard-screen');
    }
  }

  // =========================================================================
  // 18. DYNAMIC COCKPIT MFRD CANVAS DISPLAY RENDERING
  // =========================================================================

  function updateCockpitCanvas(dt) {
    if (!cockpitCanvas || !cockpitCanvasTexture) return;
    const ctx = cockpitCanvas.getContext('2d');
    const w = cockpitCanvas.width;
    const h = cockpitCanvas.height;

    // Clear background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    // MFRD 1: Left Display (Orbital Mechanics & Navball Telemetry)
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, 480, 480);

    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 22px Orbitron, monospace';
    ctx.fillText('PRIMARY FLIGHT DISPLAY · MFRD-1', 35, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px monospace';
    const alt = currentStage < 4 ? '0.004 km' : currentStage === 5 ? `${(launchTimer * 12.8).toFixed(1)} km` : '412.8 km (LEO)';
    const vel = currentStage < 4 ? '0.0 m/s' : currentStage === 5 ? `${(launchTimer * 380).toFixed(0)} m/s` : '7,740 m/s';
    const gforce = currentStage < 4 ? '1.0 G' : currentStage === 5 ? `${(1.0 + launchTimer * 0.14).toFixed(1)} G` : '0.0 G (Zero-G)';

    ctx.fillText(`ALTITUDE:    ${alt}`, 35, 95);
    ctx.fillText(`VELOCITY:    ${vel}`, 35, 130);
    ctx.fillText(`G-LOAD:      ${gforce}`, 35, 165);
    ctx.fillText(`DESTINATION: ${missionConfig.missionType.toUpperCase()} OUTPOST`, 35, 200);

    // Dynamic Artificial Horizon Pitch Ladder
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 310);
    ctx.lineTo(380, 310);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.fillText('--- HORIZON ---', 200, 305);

    // MFRD 2: Right Display (Life Support & Power Subsystems)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(520, 15, 480, 480);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px Orbitron, monospace';
    ctx.fillText('SYSTEM STATUS · ECLSS & PROPULSION', 540, 50);

    ctx.fillStyle = '#22c55e';
    ctx.fillText('● CABIN PRESSURE:  14.7 psi (NOMINAL)', 540, 100);
    ctx.fillText('● OXYGEN CONC.:    21.4% (NOMINAL)', 540, 140);
    ctx.fillText('● AVIONICS BUS:    28.2 V (INTERNAL)', 540, 180);
    ctx.fillText('● RCS THRUSTERS:   ARMED / READY', 540, 220);

    const modeText = currentStage < 4 ? 'BOARDING MODE' : currentStage === 4 ? 'COUNTDOWN ARMED' : currentStage === 5 ? 'ASCENT POWER 100%' : 'ORBIT ACHIEVED';
    ctx.fillStyle = currentStage === 4 ? '#f59e0b' : currentStage === 5 ? '#f97316' : '#00d4ff';
    ctx.font = 'bold 26px Orbitron, monospace';
    ctx.fillText(`MODE: ${modeText}`, 540, 300);

    cockpitCanvasTexture.needsUpdate = true;
  }

  // =========================================================================
  // 19. PROCEDURAL PBR TEXTURE GENERATORS (Zero external image dependencies)
  // =========================================================================

  function createConcreteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3a3e47';
    ctx.fillRect(0, 0, 512, 512);

    // Expansion joints
    ctx.strokeStyle = '#1e2025';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, 512, 512);

    // Noise speckles
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#4b515d' : '#282b32';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    return new THREE.CanvasTexture(canvas);
  }

  function createHazardStripeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, 256, 64);

    ctx.fillStyle = '#111827';
    for (let x = -64; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 16, 0);
      ctx.lineTo(x - 8, 64);
      ctx.lineTo(x - 24, 64);
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }

  function createInsulationFoamTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c2410c'; // Artemis SLS Orange Foam
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#ea580c' : '#9a3412';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }
    return new THREE.CanvasTexture(canvas);
  }

  function createThermalTilesTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
  }

  function createSuitFabricTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#e2e8f0';
    for (let x = 0; x < 128; x += 4) {
      for (let y = 0; y < 128; y += 4) {
        if ((x + y) % 8 === 0) ctx.fillRect(x, y, 2, 2);
      }
    }
    return new THREE.CanvasTexture(canvas);
  }

  function createMissionPatchTexture(missionType) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Blue circle
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    // Red aeronautics vector
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(20, 85);
    ctx.lineTo(64, 30);
    ctx.lineTo(108, 85);
    ctx.stroke();

    // Mission text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(missionType === 'mars' ? 'MARS' : 'MOON', 64, 75);

    return new THREE.CanvasTexture(canvas);
  }

  function createNavballTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Sky half
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 256, 64);

    // Ground half
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 64, 256, 64);

    // Equator line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 64);
    ctx.lineTo(256, 64);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  function createEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Deep blue ocean
    ctx.fillStyle = '#0f2b5c';
    ctx.fillRect(0, 0, 512, 256);

    // Continents
    ctx.fillStyle = '#1e5f38';
    ctx.beginPath();
    ctx.ellipse(140, 100, 55, 35, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(320, 90, 80, 45, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(350, 170, 35, 45, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // White cloud swirls
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 256, 20 + Math.random() * 30, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  function createMoonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, 256, 256);

    // Craters
    for (let i = 0; i < 60; i++) {
      const cx = Math.random() * 256;
      const cy = Math.random() * 256;
      const cr = 4 + Math.random() * 18;
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
  }

  function createMarsTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(0, 0, 256, 256);

    // Darker rust patches
    ctx.fillStyle = '#7c2d12';
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 256, Math.random() * 256, 30 + Math.random() * 40, 15 + Math.random() * 20, Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }

    // Polar ice cap
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, 256, 24);
    return new THREE.CanvasTexture(canvas);
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================
  return {
    start: start,
    stop: stop
  };
})();
