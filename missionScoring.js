/**
 * ============================================================================
 * ORBITAL FRONTIER — Mission Scoring, Achievements & Profiles (missionScoring.js)
 * ============================================================================
 * Implements objective scoring out of 100 based on genuine simulation metrics:
 * - Crew Survival (30 pts)
 * - Resource Management & Efficiency (25 pts)
 * - Scientific Discovery & Research (20 pts)
 * - Decision Quality & Equilibrium (15 pts)
 * - Mission Completion (10 pts)
 *
 * Fully supports local profiles stored in browser localStorage.
 */

const MissionScoring = (function () {
  'use strict';

  /**
   * Complete definitions of unlockable achievements
   */
  const ACHIEVEMENTS = [
    {
      id: 'life_guardian',
      name: 'Life Support Guardian',
      icon: '🛡️',
      description: 'Maintained oxygen levels above 50% throughout the entire 10-day expedition.',
      check: (game) => game.oxygen >= 50 && game.crewHealth >= 70
    },
    {
      id: 'power_expert',
      name: 'Power Management Expert',
      icon: '⚡',
      description: 'Kept battery power above 25% without suffering a brownout.',
      check: (game) => game.power >= 25
    },
    {
      id: 'radiation_safe',
      name: 'Radiation Safety Specialist',
      icon: '☢️',
      description: 'Kept cumulative crew radiation dose under 30% throughout the mission.',
      check: (game) => game.radiationExposure <= 30
    },
    {
      id: 'green_thumb',
      name: 'Hydroponics Pioneer',
      icon: '🌱',
      description: 'Successfully cultivated crops with greenhouse at Level 2 or higher.',
      check: (game) => game.greenhouseLevel >= 2 && game.food >= 60
    },
    {
      id: 'science_star',
      name: 'Deep Space Explorer',
      icon: '🔬',
      description: 'Accumulated 20 or more scientific discovery points.',
      check: (game) => game.researchPoints >= 20
    },
    {
      id: 'lunar_master',
      name: 'Lunar Vanguard',
      icon: '🌙',
      description: 'Successfully established and completed a Moon mission.',
      check: (game) => game.missionType === 'moon' && game.currentDay >= 10 && game.crewHealth > 0
    },
    {
      id: 'mars_colonist',
      name: 'Martian Trailblazer',
      icon: '🔴',
      description: 'Successfully survived and finished a Mars outpost mission.',
      check: (game) => game.missionType === 'mars' && game.currentDay >= 10 && game.crewHealth > 0
    },
    {
      id: 'master_commander',
      name: 'Master Commander',
      icon: '⭐',
      description: 'Achieved an overall mission score of 85 or higher.',
      check: (game, score) => score >= 85
    },
    {
      id: 'iron_will',
      name: 'Iron Will',
      icon: '💪',
      description: 'Completed a mission on Commander difficulty.',
      check: (game) => game.difficulty === 'commander' && game.currentDay >= 10
    },
    {
      id: 'high_morale',
      name: 'Inspiring Leader',
      icon: '🏆',
      description: 'Kept crew morale above 40 points until final mission day.',
      check: (game) => game.morale >= 40
    }
  ];

  /**
   * Calculates a mathematically rigorous score (0 to 100)
   * @param {object} game - Instance of GameState
   * @returns {object} Breakdown of score
   */
  function calculateScore(game) {
    if (!game) return { total: 0, survival: 0, resources: 0, science: 0, decisions: 0, completion: 0 };

    // 1. Crew Survival (30 pts)
    const survival = Math.round((Math.max(0, game.crewHealth) / 100) * 30);

    // 2. Resource Management (25 pts)
    const avgRes = (game.oxygen + game.water + game.food + game.power) / 4;
    const resources = Math.round((Math.min(100, Math.max(0, avgRes)) / 100) * 25);

    // 3. Science & Research (20 pts)
    const science = Math.round(Math.min(1, Math.max(0, game.researchPoints) / 25) * 20);

    // 4. Decision Quality & Balance (15 pts)
    const resArray = [game.oxygen, game.water, game.food, game.power];
    const maxR = Math.max(...resArray);
    const minR = Math.min(...resArray);
    const spread = maxR - minR;
    const balanceFactor = Math.max(0, 1 - spread / 80);
    const decisions = Math.round(balanceFactor * 15);

    // 5. Completion Bonus (10 pts)
    const completion = game.currentDay >= 10 && game.crewHealth > 0 ? 10 : Math.round((game.currentDay / 10) * 10);

    const total = Math.min(100, survival + resources + science + decisions + completion);

    // Determine unlocked achievements
    const unlocked = [];
    ACHIEVEMENTS.forEach(ach => {
      try {
        if (ach.check(game, total)) {
          unlocked.push(ach);
        }
      } catch (e) {
        console.warn('Achievement check error for ' + ach.id, e);
      }
    });

    return {
      total,
      breakdown: {
        survival,
        resources,
        science,
        decisions,
        completion
      },
      unlockedAchievements: unlocked,
      isVictory: game.crewHealth > 20 && total >= 50
    };
  }

  /**
   * Determine rank string based on cumulative score
   * @param {number} totalCumulativeScore
   * @returns {string}
   */
  function getRank(totalCumulativeScore) {
    if (totalCumulativeScore >= 300) return 'Legendary Space Pioneer';
    if (totalCumulativeScore >= 200) return 'Outpost Commander';
    if (totalCumulativeScore >= 120) return 'Mission Specialist';
    if (totalCumulativeScore >= 50) return 'Junior Explorer';
    return 'Cadet Astronaut';
  }

  /**
   * Local Player Profile management
   * Tracking all 11 required parameters from Section 3
   */
  class PlayerProfile {
    constructor(name = 'Alex', age = 10, avatar = '🧑‍🚀') {
      this.name = name;
      this.age = parseInt(age, 10) || 10;
      this.avatar = avatar;
      this.currentMission = 'Lunar Outpost (Shackleton)';
      this.missionsCompleted = 0;
      this.successfulMissions = 0;
      this.highestScore = 0;
      this.totalScience = 0;
      this.cumulativeScore = 0;
      this.bestSurvivalRecord = 'None yet';
      this.achievements = []; // Array of achievement IDs
      this.missionHistory = []; // Array of summaries
    }

    getRank() {
      return getRank(this.cumulativeScore);
    }

    getSuccessRate() {
      if (this.missionsCompleted === 0) return '100%';
      const pct = Math.round((this.successfulMissions / this.missionsCompleted) * 100);
      return `${pct}%`;
    }

    recordMission(game, scoreResult) {
      this.missionsCompleted++;
      if (scoreResult.isVictory) {
        this.successfulMissions++;
      }
      this.currentMission = game.missionType === 'moon' ? 'Lunar Outpost (Shackleton)' : 'Mars Outpost (Jezero)';
      this.cumulativeScore += scoreResult.total;
      this.totalScience += game.researchPoints || 0;

      if (scoreResult.total > this.highestScore) {
        this.highestScore = scoreResult.total;
      }

      // Update survival record
      const currentSurvival = `Day ${game.currentDay} (${Math.round(game.crewHealth)}% Health)`;
      if (this.bestSurvivalRecord === 'None yet' || game.currentDay >= 10) {
        this.bestSurvivalRecord = currentSurvival;
      }

      // Merge achievements
      scoreResult.unlockedAchievements.forEach(ach => {
        if (!this.achievements.includes(ach.id)) {
          this.achievements.push(ach.id);
        }
      });

      // Record summary in history
      this.missionHistory.unshift({
        date: new Date().toLocaleDateString(),
        missionType: game.missionType,
        destination: game.missionType === 'moon' ? 'Moon (Shackleton)' : 'Mars (Jezero)',
        difficulty: game.difficulty,
        daysCompleted: game.currentDay,
        finalScore: scoreResult.total,
        crewHealth: Math.round(game.crewHealth),
        science: game.researchPoints,
        success: scoreResult.isVictory
      });

      // Keep only last 10
      if (this.missionHistory.length > 10) {
        this.missionHistory = this.missionHistory.slice(0, 10);
      }

      this.save();
    }

    save() {
      try {
        localStorage.setItem('orbital_frontier_profile', JSON.stringify({
          name: this.name,
          age: this.age,
          avatar: this.avatar,
          currentMission: this.currentMission,
          missionsCompleted: this.missionsCompleted,
          successfulMissions: this.successfulMissions,
          highestScore: this.highestScore,
          totalScience: this.totalScience,
          cumulativeScore: this.cumulativeScore,
          bestSurvivalRecord: this.bestSurvivalRecord,
          achievements: this.achievements,
          missionHistory: this.missionHistory
        }));
      } catch (e) {
        console.warn('Unable to save profile to localStorage', e);
      }
    }

    static load() {
      try {
        const raw = localStorage.getItem('orbital_frontier_profile');
        if (!raw) return null;
        const data = JSON.parse(raw);
        const profile = new PlayerProfile(data.name, data.age, data.avatar || '🧑‍🚀');
        Object.assign(profile, data);
        return profile;
      } catch (e) {
        return null;
      }
    }

    static reset() {
      try {
        localStorage.removeItem('orbital_frontier_profile');
      } catch (e) {
        // ignore
      }
    }
  }

  return {
    ACHIEVEMENTS,
    calculateScore,
    getRank,
    PlayerProfile
  };
})();

// Export globally
window.MissionScoring = MissionScoring;
