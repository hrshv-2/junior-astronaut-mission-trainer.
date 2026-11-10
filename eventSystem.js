/**
 * ============================================================================
 * ORBITAL FRONTIER — Event & Decision Engine (eventSystem.js)
 * ============================================================================
 * Houses the narrative event chains for Lunar and Martian missions.
 * In accordance with NASA guidelines:
 * - No "safe / free" choices: every option involves a realistic engineering trade-off.
 * - Explanations tailored for ages 7-12 without sacrificing scientific accuracy.
 * - Direct integration with real NASA science facts and datasets.
 */

const EventSystem = (function () {
  'use strict';

  /**
   * 10-Day Event Sequence for Lunar Outpost
   */
  const MOON_EVENTS = [
    {
      id: 'moon_day1_arrival',
      day: 1,
      type: 'routine',
      title: 'Day 1: Outpost Commissioning & Inspection',
      description: 'Your lunar lander has docked safely at the Shackleton Crater rim outpost. Primary life-support and solar arrays are online, but initial power reserves must be allocated for overnight thermal control.',
      scienceFact: {
        title: 'Shackleton Crater & Lunar Cold',
        content: 'Shackleton Crater sits at the Moon\'s South Pole. Its peaks receive near-permanent sunlight, while its floor remains in permanent shadow at -173°C, harboring valuable water ice!'
      },
      choices: [
        {
          label: 'Option A: Heavy Thermal Baseload',
          description: 'Max heater power to protect electronics against extreme lunar cold.',
          consequences: { power: -10, crewHealth: +2, morale: +3 },
          outcomeText: 'Systems stay warm and crew morale improves, but battery storage takes an early hit.'
        },
        {
          label: 'Option B: Balanced System Diagnostic',
          description: 'Standard power profile while running sensor calibration.',
          consequences: { power: -5, researchPoints: +2 },
          outcomeText: 'Baseline diagnostics yield helpful scientific calibration data.'
        },
        {
          label: 'Option C: Aggressive Power Conservation',
          description: 'Lower interior habitat temperatures to conserve battery reserves.',
          consequences: { power: +5, morale: -5 },
          outcomeText: 'Batteries remain fully charged, but the crew complains of chilly living quarters.'
        }
      ]
    },
    {
      id: 'moon_day2_dust',
      day: 2,
      type: 'crisis',
      title: 'Day 2: Electrostatic Regolith Accumulation',
      description: 'Fine, sharp lunar dust particles have coated your primary photovoltaic arrays due to electrostatic levitation, cutting solar generation efficiency by 35%.',
      scienceFact: {
        title: 'Lunar Dust (Regolith)',
        content: 'Without wind or water to erode them, Moon dust particles have razor-sharp jagged edges and cling to suits and solar panels like static cling wrap!'
      },
      choices: [
        {
          label: 'Option A: Electrostatic Dust-Shield Pulse',
          description: 'Use electrical frequency pulses to shake off the charged dust.',
          consequences: { power: -12, solarGeneration: +4, morale: +2 },
          outcomeText: 'The pulse vibrates the dust away, restoring solar panel efficiency.'
        },
        {
          label: 'Option B: Manual EVA Surface Sweep',
          description: 'Send two astronauts outside with carbon-fiber brushes to clean panels.',
          consequences: { oxygen: -6, water: -4, solarGeneration: +5, radiationExposure: +4 },
          outcomeText: 'Panels are spotless, but the extra spacewalk consumed precious life-support consumables and exposed the crew to cosmic rays.'
        },
        {
          label: 'Option C: Tilt Arrays & Tolerate Reduced Output',
          description: 'Re-angle panels and downscale laboratory experiments.',
          consequences: { power: -4, researchPoints: -2 },
          outcomeText: 'No consumables were risked, but research activities had to be curtailed.'
        }
      ]
    },
    {
      id: 'moon_day3_ice',
      day: 3,
      type: 'opportunity',
      title: 'Day 3: Shadowed Crater Ice Extraction',
      description: 'Long-range radar on the rover has identified surface water-ice deposits inside an adjacent permanently shadowed region (PSR).',
      scienceFact: {
        title: 'Water on the Moon',
        content: 'NASA\'s LCROSS probe proved water ice exists in permanently shadowed polar craters. Water can be converted into drinking water, oxygen, and hydrogen rocket fuel!'
      },
      choices: [
        {
          label: 'Option A: Autonomous Thermal Drill Deployment',
          description: 'Dispatch the robotic rover with sublimation heating collectors.',
          consequences: { power: -10, water: +18, researchPoints: +4 },
          outcomeText: 'Remarkable success! Pure water ice is extracted and transferred to storage tanks.'
        },
        {
          label: 'Option B: Conservative Sample Scoop',
          description: 'Take only surface ice samples to verify chemical purity first.',
          consequences: { power: -4, water: +6, researchPoints: +6 },
          outcomeText: 'Laboratory assays reveal trace volatiles and pristine scientific data.'
        },
        {
          label: 'Option C: Postpone & Preserve Rover Battery',
          description: 'Keep rover docked to maintain outpost auxiliary backup power.',
          consequences: { power: +4, morale: -2 },
          outcomeText: 'Energy remains secure, though mission science planners express disappointment.'
        }
      ]
    },
    {
      id: 'moon_day4_eclss',
      day: 4,
      type: 'crisis',
      title: 'Day 4: Sabatier Reactor Pressure Anomaly',
      description: 'The carbon dioxide reduction subsystem (Sabatier reactor) is venting intermittently, reducing oxygen recovery efficiency from crew respiration.',
      scienceFact: {
        title: 'Sabatier Reactor on the ISS',
        content: 'The Sabatier reaction combines waste carbon dioxide and hydrogen to create water and methane. The water is then split back into breathable oxygen!'
      },
      choices: [
        {
          label: 'Option A: Chemical Scrubber Override',
          description: 'Engage consumable lithium hydroxide canisters to scrub CO2 immediately.',
          consequences: { oxygen: +5, power: -4, morale: +2 },
          outcomeText: 'CO2 levels drop instantly back to nominal cabin conditions.'
        },
        {
          label: 'Option B: Complete Reactor Teardown & Overhaul',
          description: 'Crew spends the afternoon replacing nickel catalysts and seals.',
          consequences: { power: -8, oxygen: +10, water: -3, researchPoints: +3 },
          outcomeText: 'The crew fixes the unit permanently, learning valuable engineering lessons.'
        },
        {
          label: 'Option C: Throttle Cabin Ventilation & Ration',
          description: 'Lower physical exercise schedules to minimize CO2 generation.',
          consequences: { oxygen: -3, morale: -6, power: +4 },
          outcomeText: 'Power is saved, but crew energy and morale take a noticeable dip.'
        }
      ]
    },
    {
      id: 'moon_day5_solar_storm',
      day: 5,
      type: 'crisis',
      title: 'Day 5: Coronal Mass Ejection (CME) Warning',
      description: 'NASA\'s DONKI space weather observatory alerts you to an Earth-directed solar flare. A cloud of high-energy protons will hit the Moon in 4 hours.',
      scienceFact: {
        title: 'Space Radiation & Solar Storms',
        content: 'The Moon has no magnetic field or thick atmosphere. During solar particle events, astronauts must seek shelter behind thick regolith berms or water shields.'
      },
      choices: [
        {
          label: 'Option A: Full Shelter Lockdown & Maximum Active Shielding',
          description: 'Retreat crew into subterranean regolith bunker with electromagnetic field active.',
          consequences: { power: -18, shieldingLevel: 3, radiationExposure: +2, researchPoints: -3 },
          outcomeText: 'Shields absorb the blast! Crew radiation dose remains completely safe.'
        },
        {
          label: 'Option B: Passive Water-Wall Bunker Shelter',
          description: 'Surround habitat core with water storage bladders to absorb protons.',
          consequences: { power: -6, shieldingLevel: 2, radiationExposure: +7, water: -2 },
          outcomeText: 'The water barrier stops most radiation while preserving vital outpost electricity.'
        },
        {
          label: 'Option C: Minimal Shielding & Maintain External Instruments',
          description: 'Keep automated science experiments running outside during the event.',
          consequences: { power: -2, radiationExposure: +16, crewHealth: -6, researchPoints: +8 },
          outcomeText: 'Extraordinary solar observation data gathered, but crew dose exceeded safe thresholds!'
        }
      ]
    },
    {
      id: 'moon_day6_greenhouse',
      day: 6,
      type: 'opportunity',
      title: 'Day 6: Hydroponic Crop Acceleration',
      description: 'Your microgreen test crops (dwarf wheat and radishes) are ready for high-yield nutrient cycling to replace freeze-dried rations.',
      scienceFact: {
        title: 'NASA Veggie & Plant Habitats',
        content: 'Growing fresh greens in space provides vital vitamins (like Vitamin C and K), boosts psychological well-being, and recycles CO2 into oxygen!'
      },
      choices: [
        {
          label: 'Option A: High-Intensity LED Light Cycle',
          description: 'Pump maximum photosynthetic active radiation (PAR) into greenhouse trays.',
          consequences: { power: -12, water: -6, food: +18, greenhouseLevel: 3, morale: +5 },
          outcomeText: 'Abundant crisp salads for dinner! The crew is delighted.'
        },
        {
          label: 'Option B: Sustained Eco-Balance Cycle',
          description: 'Maintain steady standard lighting and moderate hydration.',
          consequences: { power: -6, water: -3, food: +10, greenhouseLevel: 2 },
          outcomeText: 'Predictable crop yield with sustainable resource expenditure.'
        },
        {
          label: 'Option C: Dormancy Mode',
          description: 'Keep plants at minimum maintenance to preserve water and energy.',
          consequences: { power: -2, food: +2, greenhouseLevel: 1, water: +3 },
          outcomeText: 'Saved valuable water, but food stores did not increase substantially.'
        }
      ]
    },
    {
      id: 'moon_day7_comms',
      day: 7,
      type: 'communication',
      title: 'Day 7: Earth Ground Station Handover',
      description: 'Houston Mission Control requests a high-bandwidth telemetry dump and video link with schools on Earth.',
      scienceFact: {
        title: 'Lunar Communication Delay',
        content: 'Radio waves travel at light speed (300,000 km/s). At 384,400 km away, the lunar signal delay is only about 1.3 seconds each way — almost realtime!'
      },
      choices: [
        {
          label: 'Option A: Full High-Gain Deep Space Network Uplink',
          description: 'Broadcast high-def video stream and full scientific sensor telemetry.',
          consequences: { power: -6, morale: +6, researchPoints: +5 },
          outcomeText: 'Students on Earth cheer! The public engagement inspires thousands of kids.'
        },
        {
          label: 'Option B: Compressed Telemetry Packet Only',
          description: 'Send core engineering data only, keeping transmitters at low wattage.',
          consequences: { power: -2, researchPoints: +2 },
          outcomeText: 'Ground controllers confirm all outpost vital signs are within tolerances.'
        },
        {
          label: 'Option C: Request Expert Houston Engineering Assist',
          description: 'Ask ground teams to crunch complex life-support optimization equations.',
          consequences: { power: -3, oxygen: +6, water: +5 },
          outcomeText: 'Houston sends back refined pump calibrations that boost efficiency!'
        }
      ]
    },
    {
      id: 'moon_day8_lava_tube',
      day: 8,
      type: 'discovery',
      title: 'Day 8: Subsurface Lava Tube Discovery',
      description: 'Ground-penetrating radar on the exploration rover detects a cavernous, intact volcanic lava tube 40 meters beneath the lunar regolith.',
      scienceFact: {
        title: 'Lunar Lava Tubes',
        content: 'Ancient volcanic eruptions billions of years ago left giant underground hollow tunnels on the Moon, wide enough to shield entire cities from radiation and micrometeorites!'
      },
      choices: [
        {
          label: 'Option A: Deploy Spelunking Rover Drone',
          description: 'Lower tethered probe to scan tube dimensions and structural stability.',
          consequences: { power: -8, researchPoints: +12, morale: +4 },
          outcomeText: 'Magnificent subterranean scans! A perfect permanent habitat site is mapped.'
        },
        {
          label: 'Option B: Seismic Sensor Array Installation',
          description: 'Install surface geophones to listen for moonquakes in the vicinity.',
          consequences: { power: -5, researchPoints: +7 },
          outcomeText: 'Seismology data provides critical insights into lunar core activity.'
        },
        {
          label: 'Option C: Mark Coordinates for Future Missions',
          description: 'Log GPS waypoint and preserve all current outpost resources.',
          consequences: { power: +2, researchPoints: +2 },
          outcomeText: 'Coordinates cataloged safely without expending current battery reserves.'
        }
      ]
    },
    {
      id: 'moon_day9_micrometeorite',
      day: 9,
      type: 'crisis',
      title: 'Day 9: Micrometeorite Impact on Secondary Array',
      description: 'A pea-sized space rock traveling at 25 km/s has punctured an auxiliary solar panel wing and nicked an exterior coolant line.',
      scienceFact: {
        title: 'Whipple Shields & Hypervelocity',
        content: 'Micrometeorites travel up to 70 kilometers per second! Multi-layered Whipple shields break them into harmless gas and dust before they reach living quarters.'
      },
      choices: [
        {
          label: 'Option A: Emergency Patch Spacewalk & Nanogel Seal',
          description: 'Two astronauts suit up to spray self-healing nanogel over the puncture.',
          consequences: { oxygen: -6, water: -3, power: -4, crewHealth: +2 },
          outcomeText: 'The leak is sealed tight within ninety minutes. Coolant pressure stabilizes.'
        },
        {
          label: 'Option B: Isolate Damaged Line via Automated Valve',
          description: 'Sacrifice auxiliary cooling loop to avoid crew exposure and suit wear.',
          consequences: { power: -8, solarGeneration: -2 },
          outcomeText: 'Safe from EVA risks, but electrical distribution capacity is permanently lowered.'
        },
        {
          label: 'Option C: Divert Coolant through Habitat Floor Loop',
          description: 'Route thermal fluid into domestic floor radiant heat grids.',
          consequences: { power: -3, morale: +2, water: -2 },
          outcomeText: 'Clever engineering improvised a fix, keeping the crew cozy!'
        }
      ]
    },
    {
      id: 'moon_day10_wrapup',
      day: 10,
      type: 'routine',
      title: 'Day 10: Final Mission Certification & Handover',
      description: 'Your 10-day commissioning rotation concludes today. Artemis relief crew is in lunar orbit, awaiting final outpost certification.',
      scienceFact: {
        title: 'Artemis Base Camp Vision',
        content: 'NASA\'s Artemis Base Camp plans permanent habitats, mobile pressurized rovers, and nuclear surface power at the Moon\'s South Pole to prepare humanity for Mars!'
      },
      choices: [
        {
          label: 'Option A: Full System Buffer & Restock',
          description: 'Top off batteries and water banks so the incoming crew arrives to full reserves.',
          consequences: { power: -6, water: -4, morale: +5 },
          outcomeText: 'Artemis relief crew sends congratulations on leaving a pristine, thriving station.'
        },
        {
          label: 'Option B: Comprehensive Science Synthesis',
          description: 'Dedicate all processing servers to package sample databases for Earth.',
          consequences: { power: -8, researchPoints: +10 },
          outcomeText: 'Scientists across the globe publish groundbreaking lunar science papers!'
        },
        {
          label: 'Option C: Balanced Handover',
          description: 'Maintain steady baseline systems and conduct celebratory crew debrief.',
          consequences: { morale: +8, researchPoints: +4 },
          outcomeText: 'The crew celebrates an extraordinary 10-day triumph in deep space.'
        }
      ]
    }
  ];

  /**
   * 10-Day Event Sequence for Mars Outpost
   */
  const MARS_EVENTS = [
    {
      id: 'mars_day1_touchdown',
      day: 1,
      type: 'routine',
      title: 'Day 1: Jezero Crater Touchdown & Power Grid Sync',
      description: 'Your crew has landed in Jezero Crater. Mars atmospheric pressure is less than 1% of Earth\'s, and outside temperatures sit at -62°C. Establishing primary life support.',
      scienceFact: {
        title: 'Jezero Crater & Mars Atmosphere',
        content: 'Jezero Crater once held a giant lake and river delta! The Martian air is 95% carbon dioxide and 100 times thinner than Earth\'s, so spacesuits are required at all times outside.'
      },
      choices: [
        {
          label: 'Option A: Ramp Up MOXIE Oxygen Extraction',
          description: 'Run the Mars Oxygen ISRU Experiment at maximum power to generate O2 from CO2.',
          consequences: { power: -12, oxygen: +15, morale: +2 },
          outcomeText: 'MOXIE successfully extracts pure breathable oxygen directly from Martian carbon dioxide!'
        },
        {
          label: 'Option B: Standard Grid Initialization',
          description: 'Balanced power between environmental heaters, habitat lights, and communications.',
          consequences: { power: -6, oxygen: +6, researchPoints: +3 },
          outcomeText: 'Outpost operations reach nominal equilibrium smoothly.'
        },
        {
          label: 'Option C: Conserve Power for Dust Storm Season',
          description: 'Store maximum battery reserve and operate minimal habitat heating.',
          consequences: { power: +6, morale: -4 },
          outcomeText: 'Batteries are full, but the Martian chill makes indoor work shivering and slow.'
        }
      ]
    },
    {
      id: 'mars_day2_dust_storm',
      day: 2,
      type: 'crisis',
      title: 'Day 2: Regional Dust Storm Approaching',
      description: 'Orbital weather satellites detect a massive regional dust front spanning 800 km moving toward your landing zone. Sunlight will be reduced by up to 60%.',
      scienceFact: {
        title: 'Martian Global Dust Storms',
        content: 'Mars has giant dust storms that can envelope the entire planet for months! The 2018 global storm blocked so much sun it ended the 15-year mission of NASA\'s Opportunity rover.'
      },
      choices: [
        {
          label: 'Option A: Deploy Auxiliary Stirling Fission Reactor',
          description: 'Unpack the compact nuclear surface power unit to offset lost solar generation.',
          consequences: { power: +20, radiationExposure: +3, researchPoints: +2 },
          outcomeText: 'Steady, reliable nuclear kilowatt-power replaces sunlight completely!'
        },
        {
          label: 'Option B: Shut Down Non-Essential Labs & Charge Batteries',
          description: 'Mothball the research bay and direct all remaining solar into storage cells.',
          consequences: { power: -4, researchPoints: -4, morale: -3 },
          outcomeText: 'Power reserves survive the darkness, though research stops.'
        },
        {
          label: 'Option C: Wind-Power Turbine Deployment',
          description: 'Set up experimental low-pressure vertical wind turbines on the ridge.',
          consequences: { power: +6, oxygen: -4, water: -2 },
          outcomeText: 'Despite thin air, high storm wind speeds generate bonus electricity!'
        }
      ]
    },
    {
      id: 'mars_day3_ice_sheet',
      day: 3,
      type: 'opportunity',
      title: 'Day 3: Subsurface Glacial Ice Sheet Detected',
      description: 'Ground-penetrating radar confirms a slab of 90% pure water ice buried only 1.5 meters under the red dirt near the crater wall.',
      scienceFact: {
        title: 'Water Ice on Mars',
        content: 'Mars has enough water ice at its poles and mid-latitudes to cover the entire planet in water 35 meters deep! Future human crews will mine this for drinking and rocket fuel.'
      },
      choices: [
        {
          label: 'Option A: Thermal Rodriguez Well Excavation',
          description: 'Pump heated glycol into the ground to melt and pump liquid water into habitat tanks.',
          consequences: { power: -14, water: +22, food: +4, researchPoints: +3 },
          outcomeText: 'Liquid gold! Pristine Martian water fills storage bladders to capacity.'
        },
        {
          label: 'Option B: Surface Core Drill Sampling',
          description: 'Extract ice cores to analyze ancient atmospheric gas bubbles trapped inside.',
          consequences: { power: -6, water: +8, researchPoints: +8 },
          outcomeText: 'Ice core samples reveal climate secrets from 3 billion years ago!'
        },
        {
          label: 'Option C: Postpone Excavation & Conserve Power',
          description: 'Seal borehole until dust storm passes completely.',
          consequences: { power: +2, morale: -2 },
          outcomeText: 'Power preserved, but the crew remains dependent on recycled reserves.'
        }
      ]
    },
    {
      id: 'mars_day4_comm_delay',
      day: 4,
      type: 'communication',
      title: 'Day 4: The 14-Minute Communication Window',
      description: 'A life-support telemetry glitch triggers an automated caution. You need guidance, but Earth is 225 million kilometers away. Signals take 12.5 minutes each way!',
      scienceFact: {
        title: 'The Great Mars Delay',
        content: 'Because Mars is so far, radio messages take between 4 and 24 minutes one-way! Astronauts cannot have a live phone call with Houston; they must think independently as autonomous commanders.'
      },
      choices: [
        {
          label: 'Option A: Exercise Commander Autonomy — Reset Locally',
          description: 'Trust your onboard training and perform a localized reboot of the valve controller.',
          consequences: { power: -4, oxygen: +6, morale: +5 },
          outcomeText: 'Spot-on decision, Commander! Valves reboot flawlessly without waiting for Earth.'
        },
        {
          label: 'Option B: Transmit Packet and Wait for Houston\'s Reply',
          description: 'Transmit full diagnostics to NASA Deep Space Network and idle until response returns.',
          consequences: { oxygen: -5, researchPoints: +4 },
          outcomeText: 'The 25-minute round-trip delay was nerve-wracking, but Houston\'s advice verified the fix.'
        },
        {
          label: 'Option C: Engage AI Diagnostic Assistant',
          description: 'Use onboard neural network trained on spacecraft engineering specs.',
          consequences: { power: -6, oxygen: +4, researchPoints: +3 },
          outcomeText: 'The onboard AI pinpoints a minor sensor drift and rectifies the issue.'
        }
      ]
    },
    {
      id: 'mars_day5_solar_proton',
      day: 5,
      type: 'crisis',
      title: 'Day 5: Solar Proton Event Impact',
      description: 'A geomagnetic sensor spike warns of energetic solar particles. Mars has no global dipole magnetosphere, so surface radiation climbs rapidly.',
      scienceFact: {
        title: 'Mars Magnetic Shield Loss',
        content: 'Mars lost its global magnetic field 4 billion years ago. Its thin atmosphere shields only about 30% of cosmic rays, making artificial habitats and shelters essential.'
      },
      choices: [
        {
          label: 'Option A: Heavy Regolith Sandbagging Protocol',
          description: 'Use the rover backhoe to pile two meters of Martian soil on top of the habitat modules.',
          consequences: { power: -12, shieldingLevel: 3, radiationExposure: +2, oxygen: -4 },
          outcomeText: 'The Martian regolith provides dense, natural protection from all solar protons!'
        },
        {
          label: 'Option B: Electromagnetic Deflection Coil Activation',
          description: 'Power high-voltage superconductor coils to bend charged particles away.',
          consequences: { power: -16, shieldingLevel: 2, radiationExposure: +5 },
          outcomeText: 'High power drain, but the magnetic bubble keeps the living quarters safe.'
        },
        {
          label: 'Option C: Emergency Cram Inside Storm Shelter',
          description: 'Crowd crew into the lead-lined central equipment closet for 24 hours.',
          consequences: { power: -3, radiationExposure: +10, morale: -6 },
          outcomeText: 'Electricity was saved, but tight quarters and elevated exposure took a toll.'
        }
      ]
    },
    {
      id: 'mars_day6_biomimetic_farm',
      day: 6,
      type: 'opportunity',
      title: 'Day 6: Martian Regolith Farming Experiment',
      description: 'The science team has treated Martian soil to remove toxic perchlorates and added beneficial mycorrhizal fungi to plant potatoes and dwarf beans.',
      scienceFact: {
        title: 'Farming on Mars & Perchlorates',
        content: 'Martian soil contains toxic perchlorate salts, but washing the dirt and using bacteria can break them down into harmless chloride and oxygen, making soil fertile for plants!'
      },
      choices: [
        {
          label: 'Option A: Full Hydroponic-Regolith Hybrid Expansion',
          description: 'Commit water and warmth to triple crop acreage across the greenhouse dome.',
          consequences: { water: -8, power: -10, food: +25, greenhouseLevel: 3, morale: +6 },
          outcomeText: 'Lush green vines cover the dome! Fresh produce transforms crew morale.'
        },
        {
          label: 'Option B: Controlled Micro-Plot Cultivation',
          description: 'Keep experiment limited to six test containers to conserve water.',
          consequences: { water: -3, power: -4, food: +10, greenhouseLevel: 2 },
          outcomeText: 'Steady crop yield confirms that treated Martian regolith can support plants.'
        },
        {
          label: 'Option C: Defer to Synthetic Algae Bioreactor',
          description: 'Grow spirulina algae in closed nutrient bags using minimal power.',
          consequences: { power: -2, food: +6, water: -1 },
          outcomeText: 'High protein nutrition achieved, though the crew misses crunchy fresh veggies.'
        }
      ]
    },
    {
      id: 'mars_day7_rover_traverse',
      day: 7,
      type: 'discovery',
      title: 'Day 7: Ancient Delta Sedimentary Ridge Traverse',
      description: 'Your long-range exploration rover arrives at an ancient river delta. Layered mudstones might preserve signs of ancient microbial life.',
      scienceFact: {
        title: 'Biosignatures on Mars',
        content: 'NASA\'s Perseverance rover collects core samples in Jezero Crater looking for biosignatures — ancient chemical fossils of microscopic life from when Mars was warm and wet!'
      },
      choices: [
        {
          label: 'Option A: Deep Core Drilling & Raman Spectrometer Sweep',
          description: 'Spend maximum rover battery on diamond-tipped abrasive coring.',
          consequences: { power: -8, researchPoints: +15, morale: +4 },
          outcomeText: 'Sensational discovery! Organic molecules detected in the layered clay minerals!'
        },
        {
          label: 'Option B: High-Resolution Panoramic Mastcam Survey',
          description: 'Capture 360-degree gigapixel imagery of geological stratigraphy.',
          consequences: { power: -4, researchPoints: +7 },
          outcomeText: 'Geologists on Earth praise the spectacular sedimentary mapping images.'
        },
        {
          label: 'Option C: Safe Return Traverse to Base Camp',
          description: 'Bring rover back to habitat dock before evening dust winds pick up.',
          consequences: { power: +2, researchPoints: +3 },
          outcomeText: 'Rover returns with zero wear-and-tear, preserving equipment life.'
        }
      ]
    },
    {
      id: 'mars_day8_airlock_seal',
      day: 8,
      type: 'crisis',
      title: 'Day 8: Primary Airlock Outer Seal Micro-Tear',
      description: 'Repeated ingress with abrasive Martian dust has eroded the silicone vacuum gasket on the main suit airlock. Pressure is seeping out at 1.5 kPa per hour.',
      scienceFact: {
        title: 'Pressure Differentials in Space',
        content: 'Space habitats are pressurized like airplanes (around 101 kPa or 14.7 psi), while Mars is only 0.6 kPa. Any puncture acts like a puncture in a balloon!'
      },
      choices: [
        {
          label: 'Option A: Replace with Secondary Vacuum Mold Gasket',
          description: 'Swap in the spare gasket from the habitat workshop reserves.',
          consequences: { oxygen: +4, power: -4, water: -2 },
          outcomeText: 'Brand new gasket installed; airlock holds full 101 kPa with zero leakage.'
        },
        {
          label: 'Option B: Cyanoacrylate Resin Field Weld',
          description: 'Repair existing seal with quick-cure aerospace sealant paste.',
          consequences: { power: -2, oxygen: -2, researchPoints: +2 },
          outcomeText: 'Adequate patch job holds firm, preserving the spare gasket for emergencies.'
        },
        {
          label: 'Option C: Seal Main Airlock & Use Emergency Tunnel',
          description: 'Reroute all EVA traffic through the smaller backup crawlway.',
          consequences: { morale: -4, power: +2 },
          outcomeText: 'No parts used, but cumbersome crawlway entries frustrate the crew.'
        }
      ]
    },
    {
      id: 'mars_day9_methane_plume',
      day: 9,
      type: 'discovery',
      title: 'Day 9: Subsurface Methane Plume Detection',
      description: 'Tunable Laser Spectrometers detect a sudden spike in atmospheric methane (25 parts per billion) venting from a nearby fissured crater ridge.',
      scienceFact: {
        title: 'The Mystery of Methane on Mars',
        content: 'Methane can be produced by geological reactions (hot water reacting with rock) or by living microbes! NASA rovers have detected mysterious seasonal methane spikes.'
      },
      choices: [
        {
          label: 'Option A: Emergency Atmospheric Gas Sniffer Sortie',
          description: 'Dispatch rover immediately with specialized carbon-isotope analyzer.',
          consequences: { power: -8, researchPoints: +14, morale: +3 },
          outcomeText: 'Historic scientific discovery! Isotope ratios suggest potential hydrothermal activity!'
        },
        {
          label: 'Option B: Remote Satellite Confirmation Request',
          description: 'Ask European Mars Trace Gas Orbiter to scan the plume from space.',
          consequences: { power: -2, researchPoints: +6 },
          outcomeText: 'Orbiter corroborates surface readings with orbital infrared imagery.'
        },
        {
          label: 'Option C: Seal Air Intakes to Protect Environmental Loop',
          description: 'Prioritize interior air purity over outdoor exploration.',
          consequences: { oxygen: +3, researchPoints: +1 },
          outcomeText: 'Base habitat remains 100% pristine, though scientific mystery lingers.'
        }
      ]
    },
    {
      id: 'mars_day10_celebration',
      day: 10,
      type: 'routine',
      title: 'Day 10: Sol 10 Milestone & Earth Congratulatory Uplink',
      description: 'Your pioneer crew has survived 10 challenging Martian sols. The President, NASA Administrator, and international partners send congratulations to Jezero Base!',
      scienceFact: {
        title: 'A Martian Sol',
        content: 'A day on Mars is called a "sol." It lasts 24 hours, 39 minutes, and 35 seconds — just slightly longer than an Earth day, making it easy for human biological clocks to adapt!'
      },
      choices: [
        {
          label: 'Option A: Broadcast Live Planetary Address',
          description: 'Beam inspirational video back to Earth highlighting young space pioneers.',
          consequences: { power: -6, morale: +10, researchPoints: +6 },
          outcomeText: 'Millions of children on Earth watch your crew and dream of becoming astronauts!'
        },
        {
          label: 'Option B: Comprehensive Outpost Systems Full Diagnostic',
          description: 'Run exhaustive sensor logs to prepare outpost for the next 500-day expedition.',
          consequences: { power: -8, oxygen: +5, water: +5 },
          outcomeText: 'Every valve, wire, and fuel cell is cataloged in perfect condition.'
        },
        {
          label: 'Option C: Quiet Crew Rest & Celebration',
          description: 'Serve a special feast made of greenhouse vegetables and take the afternoon off.',
          consequences: { food: -4, morale: +12, crewHealth: +3 },
          outcomeText: 'A joyous milestone celebration on the Red Planet that your crew will remember forever.'
        }
      ]
    }
  ];

  /**
   * Get events triggered on a given day
   * @param {'moon'|'mars'} missionType
   * @param {number} day
   * @param {object} gameState
   * @returns {Array<object>}
   */
  function getEventsForDay(missionType, day, gameState) {
    const sequence = missionType === 'mars' ? MARS_EVENTS : MOON_EVENTS;
    const match = sequence.filter(e => e.day === day);

    // If day exceeds curated list, provide procedural mission continuity event
    if (match.length === 0) {
      return [generateProceduralEvent(missionType, day, gameState)];
    }

    return match;
  }

  /**
   * Generates a procedural event if simulation extends beyond day 10
   */
  function generateProceduralEvent(missionType, day, gameState) {
    const isCrisis = Math.random() > 0.5;
    if (isCrisis) {
      return {
        id: `proc_crisis_${day}`,
        day: day,
        type: 'crisis',
        title: `Day ${day}: Unexpected Power Surge`,
        description: 'Fluctuations in the primary regulator require re-balancing system draw.',
        scienceFact: {
          title: 'Power Regulation in Deep Space',
          content: 'Space outposts use complex solid-state converters to ensure sensitive life support never suffers brownouts.'
        },
        choices: [
          {
            label: 'Option A: Switch to Auxiliary Inverter',
            description: 'Safe switchover, minor battery expenditure.',
            consequences: { power: -6, oxygen: +2 },
            outcomeText: 'Power levels stabilize smoothly.'
          },
          {
            label: 'Option B: Throttle Laboratory Modules',
            description: 'Save power by pausing research.',
            consequences: { power: +4, researchPoints: -2 },
            outcomeText: 'Batteries recover while science is deferred.'
          }
        ]
      };
    } else {
      return {
        id: `proc_opp_${day}`,
        day: day,
        type: 'opportunity',
        title: `Day ${day}: Surface Geological Survey`,
        description: 'Spectrometers spot unusual mineral veins near the outpost perimeter.',
        scienceFact: {
          title: 'In-Situ Resource Utilization (ISRU)',
          content: 'Finding minerals on other worlds allows astronauts to manufacture tools and build structures without flying material from Earth.'
        },
        choices: [
          {
            label: 'Option A: Deploy Scout Rover',
            description: 'Conduct spectral mineral analysis.',
            consequences: { power: -5, researchPoints: +6 },
            outcomeText: 'New mineral samples mapped successfully!'
          },
          {
            label: 'Option B: Conserve Rover Power',
            description: 'Stay docked and recharge cells.',
            consequences: { power: +4, morale: -1 },
            outcomeText: 'Power banks remain topped off.'
          }
        ]
      };
    }
  }

  return {
    MOON_EVENTS,
    MARS_EVENTS,
    getEventsForDay
  };
})();

// Export globally
window.EventSystem = EventSystem;
