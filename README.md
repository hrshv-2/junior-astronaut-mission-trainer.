# ORBITAL FRONTIER — JUNIOR ASTRONAUT MISSION TRAINER
### NASA Space Apps Challenge 2026 Prototype

An interactive, browser-based space mission simulation game designed for children aged 7–12 (and engaging for all ages) where players command a NASA lunar or Martian research outpost.

---

## 🚀 Key Features

### 1. Cinematic 3D First Page
- **Three.js WebGL Launchpad:** High-fidelity 3D rocket standing on an illuminated launchpad with gantry arms, flame trench, dynamic atmospheric mist/smoke, and animated starfield.
- **On-Page Mission Registration:** 
  - Required Astronaut Name and Age (7–12+).
  - Selectable astronaut profile avatars (`🧑‍🚀`, `👨‍🚀`, `👩‍🚀`, `🚀`, `🛸`, `🌌`).
  - Integrated mission selector (Lunar Outpost vs. Mars Outpost) and difficulty toggle (Explorer / Specialist / Commander).
  - Privacy First: 100% client-side storage (`localStorage`); zero accounts, zero tracking.
  - Realistic launch countdown and ignition sequence.

### 2. Cinematic Third-Person Astronaut Experience
- **Playable 3D Character Exploration:** When starting a mission, players step directly into the boots of the astronaut commander at the launch complex.
- **Physical Ingress & Boarding Sequence:**
  - Walk the concrete launch apron around the towering rocket and mobile launch tower.
  - Inspect NASA cryogenic LOX tanks, RS-25 engine clusters, and talk to ground crew.
  - Ride the high-speed gantry elevator 320 feet to the Crew Access Arm.
  - Cross the catwalk into the sterile White Room.
  - Open the pressurized spacecraft hatch and step physically into the capsule cockpit.
  - Settle into the 45° carbon-composite Commander launch couch and lock safety restraints.
- **Cinematic Multi-Stage Launch:**
  - Dynamic countdown with synthesized radio comms and Quindar tones.
  - Volumetric rocket exhaust plumes, deluge water steam, and structural camera vibration.
  - Real-time ascent punching through cloud layers as the sky transitions from day to starry space.
  - Booster separation and orbital insertion with zero-G floating transition.
  - In-flight view toggling between Cockpit First-Person and Dynamic Exterior Aerial Tracking cameras.
  - Smooth contextual access to the Outpost Operations console once orbit is achieved.

### 3. Comprehensive Astronaut Profile Dashboard
- **11 Essential Mission Tracking Parameters:**
  1. Astronaut Name
  2. Age
  3. Custom Avatar
  4. Astronaut Rank (`Cadet Astronaut` → `Junior Explorer` → `Mission Specialist` → `Outpost Commander` → `Legendary Space Pioneer`)
  5. Total Missions Completed
  6. Current Assigned Mission
  7. Mission Success Rate (%)
  8. Total Scientific Discoveries
  9. Highest Mission Score (out of 100)
  10. Earned Achievements and Badges
  11. Best Survival Record (Days & Crew Health)
- Complete Mission History Log with one-click profile reset.

### 3. Realistic Aerospace Simulation Engine
- **Interconnected Resource Dynamics:** Life Support (O2, H2O, Food, Morale) ⇄ Electrical Power (Bifacial Photovoltaics, Batteries) ⇄ Radiation Protection (CME events, Regolith/Water shielding).
- **Physical Communication Latency:** 1.3-second delay on the Moon vs. 14-minute simulated signal lag on Mars.
- **Authentic NASA Open Data:** Real CME and space weather metrics from NASA DONKI, ISS life support data from NASA OSDR, and surface environmental data from the Artemis and Mars programs.

---

## 📂 Project Structure

```
Junior Protoype/
├── index.html              # Main single-page web app container
├── PROJECT_BRIEF.md        # Official NASA Junior Astronaut challenge brief
├── README.md               # Architecture and documentation
├── css/
│   └── styles.css          # Aerospace mission control design system
└── js/
    ├── app.js              # Application controller, audio synth & UI bindings
    ├── rocketScene.js      # Three.js 3D rocket & launchpad simulation
    ├── environmentScene.js # Three.js 3D lunar & Martian outpost scenes
    ├── gameEngine.js       # Core interconnected resource simulation engine
    ├── eventSystem.js      # 10-day scripted & procedural event engine
    ├── missionScoring.js   # 100-point performance scoring & profile system
    └── nasaData.js         # NASA DONKI, OSDR & planetary open data integration
```

## 🎮 How to Run
Open `index.html` directly in any modern desktop or mobile browser (Chrome, Edge, Firefox, Safari). No build tools, servers, or package installations required!
