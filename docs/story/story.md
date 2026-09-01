# Echoes of the Basin — Story Bible

> Working narrative canon for design and implementation.
> Soft-fictional late 1960s Amazon / Araguaia-analogue basin.
> Last updated: 2026-08-31 (Campbell)
>
> Companion: [`radio-world.md`](./radio-world.md) — HF networks, sched/power/static texture.
> Play loop: tune → (decode / call-sign) → ACP-lite log → reply. Map boats feed faction requests.

---

## Logline

A town acquaintance takes the night shift for a vanished radio operator and learns the basin’s secrets through static — lost expeditions, river nations, Army and guerrilla nets — without becoming a war story.

## Tone

- Soft mystery / humid procedural.
- Guerrilla war and dictatorship are **backdrop**, not the main show.
- Violence stays off-mic: silence, euphemism (“delayed,” “reassigned,” “no further contact”), missing people.
- Do **not** linger on torture, combat, or massacre.
- Player fantasy: moral **switchboard** — who you relay, bury, or “lose in static.”

## Period & place

| Field | Canon |
|-------|-------|
| Period | Soft-fictional **late 1960s** |
| Inspiration | Brazilian military dictatorship era; rural guerrilla presence in an Amazon / Araguaia-analogue basin ([Araguaia Guerrilla War](https://en.wikipedia.org/wiki/Araguaia_Guerrilla_War) as texture, not documentary) |
| Freedom | Invent outpost names, call signs, ops — do not claim strict historical reenactment |
| Code note | Game calendar/copy may still say 1945 until retconned |

## Meta premise

You are a **relief radio operator**, learning on the job.

The prior operator was an **acquaintance from town** — enough warmth to care, enough distance for mystery. Their chair, mug, and incomplete log are still here. Headquarters expects business as usual.

**Primary frame:** The Switchboard — multiple discoverable mini-storylines on the dial.

---

## Factions

Indigenous / river communities are **not** the same as guerrillas.

| Key | Diegetic face | Notes |
|-----|---------------|-------|
| Military | Army / air / outpost nets | Secrecy, cordons, “keep the channel clean” |
| Guerrilla | Coded, careful traffic | Backdrop presence; soft touch — logistics and rumor, not attack plans on-mic |
| Indigenous / river | Villages, elders, traders | Land, kinship, cultural knowledge; own stakes |
| Expeditions / survey | Researchers, lost parties, “development” teams | Lost-expedition mystery lane |

Occult / “ancient ones in the static” may appear as **seasoning** (pareidolia, rumor), not the main plot engine.

---

## Four narratives (player-facing)

| ID | Name | Pitch |
|----|------|--------|
| **G** | Marcos mystery | Solve the disappearance of Marcos Viera (town acquaintance). Desk gaps, rumors, river caches. |
| **E** | Lost expedition | **Day 2:** urgent cry for help from Survey Team Condor deep in the basin. Follow their fading sched. |
| **A** | Army vs guerrillas | You sit an Army chair (Tango-Seven). Both nets will ask for the channel. Trust is the fork. |
| **R** | Indigenous shaman | A nearby village shaman asks for **herbs and supplies** (medicine/food), not ideology. Distinct from guerrillas. |

Threads unlock through radio tasks, visible clues, and river-map landings. Completing all is not required.

---

## Radio tasks (current loop)

Keep: power on → tune MHz → choose reply → sleep when `requiredBeats` are done.

**Each day**

1. **HQ check-in** (98.8 MHz) — confirm on station; debrief yesterday + today’s news (one rumor, one freq or code, one map hint).
2. **3–4 transmission tasks** — mix of open traffic, **cipher** (daily decode book), and **call-sign** gates.

**ACP-lite log** — every fully received message is copied into Field Notes as:

- Precedence (ROUTINE / PRIORITY / IMMEDIATE / FLASH)
- Originator (call sign)
- Addressee (display only)
- Text

**Decode book** — some traffic is a number string. One decoder grid per night. Correct decode unlocks the body + choices. Skip/wrong-and-give-up = fail + faction trust ding.

**Call-sign** — secret traffic stays locked until the player answers the code word (from HQ, a clue, or a boat landing). Wrong/refuse = fail + trust ding.

**Clues (Strange Antiquities pages)** — each successful task awards a **visible** clue: world fact, Marcos lead, or a pointer (frequency, code, river square). Clues live on the Field Notes **Clues** tab.

**Fail** — wrong decode, wrong call-sign, or static on a help cry dings the named faction.

**River map** — boat landings are tied to faction requests. HQ/radio points at a square; the landing awards the clue that unlocks the radio side (herb cache, Condor grid, night-window code, Marcos anchorage). Battery cost limits how much river you clear in one night.

---

## Meta spine (phases)

| Phase | Days | What you learn |
|-------|------|----------------|
| Relief | 1–3 | Call signs, priority, what “radio silence” means; the log is incomplete on purpose |
| Pattern | 4–8 | Recurring voices; manifests and stories that don’t line up; someone used this desk as a blind drop |
| Pressure | 9–12 | Army wants a clean channel; river people want discretion; a quiet net wants safe windows |
| Accounting | 13–15 | What the missing acquaintance was protecting (or fleeing); soft ending by whom you served |

---

## 15-day beat map

**Bold** = intended story beat day for that thread. Ambient noise fills the rest.

| Day | Meta (always on) | Thread beats | Purpose |
|-----|------------------|--------------|---------|
| 1 | **HQ** on station + debrief | **G1** Marcos log gap. **A_soft** clean channel. **G_cipher** leftover numbers → Negro | Teach loop, decode, map hint |
| 2 | **HQ** Condor overdue; code SIERRA | **E1** Urgent Condor cry. **G2** Town rumor. **E_cipher** grid pad | Expedition opens; map Eastern channel |
| 3 | **HQ** shaman asking for medicine | **R1** Shaman herbs (after village landing). **A1** Quiet net (call-sign BRAVO). Optional Army pressure | River ≠ guerrilla; trust fork |
| 4 | Wrong time-stamp style in their notes | **G3** Margin frequency not on the posted list. **E2** Weak beacon — expedition callsign, wrong words | Desk ghost + lost party rhyme |
| 5 | HQ praises “reliability” | **R2** Community voice — outsiders asking wrong questions (cultural, not combat). **A2** Army: ignore a band “for security” | Soft pressure |
| 6 | Personal note — they expected *someone* in this chair | **G4** They trusted you more than HQ. **E3** Medic fragment — fear/illness, not gore | Intimacy; humanize expedition |
| 7 | Supplies tighter; rumors thicker | **A3** Quiet-net ask for a weather/window (logistics). **R3** Safe river route if you don’t shout their location | Moral switchboard |
| 8 | Memory of last time you saw them in town | **G5** Last sighting contradicts “reassignment.” **E4** Map grid matches **R** bend | Threads cross |
| 9 | Channel crowded; static has habits | **A4** Quiet voice knows you’re the *new* one. **R4** Warning about a survey team that took without asking | Soft faction tension |
| 10 | Desk ghost accelerates | **G6** Trail meant for another operator. **E5** Expedition: “do not tell the outpost everything” | Conspiracy of silence |
| 11 | Trust matters | **A5** Mutually exclusive relays. **R5** Pass a message toward expedition or kin | Light allegiance |
| 12 | Town stops asking about them by name | **G7** Soft possibilities: alive / fled / erased from paperwork. **E6** Expedition fork: found / scattered / enters river story | Near-resolution |
| 13 | “Keep nights dull” | **A6** Both nets go quieter. **R6** Story/lore gift if trust high | Calm before accounting |
| 14 | Assemble what you know | **G8** Truth package (2–3 soft versions). Cross-links among G / E / R / A | Clarification night |
| 15 | Last watch | Soft ending by threads deepened + whom you mostly served | Closure without war climax |

---

## Soft endings (examples)

| You deepened… | Ending flavor |
|---------------|---------------|
| **G** + **R** | Acquaintance left to warn/protect river kin; you inherit a quiet duty |
| **G** + **E** | They vanished chasing the expedition; you hold the last clean fragment of that party |
| **G** + **A** (Army) | Channel “cleaned”; personal cost — town grows colder; you “did the job” |
| **G** + **A** (quiet net) | You’re a soft link in a longer chain; more rumor than victory |
| Little of anything | You survived the fortnight; the basin keeps its secrets; the chair still feels borrowed |

---

## Open / TBD

- [x] Name the missing acquaintance (and optional town nickname) — **Marcos Viera** ("Marco" in town)
- [x] Outpost callsign and expedition name — **Outpost Tucunaré** / **Tango-Seven** / **Survey Team Condor**
- [ ] River community portrayal: invented group vs careful real-world reference (needs care pass if real)
- [x] Retcon in-game calendar and copy from 1945 → late 1960s (October 1968 in `data/campaign.json`)
- [x] Draft Day 1–3 authored transmissions for implementation (`data/days/01-03.json`)

---

## Design rules for writers & Cody

1. Prefer **authored beats** on unlock over pure random faction soup.
2. Choices should change **who hears what**, not trigger on-screen battles.
3. Never collapse Indigenous voices into guerrilla ideology.
4. When in doubt, cut graphic detail; keep dread in the gaps.
5. Product title: **Echoes of the Basin**. Diegetic radio chrome may still say military set names (e.g. RX-150).
6. Period radio texture lives in [`radio-world.md`](./radio-world.md) — keep real org names off-mic unless approved.
7. Map landings must serve a faction request (see `data/map-regions.json` `faction` / `hintClue`).
8. Do not simulate store-and-forward queues, sched clocks, or 16-line ACP.
