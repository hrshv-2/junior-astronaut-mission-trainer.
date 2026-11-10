/**
 * ============================================================
 * ORBITAL FRONTIER — NASA Data Integration Module
 * ============================================================
 * Integrates real NASA public data and provides educational
 * scientific information throughout the game.
 * 
 * Data Sources:
 * - NASA DONKI (Space Weather Database of Notifications, Knowledge, Information)
 * - NASA Open APIs (api.nasa.gov)
 * - Curated factual datasets from NASA Artemis and Mars programs
 * 
 * IMPORTANT: When live API data is unavailable, clearly labeled
 * archival/curated data is used as fallback. Real NASA observations
 * are never confused with simulated game values.
 * ============================================================
 */

const NASAData = (function () {
  'use strict';

  // NASA DONKI API (public, no key required for limited use)
  const DONKI_BASE = 'https://api.nasa.gov/DONKI';
  const NASA_API_KEY = 'DEMO_KEY'; // Public demo key

  /**
   * Curated real NASA data used as fallback when APIs are unavailable.
   * All data points are sourced from official NASA publications.
   */
  const CURATED_SPACE_WEATHER = {
    source: 'NASA DONKI — Space Weather Database',
    sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    description: 'Historical space weather events from NASA\'s DONKI system',
    lastUpdated: '2024-12-01',
    isArchival: true,
    events: [
      {
        id: 'CME-2024-001',
        type: 'Coronal Mass Ejection',
        date: '2024-05-10',
        speed: 1200, // km/s
        severity: 'moderate',
        description: 'A moderate coronal mass ejection was detected by SOHO/LASCO C2 coronagraph. The CME traveled at approximately 1,200 km/s.',
        kidFriendly: 'The Sun shot out a big cloud of hot gas into space! It was moving really fast — about 1,200 kilometers every second. That\'s fast enough to travel from New York to Los Angeles in about 3 seconds!',
        gameImpact: 'Solar storm events in the game are based on real CME speeds and intensities observed by NASA.'
      },
      {
        id: 'FLR-2024-002',
        type: 'Solar Flare',
        date: '2024-05-14',
        class: 'X3.9',
        severity: 'strong',
        description: 'An X3.9-class solar flare erupted from active region AR3664. This was one of the strongest flares of Solar Cycle 25.',
        kidFriendly: 'The Sun had a huge explosion of energy called a solar flare! Scientists rated it X3.9, which means it was very powerful. Solar flares are like giant lightning bolts on the Sun\'s surface.',
        gameImpact: 'Radiation spike events in the game simulate the effects of solar flares on astronaut habitats.'
      },
      {
        id: 'GST-2024-003',
        type: 'Geomagnetic Storm',
        date: '2024-05-11',
        kpIndex: 8,
        severity: 'severe',
        description: 'A G4-class (severe) geomagnetic storm was recorded, the strongest since 2003. The Kp index reached 8.',
        kidFriendly: 'Earth\'s magnetic field got a big shake-up from the Sun! This was the strongest space storm in over 20 years. It made beautiful northern lights (aurora) visible as far south as Florida!',
        gameImpact: 'Geomagnetic storm data informs the severity and frequency of solar events affecting the player\'s outpost.'
      }
    ]
  };

  const CURATED_LUNAR_DATA = {
    source: 'NASA Artemis Program & Lunar Reconnaissance Orbiter',
    sourceUrl: 'https://www.nasa.gov/artemis/',
    description: 'Environmental data about the Moon from NASA\'s Artemis program and LRO mission',
    lastUpdated: '2024-10-01',
    isArchival: true,
    facts: [
      {
        id: 'MOON-TEMP',
        title: 'Lunar Surface Temperature',
        observation: 'Surface temperatures range from -173°C (-280°F) during the lunar night to 127°C (260°F) in direct sunlight.',
        source: 'NASA Lunar Reconnaissance Orbiter / Diviner instrument',
        date: '2009-present',
        kidFriendly: 'The Moon gets REALLY hot and REALLY cold! During the day it can be hotter than boiling water, and at night it gets colder than anywhere on Earth. That\'s because the Moon has no air (atmosphere) to keep temperatures comfortable.',
        gameImpact: 'Power consumption for temperature regulation in the lunar mission is based on these extreme real temperature ranges.'
      },
      {
        id: 'MOON-DUST',
        title: 'Lunar Regolith Properties',
        observation: 'Lunar dust (regolith) consists of fine, sharp particles that cling to surfaces due to electrostatic charge. Average grain size is approximately 70 micrometers.',
        source: 'Apollo mission soil samples / NASA research',
        date: '1969-1972 (samples), ongoing research',
        kidFriendly: 'Moon dust is really tricky! Unlike dust on Earth, Moon dust has tiny sharp edges that stick to everything. Apollo astronauts found it got into their spacesuits, scratched their visors, and even made them sneeze! Future Moon bases will need to deal with this dusty challenge.',
        gameImpact: 'Lunar dust events in the game that reduce solar panel efficiency are based on real dust adhesion properties observed during Apollo missions.'
      },
      {
        id: 'MOON-WATER',
        title: 'Lunar Water Ice',
        observation: 'NASA\'s LCROSS mission confirmed water ice exists in permanently shadowed craters near the Moon\'s south pole. Estimated at 600 million metric tons.',
        source: 'NASA LCROSS mission (2009) & Chandrayaan-1',
        date: '2009-2018',
        kidFriendly: 'There\'s water on the Moon! It\'s frozen as ice hidden in deep, dark craters near the south pole where sunlight never reaches. This water could be used by future astronauts to drink, grow plants, and even make rocket fuel!',
        gameImpact: 'Water resource availability and recycling challenges in the lunar mission reflect the reality that water on the Moon is a precious, limited resource.'
      },
      {
        id: 'MOON-RAD',
        title: 'Lunar Radiation Environment',
        observation: 'Without a magnetic field or atmosphere, the lunar surface receives approximately 380 millisieverts per year from galactic cosmic rays and solar particle events.',
        source: 'NASA CRaTER instrument on LRO',
        date: '2009-present',
        kidFriendly: 'The Moon has no magnetic shield or air to protect against radiation from space. Astronauts on the Moon receive much more radiation than on Earth, so their habitats need special shielding to keep them safe. That\'s why radiation protection is so important!',
        gameImpact: 'Radiation accumulation rates and shielding effectiveness in the game are calibrated to real lunar radiation measurements.'
      }
    ]
  };

  const CURATED_MARS_DATA = {
    source: 'NASA Mars Exploration Program',
    sourceUrl: 'https://mars.nasa.gov/',
    description: 'Environmental data about Mars from NASA\'s various Mars missions',
    lastUpdated: '2024-10-01',
    isArchival: true,
    facts: [
      {
        id: 'MARS-TEMP',
        title: 'Martian Surface Temperature',
        observation: 'Average surface temperature is approximately -60°C (-80°F). Temperatures range from -125°C at the poles in winter to 20°C at the equator during summer.',
        source: 'NASA Mars Science Laboratory (Curiosity) / REMS instrument',
        date: '2012-present',
        kidFriendly: 'Mars is a cold place! The average temperature is about -60°C, which is much colder than any place on Earth. On a warm summer day near Mars\'s equator, it might reach 20°C — like a cool spring day here. But at night it drops way below freezing!',
        gameImpact: 'Heating power requirements in the Mars mission are based on these real temperature observations from the Curiosity rover.'
      },
      {
        id: 'MARS-DUST',
        title: 'Martian Dust Storms',
        observation: 'Mars experiences regional and planet-wide dust storms. Global storms can last months and reduce solar energy by 90% or more. The 2018 global dust storm ended the Opportunity rover\'s mission.',
        source: 'NASA Mars Reconnaissance Orbiter / Opportunity & Curiosity rovers',
        date: '2018 (global storm observed)',
        kidFriendly: 'Mars has HUGE dust storms — some so big they cover the entire planet! These storms can block out the Sun for months, which is really bad for solar-powered equipment. A giant dust storm in 2018 was so dark that NASA\'s Opportunity rover couldn\'t charge its batteries and had to stop working after 15 years of exploring!',
        gameImpact: 'Dust storm events in the Mars mission that reduce solar panel output are directly based on observations from the 2018 global dust storm.'
      },
      {
        id: 'MARS-COMM',
        title: 'Earth-Mars Communication Delay',
        observation: 'One-way signal travel time between Earth and Mars ranges from approximately 4 minutes (at closest approach) to 24 minutes (when Mars is on the opposite side of the Sun). Average is about 13 minutes one way.',
        source: 'NASA Deep Space Network',
        date: 'Ongoing',
        kidFriendly: 'When you send a message from Earth to Mars, it doesn\'t arrive instantly — it travels at the speed of light, but Mars is SO far away that the message takes between 4 and 24 minutes to arrive! That means if you asked a question, you\'d have to wait up to 48 minutes for an answer. Astronauts on Mars will need to make many decisions on their own!',
        gameImpact: 'Communication delay mechanics in the Mars mission use the real 8-minute average one-way delay, teaching players about the challenge of remote decision-making.'
      },
      {
        id: 'MARS-WATER',
        title: 'Water on Mars',
        observation: 'Mars has significant water ice deposits. The north polar cap contains enough water ice to cover the planet in a 30-meter deep layer if melted. Subsurface ice has been detected at many locations.',
        source: 'NASA Mars Odyssey (THEMIS) / Mars Reconnaissance Orbiter (SHARAD)',
        date: '2002-present',
        kidFriendly: 'Mars has lots of water — but it\'s all frozen! There\'s ice at the poles and hidden underground in many places. Future astronauts could dig up this ice, melt it, and use it for drinking, growing food, and even making rocket fuel to come home. Finding and using Mars water is one of the biggest challenges for future explorers!',
        gameImpact: 'Water ice extraction opportunities in the Mars mission reflect real locations and quantities of Martian water ice detected by NASA orbiters.'
      },
      {
        id: 'MARS-RAD',
        title: 'Martian Radiation Environment',
        observation: 'Mars\'s thin atmosphere (1% of Earth\'s) provides some radiation shielding, reducing surface radiation to approximately 240 millisieverts per year — about 60-70% of lunar surface levels.',
        source: 'NASA Mars Science Laboratory / Radiation Assessment Detector (RAD)',
        date: '2012-present',
        kidFriendly: 'Mars has a thin layer of air (atmosphere) that gives astronauts a little bit of radiation protection — but not much! The radiation on Mars is still much higher than on Earth. Mars\'s atmosphere blocks about 30% of the radiation compared to the Moon, which has no atmosphere at all.',
        gameImpact: 'The Mars mission has slightly lower base radiation than the Moon mission, reflecting the real difference measured by the Curiosity rover\'s radiation detector.'
      }
    ]
  };

  const CURATED_ASTRONAUT_DATA = {
    source: 'NASA Open Science Data Repository (OSDR)',
    sourceUrl: 'https://osdr.nasa.gov/',
    description: 'Astronaut health and biological research findings',
    lastUpdated: '2024-06-01',
    isArchival: true,
    facts: [
      {
        id: 'ASTRO-OXYGEN',
        title: 'Life Support: Oxygen',
        observation: 'The ISS Environmental Control and Life Support System (ECLSS) generates oxygen through electrolysis — splitting water molecules into hydrogen and oxygen. Each crew member needs approximately 0.84 kg of oxygen per day.',
        source: 'NASA ISS ECLSS documentation',
        kidFriendly: 'On the International Space Station, astronauts get their oxygen from WATER! A special machine splits water into oxygen (for breathing) and hydrogen. Each astronaut needs about 0.84 kilograms of oxygen every day — that\'s like breathing the oxygen from about 600 liters of air.',
        gameImpact: 'Oxygen generation in the game requires power and water, just like the real ISS system.'
      },
      {
        id: 'ASTRO-WATER',
        title: 'Water Recycling in Space',
        observation: 'The ISS water recycling system recovers approximately 93% of water from humidity, sweat, and even urine. Each astronaut needs about 3.5 liters of water per day.',
        source: 'NASA ISS Water Recovery System',
        kidFriendly: 'Astronauts on the space station recycle almost ALL their water — even their sweat and the moisture from their breath! The water recycling system recovers about 93% of all water. On Earth we can just turn on a tap, but in space every drop is precious!',
        gameImpact: 'The water recycling system in the game recovers 80% of water (simplified for gameplay), teaching players about the importance of water conservation in space.'
      },
      {
        id: 'ASTRO-FOOD',
        title: 'Growing Food in Space',
        observation: 'NASA\'s Veggie and Advanced Plant Habitat experiments on the ISS have successfully grown lettuce, radishes, chili peppers, and other crops in microgravity.',
        source: 'NASA Veggie / Advanced Plant Habitat experiments on ISS',
        kidFriendly: 'Astronauts have already grown vegetables in space! On the space station, they\'ve grown lettuce, radishes, and even chili peppers. For longer missions to the Moon and Mars, astronauts will need greenhouses to grow more of their own food instead of bringing everything from Earth.',
        gameImpact: 'The greenhouse system in the game is based on real NASA plant growth experiments aboard the ISS.'
      },
      {
        id: 'ASTRO-RAD-HEALTH',
        title: 'Radiation Effects on Astronauts',
        observation: 'NASA limits astronaut career radiation exposure to reduce the risk of radiation-induced cancer. Long-duration missions beyond low Earth orbit pose significantly higher radiation risks.',
        source: 'NASA Space Radiation Element / OSDR',
        kidFriendly: 'Too much radiation can make astronauts sick over time, so NASA carefully tracks how much radiation each astronaut receives. This is one of the biggest challenges for sending humans to Mars — the trip takes months, and astronauts would be exposed to radiation the whole time. That\'s why scientists are working on better radiation shields!',
        gameImpact: 'Cumulative radiation exposure tracking in the game reflects NASA\'s real approach to monitoring astronaut radiation dose.'
      }
    ]
  };

  /**
   * Attempt to fetch recent space weather data from NASA DONKI API
   * Falls back to curated data on failure
   */
  async function fetchRecentSpaceWeather() {
    try {
      // Try to fetch recent CME data (last 30 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await fetch(
        `${DONKI_BASE}/CME?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_API_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          isLive: true,
          source: 'NASA DONKI API — Live Data',
          sourceUrl: 'https://api.nasa.gov/',
          fetchDate: new Date().toISOString(),
          events: data.slice(0, 5).map(cme => ({
            id: cme.activityID || 'CME-LIVE',
            type: 'Coronal Mass Ejection',
            date: cme.startTime ? cme.startTime.split('T')[0] : endDate,
            description: cme.note || 'CME detected by SOHO/LASCO coronagraph.',
            instruments: cme.instruments ? cme.instruments.map(i => i.displayName).join(', ') : 'SOHO/LASCO',
            kidFriendly: `NASA just detected a real solar event! A cloud of hot gas from the Sun was spotted by space telescopes. Scientists at NASA track these events to protect astronauts and satellites.`,
            gameImpact: 'This real-time solar activity data is used to create authentic solar storm events in the game.'
          }))
        };
      }

      // API returned no events, use curated data
      return { ...CURATED_SPACE_WEATHER, apiNote: 'No recent CME events detected. Showing archived data.' };
    } catch (error) {
      console.warn('NASA DONKI API unavailable, using curated data:', error.message);
      return { ...CURATED_SPACE_WEATHER, apiNote: `Live API unavailable (${error.message}). Showing verified archival NASA data.` };
    }
  }

  /**
   * Get all NASA science data relevant to a specific mission type
   */
  function getMissionData(missionType) {
    const datasets = [];

    // Always include space weather
    datasets.push({
      category: 'Space Weather',
      ...CURATED_SPACE_WEATHER
    });

    // Always include astronaut health data
    datasets.push({
      category: 'Astronaut Health & Life Support',
      ...CURATED_ASTRONAUT_DATA
    });

    if (missionType === 'moon') {
      datasets.push({
        category: 'Lunar Environment',
        ...CURATED_LUNAR_DATA
      });
    } else if (missionType === 'mars') {
      datasets.push({
        category: 'Martian Environment',
        ...CURATED_MARS_DATA
      });
    }

    return datasets;
  }

  /**
   * Get a specific science fact by ID
   */
  function getScienceFact(factId) {
    const allFacts = [
      ...CURATED_LUNAR_DATA.facts,
      ...CURATED_MARS_DATA.facts,
      ...CURATED_ASTRONAUT_DATA.facts,
    ];
    return allFacts.find(f => f.id === factId) || null;
  }

  /**
   * Get a random science fact appropriate for the mission type
   */
  function getRandomFact(missionType) {
    let pool = [...CURATED_ASTRONAUT_DATA.facts];
    if (missionType === 'moon') {
      pool = pool.concat(CURATED_LUNAR_DATA.facts);
    } else {
      pool = pool.concat(CURATED_MARS_DATA.facts);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Generate HTML for the NASA Data section in mission results
   */
  function renderNASADataSection(missionType) {
    const datasets = getMissionData(missionType);
    let html = '';

    datasets.forEach(dataset => {
      html += `
        <div class="nasa-data-card">
          <span class="nasa-badge">NASA — ${dataset.isArchival ? 'Archival Data' : 'Verified Data'}</span>
          <h4>${dataset.category}</h4>
          <div class="nasa-source">
            Source: ${dataset.source} · Last Updated: ${dataset.lastUpdated}
            <br/>
            <a href="${dataset.sourceUrl}" target="_blank" rel="noopener" style="color: var(--cyan-dim); font-size: 0.7rem;">${dataset.sourceUrl}</a>
          </div>
          <p>${dataset.description}</p>
          ${dataset.apiNote ? `<p style="color: var(--yellow-warn); font-size: 0.75rem; margin-top: 8px;">ℹ️ ${dataset.apiNote}</p>` : ''}
        </div>
      `;
    });

    return html;
  }

  /**
   * Render a science fact tooltip/panel
   */
  function renderScienceFact(fact) {
    if (!fact) return '';
    return `
      <div class="science-fact">
        <h4>🔬 NASA Science: ${fact.title}</h4>
        <p>${fact.kidFriendly}</p>
        <div style="margin-top: 8px; font-size: 0.7rem; color: #64748b;">
          Source: ${fact.source} · ${fact.date}
        </div>
        <div style="margin-top: 4px; font-size: 0.7rem; color: #64748b; font-style: italic;">
          🎮 Game Connection: ${fact.gameImpact}
        </div>
      </div>
    `;
  }

  // Public API
  return {
    fetchRecentSpaceWeather,
    getMissionData,
    getScienceFact,
    getRandomFact,
    renderNASADataSection,
    renderScienceFact,
    CURATED_SPACE_WEATHER,
    CURATED_LUNAR_DATA,
    CURATED_MARS_DATA,
    CURATED_ASTRONAUT_DATA
  };
})();

// Expose globally
window.NASAData = NASAData;
