/**
 * ============================================================================
 * ORBITAL FRONTIER — Main Application Controller (app.js)
 * ============================================================================
 * Orchestrates screen transitions, on-landing mission registration,
 * simulated launch countdown sequence, 3D scenes, Web Audio sound effects,
 * and the complete 11-parameter astronaut profile system.
 */

(function () {
  'use strict';

  // State holders
  let currentProfile = null;
  let currentGame = null;
  let selectedMission = 'moon';
  let selectedDifficulty = 'explorer';
  let selectedAvatar = '🧑‍🚀';
  let soundEnabled = true;

  // Synthesized Web Audio API Sound Effects (no external mp3 files needed)
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'click') {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'ignition') {
        // Deep rumble simulation
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(140, now + 2.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 2.5);
        osc.start(now);
        osc.stop(now + 2.5);
      } else if (type === 'decision') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'warning') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.linearRampToValueAtTime(180, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'fanfare') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        osc.frequency.setValueAtTime(1046.50, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      // Audio playback fails gracefully
    }
  }

  // Navigation / Screen Switcher
  function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(scr => scr.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      target.scrollTop = 0;
    }
    playSound('click');
  }
  window.switchScreen = switchScreen;

  // DOM Elements
  const loadingScreen = document.getElementById('loading-screen');
  const nameInput = document.getElementById('astronaut-name');
  const ageInput = document.getElementById('astronaut-age');
  const nameError = document.getElementById('name-error');
  const ageError = document.getElementById('age-error');
  const startMissionBtn = document.getElementById('start-mission-btn');
  const currentAvatarDisplay = document.getElementById('current-selected-avatar');
  const cardMoon = document.getElementById('card-moon');
  const cardMars = document.getElementById('card-mars');
  const advanceDayBtn = document.getElementById('advance-day-btn');
  const sendCommBtn = document.getElementById('send-comm-btn');
  const soundBtn = document.getElementById('sound-btn');
  const dashProfileBtn = document.getElementById('dash-profile-btn');
  const landingProfileBtn = document.getElementById('landing-profile-btn');
  const dashExitBtn = document.getElementById('dash-exit-btn');
  const replayMissionBtn = document.getElementById('replay-mission-btn');
  const newMissionBtn = document.getElementById('new-mission-btn');
  const resultsProfileBtn = document.getElementById('results-profile-btn');
  const profileResumeBtn = document.getElementById('profile-resume-btn');
  const profileBackBtn = document.getElementById('profile-back-btn');
  const resetProfileBtn = document.getElementById('reset-profile-btn');
  const buildingModal = document.getElementById('building-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  // Simulated Launch Overlay Elements
  const launchOverlay = document.getElementById('launch-sequence-overlay');
  const launchCountdownEl = document.getElementById('launch-hud-countdown');
  const launchStatusEl = document.getElementById('launch-status-message');

  // Initialize Application
  window.addEventListener('DOMContentLoaded', () => {
    // Attempt loading existing profile
    currentProfile = window.MissionScoring.PlayerProfile.load();
    if (currentProfile) {
      nameInput.value = currentProfile.name;
      ageInput.value = currentProfile.age;
      selectedAvatar = currentProfile.avatar || '🧑‍🚀';
      currentAvatarDisplay.textContent = selectedAvatar;

      // Select matching avatar button
      document.querySelectorAll('.avatar-option-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-avatar') === selectedAvatar);
      });
    }

    // Initialize 3D Rocket Scene on landing screen
    if (window.RocketScene) {
      window.RocketScene.init('rocket-scene');
    }

    // Hide loader
    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => loadingScreen.remove(), 600);
      }
    }, 400);

    bindEvents();
  });

  function bindEvents() {
    // Avatar selection buttons
    document.querySelectorAll('.avatar-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedAvatar = btn.getAttribute('data-avatar');
        currentAvatarDisplay.textContent = selectedAvatar;
        playSound('click');
      });
    });

    // Mission cards selection on landing page
    cardMoon.addEventListener('click', () => {
      selectedMission = 'moon';
      cardMoon.classList.add('selected');
      cardMars.classList.remove('selected');
      cardMoon.querySelector('.card-radio-circle').textContent = '●';
      cardMars.querySelector('.card-radio-circle').textContent = '○';
      playSound('click');
    });

    cardMars.addEventListener('click', () => {
      selectedMission = 'mars';
      cardMars.classList.add('selected');
      cardMoon.classList.remove('selected');
      cardMars.querySelector('.card-radio-circle').textContent = '●';
      cardMoon.querySelector('.card-radio-circle').textContent = '○';
      playSound('click');
    });

    // Difficulty selection pills
    document.querySelectorAll('.diff-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-pill').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedDifficulty = btn.getAttribute('data-difficulty');
        playSound('click');
      });
    });

    // Start Mission button click on Landing page
    startMissionBtn.addEventListener('click', () => {
      const nameVal = nameInput.value.trim();
      const ageVal = parseInt(ageInput.value, 10);
      let isValid = true;

      if (!nameVal || nameVal.length < 2) {
        nameError.classList.add('visible');
        nameInput.classList.add('error');
        isValid = false;
      } else {
        nameError.classList.remove('visible');
        nameInput.classList.remove('error');
      }

      if (isNaN(ageVal) || ageVal < 7 || ageVal > 100) {
        ageError.classList.add('visible');
        ageInput.classList.add('error');
        isValid = false;
      } else {
        ageError.classList.remove('visible');
        ageInput.classList.remove('error');
      }

      if (!isValid) return;

      // Update or create profile
      if (!currentProfile || currentProfile.name !== nameVal || currentProfile.age !== ageVal) {
        currentProfile = new window.MissionScoring.PlayerProfile(nameVal, ageVal, selectedAvatar);
      } else {
        currentProfile.avatar = selectedAvatar;
      }
      currentProfile.save();

      // Launch Cinematic Third-Person Astronaut Experience
      startCinematicAstronautExperience();
    });

    // Advance Day
    advanceDayBtn.addEventListener('click', () => {
      if (!currentGame) return;
      if (currentGame.pendingEvents.length > 0) {
        alert('Commander! You must make a decision on the active mission event before advancing to the next day.');
        return;
      }

      if (currentGame.currentDay >= 10 || currentGame.crewHealth <= 0) {
        showResults();
        return;
      }

      const report = currentGame.advanceDay();
      updateDashboardUI();
      renderDayEvents(report.events);
      playSound('click');

      if (currentGame.currentDay >= 10 || currentGame.crewHealth <= 0) {
        advanceDayBtn.textContent = '🏁 VIEW OUTPOST EVALUATION';
        advanceDayBtn.classList.remove('btn-primary');
        advanceDayBtn.classList.add('btn-choice');
        advanceDayBtn.style.borderColor = 'var(--cyan-glow)';
      }
    });

    // Simulated Comms to Earth with realistic delay
    sendCommBtn.addEventListener('click', () => {
      if (!currentGame) return;
      const isMars = currentGame.missionType === 'mars';
      const delayMs = isMars ? 4000 : 1300;
      sendCommBtn.disabled = true;
      sendCommBtn.textContent = `📡 Signal traveling to Earth (${isMars ? '14-min Mars delay' : '1.3-sec Moon delay'})...`;

      setTimeout(() => {
        const commContainer = document.getElementById('comm-messages');
        const replies = isMars ? [
          'Houston confirms packet received via Mars Reconnaissance Orbiter. Stay safe in Jezero, Commander!',
          'Flight Dynamics reports atmospheric dust index is stabilizing over your coordinates.',
          'NASA astrobiology team is thrilled with the ancient sediment spectra. Keep monitoring!'
        ] : [
          'Houston confirms receipt of telemetry. Shackleton solar elevation is nominal.',
          'Flight Director says your water conservation protocol is exemplary.',
          'Medical team reports your crew biometrics are strong. Proceed with planned EVA.'
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];

        const msgDiv = document.createElement('div');
        msgDiv.className = 'comm-message animate-in';
        msgDiv.innerHTML = `
          <span class="comm-from">HOUSTON MISSION CONTROL (T+${(delayMs / 1000).toFixed(1)}s)</span>
          ${randomReply}
        `;
        commContainer.prepend(msgDiv);

        sendCommBtn.disabled = false;
        sendCommBtn.textContent = '📡 Send Message to Earth';
        playSound('beep');
      }, delayMs);
    });

    // Sound toggle
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
    });

    // Navigation bindings
    landingProfileBtn.addEventListener('click', () => renderProfileScreen());
    dashProfileBtn.addEventListener('click', () => renderProfileScreen());
    resultsProfileBtn.addEventListener('click', () => renderProfileScreen());
    dashExitBtn.addEventListener('click', () => {
      if (confirm('Return to launchpad? Active simulation will pause.')) {
        if (window.AstronautExperience) window.AstronautExperience.stop();
        switchScreen('landing-screen');
      }
    });

    profileResumeBtn.addEventListener('click', () => {
      if (currentGame) {
        switchScreen('dashboard-screen');
      } else {
        switchScreen('landing-screen');
      }
    });

    profileBackBtn.addEventListener('click', () => {
      if (currentGame) {
        switchScreen('dashboard-screen');
      } else {
        switchScreen('landing-screen');
      }
    });

    replayMissionBtn.addEventListener('click', () => {
      startCinematicAstronautExperience();
    });

    newMissionBtn.addEventListener('click', () => {
      if (window.AstronautExperience) window.AstronautExperience.stop();
      switchScreen('landing-screen');
    });

    resetProfileBtn.addEventListener('click', () => {
      if (confirm('Permanently delete your astronaut profile and mission history? This cannot be undone.')) {
        window.MissionScoring.PlayerProfile.reset();
        currentProfile = new window.MissionScoring.PlayerProfile('Alex', 10, '🧑‍🚀');
        renderProfileScreen();
      }
    });

    // Facility inspectors
    document.querySelectorAll('.outpost-building-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const buildingKey = btn.getAttribute('data-building');
        showBuildingModal(buildingKey);
      });
    });

    modalCloseBtn.addEventListener('click', () => {
      buildingModal.classList.remove('active');
    });

    buildingModal.addEventListener('click', (e) => {
      if (e.target === buildingModal) buildingModal.classList.remove('active');
    });
  }

  // Start Cinematic Third-Person Astronaut Experience
  function startCinematicAstronautExperience() {
    switchScreen('astronaut-experience-screen');
    if (window.AstronautExperience) {
      window.AstronautExperience.start({
        missionType: selectedMission,
        difficulty: selectedDifficulty,
        commanderName: currentProfile ? currentProfile.name : 'Alex',
        avatar: selectedAvatar,
        onCompleteLaunchToOrbit: () => {
          startNewMissionGame();
          switchScreen('dashboard-screen');
        }
      });
    }
  }

  // Trigger Realistic Launch Countdown & Sequence (Fallback / Direct)
  function triggerLaunchSequence() {
    launchOverlay.classList.add('active');
    let countdown = 5;

    launchCountdownEl.textContent = `T-${countdown}`;
    launchStatusEl.textContent = 'TERMINAL COUNTDOWN SEQUENCER INITIATED';
    playSound('beep');

    const timer = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        launchCountdownEl.textContent = `T-${countdown}`;
        playSound('beep');
        if (countdown === 3) {
          launchStatusEl.textContent = 'MAIN ENGINE IGNITION SEQUENCE START';
          playSound('ignition');
          document.body.classList.add('launch-vibrate');
        }
      } else if (countdown === 0) {
        launchCountdownEl.textContent = 'LIFTOFF!';
        launchStatusEl.textContent = 'ALL ENGINES RUNNING — WE HAVE LIFTOFF!';
        playSound('fanfare');

        if (window.RocketScene) {
          window.RocketScene.startLaunchSequence();
        }
      } else {
        clearInterval(timer);
        document.body.classList.remove('launch-vibrate');
        launchOverlay.classList.remove('active');

        // Transition to Mission Control Dashboard
        startNewMissionGame();
        switchScreen('dashboard-screen');
      }
    }, 1000);
  }

  // Start New Mission Game
  function startNewMissionGame() {
    currentGame = new window.GameState(selectedMission, selectedDifficulty);

    // Initialize 3D Environment Scene
    if (window.EnvironmentScene) {
      window.EnvironmentScene.destroy();
      window.EnvironmentScene.init('environment-canvas', selectedMission);
    }

    // Update Welcome Greeter throughout experience
    const commanderName = currentProfile ? currentProfile.name : 'Alex';
    const welcomeText = `Welcome aboard, Commander ${commanderName}!`;

    document.getElementById('dash-avatar').textContent = currentProfile ? currentProfile.avatar : '🧑‍🚀';
    document.getElementById('dash-player-name').textContent = welcomeText;
    document.getElementById('dash-mission-location').textContent = selectedMission === 'moon' ? 'Lunar Outpost' : 'Mars Outpost';
    document.getElementById('dash-mission-tag').innerHTML = `<span>${selectedMission === 'moon' ? '🌙' : '🔴'}</span><span>${selectedMission === 'moon' ? 'Moon (Shackleton)' : 'Mars (Jezero)'}</span>`;
    document.getElementById('dash-difficulty-tag').textContent = selectedDifficulty.toUpperCase();
    document.getElementById('comm-delay-note').textContent = selectedMission === 'moon' ? 'Signal delay: ~1.3 seconds (Speed of Light)' : 'Signal delay: ~14 minutes (Interplanetary Lag)';

    advanceDayBtn.textContent = '▶ ADVANCE TO NEXT MISSION DAY';
    advanceDayBtn.className = 'btn btn-primary w-full';

    // Clear logs & comms
    document.getElementById('log-entries').innerHTML = `
      <div class="log-entry">
        <span class="log-day">[DAY 1]</span>
        <span class="log-text">Commander ${commanderName} assumes command of the ${selectedMission === 'moon' ? 'Shackleton Lunar' : 'Jezero Martian'} research outpost. All primary telemetry channels verified.</span>
      </div>
    `;

    // Process Day 1
    const day1Events = window.EventSystem.getEventsForDay(selectedMission, 1, currentGame);
    currentGame.pendingEvents = [...day1Events];
    updateDashboardUI();
    renderDayEvents(day1Events);
  }

  // Update Dashboard Indicators & Resource Bars
  function updateDashboardUI() {
    if (!currentGame) return;
    const s = currentGame.getResourceStatus();

    document.getElementById('dash-day').textContent = s.currentDay;

    // Oxygen
    setBar('oxygen-bar', 'oxygen-value', s.oxygen);
    // Water
    setBar('water-bar', 'water-value', s.water);
    // Food
    setBar('food-bar', 'food-value', s.food);
    // Crew Health
    setBar('health-bar', 'health-value', s.crewHealth);
    // Battery
    setBar('power-bar', 'power-value', s.power);
    // Radiation
    setBar('radiation-bar', 'radiation-value', s.radiationExposure);

    // Research
    const rPct = Math.min(100, (s.researchPoints / 25) * 100);
    document.getElementById('research-bar').style.width = `${rPct}%`;
    document.getElementById('research-value').textContent = `${s.researchPoints} pts`;

    // Morale
    const mPct = Math.min(100, (s.morale / 50) * 100);
    document.getElementById('morale-bar').style.width = `${mPct}%`;
    document.getElementById('morale-value').textContent = `${s.morale} / 50`;

    // Status texts
    document.getElementById('solar-gen-value').textContent = `+${s.solarGeneration} kW`;
    document.getElementById('power-consumption-value').textContent = `-${s.powerConsumption} kW`;
    document.getElementById('shielding-value').textContent = `Level ${s.shieldingLevel} Active`;
    document.getElementById('greenhouse-value').textContent = `Level ${s.greenhouseLevel} (${s.greenhouseLevel > 0 ? 'Producing' : 'Dormant'})`;

    // Status dots
    updateDot('life-support-status', s.oxygen < 30 || s.water < 25 || s.crewHealth < 50 ? 'danger' : (s.oxygen < 50 ? 'warn' : 'ok'));
    updateDot('power-status', s.power < 20 ? 'danger' : (s.power < 40 ? 'warn' : 'ok'));
    updateDot('radiation-status', s.radiationExposure > 60 ? 'danger' : (s.radiationExposure > 30 ? 'warn' : 'ok'));
  }

  function setBar(barId, valId, value) {
    const bar = document.getElementById(barId);
    const val = document.getElementById(valId);
    const pct = Math.max(0, Math.min(100, Math.round(value)));
    if (bar) {
      bar.style.width = `${pct}%`;
      bar.classList.toggle('critical', pct < 20);
    }
    if (val) {
      val.textContent = `${pct}%`;
    }
  }

  function updateDot(dotId, statusClass) {
    const dot = document.getElementById(dotId);
    if (!dot) return;
    dot.className = `status-dot ${statusClass}`;
  }

  // Render Events into the Event Area
  function renderDayEvents(events) {
    const container = document.getElementById('event-container');
    container.innerHTML = '';

    if (!events || events.length === 0) {
      container.innerHTML = `
        <div class="event-card routine animate-in">
          <span class="event-type-badge routine">⬡ Outpost Nominal</span>
          <h3>All Systems Operating Smoothly</h3>
          <p>No critical anomalies detected today. Click "Advance to Next Mission Day" to proceed.</p>
        </div>
      `;
      return;
    }

    events.forEach(evt => {
      const card = document.createElement('div');
      card.className = `event-card ${evt.type} animate-in`;
      card.id = `card_${evt.id}`;

      let choicesHtml = '';
      evt.choices.forEach((c, idx) => {
        choicesHtml += `
          <button class="btn-choice" data-event-id="${evt.id}" data-choice-idx="${idx}">
            <span class="choice-label">${c.label}</span>
            <span class="choice-desc">${c.description}</span>
          </button>
        `;
      });

      let factHtml = '';
      if (evt.scienceFact) {
        factHtml = `
          <div class="science-fact">
            <h4>🔬 NASA Science: ${evt.scienceFact.title}</h4>
            <p>${evt.scienceFact.content}</p>
          </div>
        `;
      }

      card.innerHTML = `
        <span class="event-type-badge ${evt.type}">⬡ ${evt.type.toUpperCase()}</span>
        <h3>${evt.title}</h3>
        <p>${evt.description}</p>
        <div class="event-choices" id="choices_${evt.id}">
          ${choicesHtml}
        </div>
        ${factHtml}
      `;

      container.appendChild(card);
    });

    // Bind choice clicks
    container.querySelectorAll('.btn-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventId = btn.getAttribute('data-event-id');
        const choiceIdx = parseInt(btn.getAttribute('data-choice-idx'), 10);
        handlePlayerChoice(eventId, choiceIdx);
      });
    });

    if (events.some(e => e.type === 'crisis')) {
      playSound('warning');
    }
  }

  function handlePlayerChoice(eventId, choiceIdx) {
    if (!currentGame) return;
    const result = currentGame.makeDecision(eventId, choiceIdx);
    if (!result) return;

    playSound('decision');

    const choicesDiv = document.getElementById(`choices_${eventId}`);
    if (choicesDiv) {
      let changesBadges = '';
      const applied = result.appliedConsequences || {};
      for (const [k, v] of Object.entries(applied)) {
        const sign = v >= 0 ? `+${v}` : `${v}`;
        const cls = v >= 0 ? 'positive' : 'negative';
        changesBadges += `<span class="resource-change ${cls}">${k}: ${sign}</span>`;
      }

      choicesDiv.innerHTML = `
        <div class="event-outcome animate-in">
          <div><strong>Outcome:</strong> ${result.choice.outcomeText}</div>
          <div class="resource-changes">${changesBadges}</div>
        </div>
      `;
    }

    const logEntries = document.getElementById('log-entries');
    const logItem = document.createElement('div');
    logItem.className = 'log-entry animate-in';
    logItem.innerHTML = `
      <span class="log-day">[DAY ${currentGame.currentDay}]</span>
      <span class="log-text"><strong>${result.choice.label}:</strong> ${result.choice.outcomeText}</span>
    `;
    logEntries.prepend(logItem);

    updateDashboardUI();
  }

  // Show Results Screen
  function showResults() {
    if (!currentGame) return;
    const scoreResult = currentGame.calculateScore();

    if (currentProfile) {
      currentProfile.recordMission(currentGame, scoreResult);
    }

    playSound('fanfare');

    const icon = document.getElementById('result-icon');
    const title = document.getElementById('result-title');
    const subtitle = document.getElementById('result-subtitle');

    if (scoreResult.isVictory) {
      icon.textContent = '🏆';
      title.className = 'success';
      title.textContent = 'Mission Evaluation Complete — Success!';
      subtitle.textContent = `Outstanding leadership, Commander ${currentProfile ? currentProfile.name : 'Alex'}! The outpost thrived under your command.`;
    } else {
      icon.textContent = '⚠️';
      title.className = 'partial';
      title.textContent = 'Expedition Concluded With Critical Challenges';
      subtitle.textContent = 'Deep space survival is merciless. Review your performance telemetry below!';
    }

    const scoreCircle = document.getElementById('score-circle');
    const scoreNumber = document.getElementById('score-number');
    scoreCircle.style.setProperty('--score', scoreResult.total);
    scoreNumber.textContent = scoreResult.total;

    const statsContainer = document.getElementById('results-stats');
    statsContainer.innerHTML = `
      <div class="result-stat">
        <div class="stat-icon">❤️</div>
        <div class="stat-label">Crew Survival</div>
        <div class="stat-value">${scoreResult.breakdown.survival}/30</div>
      </div>
      <div class="result-stat">
        <div class="stat-icon">🔋</div>
        <div class="stat-label">Resource Conservation</div>
        <div class="stat-value">${scoreResult.breakdown.resources}/25</div>
      </div>
      <div class="result-stat">
        <div class="stat-icon">🔬</div>
        <div class="stat-label">Scientific Discoveries</div>
        <div class="stat-value">${scoreResult.breakdown.science}/20</div>
      </div>
      <div class="result-stat">
        <div class="stat-icon">⚖️</div>
        <div class="stat-label">Decision Equilibrium</div>
        <div class="stat-value">${scoreResult.breakdown.decisions}/15</div>
      </div>
      <div class="result-stat">
        <div class="stat-icon">🏁</div>
        <div class="stat-label">Mission Milestone</div>
        <div class="stat-value">${scoreResult.breakdown.completion}/10</div>
      </div>
      <div class="result-stat">
        <div class="stat-icon">☢️</div>
        <div class="stat-label">Final Radiation</div>
        <div class="stat-value">${Math.round(currentGame.radiationExposure)}%</div>
      </div>
    `;

    const achContainer = document.getElementById('achievements-grid');
    if (scoreResult.unlockedAchievements.length === 0) {
      achContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b;">No new badges unlocked on this run. Replay with different strategies to earn badges!</p>`;
    } else {
      achContainer.innerHTML = scoreResult.unlockedAchievements.map(ach => `
        <div class="achievement-card unlocked">
          <div class="ach-icon">${ach.icon}</div>
          <div class="ach-name">${ach.name}</div>
          <div class="ach-desc">${ach.description}</div>
        </div>
      `).join('');
    }

    const historyContainer = document.getElementById('decision-history-entries');
    if (!currentGame.decisions || currentGame.decisions.length === 0) {
      historyContainer.innerHTML = `<p style="color: #64748b;">No decisions recorded.</p>`;
    } else {
      historyContainer.innerHTML = currentGame.decisions.map(d => `
        <div class="decision-entry">
          <div class="dec-day">MISSION DAY ${d.day}</div>
          <div class="dec-title">${d.eventId}</div>
          <div class="dec-choice">Selected Choice Index: ${d.choiceIndex + 1}</div>
        </div>
      `).join('');
    }

    const nasaContainer = document.getElementById('nasa-data-entries');
    if (window.NASAData) {
      nasaContainer.innerHTML = window.NASAData.renderNASADataSection(currentGame.missionType);
    }

    switchScreen('results-screen');
  }

  // Render Comprehensive Profile Screen (Showing all 11 required parameters)
  function renderProfileScreen() {
    if (!currentProfile) {
      currentProfile = new window.MissionScoring.PlayerProfile('Alex', 10, '🧑‍🚀');
    }

    document.getElementById('profile-avatar-display').textContent = currentProfile.avatar;
    document.getElementById('profile-name').textContent = `Commander ${currentProfile.name}`;
    document.getElementById('profile-rank').textContent = currentProfile.getRank();
    document.getElementById('profile-welcome-tag').textContent = `Welcome aboard, Commander ${currentProfile.name}!`;

    // Populate all 11 tracking fields:
    document.getElementById('prof-stat-age').textContent = `${currentProfile.age} yrs`;
    document.getElementById('prof-stat-rank').textContent = currentProfile.getRank();
    document.getElementById('prof-stat-completed').textContent = currentProfile.missionsCompleted;
    document.getElementById('prof-stat-current').textContent = currentProfile.currentMission || 'Lunar Outpost';
    document.getElementById('prof-stat-rate').textContent = currentProfile.getSuccessRate();
    document.getElementById('prof-stat-science').textContent = `${currentProfile.totalScience} pts`;
    document.getElementById('prof-stat-highscore').textContent = `${currentProfile.highestScore} / 100`;
    document.getElementById('prof-stat-survival').textContent = currentProfile.bestSurvivalRecord || 'None yet';

    // Mission History
    const histDiv = document.getElementById('mission-history-entries');
    if (!currentProfile.missionHistory || currentProfile.missionHistory.length === 0) {
      histDiv.innerHTML = `<p style="color: #64748b; text-align: center; font-size: 0.9rem;">No completed missions recorded yet. Begin your first expedition!</p>`;
    } else {
      histDiv.innerHTML = currentProfile.missionHistory.map(h => `
        <div class="decision-entry">
          <div class="dec-day">${h.date} · ${h.destination} · ${h.difficulty.toUpperCase()}</div>
          <div class="dec-title">Evaluation Score: ${h.finalScore}/100 — ${h.success ? 'Success' : 'Partial'}</div>
          <div class="dec-choice">Days Survived: ${h.daysCompleted}/10 | Science: ${h.science} pts | Final Health: ${h.crewHealth}%</div>
        </div>
      `).join('');
    }

    // Achievements Grid
    const achGrid = document.getElementById('profile-achievements-grid');
    const allAchs = window.MissionScoring.ACHIEVEMENTS;
    achGrid.innerHTML = allAchs.map(ach => {
      const isUnlocked = currentProfile.achievements.includes(ach.id);
      return `
        <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="ach-icon">${ach.icon}</div>
          <div class="ach-name">${ach.name}</div>
          <div class="ach-desc">${ach.description}</div>
        </div>
      `;
    }).join('');

    switchScreen('profile-screen');
  }

  // Facility Inspection Modal
  function showBuildingModal(buildingKey) {
    if (window.EnvironmentScene) {
      window.EnvironmentScene.highlightBuilding(buildingKey);
    }

    const data = {
      habitat: {
        title: 'Central Pressurized Habitat Dome',
        type: 'CREW LIFE SUPPORT & LIVING QUARTERS',
        body: `<p>The heart of your outpost. Provides radiation shielding, thermal atmospheric circulation, exercise equipment to prevent bone density loss, and sleeping berths for the astronaut crew.</p>
               <p><strong>Power Draw:</strong> 4 kW baseload continuous.<br/><strong>Atmosphere:</strong> 78% Nitrogen / 21% Oxygen at 101.3 kPa.</p>`
      },
      solar: {
        title: 'Bifacial Photovoltaic Solar Array',
        type: 'ELECTRICAL POWER GENERATION',
        body: `<p>High-efficiency multi-junction gallium arsenide solar cells. On the Moon, panels track the low horizon sun. On Mars, automated dust wipers keep regolith off the glass.</p>
               <p><strong>Generation:</strong> 8-15 kW daytime.<br/><strong>Vulnerability:</strong> Dust accumulation and micrometeorite punctures.</p>`
      },
      greenhouse: {
        title: 'Closed-Loop Hydroponic Greenhouse',
        type: 'BIO-REGENERATIVE FOOD & OXYGEN PRODUCTION',
        body: `<p>Crops (dwarf wheat, tomatoes, radishes, and sweet potatoes) are grown under LED grow lights without soil. Plants recycle crew CO2 into oxygen and provide essential fresh micronutrients.</p>
               <p><strong>Requirements:</strong> 4-10 kW electricity & recycled water.<br/><strong>Output:</strong> Fresh food reserves & morale boost.</p>`
      },
      lab: {
        title: 'Geological & Astrobiology Laboratory',
        type: 'SCIENTIFIC RESEARCH & SAMPLE ANALYSIS',
        body: `<p>Houses Raman spectrometers, electron microscopes, and sterile gloveboxes to inspect lunar rocks and Martian core samples for signs of ancient water and biosignatures.</p>
               <p><strong>Power Draw:</strong> 3-5 kW when processing active samples.<br/><strong>Output:</strong> Mission Discovery Points.</p>`
      },
      comm: {
        title: 'Deep Space High-Gain Dish Array',
        type: 'EARTH-OUTPOST COMMUNICATIONS',
        body: `<p>Parabolic dish transceiver communicating directly with the NASA Deep Space Network (DSN) antennas in California, Spain, and Australia.</p>
               <p><strong>Lunar Latency:</strong> 1.3 seconds.<br/><strong>Martian Latency:</strong> 4 to 24 minutes one-way.</p>`
      },
      shelter: {
        title: 'Subterranean Storm Shelter & Water Wall',
        type: 'RADIATION PROTECTION BUNKER',
        body: `<p>Thick regolith-covered underground sanctuary surrounded by greywater storage tanks. Water and hydrogen-rich materials absorb deadly high-energy protons during coronal mass ejections.</p>
               <p><strong>Protection Factor:</strong> Reduces cosmic radiation dose by up to 90% during solar flares.</p>`
      }
    };

    const info = data[buildingKey] || { title: 'Outpost Facility', type: 'FACILITY', body: '<p>Standard outpost facility.</p>' };
    document.getElementById('modal-title').textContent = info.title;
    document.getElementById('modal-subtitle').textContent = info.type;
    document.getElementById('modal-content').innerHTML = info.body;
    buildingModal.classList.add('active');
    playSound('click');
  }

})();
