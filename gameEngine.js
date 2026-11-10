/**
 * ============================================================================
 * Orbital Frontier — Junior Astronaut Mission Trainer
 * Core Simulation Engine (gameEngine.js)
 * ============================================================================
 *
 * This file contains the main GameState class that drives the entire
 * resource-management simulation. Every resource is interconnected:
 * power feeds life support which makes oxygen, water feeds the greenhouse
 * which makes food, radiation damages health, morale affects everything.
 *
 * Designed for children aged 7-12: numbers are kept simple (0-100 scales),
 * feedback is immediate, and cascading failures happen gradually so players
 * have time to course-correct.
 */

// ─── Helper: clamp a number between min and max ────────────────────────────
/**
 * Clamp a value between a minimum and maximum.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generate a small random fluctuation in the range [-magnitude, +magnitude].
 * Used to keep resource numbers feeling alive.
 * @param {number} magnitude  Half-width of the random range
 * @returns {number}
 */
function fluctuate(magnitude) {
  return (Math.random() * 2 - 1) * magnitude;
}

// ─── Difficulty Presets ────────────────────────────────────────────────────
/**
 * Difficulty modifiers change how fast resources deplete and how much
 * starting supply the player receives.
 */
const DIFFICULTY = {
  explorer: {
    label: 'Explorer',
    depletionRate: 0.7,       // 30% slower depletion
    startingBonus: 15,        // +15 to starting resources
    warningThreshold: 35,     // warnings trigger at 35%
    description: 'Easier — great for first-time astronauts!',
  },
  specialist: {
    label: 'Specialist',
    depletionRate: 1.0,       // normal rates
    startingBonus: 0,
    warningThreshold: 25,
    description: 'Normal — a balanced challenge.',
  },
  commander: {
    label: 'Commander',
    depletionRate: 1.2,       // 20% faster depletion
    startingBonus: -10,       // fewer starting supplies
    warningThreshold: 18,
    description: 'Hard — only for experienced astronauts!',
  },
};

// ─── Mission Location Profiles ─────────────────────────────────────────────
/**
 * Each mission location has unique environmental properties that affect
 * solar generation, radiation, communication delay, and special hazards.
 */
const MISSION_PROFILES = {
  moon: {
    label: 'Lunar Outpost',
    /** Day/night cycle length in game-days (simplified from real 14-day cycles) */
    dayPhaseLengthDays: 3,   // 3 game-days of sunlight
    nightPhaseLengthDays: 2, // 2 game-days of darkness
    /** Solar efficiency multiplier (no atmosphere = full sun when lit) */
    solarEfficiency: 1.0,
    /** Base solar generation rate during daytime (power units per day) */
    solarBaseRate: 20,
    /** Communication delay in seconds (1.3s Moon → Earth) */
    commDelaySeconds: 1.3,
    /** Comm delay description for children */
    commDelayText: 'almost instant',
    /** Base radiation rate per day (no atmosphere = higher) */
    baseRadiationRate: 1.5,
    /** Whether dust storms can occur */
    hasDustStorms: false,
    /** Lunar dust reduces solar efficiency over time */
    hasDustAccumulation: true,
    /** Temperature extremes for flavor text */
    tempRange: { min: -173, max: 127, unit: '°C' },
    /** Starting resources specific to this mission */
    startingResources: {
      oxygen: 90,
      water: 85,
      food: 80,
      power: 75,
    },
    /** Total mission length in days */
    missionDays: 10,
  },
  mars: {
    label: 'Mars Base Alpha',
    dayPhaseLengthDays: 1,   // roughly 12hr cycle → every other day counts as "night"
    nightPhaseLengthDays: 1,
    solarEfficiency: 0.6,    // farther from sun + thin atmosphere
    solarBaseRate: 14,
    commDelaySeconds: 480,   // 8 minutes average
    commDelayText: '8 minutes each way',
    baseRadiationRate: 0.8,  // thin atmosphere provides some shielding
    hasDustStorms: true,
    hasDustAccumulation: false,
    tempRange: { min: -80, max: 20, unit: '°C' },
    startingResources: {
      oxygen: 85,
      water: 80,
      food: 75,
      power: 70,
    },
    missionDays: 10,
  },
};

// ─── Power Consumption Table ───────────────────────────────────────────────
/**
 * Power costs for each subsystem, measured in units per game-day.
 * These are the "sticker prices"; actual draw may vary with system level.
 */
const POWER_COSTS = {
  lifeSupport: 5,          // O₂ generation + air scrubbing
  baseHabitat: 3,          // lighting, heating, computers
  research: 4,             // lab equipment (only when active)
  communicationPerMsg: 2,  // per outgoing transmission
  greenhouse: [0, 3, 6, 10],   // indexed by greenhouse level 0-3
  shielding: [0, 2, 5, 12],    // indexed by shielding level 0-3
};

