# Undefeated: Gridiron Legends — Design System

Source: brand sheet, background asset sheet, and five production screen
comps (Home, Game Setup, Draft/Player List, Spin, Leaderboard). This
documents the patterns actually present across those screens so new
screens stay consistent without re-deriving spacing/color/component
decisions from scratch each time.

**Scope note:** this is the core/default visual system used across the
existing app. It does **not** cover the "broadcast scoreboard" direction
adopted for the Home screen redesign (see `01-home-screen.md`) — that's
a deliberate departure for that one screen (sharp corners, mono type,
ticker) and should not be mixed with the rounded/gold system documented
here on other screens. If the broadcast direction later expands beyond
Home, this doc will need a second pass to reconcile the two systems.

---

## 1. Brand foundations

**Name/lockup:** "UNDEFEATED" (primary wordmark, large) + "GRIDIRON
LEGENDS" (secondary line, smaller, letter-spaced, gold) + optional
tagline "BUILD THE GREATEST ERA."

**Mark:** shield/crest containing a stylized "U" with a football-lace
stitch pattern down the center, gold star beneath.

**Logo variants** (all should exist as separate exports, not derived at
runtime):
- Full lockup on dark background (primary, most contexts)
- Full lockup on light background (for any light-mode surfaces, external
  marketing use)
- Icon-only (shield+U) on dark
- Icon-only on light

**Not affiliated disclaimer:** small centered gray text at the bottom of
the Home screen — `"Not affiliated with or endorsed by the NFL, NFLPA,
or any team."` This should persist on Home and any other screen that
prominently features real historical rosters/teams.

---

## 2. Color palette

| Token | Hex | Usage |
|---|---|---|
| Midnight Black | `#0B0F14` | Primary background |
| Steel Silver | `#A7B1BC` | Secondary text, inactive icons/borders, unselected states |
| Championship Gold | `#D4A017` | Primary accent — CTAs, selected states, active nav, borders on emphasized elements |
| Gridiron Blue | `#123B5D` | Secondary accent — used sparingly (era-related UI, secondary category color) |
| Turf White | `#F5F7FA` | Primary text on dark backgrounds |

These five tokens are already defined in `theme/colors.ts` — this
section documents *usage rules*, since the palette alone doesn't tell
you when to reach for gold vs. silver vs. white.

