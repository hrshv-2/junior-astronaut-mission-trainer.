# ORBITAL FRONTIER — JUNIOR ASTRONAUT MISSION TRAINER

I want you to design and build a highly polished, realistic, interactive space mission simulation game called:

# ORBITAL FRONTIER — JUNIOR ASTRONAUT MISSION TRAINER

Do not create a basic website, slideshow, simple animation, or ordinary quiz game. Build an immersive, informative, realistic, playable space mission experience that makes players feel like they are managing an actual NASA-style lunar or Martian outpost.

## 1. THE MAIN PURPOSE

Build a browser-based educational survival and resource-management simulation in which a player becomes the commander of a lunar or Martian research outpost.

The player must make important mission decisions involving:

- Oxygen and life-support systems.
- Water conservation.
- Food production and greenhouse management.
- Electrical power budgeting.
- Radiation protection and solar storms.
- Communication delays between Earth and the outpost.
- Scientific research and exploration.
- Crew safety and mission objectives.

Every decision must have consequences.

For example:
- Increasing greenhouse production consumes water and electricity but improves future food supplies.
- Activating additional radiation shielding consumes valuable electrical power.
- Conducting more scientific research can produce discoveries but may reduce available resources.
- Saving electricity may preserve the outpost through the night but force the crew to postpone research.
- Sending a message to Earth does not produce an immediate response, especially during a Mars mission.

The main educational objective is to demonstrate how real astronauts and mission planners manage competing priorities in space.

---

# 2. FIRST PAGE — CINEMATIC SPACE EXPERIENCE

The landing page is extremely important. Make it visually spectacular.

When someone opens the website, they should immediately feel that they are entering a professional space mission simulator.

### Visual requirements

Create a cinematic, full-screen first page with:

- A beautiful, realistic rocket standing on a launchpad.
- A detailed space centre or launch environment.
- Realistic lighting, shadows, clouds, smoke, and atmospheric effects.
- A large rocket or spacecraft as the main visual focus.
- A realistic starfield and subtle background movement.
- Subtle camera motion, depth, and parallax effects.
- High-quality typography and a sophisticated dark space-themed design.
- Smooth transitions between the landing page and mission control.

Use genuine, high-quality NASA imagery wherever possible. Prefer official NASA image resources or appropriately licensed space imagery. If you use an actual NASA image, display its source and attribution.

The rocket image should be visually realistic, not a cartoon or simple flat illustration.

Where technically feasible, implement a realistic 3D rocket model using Three.js or an appropriate 3D rendering library. Allow subtle rotation or camera movement.

**Important:** Do not pretend that an archived photograph is a live video feed. If a real live feed is unavailable, use a genuine NASA archival image and label it honestly. You may include a realistic launch countdown and launch sequence as a simulation.

### Landing page content

Display:

**ORBITAL FRONTIER**

*Your mission. Your decisions. Humanity's future.*

Subtitle:

"Become a young astronaut. Build your outpost. Make the decisions that could save your crew."

Add an attractive mission-entry panel directly on the landing page.

The player must enter:

1. Astronaut name or nickname — required.
2. Age — required, between 7 and 12.

Include:
- A beautiful astronaut-profile avatar.
- A mission selection option.
- A large START MISSION button.
- A privacy note explaining that the profile is stored locally and no account is required.

Do not ask children for email addresses, phone numbers, home addresses, or other unnecessary personal information.

The interface should show the player's entered name throughout the experience.

Example:

"Welcome aboard, Commander Alex!"

---

# 3. PLAYER PROFILE SYSTEM

Build an attractive and functional astronaut profile.

Each player should receive a unique local profile based on their name and age.

The profile dashboard should show:

- Astronaut name.
- Age.
- Profile avatar.
- Astronaut rank.
- Missions completed.
- Current mission.
- Mission success rate.
- Total scientific discoveries.
- Highest mission score.
- Earned achievements and badges.
- Mission history.
- Best survival record.

Create an astronaut ranking system:

- Cadet Astronaut.
- Junior Explorer.
- Mission Specialist.
- Outpost Commander.
- Legendary Space Pioneer.

Players should unlock achievements by making good decisions, completing objectives, managing resources efficiently, and learning real space science.

Use browser local storage for saving progress without requiring registration. Provide a clear way to reset or delete the local profile.