// ─── Resource Consumption Rates (per day, before difficulty modifier) ──────
const BASE_RATES = {
  oxygenConsumption: 2,     // crew breathes ~2 units/day
  waterConsumption: 1.5,    // drinking + hygiene
  foodConsumption: 2,       // meals for the crew
  waterRecyclingReturn: 0.8, // 80% of consumed water is recycled
};

// ─── Greenhouse Production ─────────────────────────────────────────────────
/**
 * Food produced per day at each greenhouse level, assuming adequate
 * water and power supply. If water < 30% output halves.
 */
const GREENHOUSE_FOOD_OUTPUT = [0, 0.4, 0.9, 1.6]; // levels 0-3
/** Water consumed by the greenhouse per day at each level */
const GREENHOUSE_WATER_USE = [0, 0.3, 0.6, 1.0];

// ════════════════════════════════════════════════════════════════════════════
//  GameState — the heart of the simulation
// ════════════════════════════════════════════════════════════════════════════

/**
 * @class GameState
 * Tracks every resource, processes daily ticks, handles events, and
 * calculates the cascading consequences of player decisions.
 *
 * Usage:
 *   const game = new GameState('moon', 'specialist');
 *   const dayReport = game.advanceDay();
 *   game.makeDecision(eventId, choiceIndex);
 *   const status = game.getResourceStatus();
 */