**Usage rules observed across screens:**
- Gold is reserved for **emphasis and selection state** — active tab,
  selected toggle option, primary CTA fill, "you are here" highlight
  (see Leaderboard's current-user row), highest-ranked item in a list
  (see top player card border in the draft screen). Gold is not used as
  a default border color on every card — only the emphasized one.
- Default card borders are a low-contrast dark gray (roughly
  `steel silver at ~15–20% opacity`, not full `#A7B1BC` — full-opacity
  silver is reserved for icon glyphs and secondary text, not hairline
  borders). Confirm exact border color against the comps at implementation
  time rather than guessing a value; the pattern is "barely visible
  until something needs to stand out."
- White (`#F5F7FA`) is primary text; steel silver is everything
  secondary — subtitles, captions, disabled/inactive labels, timestamps.
- Blue (`gridironBlue`) shows up specifically on **era-related** UI (the
  Spin screen's ERA card uses a cooler/steel treatment distinct from the
  gold TEAM card). Treat blue as "the era/secondary-category color," not
  a general-purpose second accent — don't reach for it arbitrarily
  elsewhere.
- Rank/tier badges (Leaderboard #1–3, brand badge set) use a
  gold → silver → bronze progression for 1st/2nd/3rd, falling back to a
  plain dark badge with a number for 4th and below. This progression
  pattern should be reused anywhere else a ranked list appears.

---

## 3. Typography

| Role | Font | Notes |
|---|---|---|
| Display / headers / wordmark | Bebas Neue (primary), Oswald or an "Industry"-style condensed face as alternates | All-caps, heavy, condensed. Used for screen titles, the wordmark, big numerals (OVR, round counters) |
| Body / UI text | Inter (primary), Manrope as alternate | Used for player names, descriptions, list content, buttons |

**Observed scale (approximate, confirm exact px against comps):**
- Screen title (e.g. "GAME SETUP"): large, bold, all-caps, Bebas
  Neue/Oswald
- Section label (e.g. "AVAILABLE PLAYERS", "CHOOSE YOUR MODE"): small,
  all-caps, letter-spaced, gold or silver depending on emphasis
- Card title (player name, mode name): medium, semibold, Inter, white
- Card subtitle/meta (team/year, "stats visible"): small, regular,
  Inter, steel silver
- Large numerals (OVR rating, round number): Bebas Neue/Oswald, bold,
  often gold or white depending on emphasis — this is a distinct visual
  category from body text, treat as its own type style
  (`Typography.statNumeral` or similar), not just "large body text"

**All-caps usage:** section labels, button text, badge text, and the
wordmark are consistently all-caps. Player names and descriptive body
copy are not. Keep this distinction — don't uppercase everything or the
hierarchy collapses.

---

## 4. Layout & spacing

- Base corner radius: cards and buttons use a consistently rounded
  corner (~12–16px range) — this is the default radius scale
  (`Radius.md`/`Radius.lg`), distinct from the broadcast-direction
  Home screen's sharp corners.
- Card border width: hairline, ~1px, with a slightly heavier (~1.5–2px)
  border reserved for gold-emphasized/selected cards.
- The Game Setup modal uses a distinct **clipped/notched corner**
  treatment (corners cut at an angle rather than rounded) on its outer
  border — this "military stencil / equipment tag" corner treatment
  appears selectively (Game Setup panel, Spin screen team/era cards) as
  a special emphasis pattern, not the default card style. Reserve it for
  moments that should feel like a special "briefing" or "reveal" UI,
  not everyday list cards.
- Consistent vertical rhythm: section label → content block → next
  section label, with clear spacing breaks between logical groups
  (stat chips as one group, mode list as another, etc.)
- Bottom sheet / slot-assignment pattern (draft screen): persistent
  bottom panel overlaying the list, with its own toggle + grid controls,
  separated from the scrollable content above by a horizontal rule.

---

## 5. Iconography

Brand iconography set includes: football, helmet, trophy, jersey
(numbered), stadium, calendar, bar chart, star/badge outline. Keep new
icons within this same **flat, single-color line/glyph style** —
outlined, not filled illustrations, so they sit comfortably next to the
badge/crest artwork without competing with it stylistically.

Mode icons on Home currently use a mix of emoji-adjacent symbols (💯
brain, crossed swords) rendered in gold — these read as slightly more
illustrative than the strict line-icon set. Worth deciding whether to
formalize mode icons as custom line icons matching the brand set, or
keep the more playful illustrative style — flag as a
`> DECISION NEEDED` rather than mixing both styles inconsistently
across future mode additions.

---

## 6. Background imagery system

Two signature background photographic treatments, both dark and
non-repeating:

1. **Header background — stadium with lights.** Dark, dramatic stadium
   bowl shot with bright floodlights arcing across the top. Used behind
   logos, titles, and header content.
2. **Footer background — football field.** Dark field with yard lines
   and subtle grass texture, used for footers, nav areas, and bottom
   fades.

**Implementation notes:**
- Both are single (non-repeating) high-resolution images, not tiled
  patterns.
- Always apply a dark gradient overlay on top for text/content
  readability — never place UI directly on the raw photo without a
  scrim.
- Pre-exported at fixed device-class sizes rather than scaled at
  runtime:

| Variant | Size |
|---|---|
| Android Small | 360×600 |
| Android Medium | 360×800 |
| Android Large | 360×960 |
| iOS (Notch) | 390×844 |
| iOS (Dynamic Island) | 430×932 |
| iOS (Large) | 414×896 |

Store these as static assets per size class rather than generating at
build time; match the existing `assets/` naming convention used for the
app icon size variants (`android-icon-*.png` pattern) for consistency,
e.g. `bg-header-stadium-{variant}.png`.

---

## 7. Core components

### 7.1 Primary button (CTA)
Full-width (or near-full-width), gold gradient fill, dark/black bold
text, rounded corners matching card radius. Used for the single primary
action per screen (Play Today's Challenge, Start Game, Spin). Often
paired with a trailing arrow glyph (`→`).

### 7.2 Secondary button
Dark fill, subtle border, gray text — used for Cancel/dismiss actions
sitting alongside a primary gold button. Always visually subordinate;
never gold.

### 7.3 Segmented control
Two- or three-way toggle (e.g. ALL TEAMS / ONE TEAM, OFF / DEF, DAILY /
WEEKLY / ALL-TIME). Active segment gets a gold border/fill; inactive
segments are flat dark with gray text. This exact pattern reappears
across Game Setup, the draft slot-assignment sheet, and Leaderboard —
build one shared `<SegmentedControl>` component rather than three
one-off implementations.

### 7.4 Info chip
Small bordered rounded rect with a label (small, caps, gray or gold)
above a value (bold, white or gold). Used for TEAM / ERA / REROLL on the
draft screen, and the three stat chips on Home (Playing Today / Resets
In / Streak). Reusable as `<InfoChip label value />`.

### 7.5 Selectable pill / tile
Rounded rect, unselected = dark fill + gray border + gray text; selected
= gold border + gold or check-marked accent. Used for era selection
(Game Setup) and position-slot assignment (draft screen). Build as one
component (`<SelectablePill selected onPress />`) since the visual
state logic is identical even though content differs.

### 7.6 List row (draft/player list)
Position badge (small square, dark fill, colored border, position
abbreviation) + name (bold) + meta line (team · year · tag, gray, small)
+ right-aligned value (large number, e.g. OVR) with a small caption
label beneath it. Top/emphasized row in a list gets a gold border;
default rows get the standard hairline border.

### 7.7 Mode card
Icon (colored, ~24–32px) + title (bold) + subtitle (gray, small) +
trailing chevron. Full-width, stacked vertically, consistent height.
This is the pattern to extend for any new mode card (e.g. Two-Minute
Drill, Legacy) on screens still using the core system rather than the
broadcast Home direction.

### 7.8 Hero/challenge card
Larger bordered card (gold border, more prominent than default cards),
containing: eyebrow label, optional "NEW" badge, title, subtitle, a row
of info chips, and a primary CTA button. This is the Today's Challenge
pattern — reusable anywhere a single promoted action needs to stand out
from a list below it.

### 7.9 Rank badge
Shield-shaped badge for ranks 1–3 (gold/silver/bronze), plain circular
numbered badge for rank 4+. Reuse for any ranked list (leaderboards,
seasonal standings, etc.), not just the main leaderboard.

### 7.10 Tab bar
Bottom navigation, icon above label, gold fill/color for the active
tab, gray/steel for inactive. Five items observed (Board, Roster, Spin,
History, Profile) — this is the default tab bar style; the broadcast
Home direction's underline variant (doc 01) is a proposed alternate, not
yet adopted app-wide.

### 7.11 Player card (collectible/profile card)
The richest component in the system — used for individual player
display (profile, collection, pack reveal):
- Era range, top-left
- Rarity/tier badge, top-right (see §8)
- Central artwork (helmet or player photo treatment)
- Large OVR numeral with "OVR" caption
- Position tag
- Player name + position title
- Row of 5 stat abbreviations with values (stat set varies by position
  — the example shows THP/ACC/AWR/SPD/STR for a QB; other positions
  will need their own relevant stat set, don't force the same five
  labels onto every position)
- Team/brand icon at the bottom center

Build this as a single configurable `<PlayerCard>` component — it will
be reused across the roster list, player profile, pack-opening reveal
(Legacy mode), and comparison views, so avoid forking separate
implementations per screen.

---

## 8. Badge / tier system

Six badge types established in the brand sheet, each a shield shape
with a distinct icon and color treatment:

| Badge | Icon | Color treatment |
|---|---|---|
| MVP | Crown | Gold |
| All Pro | Star | Silver/steel |
| Legend | Star | Gold |
| Hall of Fame | Columns | Bronze/dark gold |
| Elite | Stars | Silver/steel, distinct shape accent |
| Icon | Stars | Purple-tinted (only badge that departs from the core 5-color palette — confirm this is intentional before reusing purple elsewhere) |

This same 6-tier structure was proposed as the pack-pull rarity system
for Legacy mode (`03-legacy-mode.md`, common/rare/elite/legend). Reconcile
the two before implementation — either the pack rarity tiers map
directly onto these existing 6 badges (recommended, avoids maintaining
two parallel tier systems with different names/colors), or they're
deliberately different systems and that should be stated explicitly
rather than left ambiguous. Recommend mapping pack rarities onto the
existing named tiers (Common → base/no badge, Rare → All Pro, Elite →
Elite, Legend → Legend) rather than introducing new unbranded rarity
labels.

> DECISION NEEDED: confirm the pack-rarity-to-badge mapping above before
> Legacy mode pack logic is implemented.

---

## 9. Screen header pattern

Every screen observed uses one of two header treatments:
1. **Branded header** (Home, Leaderboard): full logo lockup + settings
   gear, stadium background image behind it
2. **Contextual header** (Game Setup, Draft, Spin): back arrow + a
   centered pill/label showing context (e.g. "ROUND 1/12"), no full
   logo — logo real estate is reclaimed for task content once the
   player is mid-flow

New screens should pick one of these two patterns rather than inventing
a third — branded header for top-level/entry screens, contextual header
for anything inside an active game flow.

---

## 10. Open items for engineering

- [ ] Confirm exact hex/opacity for default (non-emphasized) card border
      color — approximate only in this doc
- [ ] Confirm exact corner radius values in px for both the standard
      rounded style and the clipped-corner "briefing" style
- [ ] Decide on mode-icon style: custom line icons vs. current
      illustrative/emoji-adjacent icons (§5)
- [ ] Resolve pack-rarity-to-badge-tier mapping before Legacy mode
      implementation (§8)
- [ ] Reconcile this core system with the broadcast scoreboard Home
      direction if that style expands to other screens
