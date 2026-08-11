# Radio World — Period Texture & Design Seeds

> Historical/technical texture for **Echoes of the Basin**.
> Soft-fictional late 1960s Amazon basin. Use as inspiration, not documentary constraint.
> Companion to [`story.md`](./story.md). Last updated: 2026-08-08 (Campbell)

**How to use this file**

| Section | For |
|---------|-----|
| [Critical networks](#critical-networks) | Story factions, voices, mini-arcs |
| [Environmental & technical challenges](#environmental--technical-challenges) | Atmosphere, failure states, UI flavor |
| [Power infrastructure](#power-infrastructure) | Resource / survival mechanics |
| [Operational protocols](#operational-protocols) | Core loop ideas (sched, CW, discipline) |
| [Story seeds](#story-seeds) | Narrative hooks that fit the bible |
| [Gameplay mechanic seeds](#gameplay-mechanic-seeds) | Systems Cody can prototype later |
| [Soft-fiction naming](#soft-fiction-naming) | Real orgs → in-world analogues |
| [Sources](#sources-pointers) | Further reading / Scout deep-dives |

Tone reminder from the bible: war and hardship are **backdrop**; dread lives in silence and missed check-ins, not gore.

---

## Critical networks

In the real basin, two-way HF radio was often the only link for hundreds of miles — internet, emergency room, and postal service of the jungle. Operations tended to fall into three grids:

### 1. Missionary / aviation-support nets

Organized grids (historically: JAARS, New Tribes Mission, and similar) ran remote outposts on a strict **“sched”** (scheduled radio check-in), often twice daily: medical emergencies, supply needs, weather, coordinates.

**Story use:** A fourth soft network — medics, translators, bush pilots — who need the channel more than they need politics. Can cross-cut Lost Expedition and River Voices without becoming a sermon.

**Mechanic use:** Fixed daily windows when certain voices are guaranteed “up.”

### 2. Commercial & resource extraction

Rubber tappers, lumber, mineral survey teams — traffic between riverboats, trading posts, and hubs (historically Manaus, Iquitos, etc.).

**Story use:** Fuel for **Lost Expedition** and **Supply Lies**-style beats: manifests, delayed boats, “company” frequencies that don’t match Army maps.

**Mechanic use:** Riverboat relays as multi-hop messages (you pass to boat → boat passes upriver).

### 3. Government & military outposts

Border detachments and Army posts on HF to hold presence along forested, ambiguous frontiers.

**Story use:** Already covered by **Two Armies of the Air** — keep soft: cordons, “clean channel,” reassignment euphemisms.

**Mechanic use:** Priority override (“clear the freq”), contested bands, punishment for chatting out of turn.

---

## Environmental & technical challenges

| Challenge | Reality (texture) | Design seed |
|-----------|-------------------|-------------|
| **Jungle canopy** | Wet foliage absorbs ground-wave; line-of-sight dies fast | Night / clear-sky bonuses; “under canopy” days need skywave bands |
| **Tropical static (QRN)** | Distant lightning floods the air with noise | Weather events: voice unreadable, Morse still scrapes through |
| **Tropical bands** | Roughly **2–7 MHz** (esp. ~2.3–5.06 MHz “tropical bands”) bounce off the ionosphere over the trees | Band choice matters: wrong band = static soup; right band = story unlock |
| **Humidity & heat** | Fungus on boards, corrosion, shorts; varnish / heated dry-boxes | Gear **degrades**; ignore maintenance → clarity drops or set goes dark mid-sched |

---

## Power infrastructure

No grid at the outpost fantasy:

| Source | Texture | Design seed |
|--------|---------|-------------|
| Gasoline generator | Noisy; fuel flown or canoed in — expensive | Loud generator = safer power, worse stealth / more “presence” |
| Lead-acid batteries | Tractor/car batteries; finite amp-hours | Existing **batteries** resource gains diegetic weight |
| Kerosene thermo-electric trickle | Slow charge from lamp heat in deepest bush | Emergency trickle: tiny recover, long wait |

**Design principle:** Radios are **not always on**. Power is a first-class constraint, not a flavor number.

---

## Operational protocols

### Voice (SSB) vs Morse (CW)

In the 1960s, SSB voice was spreading, but **CW/Morse** still cut through when voice drowned in QRN.

**Story:** Some truths only arrive as dots and dashes (or a UI stand-in: “decoded fragment”). The missing operator may have preferred CW for secrets.

**Mechanic:** Dual modes — Voice (fast, low battery? clear weather) vs CW (slow, works in storms, costs attention/time).

### The “sched” system

Radios off most of the day to save fuel/batteries. Power on at exact minutes (e.g. 08:00 and 16:00) for roll call.

**Missing a sched** historically could trigger search-and-rescue / escalation of concern.

**Story (soft):** If Survey Team Condor or a river clinic misses sched, the *absence* is the beat — not a crash cutscene. Marcos’s empty chair is the ultimate missed sched.

**Mechanic:** Day structured around **windows**. Outside windows: scanning is hard or costly. Inside windows: crowded channel, choices of whom to answer. Miss acknowledging *your* sched → HQ pressure, trust ding, or a plane “checking in” (soft, off-mic).

### Channel discipline

Many outposts share freqs. Strict turn-taking, brevity, and call-sign ritual.

**Mechanic:** Talk too long → drown someone else’s emergency or draw the wrong ear. Choices become *when* you key up, not only *what* you say.

---

## Story seeds

Fits existing threads in [`story.md`](./story.md); optional expansions marked *new*.

| Seed | Thread | Soft beat idea |
|------|--------|----------------|
| Marcos’s last log is only **sched times**, no content | **G** Ghost of the Desk | He kept the clock, erased the words |
| Condor’s beacon only rises on the **evening sched** | **E** Lost Expedition | Daytime scan finds nothing; patience is the puzzle |
| River clinic borrows missionary-net etiquette | **R** River Voices | They ask for medicine relay, not ideology |
| Army demands you stay off a band during *their* window | **A** Two Armies | Soft conflict: silence vs warning |
| Bush plane “rides” the same sched grid | *new / cross* | Pilot asks you to confirm a strip is clear — commercial, military, or mercy flight? |
| Fungus in the set the week Marcos left | **G** | Hardware failure as cover story — or real neglect |
| A CW-only stranger who never joins voice roll call | **A** / **G** | Quiet Frequency with period logic |

---

## Gameplay mechanic seeds

Prioritized for fit with current loop (tune → log → choose → resources → advance day). Not a commitment to build all.

### High fit (extends current systems)

1. **Sched windows** — 2–3 timed slots per day; story transmissions cluster here; roaming scan outside costs batteries and yields more static.
2. **Band / tropical freqs** — Retcon flavor of dial toward HF tropical bands (or keep MHz UI but label “night band / storm band”). Wrong band during QRN → failed voice, optional CW decode mini-choice.
3. **Battery = life of the net** — Generator fuel as rare resource; running generator during quiet hours has narrative side effects (noise, visitors, HQ noticing you’re “always up”).
4. **Missed sched escalation** — Soft: notepad telegram, trust shift, “aircraft overhead” rumor — never forced combat.
5. **Clarity meter** — Humidity / maintenance / storm stack; below threshold, choices shrink to “copy fragments” / CW only.

### Medium fit (new toys)

6. **Relay hops** — Message must bounce boat → outpost → hub; player chooses which hop to trust.
7. **Dry-box / varnish mini-care** — Short day action: maintain set vs chase a mystery freq.
8. **Roll-call UI** — List of call signs; mark present / weak / absent; absences unlock threads.
9. **SSB vs CW toggle** — Trade speed/clarity for storm penetration and secrecy.

### Later / expansion

10. **Bush-plane subplot** — Sched-linked flights; weather + radio confirmations gate supply and expedition outcomes.
11. **Shared-frequency etiquette** — Reputation with “the net” as a whole, separate from Army/guerrilla trust.

---

## Soft-fiction naming

Prefer **inspired analogues** in dialogue unless Thomas explicitly wants real org names on-mic.

| Historical texture | In-world suggestion |
|--------------------|---------------------|
| JAARS / jungle aviation-radio grids | “Aviation sched net,” “mercy flight net,” invented call-sign family |
| New Tribes-style outposts | Remote clinic / translation outpost (careful, non-caricature) |
| Manaus / Iquitos hubs | Named regional HQ already in fiction, or “the city desk” |
| Tropical bands (2–7 MHz) | Diegetic labels: “night tropical,” “storm window” |

Real citations stay in this doc for designers; players get fiction.

---

## Optional deep-dives (not yet written)

If we expand later:

- [ ] Bush-plane networks that lived on these radios  
- [ ] Specific tropical-band / ionosphere day-night behavior for puzzle design  
- [ ] Missionary journals / Brazil border-integration logistics (Scout) — tone-check before any real-community portrayal  

---

## Sources (pointers)

Synthesized from mid-20th-century remote HF practice, humanitarian/aviation radio logistics, and engineering notes. Starting points (not exhaustive):

- [JAARS — history](https://www.jaars.org/the-story-of-jaars) — sched culture, jungle aviation + radio safety net  
- Field / archive texture (e.g. 1960s remote shortwave medical links) — treat as atmosphere, not script  
- HF propagation & foliage attenuation — canopy loss, skywave dependence  
- “Tropical bands” (~120 / 90 / 60 m) — ITU-era remote broadcast/ops practice in equatorial regions  
- 1960s hardware constraints — tubes/early transistors, humidity, battery/generator power, no always-on monitoring  

Use Scout if we need a cited research brief before locking real names or real peoples into canon.