class GameState {
  /**
   * Create a new mission.
   * @param {'moon'|'mars'} missionType - The destination
   * @param {'explorer'|'specialist'|'commander'} difficulty - Difficulty level
   */
  constructor(missionType, difficulty) {
    // ── Validate inputs ──────────────────────────────────────────────────
    if (!MISSION_PROFILES[missionType]) {
      throw new Error(`Unknown mission type: "${missionType}". Use 'moon' or 'mars'.`);
    }
    if (!DIFFICULTY[difficulty]) {
      throw new Error(`Unknown difficulty: "${difficulty}". Use 'explorer', 'specialist', or 'commander'.`);
    }

    /** @type {'moon'|'mars'} */
    this.missionType = missionType;
    /** @type {'explorer'|'specialist'|'commander'} */
    this.difficulty = difficulty;

    // Shorthand references
    const profile = MISSION_PROFILES[missionType];
    const diff = DIFFICULTY[difficulty];

    /** @type {object} Mission-specific environmental data */
    this.profile = profile;
    /** @type {object} Difficulty modifiers */
    this.diff = diff;

    // ── Current game-day (1-indexed; day 0 = pre-mission) ────────────────
    /** @type {number} */
    this.currentDay = 0;
    /** @type {number} Total days in this mission */
    this.totalDays = profile.missionDays;
    /** @type {boolean} Has the mission ended? */
    this.missionComplete = false;
    /** @type {boolean} Did the crew survive? */
    this.crewAlive = true;

    // ── Resources ────────────────────────────────────────────────────────
    const bonus = diff.startingBonus;
    /** Oxygen tank level, 0-100 */
    this.oxygen = clamp(profile.startingResources.oxygen + bonus, 0, 100);
    /** Water reserves, 0-100 */
    this.water = clamp(profile.startingResources.water + bonus, 0, 100);
    /** Food supply, 0-100 */
    this.food = clamp(profile.startingResources.food + bonus, 0, 100);
    /** Battery / power grid level, 0-100 */
    this.power = clamp(profile.startingResources.power + bonus, 0, 100);

    // ── Power subsystem tracking ─────────────────────────────────────────
    /** Current solar generation this day (set during day-phase calc) */
    this.solarGeneration = 0;
    /** Sum of all system power draws this day */
    this.powerConsumption = 0;

    // ── Radiation & Shielding ────────────────────────────────────────────
    /** Cumulative radiation exposure, 0-100 (100 = critical) */
    this.radiationExposure = 0;
    /** Shielding level: 0=off, 1=low, 2=medium, 3=max */
    this.shieldingLevel = 1;

    // ── Greenhouse ───────────────────────────────────────────────────────
    /** Greenhouse level: 0=off, 1=minimal, 2=normal, 3=max */
    this.greenhouseLevel = 0;

    // ── Crew stats ───────────────────────────────────────────────────────
    /** Crew health, 0-100 */
    this.crewHealth = 100;
    /** Crew morale, 0-50 */
    this.crewMorale = 50;

    // ── Research & Communication ─────────────────────────────────────────
    /** Accumulated research/science points */
    this.researchPoints = 0;
    /** Whether the research lab is actively running (costs power) */
    this.researchActive = false;
    /** Messages sent to Earth */
    this.messagesSentToEarth = 0;
    /** Communication queue: { day, direction, content } */
    this.communicationQueue = [];

    // ── Environmental state ──────────────────────────────────────────────
    /** Is it currently daytime? (affects solar generation) */
    this.isDaytime = true;
    /** Dust accumulation on solar panels (Moon), 0-1 (1 = fully covered) */
    this.solarDust = 0;
    /** Is a dust storm active? (Mars) */
    this.dustStormActive = false;
    /** Dust storm severity 0-1 (1 = worst) */
    this.dustStormSeverity = 0;
    /** Is a solar storm / radiation event active? */
    this.solarStormActive = false;

    // ── Event & Decision Tracking ────────────────────────────────────────
    /** Events that have already been shown (by id) */
    this.eventsTriggered = [];
    /** Decisions the player has made: { eventId, choiceIndex, day } */
    this.decisionLog = [];
    /** Pending events waiting for player decision */
    this.pendingEvents = [];
    /** Log of every day's resource snapshot (for scoring/history) */
    this.dailyLog = [];

    // ── Achievement Tracking ─────────────────────────────────────────────
    /** Has oxygen ever dropped below 50%? */
    this.oxygenDroppedBelow50 = false;
    /** Has power ever dropped below 15%? */
    this.powerDroppedBelow15 = false;
    /** Days the greenhouse was at level 2 or higher */
    this.greenhouseHighDays = 0;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  DAY / NIGHT CYCLE
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Determine if the current day falls in a daytime or nighttime phase,
   * based on the mission location's cycle lengths.
   * @returns {boolean} true if daytime
   */
  _calculateDaytime() {
    const p = this.profile;
    const cycleLength = p.dayPhaseLengthDays + p.nightPhaseLengthDays;
    // Position within the current cycle (0-indexed)
    const posInCycle = (this.currentDay - 1) % cycleLength;
    return posInCycle < p.dayPhaseLengthDays;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  SOLAR POWER CALCULATION
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Calculate how much solar power is generated this day.
   * Affected by: daytime/nighttime, location efficiency, dust, storms.
   * @returns {number} Power units generated
   */
  _calculateSolarGeneration() {
    if (!this.isDaytime) {
      // No solar at night — battery only
      return 0;
    }

    let rate = this.profile.solarBaseRate * this.profile.solarEfficiency;

    // Lunar dust accumulation reduces output gradually
    if (this.profile.hasDustAccumulation) {
      rate *= (1 - this.solarDust * 0.6); // up to 60% reduction at max dust
    }

    // Mars dust storm can slash solar by 50-90%
    if (this.dustStormActive) {
      const reduction = 0.5 + this.dustStormSeverity * 0.4; // 50%-90%
      rate *= (1 - reduction);
    }

    // Small natural fluctuation (±5%)
    rate *= (1 + fluctuate(0.05));

    return Math.max(0, rate);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  POWER CONSUMPTION CALCULATION
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Sum up all power consumption from active systems.
   * @returns {number} Total power consumed this day
   */
  _calculatePowerConsumption() {
    let total = 0;

    // Always-on systems
    total += POWER_COSTS.lifeSupport;
    total += POWER_COSTS.baseHabitat;

    // Variable systems
    total += POWER_COSTS.greenhouse[this.greenhouseLevel];
    total += POWER_COSTS.shielding[this.shieldingLevel];

    // Research lab
    if (this.researchActive) {
      total += POWER_COSTS.research;
    }

    // Apply difficulty modifier (harder = more consumption)
    total *= this.diff.depletionRate;

    return total;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  RESOURCE TICK — Process one day of resource changes
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Process all resource production, consumption, and cascading effects
   * for one game-day. This is the core simulation loop.
   * @returns {object} A detailed breakdown of what changed and why
   */
  _tickResources() {
    const report = {
      powerGenerated: 0,
      powerConsumed: 0,
      oxygenChange: 0,
      waterChange: 0,
      foodChange: 0,
      radiationChange: 0,
      healthChange: 0,
      moraleChange: 0,
      warnings: [],
      criticals: [],
    };

    const dr = this.diff.depletionRate; // difficulty rate multiplier

    // ── 1. DAY/NIGHT ─────────────────────────────────────────────────────
    this.isDaytime = this._calculateDaytime();

    // ── 2. SOLAR POWER ───────────────────────────────────────────────────
    this.solarGeneration = this._calculateSolarGeneration();
    report.powerGenerated = this.solarGeneration;

    // ── 3. POWER CONSUMPTION ─────────────────────────────────────────────
    this.powerConsumption = this._calculatePowerConsumption();
    report.powerConsumed = this.powerConsumption;

    // Net power change
    const netPower = this.solarGeneration - this.powerConsumption;
    this.power = clamp(this.power + netPower, 0, 100);

    // ── 4. OXYGEN ────────────────────────────────────────────────────────
    // Crew consumes oxygen constantly
    let o2Loss = BASE_RATES.oxygenConsumption * dr;

    // Life support generates oxygen — but needs power
    let o2Generation = 0;
    if (this.power >= 20) {
      // Full life support output: replaces most of what crew breathes
      o2Generation = BASE_RATES.oxygenConsumption * 0.85;
    } else if (this.power >= 5) {
      // Reduced life support — only partial O₂ generation
      o2Generation = BASE_RATES.oxygenConsumption * 0.4;
      report.warnings.push('Life support running on backup — oxygen generation reduced!');
    } else {
      // Life support barely functional
      o2Generation = BASE_RATES.oxygenConsumption * 0.1;
      report.criticals.push('CRITICAL: Life support nearly offline! Oxygen dropping fast!');
    }

    const netO2 = o2Generation - o2Loss + fluctuate(0.2);
    this.oxygen = clamp(this.oxygen + netO2, 0, 100);
    report.oxygenChange = netO2;

    // ── 5. WATER ─────────────────────────────────────────────────────────
    // Crew drinks water
    let waterLoss = BASE_RATES.waterConsumption * dr;

    // Greenhouse uses water
    waterLoss += GREENHOUSE_WATER_USE[this.greenhouseLevel] * dr;

    // Recycling recovers some water (needs power)
    let waterRecycled = 0;
    if (this.power >= 10) {
      waterRecycled = BASE_RATES.waterConsumption * BASE_RATES.waterRecyclingReturn;
    } else if (this.power >= 3) {
      waterRecycled = BASE_RATES.waterConsumption * BASE_RATES.waterRecyclingReturn * 0.5;
      report.warnings.push('Water recycler running at half capacity — low power.');
    }
    // No recycling if power < 3

    const netWater = waterRecycled - waterLoss + fluctuate(0.15);
    this.water = clamp(this.water + netWater, 0, 100);
    report.waterChange = netWater;

    // ── 6. FOOD ──────────────────────────────────────────────────────────
    let foodLoss = BASE_RATES.foodConsumption * dr;

    // Greenhouse produces food (needs water and power)
    let foodProduced = GREENHOUSE_FOOD_OUTPUT[this.greenhouseLevel];
    if (this.water < 30) {
      foodProduced *= 0.5; // wilting plants
      if (this.greenhouseLevel > 0) {
        report.warnings.push('Greenhouse crops wilting — not enough water!');
      }
    }
    if (this.power < 10 && this.greenhouseLevel > 0) {
      foodProduced *= 0.3; // no grow lights
      report.warnings.push('Greenhouse lights dimming — low power!');
    }

    const netFood = foodProduced - foodLoss + fluctuate(0.15);
    this.food = clamp(this.food + netFood, 0, 100);
    report.foodChange = netFood;

    // ── 7. RADIATION ─────────────────────────────────────────────────────
    let radIncrease = this.profile.baseRadiationRate;

    // Solar storm massively increases radiation
    if (this.solarStormActive) {
      radIncrease += 6;
    }

    // Shielding reduces radiation accumulation
    const shieldReduction = [1.0, 0.6, 0.3, 0.1]; // multiplier at each level
    radIncrease *= shieldReduction[this.shieldingLevel];

    // Difficulty modifier
    radIncrease *= dr;

    // Tiny random variation
    radIncrease += fluctuate(0.3);
    radIncrease = Math.max(0, radIncrease);

    this.radiationExposure = clamp(this.radiationExposure + radIncrease, 0, 100);
    report.radiationChange = radIncrease;

    // ── 8. CREW HEALTH — cascading effects ───────────────────────────────
    let healthDelta = 0;

    // Natural slow recovery when conditions are good
    if (this.oxygen > 60 && this.food > 40 && this.water > 40 && this.radiationExposure < 30) {
      healthDelta += 1; // slow healing
    }

    // Oxygen deprivation
    if (this.oxygen < 30) {
      healthDelta -= (30 - this.oxygen) * 0.15;
      report.criticals.push('WARNING: Low oxygen is affecting crew health!');
    }

    // Dehydration
    if (this.water < 25) {
      healthDelta -= (25 - this.water) * 0.12;
      report.criticals.push('WARNING: Water shortage — crew dehydrated!');
    }

    // Starvation
    if (this.food < 20) {
      healthDelta -= (20 - this.food) * 0.1;
      report.warnings.push('Crew is hungry — food supplies low!');
    }

    // Radiation sickness
    if (this.radiationExposure > 60) {
      healthDelta -= (this.radiationExposure - 60) * 0.08;
      report.criticals.push('WARNING: High radiation exposure damaging crew health!');
    }

    // Power failure affects temperature control
    if (this.power < 5) {
      healthDelta -= 3;
      report.criticals.push('CRITICAL: Habitat temperature regulation failing!');
    }

    healthDelta *= dr;
    this.crewHealth = clamp(this.crewHealth + healthDelta, 0, 100);
    report.healthChange = healthDelta;

    // ── 9. CREW MORALE ───────────────────────────────────────────────────
    let moraleDelta = 0;

    // Health affects morale
    if (this.crewHealth < 40) {
      moraleDelta -= 2;
    } else if (this.crewHealth > 80) {
      moraleDelta += 0.5;
    }

    // Food variety (having plenty of food boosts morale)
    if (this.food > 60) {
      moraleDelta += 0.5;
    } else if (this.food < 20) {
      moraleDelta -= 1.5;
    }

    // Research success boosts morale
    if (this.researchActive && this.power >= 10) {
      moraleDelta += 0.8;
    }

    // Overall dire situation tanks morale
    if (this.oxygen < 30 || this.water < 20 || this.power < 10) {
      moraleDelta -= 1;
    }

    // Small random component (life on a space station is unpredictable)
    moraleDelta += fluctuate(0.5);

    this.crewMorale = clamp(this.crewMorale + moraleDelta, 0, 50);
    report.moraleChange = moraleDelta;

    // ── 10. DUST ACCUMULATION (Moon) ─────────────────────────────────────
    if (this.profile.hasDustAccumulation) {
      // Lunar dust slowly coats solar panels
      this.solarDust = clamp(this.solarDust + 0.04 + fluctuate(0.02), 0, 1);
    }

    // ── 11. ACHIEVEMENT TRACKING ─────────────────────────────────────────
    if (this.oxygen < 50) {
      this.oxygenDroppedBelow50 = true;
    }
    if (this.power < 15) {
      this.powerDroppedBelow15 = true;
    }
    if (this.greenhouseLevel >= 2) {
      this.greenhouseHighDays++;
    }

    // ── 12. RESOURCE WARNINGS ────────────────────────────────────────────
    const wt = this.diff.warningThreshold;
    if (this.oxygen < wt && this.oxygen > 0) {
      report.warnings.push(`Oxygen at ${Math.round(this.oxygen)}% — getting low!`);
    }
    if (this.water < wt && this.water > 0) {
      report.warnings.push(`Water at ${Math.round(this.water)}% — conserve water!`);
    }
    if (this.food < wt && this.food > 0) {
      report.warnings.push(`Food at ${Math.round(this.food)}% — rations running low!`);
    }
    if (this.power < wt && this.power > 0) {
      report.warnings.push(`Power at ${Math.round(this.power)}% — reduce power usage!`);
    }

    // ── 13. CREW DEATH CHECK ─────────────────────────────────────────────
    if (this.crewHealth <= 0) {
      this.crewAlive = false;
      this.missionComplete = true;
      report.criticals.push('MISSION FAILED: Crew health has reached zero. Emergency evacuation initiated.');
    }
    if (this.oxygen <= 0 && this.power <= 0) {
      this.crewAlive = false;
      this.missionComplete = true;
      report.criticals.push('MISSION FAILED: Complete life support failure. Emergency evacuation initiated.');
    }

    return report;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  ADVANCE DAY — Main public method to progress the simulation
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Advance the simulation by one full game-day. Processes resources,
   * triggers events, and returns a comprehensive day report.
   *
   * @returns {object} Day report with resource changes, events, and status
   */
  advanceDay() {
    if (this.missionComplete) {
      return {
        day: this.currentDay,
        missionComplete: true,
        crewAlive: this.crewAlive,
        message: 'The mission has already ended.',
      };
    }

    this.currentDay++;

    // Process resource changes
    const resourceReport = this._tickResources();

    // Get events for this day from the event system
    let dayEvents = [];
    if (window.EventSystem) {
      dayEvents = window.EventSystem.getEventsForDay(
        this.missionType,
        this.currentDay,
        this
      );
      // Mark events as triggered
      dayEvents.forEach(evt => {
        if (!this.eventsTriggered.includes(evt.id)) {
          this.eventsTriggered.push(evt.id);
        }
      });
      // Add to pending (player needs to make decisions)
      this.pendingEvents.push(...dayEvents);
    }

    // Check for mission completion
    if (this.currentDay >= this.totalDays && !this.missionComplete) {
      this.missionComplete = true;
    }

    // Snapshot for daily log
    const snapshot = this._takeSnapshot();
    snapshot.resourceReport = resourceReport;
    snapshot.events = dayEvents.map(e => ({
      id: e.id,
      title: e.title,
      type: e.type,
    }));
    this.dailyLog.push(snapshot);

    // Build the day report
    return {
      day: this.currentDay,
      isDaytime: this.isDaytime,
      phaseLabel: this.isDaytime ? '☀️ Daytime' : '🌙 Nighttime',
      resources: this.getResourceStatus(),
      resourceReport: resourceReport,
      events: dayEvents,
      pendingDecisions: this.pendingEvents.length,
      missionComplete: this.missionComplete,
      crewAlive: this.crewAlive,
      missionProgress: Math.round((this.currentDay / this.totalDays) * 100),
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  MAKE DECISION — Process a player's choice for an event
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Process a player's decision for a triggered event.
   *
   * @param {string} eventId - The ID of the event being decided
   * @param {number} choiceIndex - Index of the chosen option (0-based)
   * @returns {object|null} Result of the decision, or null if event not found
   */
  makeDecision(eventId, choiceIndex) {
    // Find the pending event
    const eventIndex = this.pendingEvents.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      console.warn(`Event "${eventId}" not found in pending events.`);
      return null;
    }

    const event = this.pendingEvents[eventIndex];
    const choice = event.choices[choiceIndex];
    if (!choice) {
      console.warn(`Choice index ${choiceIndex} out of range for event "${eventId}".`);
      return null;
    }

    // Apply consequences
    const consequences = choice.consequences || {};
    const applied = {};

    for (const [key, value] of Object.entries(consequences)) {
      switch (key) {
        case 'oxygen':
          this.oxygen = clamp(this.oxygen + value, 0, 100);
          applied.oxygen = value;
          break;
        case 'water':
          this.water = clamp(this.water + value, 0, 100);
          applied.water = value;
          break;
        case 'food':
          this.food = clamp(this.food + value, 0, 100);
          applied.food = value;
          break;
        case 'power':
          this.power = clamp(this.power + value, 0, 100);
          applied.power = value;
          break;
        case 'radiationExposure':
          this.radiationExposure = clamp(this.radiationExposure + value, 0, 100);
          applied.radiationExposure = value;
          break;
        case 'crewHealth':
          this.crewHealth = clamp(this.crewHealth + value, 0, 100);
          applied.crewHealth = value;
          break;
        case 'crewMorale':
          this.crewMorale = clamp(this.crewMorale + value, 0, 50);
          applied.crewMorale = value;
          break;
        case 'researchPoints':
          this.researchPoints = Math.max(0, this.researchPoints + value);
          applied.researchPoints = value;
          break;
        case 'shieldingLevel':
          this.shieldingLevel = clamp(value, 0, 3);
          applied.shieldingLevel = value;
          break;
        case 'greenhouseLevel':
          this.greenhouseLevel = clamp(value, 0, 3);
          applied.greenhouseLevel = value;
          break;
        case 'researchActive':
          this.researchActive = !!value;
          applied.researchActive = value;
          break;
        case 'solarDust':
          this.solarDust = clamp(this.solarDust + value, 0, 1);
          applied.solarDust = value;
          break;
        case 'dustStormActive':
          this.dustStormActive = !!value;
          applied.dustStormActive = value;
          break;
        case 'dustStormSeverity':
          this.dustStormSeverity = clamp(value, 0, 1);
          applied.dustStormSeverity = value;
          break;
        case 'solarStormActive':
          this.solarStormActive = !!value;
          applied.solarStormActive = value;
          break;
        case 'messagesSentToEarth':
          this.messagesSentToEarth += value;
          this.power = clamp(this.power - POWER_COSTS.communicationPerMsg * value, 0, 100);
          applied.messagesSentToEarth = value;
          break;
        default:
          console.warn(`Unknown consequence key: "${key}"`);
      }
    }

    // Log the decision
    this.decisionLog.push({
      eventId: eventId,
      choiceIndex: choiceIndex,
      choiceLabel: choice.label,
      day: this.currentDay,
      consequences: applied,
    });

    // Remove from pending
    this.pendingEvents.splice(eventIndex, 1);

    // Return outcome info
    return {
      eventId: eventId,
      eventTitle: event.title,
      choiceLabel: choice.label,
      outcomeText: choice.outcomeText,
      consequences: applied,
      scienceFact: event.scienceFact || null,
      updatedResources: this.getResourceStatus(),
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  PLAYER ACTIONS — Change system settings between events
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Set the greenhouse level (0-3).
   * @param {number} level
   */
  setGreenhouseLevel(level) {
    this.greenhouseLevel = clamp(Math.floor(level), 0, 3);
  }

  /**
   * Set the shielding level (0-3).
   * @param {number} level
   */
  setShieldingLevel(level) {
    this.shieldingLevel = clamp(Math.floor(level), 0, 3);
  }

  /**
   * Toggle research lab on/off.
   * @param {boolean} active
   */
  setResearchActive(active) {
    this.researchActive = !!active;
  }

  /**
   * Send a message to Earth (costs power).
   * @param {string} content - Message text
   * @returns {object} Confirmation with estimated reply time
   */
  sendMessageToEarth(content) {
    const cost = POWER_COSTS.communicationPerMsg;
    if (this.power < cost) {
      return {
        success: false,
        reason: 'Not enough power to transmit.',
      };
    }

    this.power = clamp(this.power - cost, 0, 100);
    this.messagesSentToEarth++;

    const msg = {
      day: this.currentDay,
      direction: 'outgoing',
      content: content,
      delay: this.profile.commDelayText,
    };
    this.communicationQueue.push(msg);

    // Morale boost from communicating with Earth
    this.crewMorale = clamp(this.crewMorale + 1.5, 0, 50);

    return {
      success: true,
      powerUsed: cost,
      delay: this.profile.commDelayText,
      message: msg,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  RESOURCE STATUS — Snapshot of all current values
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Get a complete snapshot of all current resource values, formatted
   * with labels and danger thresholds for the UI.
   *
   * @returns {object} All resource values and status indicators
   */
  getResourceStatus() {
    const wt = this.diff.warningThreshold;

    /**
     * Helper to classify a 0-100 resource as 'critical', 'warning', 'ok', or 'good'.
     * @param {number} value
     * @returns {string}
     */
    const status = (value) => {
      if (value <= 10) return 'critical';
      if (value <= wt) return 'warning';
      if (value <= 60) return 'ok';
      return 'good';
    };

    return {
      // Primary resources
      oxygen: { value: Math.round(this.oxygen * 10) / 10, max: 100, status: status(this.oxygen), label: 'Oxygen' },
      water: { value: Math.round(this.water * 10) / 10, max: 100, status: status(this.water), label: 'Water' },
      food: { value: Math.round(this.food * 10) / 10, max: 100, status: status(this.food), label: 'Food' },
      power: { value: Math.round(this.power * 10) / 10, max: 100, status: status(this.power), label: 'Power' },

      // Power details
      solarGeneration: { value: Math.round(this.solarGeneration * 10) / 10, label: 'Solar Generation' },
      powerConsumption: { value: Math.round(this.powerConsumption * 10) / 10, label: 'Power Usage' },

      // Radiation
      radiationExposure: {
        value: Math.round(this.radiationExposure * 10) / 10,
        max: 100,
        status: this.radiationExposure > 60 ? 'critical' : this.radiationExposure > 40 ? 'warning' : 'ok',
        label: 'Radiation',
      },
      shieldingLevel: { value: this.shieldingLevel, max: 3, label: 'Shielding' },

      // Greenhouse
      greenhouseLevel: { value: this.greenhouseLevel, max: 3, label: 'Greenhouse' },

      // Crew
      crewHealth: {
        value: Math.round(this.crewHealth * 10) / 10,
        max: 100,
        status: status(this.crewHealth),
        label: 'Crew Health',
      },
      crewMorale: {
        value: Math.round(this.crewMorale * 10) / 10,
        max: 50,
        status: this.crewMorale < 15 ? 'critical' : this.crewMorale < 25 ? 'warning' : 'good',
        label: 'Crew Morale',
      },

      // Science & Comms
      researchPoints: { value: this.researchPoints, label: 'Research Points' },
      researchActive: { value: this.researchActive, label: 'Research Lab' },
      messagesSent: { value: this.messagesSentToEarth, label: 'Messages to Earth' },

      // Environment
      isDaytime: this.isDaytime,
      solarDust: this.profile.hasDustAccumulation ? Math.round(this.solarDust * 100) : 0,
      dustStormActive: this.dustStormActive,
      solarStormActive: this.solarStormActive,

      // Mission progress
      currentDay: this.currentDay,
      totalDays: this.totalDays,
      missionType: this.missionType,
      difficulty: this.difficulty,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  SCORING
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Calculate the end-of-mission score (0-100).
   * Delegated to the MissionScoring module if available, otherwise
   * uses a built-in basic calculation.
   *
   * @returns {object} Score breakdown
   */
  calculateScore() {
    if (window.MissionScoring) {
      return window.MissionScoring.calculateScore(this);
    }

    // Fallback basic scoring
    let score = 0;

    // Crew Survival (30 pts)
    score += (this.crewHealth / 100) * 30;

    // Resource Management (25 pts)
    const avgResources = (this.oxygen + this.water + this.food + this.power) / 4;
    score += (avgResources / 100) * 25;

    // Science (20 pts)
    score += Math.min(this.researchPoints / 20, 1) * 20;

    // Decision Quality (15 pts) — based on having balanced resources
    const resourceSpread = Math.max(this.oxygen, this.water, this.food, this.power) -
                           Math.min(this.oxygen, this.water, this.food, this.power);
    const balanceScore = Math.max(0, 1 - resourceSpread / 60);
    score += balanceScore * 15;

    // Mission Completion (10 pts)
    if (this.currentDay >= this.totalDays && this.crewAlive) {
      score += 10;
    } else {
      score += (this.currentDay / this.totalDays) * 5;
    }

    return {
      total: Math.round(score),
      breakdown: {
        crewSurvival: Math.round((this.crewHealth / 100) * 30),
        resourceManagement: Math.round((avgResources / 100) * 25),
        scientificAchievement: Math.round(Math.min(this.researchPoints / 20, 1) * 20),
        decisionQuality: Math.round(balanceScore * 15),
        missionCompletion: this.currentDay >= this.totalDays && this.crewAlive ? 10 : Math.round((this.currentDay / this.totalDays) * 5),
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  SNAPSHOT & HISTORY
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Take a snapshot of current resource levels for the daily log.
   * @returns {object}
   */
  _takeSnapshot() {
    return {
      day: this.currentDay,
      oxygen: Math.round(this.oxygen * 10) / 10,
      water: Math.round(this.water * 10) / 10,
      food: Math.round(this.food * 10) / 10,
      power: Math.round(this.power * 10) / 10,
      crewHealth: Math.round(this.crewHealth * 10) / 10,
      crewMorale: Math.round(this.crewMorale * 10) / 10,
      radiationExposure: Math.round(this.radiationExposure * 10) / 10,
      researchPoints: this.researchPoints,
      shieldingLevel: this.shieldingLevel,
      greenhouseLevel: this.greenhouseLevel,
      isDaytime: this.isDaytime,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  SERIALIZATION — Save/Load to localStorage
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Serialize the entire game state to a JSON-compatible object.
   * @returns {object} Serialized state
   */
  serialize() {
    return {
      version: 1,
      missionType: this.missionType,
      difficulty: this.difficulty,
      currentDay: this.currentDay,
      totalDays: this.totalDays,
      missionComplete: this.missionComplete,
      crewAlive: this.crewAlive,
      oxygen: this.oxygen,
      water: this.water,
      food: this.food,
      power: this.power,
      solarGeneration: this.solarGeneration,
      powerConsumption: this.powerConsumption,
      radiationExposure: this.radiationExposure,
      shieldingLevel: this.shieldingLevel,
      greenhouseLevel: this.greenhouseLevel,
      crewHealth: this.crewHealth,
      crewMorale: this.crewMorale,
      researchPoints: this.researchPoints,
      researchActive: this.researchActive,
      messagesSentToEarth: this.messagesSentToEarth,
      communicationQueue: this.communicationQueue,
      isDaytime: this.isDaytime,
      solarDust: this.solarDust,
      dustStormActive: this.dustStormActive,
      dustStormSeverity: this.dustStormSeverity,
      solarStormActive: this.solarStormActive,
      eventsTriggered: this.eventsTriggered,
      decisionLog: this.decisionLog,
      pendingEvents: this.pendingEvents,
      dailyLog: this.dailyLog,
      oxygenDroppedBelow50: this.oxygenDroppedBelow50,
      powerDroppedBelow15: this.powerDroppedBelow15,
      greenhouseHighDays: this.greenhouseHighDays,
    };
  }

  /**
   * Restore a game state from a serialized object.
   * @param {object} data - Previously serialized state
   * @returns {GameState} A fully restored GameState instance
   */
  static deserialize(data) {
    const game = new GameState(data.missionType, data.difficulty);

    // Restore every tracked property
    game.currentDay = data.currentDay;
    game.totalDays = data.totalDays;
    game.missionComplete = data.missionComplete;
    game.crewAlive = data.crewAlive;
    game.oxygen = data.oxygen;
    game.water = data.water;
    game.food = data.food;
    game.power = data.power;
    game.solarGeneration = data.solarGeneration;
    game.powerConsumption = data.powerConsumption;
    game.radiationExposure = data.radiationExposure;
    game.shieldingLevel = data.shieldingLevel;
    game.greenhouseLevel = data.greenhouseLevel;
    game.crewHealth = data.crewHealth;
    game.crewMorale = data.crewMorale;
    game.researchPoints = data.researchPoints;
    game.researchActive = data.researchActive;
    game.messagesSentToEarth = data.messagesSentToEarth;
    game.communicationQueue = data.communicationQueue || [];
    game.isDaytime = data.isDaytime;
    game.solarDust = data.solarDust;
    game.dustStormActive = data.dustStormActive;
    game.dustStormSeverity = data.dustStormSeverity;
    game.solarStormActive = data.solarStormActive;
    game.eventsTriggered = data.eventsTriggered || [];
    game.decisionLog = data.decisionLog || [];
    game.pendingEvents = data.pendingEvents || [];
    game.dailyLog = data.dailyLog || [];
    game.oxygenDroppedBelow50 = data.oxygenDroppedBelow50 || false;
    game.powerDroppedBelow15 = data.powerDroppedBelow15 || false;
    game.greenhouseHighDays = data.greenhouseHighDays || 0;

    return game;
  }

  /**
   * Save the current game to localStorage.
   * @param {string} [slotName='autosave'] - Save slot name
   */
  save(slotName = 'autosave') {
    try {
      const key = `orbital_frontier_save_${slotName}`;
      localStorage.setItem(key, JSON.stringify(this.serialize()));
      return true;
    } catch (e) {
      console.error('Failed to save game:', e);
      return false;
    }
  }

  /**
   * Load a game from localStorage.
   * @param {string} [slotName='autosave'] - Save slot name
   * @returns {GameState|null} Restored game state, or null if no save found
   */
  static load(slotName = 'autosave') {
    try {
      const key = `orbital_frontier_save_${slotName}`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return GameState.deserialize(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to load game:', e);
      return null;
    }
  }
}

// ── Export to window (no build tools) ──────────────────────────────────────
window.GameState = GameState;
window.DIFFICULTY = DIFFICULTY;
window.MISSION_PROFILES = MISSION_PROFILES;
window.POWER_COSTS = POWER_COSTS;
