/**
 * Lunar EVA: Realistic Moon Surface Point of View Simulator
 * Features first-person astronaut helmet visor, rocket airlock egress,
 * low lunar gravity exploration, high-resolution regolith craters, and Earthrise.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { setupLunarWorld, LunarWorldRefs } from './three/LunarWorld';
import {
  createInitialPlayerState,
  updatePlayerPhysics,
  getNearbyCollectible,
  PlayerPhysicsState,
  InputKeys,
  LunarSample,
} from './sim/astronautState';
import { getLunarHeight } from './sim/lunarTerrain';
import { sounds } from './sim/soundEffects';
import { createGeologicalSampleMesh } from './three/models/ScientificEquipment';
import { AstronautVisorHUD } from './components/AstronautVisorHUD';
import { BottomControlDock } from './components/BottomControlDock';
import { SampleCatalogModal } from './components/SampleCatalogModal';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);

  // React state for HUD rendering (throttled updates to avoid 60Hz rerenders)
  const [playerState, setPlayerState] = useState<PlayerPhysicsState>(() => createInitialPlayerState());
  const [nearestSample, setNearestSample] = useState<LunarSample | null>(null);
  const [actionText, setActionText] = useState<string | null>('OPEN AIRLOCK HATCH');
  const [distanceToLander, setDistanceToLander] = useState<number>(0);
  const [missionSeconds, setMissionSeconds] = useState<number>(625);
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  // Mutable refs held across animation loop
  const playerStateRef = useRef<PlayerPhysicsState>(playerState);
  const worldRefs = useRef<LunarWorldRefs | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastFootstepWalkCycleRef = useRef<number>(0);

  // Keyboard input state
  const keysRef = useRef<InputKeys>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    jetpack: false,
  });

  // Keep playerStateRef synchronized with React state setter
  const updateState = (newState: PlayerPhysicsState) => {
    playerStateRef.current = newState;
    setPlayerState(newState);
  };

  // Format mission elapsed time HH:MM:SS
  const formatMissionTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Pre-allocated scratch vectors for zero garbage collection
  const _camTarget = useRef(new THREE.Vector3());
  const _desiredCamPos = useRef(new THREE.Vector3());

  // --- INTERACTIVE ACTIONS ---
  const handlePerformAction = () => {
    sounds.init();
    const curr = playerStateRef.current;

    if (curr.phase === 'inside_cabin') {
      sounds.playHatchOpen();
      sounds.playQuindarBeep(2525);
      updateState({
        ...curr,
        phase: 'hatch_opening',
      });
      return;
    }

    if (curr.phase === 'ladder_porch') {
      sounds.playQuindarBeep(2475);
      updateState({
        ...curr,
        phase: 'descending_ladder',
      });
      return;
    }

    if (curr.phase === 'first_step') {
      // Step off ladder onto the moon
      sounds.playFootstep();
      sounds.playQuindarBeep(2525);
      updateState({
        ...curr,
        phase: 'exploring',
        x: 0,
        z: 5.5,
        y: getLunarHeight(0, 5.5) + 1.82,
        isGrounded: true,
      });
      return;
    }

    if (curr.phase === 'exploring') {
      // Check if near a sample
      const nearby = getNearbyCollectible(curr.x, curr.z, curr.samples);
      if (nearby) {
        sounds.playSampleCollect();
        sounds.playQuindarBeep(2525);
        const updatedSamples = curr.samples.map((s) =>
          s.id === nearby.id ? { ...s, collected: true } : s
        );

        // Remove 3D marker in world
        const mesh = worldRefs.current?.sampleMeshes.get(nearby.id);
        if (mesh && worldRefs.current) {
          worldRefs.current.scene.remove(mesh);
        }

        updateState({
          ...curr,
          samples: updatedSamples,
        });
      }
    }
  };

  const handlePlantFlag = () => {
    sounds.init();
    const curr = playerStateRef.current;
    if (curr.phase !== 'exploring' || curr.flagPlanted) return;

    sounds.playFootstep();
    sounds.playQuindarBeep(2525);

    const flagX = curr.x + Math.sin(curr.yaw) * 1.5;
    const flagZ = curr.z + Math.cos(curr.yaw) * 1.5;
    const flagY = getLunarHeight(flagX, flagZ);

    if (worldRefs.current?.flagGroup) {
      worldRefs.current.flagGroup.position.set(flagX, flagY, flagZ);
      worldRefs.current.flagGroup.visible = true;
    }

    updateState({
      ...curr,
      flagPlanted: true,
      flagPosition: { x: flagX, y: flagY, z: flagZ },
    });
  };

  const handleToggleVisor = () => {
    sounds.init();
    sounds.playQuindarBeep(2475);
    updateState({
      ...playerStateRef.current,
      visorDown: !playerStateRef.current.visorDown,
    });
  };

  const handleToggleFlashlight = () => {
    sounds.init();
    const next = !playerStateRef.current.flashlightOn;
    if (worldRefs.current) {
      worldRefs.current.flashlight.intensity = next ? 3.5 : 0;
    }
    updateState({
      ...playerStateRef.current,
      flashlightOn: next,
    });
  };

  const handleCameraChange = (mode: 'first_person' | 'third_person' | 'drone') => {
    sounds.init();
    updateState({
      ...playerStateRef.current,
      cameraMode: mode,
    });
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    sounds.setMuted(nextMute);
    setIsMuted(nextMute);
  };

  const handleJump = () => {
    sounds.init();
    if (playerStateRef.current.isGrounded) {
      keysRef.current.jump = true;
      setTimeout(() => {
        keysRef.current.jump = false;
      }, 150);
    }
  };

  const handleJetpack = () => {
    sounds.init();
    sounds.playThruster();
    keysRef.current.jetpack = true;
    setTimeout(() => {
      keysRef.current.jetpack = false;
    }, 400);
  };

  const handleTakeSnapshot = () => {
    sounds.init();
    sounds.playQuindarBeep(2525);
    if (!worldRefs.current) return;

    try {
      worldRefs.current.renderer.render(worldRefs.current.scene, worldRefs.current.camera);
      const canvas = worldRefs.current.renderer.domElement;
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Lunar_EVA_Moon_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Ignored in headless
    }

    setSnapshotToast('Lunar EVA photograph saved to downloads');
    setTimeout(() => setSnapshotToast(null), 3500);
  };

  // --- THREE.JS INITIALIZATION & TICK LOOP ---
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.appendChild(renderer.domElement);

    // Setup PMREM RoomEnvironment for metallic & gold visor reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    pmremGenerator.dispose();

    const world = setupLunarWorld(renderer, width, height);
    world.scene.environment = envTexture;
    worldRefs.current = world;

    // Populate geological samples in the 3D world
    playerStateRef.current.samples.forEach((sample) => {
      const sMesh = createGeologicalSampleMesh(sample);
      world.scene.add(sMesh);
      world.sampleMeshes.set(sample.id, sMesh);
    });

    // Start ambient suit breathing
    sounds.startSuitBreathing();

    // Clock for delta time
    const clock = new THREE.Clock();
    let frameId = 0;
    let hudThrottleTime = 0;

    // Software WebGL frame pacing helper with timeout safeguard
    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl?.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (gl) gl.flush();
      let waited = 0;
      const poll = () => {
        waited += 5;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED && waited < 40) {
          frameId = window.setTimeout(poll, 10);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 140);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    // --- MAIN ANIMATION TICK ---
    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      // 1. Advance Astronaut Physics
      const prev = playerStateRef.current;
      const next = updatePlayerPhysics(prev, keysRef.current, delta);
      playerStateRef.current = next;

      // 2. Audio Footstep Triggering on Regolith
      if (next.phase === 'exploring' && next.isGrounded) {
        if (next.walkCycle - lastFootstepWalkCycleRef.current > 1.8) {
          lastFootstepWalkCycleRef.current = next.walkCycle;
          sounds.playFootstep();
          // Dynamic footprint stamp
          const pVec = new THREE.Vector3(next.x, next.y - 1.82, next.z);
          world.footprints.maybeStamp(pVec, next.yaw, true);
        }
      }

      // 3. Update Rocket Lander Hatch Animation
      if (next.phase === 'hatch_opening' || next.hatchProgress > 0) {
        // Swing hatch open 110 degrees on pivot
        world.lander.hatch.rotation.y = next.hatchProgress * (Math.PI * 0.65);
      }

      // 4. Update Astronaut Character & Camera Transform
      const isFP = next.cameraMode === 'first_person';
      world.astronaut.root.visible = !isFP;
      world.fpGloves.visible = isFP;

      // Position astronaut character
      world.astronaut.root.position.set(next.x, next.y - 1.82, next.z);
      world.astronaut.root.rotation.y = next.yaw;

      // Visor gold film mesh visibility
      world.astronaut.goldVisor.visible = next.visorDown;

      // Subtle suit arm walk bounce
      if (next.walkCycle > 0) {
        const armSwing = Math.sin(next.walkCycle) * 0.35;
        world.astronaut.leftArm.rotation.x = armSwing;
        world.astronaut.rightArm.rotation.x = -armSwing;
        // First-person gloves gentle sway
        world.fpGloves.position.y = Math.sin(next.walkCycle * 2) * 0.015;
        world.fpGloves.position.x = Math.cos(next.walkCycle) * 0.015;
      }

      // Camera Positioning according to mode
      if (isFP) {
        // Helmet first-person eye position
        world.camera.position.set(next.x, next.y, next.z);

        // Yaw and Pitch rotation
        const forward = new THREE.Vector3(
          -Math.sin(next.yaw) * Math.cos(next.pitch),
          Math.sin(next.pitch),
          -Math.cos(next.yaw) * Math.cos(next.pitch)
        );
        _camTarget.current.copy(world.camera.position).add(forward);
        world.camera.lookAt(_camTarget.current);
      } else if (next.cameraMode === 'third_person') {
        // Over-the-shoulder astronaut EVA follow camera
        const camDist = 3.6;
        const camHeight = 1.2;
        _desiredCamPos.current.set(
          next.x + Math.sin(next.yaw) * camDist,
          next.y + camHeight,
          next.z + Math.cos(next.yaw) * camDist
        );
        // Exponential damping
        world.camera.position.lerp(_desiredCamPos.current, 0.15);
        world.camera.lookAt(next.x, next.y - 0.2, next.z);
      } else {
        // Drone high orbital view
        const droneDist = 18.0;
        _desiredCamPos.current.set(
          next.x + Math.sin(next.yaw) * droneDist,
          next.y + 12.0,
          next.z + Math.cos(next.yaw) * droneDist
        );
        world.camera.position.lerp(_desiredCamPos.current, 0.08);
        world.camera.lookAt(next.x, next.y, next.z);
      }

      // Slowly rotate Earth in the black sky
      world.earthMesh.rotation.y += delta * 0.012;

      // 5. Throttled React HUD Telemetry Updates (10Hz)
      hudThrottleTime += delta;
      if (hudThrottleTime >= 0.1) {
        hudThrottleTime = 0;
        setPlayerState({ ...next });

        const distLander = Math.hypot(next.x, next.z);
        setDistanceToLander(distLander);

        const sample = getNearbyCollectible(next.x, next.z, next.samples);
        setNearestSample(sample);

        // Determine active action text
        if (next.phase === 'inside_cabin') {
          setActionText('OPEN AIRLOCK HATCH');
        } else if (next.phase === 'hatch_opening') {
          setActionText('DEPRESSURIZING...');
        } else if (next.phase === 'ladder_porch') {
          setActionText('CLIMB DOWN LADDER');
        } else if (next.phase === 'descending_ladder') {
          setActionText('DESCENDING LADDER...');
        } else if (next.phase === 'first_step') {
          setActionText('TAKE FIRST STEP ON THE MOON');
        } else if (sample && !sample.collected) {
          setActionText(`COLLECT ${sample.name.toUpperCase()}`);
        } else {
          setActionText(null);
        }
      }

      // 6. Render Scene
      renderer.render(world.scene, world.camera);

      // Paced scheduling
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    // Start loop
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    // Mission timer increment every second
    const timerInterval = setInterval(() => {
      setMissionSeconds((s) => s + 1);
    }, 1000);

    // --- MOUSE & TOUCH LOOK CONTROLS ---
    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      const sensitivity = 0.0032;
      const curr = playerStateRef.current;
      const newYaw = curr.yaw - dx * sensitivity;
      const newPitch = Math.max(-1.4, Math.min(1.4, curr.pitch - dy * sensitivity));

      playerStateRef.current = {
        ...curr,
        yaw: newYaw,
        pitch: newPitch,
      };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    // Touch controls
    const handleTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length === 0) return;
      const dx = e.touches[0].clientX - lastMousePosRef.current.x;
      const dy = e.touches[0].clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      const sensitivity = 0.004;
      const curr = playerStateRef.current;
      playerStateRef.current = {
        ...curr,
        yaw: curr.yaw - dx * sensitivity,
        pitch: Math.max(-1.4, Math.min(1.4, curr.pitch - dy * sensitivity)),
      };
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    // --- KEYBOARD LISTENERS ---
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keysRef.current.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') keysRef.current.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') keysRef.current.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') keysRef.current.right = true;
      if (code === 'Space') {
        if (playerStateRef.current.isGrounded) keysRef.current.jump = true;
        else keysRef.current.jetpack = true;
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') keysRef.current.sprint = true;
      if (code === 'KeyE') handlePerformAction();
      if (code === 'KeyF') handlePlantFlag();
      if (code === 'KeyV') handleToggleVisor();
      if (code === 'KeyL') handleToggleFlashlight();
      if (code === 'KeyP') handleTakeSnapshot();
      if (code === 'Digit1') handleCameraChange('first_person');
      if (code === 'Digit2') handleCameraChange('third_person');
      if (code === 'Digit3') handleCameraChange('drone');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keysRef.current.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') keysRef.current.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') keysRef.current.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') keysRef.current.right = false;
      if (code === 'Space') {
        keysRef.current.jump = false;
        keysRef.current.jetpack = false;
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') keysRef.current.sprint = false;
    };

    // Resize handler
    const handleResize = () => {
      if (!mount || !worldRefs.current) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      worldRefs.current.camera.aspect = w / h;
      worldRefs.current.camera.updateProjectionMatrix();
      worldRefs.current.renderer.setSize(w, h);
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      clearInterval(timerInterval);
      sounds.stopSuitBreathing();

      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);

      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 1. THREE.JS WEBGL CANVAS CONTAINER (Isolated Ref) */}
      <div
        ref={canvasMountRef}
        data-testid="lunar-webgl-canvas"
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* 2. ASTRONAUT HELMET VISOR HUD */}
      <AstronautVisorHUD
        playerState={playerState}
        nearestSample={nearestSample}
        onActionClick={handlePerformAction}
        actionText={actionText}
        distanceToLander={distanceToLander}
        missionTime={formatMissionTime(missionSeconds)}
      />

      {/* 3. ERGONOMIC BOTTOM CONTROL DOCK */}
      <BottomControlDock
        playerState={playerState}
        onToggleVisor={handleToggleVisor}
        onToggleFlashlight={handleToggleFlashlight}
        onCameraChange={handleCameraChange}
        onJump={handleJump}
        onJetpack={handleJetpack}
        onPlantFlag={handlePlantFlag}
        onAction={handlePerformAction}
        actionText={actionText}
        onToggleMute={handleToggleMute}
        isMuted={isMuted}
        onOpenCatalog={() => setIsCatalogOpen(true)}
        onTakeSnapshot={handleTakeSnapshot}
      />

      {/* 4. GEOLOGICAL SAMPLE CATALOG MODAL */}
      <SampleCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        samples={playerState.samples}
      />

      {/* 5. SNAPSHOT TOAST NOTIFICATION */}
      {snapshotToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 border border-cyan-400 text-cyan-200 px-5 py-2.5 rounded-xl shadow-2xl text-xs font-mono tracking-wide animate-in fade-in slide-in-from-top-4">
          {snapshotToast}
        </div>
      )}
    </main>
  );
}
