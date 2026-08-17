# Car Dash — Software Architecture Spec (v1)

## 1. Overview

A Raspberry Pi 4 (4GB) running a locally-hosted web app, displayed fullscreen via Chromium in kiosk mode on a 7" HDMI touchscreen (1024×600 assumed as design target — see Section 6) mounted in the center console. Single-user, single-device, no multi-tenancy or auth concerns.

**v1 priority order:**
1. App shell + dashboard (this document's main focus)
2. Navigation (Section 5)
3. Calls + Media over Bluetooth (Section 8)
4. Fuel gauge replacement — **non-goal for v1**, see Section 9.

**Core constraint carried through every decision below:** no invasive vehicle wiring. OBD-II port and 12V accessory outlet only.

### 1.1 MVP vs. Polish tagging

Every build-phase task throughout this doc is tagged with one of:

- **(MVP)** — required for a functional core loop (dashboard → nav → calls/media all working end to end). Build these first, in order, per feature.
- **(Polish — quick follow-up)** — genuinely nice, low effort, and cheap to build immediately after the MVP piece it sits on top of, while the context is still fresh. Not required to consider a feature "working," but not worth deferring to a separate pass either.
- **(Polish — deferred)** — real value, but nontrivial effort or dependent on things outside your control (external data coverage, hardware not yet acquired). Revisit only once the full MVP loop across all features is working, not before.

The goal is to avoid both "nothing works because polish crept into the critical path" and "the whole nice-to-have list gets bolted on at the very end in one big pass" — quick-follow-up items ride along with their MVP piece; deferred items don't.

---

## 2. High-Level Architecture

```
┌───────────────────────────────────────────────────┐
│                Chromium (kiosk mode)                 │
│  ┌─────────────────────────────────────────────┐   │
│  │              App Shell (React)                  │   │
│  │  ┌───────────────────────────────────────┐     │   │
│  │  │ Status bar: clock, connectivity,        │     │   │
│  │  │ persistent media pill                   │     │   │
│  │  ├───────────────────────────────────────┤     │   │
│  │  │                                         │     │   │
│  │  │  ONE persistent Mapbox GL instance,     │     │   │
│  │  │  mounted at shell level, always live.   │     │   │
│  │  │  "Docked" and "expanded" nav are the     │     │   │
│  │  │  same instance, resized via view state   │     │   │
│  │  │  (navExpanded: boolean) — not two         │     │   │
│  │  │  instances, not a route remount.          │     │   │
│  │  │                                         │     │   │
│  │  │  Dashboard (Home, "/")                  │     │   │
│  │  │   — config-driven pane grid             │     │   │
│  │  │   — panes: nav (docked view of the       │     │   │
│  │  │     shared instance), media, (fuel later)│     │   │
│  │  │                                         │     │   │
│  │  │  /settings→ Settings (real route)        │     │   │
│  │  │                                         │     │   │
│  │  ├───────────────────────────────────────┤     │   │
│  │  │  Global overlay layer (incoming call)    │     │   │
│  │  └───────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┘
                        │
                   WebSocket + REST
                        │
┌───────────────────────────────────────────────────┐
│           FastAPI backend (single process)            │
│  ┌───────────┐ ┌────────────┐ ┌────────────┐        │
│  │ /api/nav/*│ │/api/calls/*│ │/api/media/* │        │
│  │  (router) │ │  (router)  │ │  (router)   │        │
│  └───────────┘ └────────────┘ └────────────┘        │
│         /api/fuel/* (future, stubbed)                  │
│         WebSocket hub — calls + media events only       │
│         (nav has no push events; see Section 5.2)        │
└───────────────────────────────────────────────────┘
        │                    │
   Phone hotspot        BlueZ / oFono / PipeWire
   (nav data, iTunes    (calls + AVRCP media,
    artwork lookups)     via USB BT adapter)
```

---

## 3. Design System

Built as a shared token layer, referenced by every widget/route rather than each component styling independently.

### 3.0 Reference direction

Primary visual references: iOS 26 / CarPlay (clean, dark, restrained), and the Ferrari Luce interface (LoveFrom / Jony Ive, announced Feb 2026) — functionally grouped, pared down to essential functions, instrumentation-inspired rather than app-like. Apple's ["Designing Fluid Interfaces" design skill](https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md) is used as a reasoning reference for motion *behavior* only (see 3.4) — it is not installed as a build dependency and its spring/JS-physics implementation is explicitly not used, since it conflicts with the CSS-only motion constraint below.

Explicitly **not** pursuing, and why:
- **True translucency (`backdrop-filter`) / SVG-displacement "liquid glass" refraction** (the kokonutui.com liquid-glass-card was the visual reference) — both are GPU-costly in a way that competes with Section 6's continuous Mapbox render load. Glass is *approximated* instead (see 3.1).
- **A second, light "day" palette** — day/night stays one dark base with contrast/luminance deltas, not a light-mode UI (see 3.1).

### 3.1 Tokens

- **Color:** dark base, single strong accent family, semantic overrides where the reference material calls for it (calls, invalid states). Approximate values to refine during build:
  - `bg-base` — near-black, slightly warm rather than pure black (avoids the OLED-blue cast).
  - `surface-raised` — card/pane background at rest.
  - `surface-glass` — the *approximated* glass layer: no `backdrop-filter`; achieved via a subtle gradient (slightly lighter toward the top edge, "light catching the material"), a bright top-edge highlight border, and elevation shadow (3.1.3) rather than real blur. Reserved for surfaces that open/close (media pill, overlay banners, settings sheet) — nav gets none of this, it's the one thing always in motion.
  - `accent-amber` — primary/default accent (media and general active-state use; not exclusive).
  - `accent-red` — reserved strictly for calls / hard-interrupt / critical states. Kept separate from invalid/unusable-lane styling (3.3) so red isn't doing two jobs at once.
  - `accent-green` — positive/connected state.
  - `text-primary` / `text-secondary` — vibrancy rule: over glass/translucent-*looking* surfaces, don't drop to flat gray for secondary text — bump weight and contrast slightly instead, per the reference skill's point that color/legibility should live on a solid layer, not fade out on the translucent one.
  - **(MVP)**
- **Day/night theming:** `theme: 'day' | 'night'` flowing through the token layer, switched on system time. One dark base palette only — no parallel light theme. Expressed as a small set of luminance/contrast multiplier tokens on top of the base palette: night reduces amber/text luminance and slightly desaturates accents (glare reduction); day raises surface *contrast*, not brightness, for sunlight legibility. Build alongside the base tokens from day one — retrofitting into components that already hardcode colors is real rework. **(Polish — quick follow-up, right after base tokens exist)**
- **Typography:**
  - **SF Pro Display** — large numerals/headlines needing optical sizing at big sizes (e.g. speed readout, ETA headline figure).
  - **SF Pro Text** — general UI chrome: labels, nav banner text, settings, media metadata.
  - **DIN 1451** — reserved specifically for road-sourced data, not general use: **speed limit display** (the literal correct citation — DIN 1451 is the actual German road-sign typeface, Section 5.2), plus ETA, distance-to-maneuver, trip time, and the status-bar clock. Everything conversational stays SF Pro; this keeps the pairing meaningful (road data vs. interface chrome) rather than decorative.
  - `font-variant-numeric: tabular-nums` on all live-updating numerals (speed limit, ETA, live trip progress) to prevent digit-width reflow jitter on refresh.
  - Licensing note: SF Pro isn't licensed for general redistribution off Apple platforms; low-stakes here since this never leaves the Pi, but font files need to be self-hosted (no `-apple-system` fallback available on Linux/Chromium).
  - **(MVP)**
- **Corner-radius — concentricity, not a flat scale:** inner containers derive their radius from their parent's radius minus their own padding (Apple HIG's concentricity principle), computed per component rather than picked from a fixed `sm/md/lg` token set. This is required, not optional polish, because panes are sized in `fr`/percentages (Section 4.1) — a flat radius scale will visibly mismatch the moment a pane resizes; a formula tied to each container's own padding won't. **Rounding starts at the card/pane level** — the app shell itself is unrounded (fullscreen kiosk against the physical bezel, not a floating window). **(MVP)**
- **Elevation / shadow scale:** since real translucency is out (3.0), depth and hierarchy between layers come from a shadow + top-edge-highlight scale instead of blur radius — heavier/bigger surfaces get a stronger shadow and brighter highlight, same "material weight encodes hierarchy" idea, no compositing cost. **(MVP)**
- **Icon set:** 24×24 base grid, **1.75px stroke weight** at that grid (scales proportionally with size) — matched to SF Pro Text/Medium's stem width at the body sizes icons will mostly sit next to (~16–20px), so icons don't out-weigh or under-weigh adjacent labels. Rounded caps/joins to match SF Pro's rounded terminals. **Two treatments, not a separate rule per feature:** filled/solid for anything tappable or representing current state (media transport, call answer/decline, active lane); stroke-only at the defined weight for ambient/status icons (connectivity, inactive lane, climate). This directly extends Section 5.2's existing `active`/`inactive`/`valid:false` lane-guidance distinction to the whole icon set rather than inventing a separate treatment for lane arrows alone.
  - Lane-guidance arrows (Section 5.2): single-direction (left/straight/right) needed for MVP lane UI; combined dual-indication variants (straight+left, straight+right, left+right) follow shortly after. Single-direction: **(MVP)**. Combined variants: **(Polish — quick follow-up)**.
- **Status badge component:** the small rectangular-but-curved indicator style (reference: "TOUR"/"DRY" badges) — smaller fixed radius, border rather than fill, color = semantic state. Formalized as one reusable token-driven component but built only when a real use case needs it, not speculatively — expected to be low-frequency in this project. **(MVP, whenever first needed)**

### 3.2 Card / pane composition — avoiding the generic "RN card" look

The failure mode to design against explicitly: a single shared Card component whose *internal* layout never changes — icon, label, value, centered or stacked with identical padding regardless of widget. Swap the icon and text and every card is interchangeable; that sameness is what reads as uncustomized, independent of how good the radius or shadow looks. None of the reference material does this — the reference cluster pins big values bottom-left against a small top label rather than centering; the media card lets art sit flush in a corner with baseline-aligned text beside it; the map pane has no card chrome at all, it's edge-to-edge; the clock is circular, not a rectangle with a clock icon in it.

Rule going forward:
- The shared Card/Pane component owns **only the outer surface** — background, elevation (3.1), radius (via the concentricity formula, 3.1). It owns nothing about internal alignment, padding, or composition.
- **Each widget type defines its own internal layout** matched to its content — asymmetric alignment, a real type-scale jump between label and value, content bleeding to an edge where the reference does that — rather than reusing one centered icon+label+value template everywhere.
- **Build-order consequence:** don't extract a generic internal-layout abstraction before at least two real widgets exist to compare against each other. If two different widgets converge on an identical internal layout, treat that as a signal to reconsider, not evidence of good consistency.
- **(MVP — an architecture/build-order rule, applies from the first widget build in Phase 1 onward, not a separate task)**

### 3.3 Color discipline for state

Red is reserved strictly for calls / hard-interrupt / critical states (Section 4.4). Section 5.2's lane `valid: false` state (present but unusable for this route) uses a desaturated/outlined red rather than the same saturated call-red, so the two "something's wrong" signals don't compete for the same meaning. **(MVP)**

### 3.4 Motion policy

Native CSS transitions/animations only, restricted to `transform`/`opacity`. No animation library in v1. **(MVP — this is a constraint, not a feature to build)**

The Apple fluid-interfaces principles referenced in 3.0 are adopted at the **behavioral** level only, within that constraint — no JS physics, no spring library, no interruptible velocity re-targeting:
- Respond on pointer-down, not on release (`:active` states fire instantly).
- On interrupt, transition from the element's current computed value, not a hard reset to a fresh target.
- Anchor menus/sheets/overlays to their trigger's position, not the viewport center.
- Mirror the easing curve between a surface's open and close so the paths feel symmetric.
- Where a "spring-ish" settle is actually wanted — media pill expand/collapse, the persistent home affordance, the incoming-call banner — a tuned `cubic-bezier` easing curve approximates the feel. No drag/gesture tracking, no velocity handoff.

### 3.5 Touch & legibility baseline

- **Touch targets, not hover states** — this is a finger on glass, not a cursor. Every interactive element needs a real pressed (`:active`) state and a minimum ~44px touch target, sized as a token rather than eyeballed per component. **(MVP)**
- **Daylight legibility** is a real contrast/luminance pass for the "day" theme (3.1), not just a lighter recolor — center console mounting means direct sun glare is a real condition, not an edge case. **(MVP)**

---

## 4. Frontend Shell

**Stack:** React + Vite, React Router, lightweight state via Context or Zustand.

### 4.1 Structure

- **App Shell** — always mounted for the session lifetime.
  - Top status bar: clock, connectivity indicator, persistent expandable media pill (Section 8.3), future call-in-progress indicator space. **(MVP, minus media pill which ships with media itself)**
  - Main content area: dashboard + settings route + the persistent nav instance's expanded state.
- **Dashboard** (`/`) — config-driven pane grid (CSS Grid, sized in `fr`/percentages, not hardcoded pixels). **(MVP)**
- **`/settings`** — real route (nothing else needs to be a "real" route once nav moves to shared view state — see 4.2). **(MVP, minimal — expand later)**
- **Persistent "home" affordance** — fixed button/gesture, always available, collapses expanded nav back to docked and returns to `/`. **(MVP)**

### 4.2 Nav: shared instance, not docked/expanded components

Nav is architecturally different from other panes and is called out separately from the generic pane system below:

- **One Mapbox GL instance, mounted once at the App Shell level, never torn down for the session.** Docked (dashboard pane) and expanded (fullscreen) are the *same* canvas, resized via a shared `navExpanded: boolean` in shell state — not two components, not a route that mounts/unmounts a map, not a static-image snapshot.
- The URL can still reflect `/nav` for back-button/bookmark sanity, but nothing about that URL change actually mounts or remounts the map — it's cosmetic routing over what is functionally view state.
- This means nav is always rendering, live, whether docked or expanded — no refresh timer, no staleness, fully smooth in both modes by construction. The real cost is sustained GPU/render load and continuous tile fetching whenever the app is on screen and moving, which is why Section 6's render-on-demand tuning is load-bearing here, not optional polish.
- 3D can stay enabled in both modes if wanted — no longer required to drop to 2D for docked mode, since there's only ever the one instance regardless. **(MVP: 2D or 3D, your call — not a perf-forced decision anymore)**
- **Back button / URL sync:** since expanding nav is a view-state change (`navExpanded`), not a real route mount, the browser back button and the persistent home affordance both need to collapse `navExpanded` back to docked rather than triggering an actual navigation — otherwise the URL and the mounted UI can disagree. Decide and implement this deliberately rather than relying on React Router's default back behavior, which assumes route changes correspond to real mount/unmount. **(MVP)**
- **Chromium kiosk geolocation permissions:** browser geolocation normally requires a one-time user-facing permission prompt, which has no natural UI path in a fullscreen kiosk with no address bar. Pre-grant the permission via Chromium policy configuration (e.g. a `GeolocationDefaultUrlPolicy`-style allow-list for the app's local origin) as part of initial Chromium/kiosk setup — otherwise `useCurrentPosition()` silently returns nothing on first real boot, which looks like a nav bug but is actually a permissions gap. **(MVP — part of Section 6.1's provisioning pass, not a nav-specific task)**

### 4.3 Other Dashboard Panes

- **Media widget** — docked: compact now-playing card. Expanded: larger art, full controls. Conditionally rendered (nothing when nothing's playing). **(MVP: docked text-only card. Expanded richer view: Polish — quick follow-up.)**
- **Fuel widget** — absent/disabled in v1, see Section 9.
- Panes defined as data (widget id + size fraction) in a layout config, not hardcoded percentages. **(MVP)**

### 4.4 Global Overlay Layer

- Subscribes to the shared WebSocket connection directly, rendered at App Shell level above everything including expanded nav.
- **Calls are a hard interrupt** — incoming call banner / in-call bar renders over whatever's showing, regardless of nav state. **(MVP)**
- **Media is ambient, not an interrupt** — pill + dashboard widget, never blocks anything. **(MVP)**

### 4.5 Shared State / Connections

- WebSocket connection lives at shell level (Context/Provider), established once. **(MVP)**
- Shared state: connectivity status, active call state, current media state, `navExpanded`. **(MVP)**
- Each widget/route owns its own local UI state otherwise.

### 4.6 Boot & Loading States

- Static splash shown immediately on boot, before React mounts / WebSocket connects. **(MVP — even a plain logo screen beats a blank one)**
- Per-widget skeleton loaders, populating independently as each widget's own data arrives. **(Polish — quick follow-up, once widgets exist to have loading states)**

---

## 5. Navigation

**Status:** in scope for v1, first priority. Lives at the shell level per Section 4.2, not as a mountable route.

**Stack changes from the original standalone nav PRD:** the original PRD assumed Next.js + Vercel + Next.js API routes. This build instead uses:
- **Framework:** the shell's Vite + React + TypeScript + Tailwind + React Router setup.
- **API proxying:** `/api/nav/*` FastAPI router (Section 7.1) — keys stay server-side.
- **Deployment:** dropped — targets the Pi's local Chromium kiosk only.
- **Mount model:** the single biggest structural change from the original PRD — nav is not a route that mounts/unmounts, it's a persistent shell-level instance toggled between docked/expanded view states (Section 4.2).
- Everything else — map/routing/UI logic, external APIs, feature specs, cost constraints — carries over unchanged. `useCurrentPosition()` needs no changes.

### 5.1 External APIs & Data Sources

| Purpose | Provider | Notes |
|---|---|---|
| Routing, directions, turn-by-turn, banner instructions | Mapbox Directions API | Primary data source for all navigation logic |
| Map rendering, base style, 3D buildings | Mapbox GL JS + Mapbox Studio custom style | Style currently default Mapbox Standard, 3D toggled on |
| Live traffic | TomTom Traffic API | Confirmed coverage in UAE |
| POI / place search | Google Places API (New) — Text Search + Place Details, Pro tier fields only | Sole POI source for v1 |
| Street-level route preview | Google Street View Static API | One image per route step |
| Speed limits, lane data, destination signage | Sourced via Mapbox's banner instruction responses (OSM tags under the hood) | Parsed from Directions API response, no separate integration |

API keys held server-side, proxied via `/api/nav/*`, never shipped to the frontend bundle.

### 5.2 Feature Specifications

**Map rendering & styling** — Mapbox GL JS, custom Studio style built on Mapbox Standard. Verify landmark coverage for Dubai/Sharjah; fall back to generic extrusions where sparse. **(MVP: base style + 3D buildings. Landmark coverage verification pass: Polish — quick follow-up.)**

**Routing** — Single and multi-stop via Directions API, pin dropping, draggable waypoints, recalculation on change. **(MVP: single-destination. Multi-stop: Polish — quick follow-up, same API, mostly UI work.)**

**Turn-by-turn navigation UI** — Custom nav banner from `banner_instructions`: instruction text, distance, maneuver icon. **(MVP)**

- **Lane guidance:** parsed from `banner_instructions.sub.components`, one object per physical lane, left to right:
  ```json
  "sub": {
    "components": [
      { "type": "lane", "indications": ["left"], "active": false, "valid": true },
      { "type": "lane", "indications": ["straight"], "active": true, "valid": true },
      { "type": "lane", "indications": ["straight", "right"], "active": true, "valid": true },
      { "type": "lane", "indications": ["right"], "active": false, "valid": true }
    ]
  }
  ```
  - `indications` — arrow glyph(s); dual-indication lanes need combined icons (Section 3).
  - `active: true` — recommended lane, full-opacity accent color. `active: false` — usable, muted. `valid: false` — physically present but unusable for this route, third dimmed/outlined state.
  - Silent fallback (no lane UI) when data is absent — the expected default on much of the local road network, not an error state.
  - **(MVP: `active`/inactive states with single-direction icons. `valid: false` third state + dual-indication icons: Polish — quick follow-up, same component, additional states.)**
- **Destination signposts:** exit number, exit code, destination text where present; plain road-name + arrow fallback otherwise. **(MVP: fallback display. Full signpost card: Polish — quick follow-up.)**

**Live traffic** — TomTom flow overlay (~60s refresh), incidents as map markers/warnings. **(MVP: flow overlay. Incident markers: Polish — quick follow-up.)**

**Speed limits** — From Mapbox's bundled `maxspeed` data, persistent display. Never Google Roads API. **(MVP)**

**POI / place search** — Google Places sole source. Text Search, Autocomplete with session tokens terminated by Place Details, Pro-tier field mask only. **(MVP: Text Search + results list + tap-to-route. Autocomplete: Polish — quick follow-up. Saved/recent places: Polish — deferred, not needed for a working search loop.)**

**Street-level route preview** — Bearing calculation, Street View Static per step, swipeable panel, graceful no-coverage handling. **(Polish — deferred: real value, but not required for the core nav loop to work, and is its own multi-part build.)**

**ETA & live trip progress** — Traffic-aware initial ETA, live recalculation against position, traffic-linked updates, reroute handling, persistent display. **(MVP: initial ETA + basic live update + reroute-on-waypoint-change. Traffic-linked ETA adjustment: Polish — quick follow-up, once basic live ETA and the traffic overlay both exist.)**

**Location handling** — `useCurrentPosition()` abstraction, never call `navigator.geolocation` directly elsewhere. **(MVP)**

### 5.3 Build Phases

- **Phase 0 — Setup (MVP):** scaffold the persistent shell-level Mapbox instance; env vars for API keys; publish Studio style.
- **Phase 1 — Core map & routing (MVP):** base map, `useCurrentPosition()`, single-destination pin-drop routing (traffic-aware profile), route line + initial ETA + distance.
- **Phase 1.5 (Polish — quick follow-up):** multi-stop waypoints.
- **Phase 2 — Turn-by-turn (MVP):** nav banner, lane guidance base states, signpost fallback, speed limit display.
- **Phase 2.5 (Polish — quick follow-up):** full signpost cards, dual-indication lane icons, `valid:false` lane state.
- **Phase 3 — Traffic (MVP):** TomTom flow overlay, basic live ETA recalculation.
- **Phase 3.5 (Polish — quick follow-up):** incident markers, traffic-linked ETA adjustment.
- **Phase 4 — Search (MVP):** Text Search + results + tap-to-route.
- **Phase 4.5 (Polish — quick follow-up):** Autocomplete + session tokens.
- **Phase 5 (Polish — deferred):** Street View route preview; saved/recent places.
- **Phase 6 — Testing (MVP, ongoing not a one-time pass):** real-route testing across all of the above as they land.

### 5.4 Cost Constraints

Solo/personal usage — all APIs expected to stay within free tiers. No caching/rate-limiting infra beyond session-token discipline. Never call Google Roads API speed-limit endpoint.

**Data usage note:** earlier estimates (~150-450MB/month) assumed tile/routing usage only during active turn-by-turn. Since Section 4.2's persistent instance renders and fetches tiles whenever the map is on screen and moving — not just during an active route — treat that estimate as a floor rather than the real number. Still comfortably within any standard UAE data plan, but worth confirming against real usage once running rather than assuming the original figure holds exactly.

### 5.5 Explicit Non-Goals

- No offline functionality, no OSM Overpass POI, no camera-based sign recognition, no crowdsourced hazards, no MapLibre migration.
- External GPS module integration, standalone/Vercel deployment — deferred, not v1.
- Mapbox's paid Lane Guidance / 3D junction visualization product — not used; free OSM `turn:lanes` via Directions API is the actual source.

---

## 6. Rendering & Performance

Now load-bearing for nav specifically, since Section 4.2's persistent shared instance means the map renders continuously whenever the app is on screen, not only during active navigation.

### 6.1 Chromium / GPU configuration **(MVP — set up during initial Pi provisioning, not discovered later)**

- `gpu_mem` split (128-256MB) in `/boot/firmware/config.txt`.
- Confirm `dtoverlay=vc4-kms-v3d` active.
- Kiosk launch flags: `--kiosk --enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --use-gl=egl --disable-translate --disable-infobars --noerrdialogs --disable-session-crashed-bubble`

### 6.2 CSS / animation performance **(MVP — a constraint applied from the first component built, not retrofitted)**

- `transform`/`opacity` only for motion; never `width`/`height`/`top`/`left`/`box-shadow`.
- `will-change` on elements known to animate (expanding dashboard panes, media pill).

### 6.3 Mapbox-specific tuning

- `maxZoom`/layer complexity trimmed per zoom level in Studio. **(Polish — quick follow-up, tune once the base style is in use and any jank is actually observed, not blind upfront.)**
- **Only one live Mapbox GL instance, ever** — enforced by the Section 4.2 architecture itself, not a separate task.
- `preserveDrawingBuffer: false` in init config. **(MVP — one-line config, do it at setup.)**
- **Render-on-demand / capped redraw when stationary** — now genuinely load-bearing given the instance runs continuously. **(MVP — this is the mitigation for the continuous-rendering trade-off accepted in Section 4.2, not optional.)**
- **Pause rendering entirely when not visible at all** — e.g. while on `/settings`, where neither the docked pane nor expanded view is shown. Same render-on-demand mechanism as the stationary case, just extended to "off-screen" as an additional trigger rather than a separate system. **(MVP — cheap addition to the same mitigation above, not a new task.)**

---

## 7. Backend

**Stack:** FastAPI.

### 7.1 Structure

- Single process, single systemd unit. Feature routers: `/api/nav/*`, `/api/calls/*`, `/api/media/*`, `/api/fuel/*` (stubbed).
- **WebSocket hub carries calls + media events only** — `call:incoming`, `call:ended`, `call:state`, `media:track_changed`, `media:playback_state`, `media:artwork_resolved`. Nav does **not** push events over this hub: since the map instance lives in the same frontend process at shell level (Section 4.2), ETA/reroute state updates directly in shared frontend state as a natural consequence of the map's own logic — there's no second consumer needing to be told about it over a network boundary. Revisit only if a future widget outside the nav instance itself needs live ETA without importing the map (unlikely, not planned). **(MVP: calls + media on the hub. No nav events — this removes a task, not adds one.)**
- Routers can split into separate processes later if calls'/media's D-Bus handling demands isolation.

### 7.2 Persistence

- SQLite, WAL mode: fill-up history/fuel state (once in scope), artwork cache (Section 8.4), call logs if ever added.
- Atomic writes given the Pi may lose power abruptly on a switched outlet. **(MVP)**

### 7.3 Dev Mock Mode

- Mock/dev mode firing simulated `call:*`/`media:*` WebSocket events, independent of real Bluetooth. **(MVP — build this before real Bluetooth integration, it's what makes Tier 1 dev workflow in Section 11.2 possible.)**

---

## 8. Calls + Media (Bluetooth)

**Status:** in scope for v1, second priority after nav. Share the same Bluetooth connection and backend plumbing.

### 8.1 Stack **(MVP for the base connection; see per-feature tags below)**

- **BlueZ** — Hands-Free (HF) role for calls, phone as Audio Gateway.
- **oFono** — call state / AT commands on top of BlueZ.
- **AVRCP** — media track metadata + playback control, same connection.
- **PipeWire** — SCO voice audio for calls; general Bluetooth audio output for media.
- **Hardware:** dedicated USB Bluetooth adapter — for reliability and to avoid WiFi antenna contention.
- **Auto-reconnect:** BlueZ trust + autoconnect. **(Polish — quick follow-up: get manual pairing working first, then wire up autoconnect once the base connection is proven.)**

### 8.2 Backend Integration

- Shared service listening on D-Bus for call + AVRCP events, republishing over WebSocket. **(MVP)**
- REST endpoints: `/api/calls/{answer,reject,hangup}`, `/api/media/{play,pause,next,previous}`. **(MVP)**
- **Crash resilience:** systemd restart policy on this service. **(MVP — this is the service most likely to need it, given Bluetooth stack instability generally.)**

### 8.3 Frontend Integration

- **Calls — hard interrupt:** incoming call banner, in-call bar. **(MVP)**
- **Media — ambient:** top-bar pill + dashboard widget, conditionally rendered. **(MVP: text-only. Richer expanded view: Polish — quick follow-up, per Section 4.3.)**

### 8.4 Artwork Resolution — Layered Fallback

Two different storage shapes under one lookup key, since native and iTunes art arrive in different forms:

1. **Local cache lookup** (`artist+title` key) — checked first always.
   - **Native AVRCP art** arrives as raw image bytes from the phone — stored to disk (or as a blob in SQLite) and served via a local static route.
   - **iTunes results** are already URLs — cached as the URL directly, no re-hosting needed.
2. **BlueZ native AVRCP artwork** — checked first (free, works offline). On success, persisted per the storage split above.
3. **iTunes Search API** — only on double-miss, only if connectivity is confirmed first. No auth required.
4. **Placeholder tune icon** — if all three miss.

- `/api/media/artwork` endpoint: cache-checked, iTunes fallback on miss, returns a URL (either the local static route for native art, or the external URL for iTunes) or null.
- Non-blocking: placeholder shows immediately, art swaps in asynchronously.
- ~2-3s timeout on iTunes; background completion still updates art if it lands late.
- Stale-response guard: lookups tagged by track, late responses for a now-stale track discarded.

**(MVP: chain steps 1, 2, and 4 — cache + native art + placeholder. Step 3, iTunes fallback: Polish — quick follow-up, meaningful coverage improvement, cheap to add once the base chain works.)**

### 8.5 Audio Output (car speakers)

- **Cassette adapter** — wired 3.5mm into the confirmed-present deck, no RF. **(MVP, pending hardware sourcing — see Section 12.)**
- FM transmitter — documented fallback only if the cassette mechanism proves unreliable. **(Polish — deferred, only if needed.)**

### 8.6 Volume Handling

Day-to-day loudness is **not** a UI concern — once the cassette adapter is in, the deck treats the Pi's output as its "tape" source, and the car's own physical volume knob controls final output to the speakers exactly as it would for any AUX-equivalent source. No on-screen volume control is required for normal use.

Two things this setup does need:

- **One-time gain-staging calibration, not a feature.** The Pi's OS-level audio output level must be set once during install so it isn't too quiet (forcing the car's knob near max, weak headroom) or too hot (risking a clipped/distorted signal into the adapter regardless of the knob position). Play test audio, adjust Pi output level until it sounds clean at a normal position on the car's knob, then leave it fixed. **(MVP — a documented setup step, not code.)**
- **Call/media audio ducking — this is real code.** Since calls and media share the same Bluetooth connection and the same physical output chain (cassette adapter → car speakers), an incoming/active call must automatically lower the media stream's output level rather than competing with it at full volume, and restore it when the call ends. Implemented at the PipeWire routing layer as part of the same backend service handling call/media events (Section 8.2) — triggered by `call:state` transitions. **(MVP — without this, calls are unusable while music is playing, which defeats the point of the feature.)**

**Optional, not required for the core loop:** a lightweight on-screen control isn't needed for overall loudness, but could be worth adding narrowly for muting nav voice prompts independently of music/calls, without touching the physical knob. **(Polish — deferred, only if it turns out to be missed in practice.)**

---

## 9. Fuel Gauge — Non-Goal for v1

**Status: explicitly out of scope for v1.**

Reasoning: existing manual estimation has been reliable enough in practice; MAF-based dead-reckoning adds meaningful scope not justified until nav + calls/media are solid.

Prior planning to carry forward when revisited:
- MAF-based consumption estimation (no fuel-level OBD PID; sender-tap rejected on wiring-comfort grounds).
- Genuine ELM327 v1.5 or known-good adapter required (cheap clones confirmed unreliable on this vehicle's CAN bus).
- Calibration: liters/AED manual fill entry, soft ~80L capacity ceiling, rolling bias-correction from fill history, manual override, occasional fill-to-click as calibration anchor.
- Drift mitigation: DFCO detection, cold-start enrichment via coolant temp, MAF signal sanity checks.
- Storage: SQLite current-state table + append-only fill-up history log.
- Would surface as a dashboard widget + possible route, currently absent/disabled.
- Optional side-check once an OBD adapter exists: passive CAN sniff for HVAC fan speed exposure, as a cheap alternative to the hardware adjustable-arm mount for OEM readout access — not blocking, arm remains primary plan.

No action needed until re-prioritized.

---

## 10. Power / Shutdown (cross-cutting) **(MVP)**

- 12V outlet confirmed **switched** (dies with ignition off).
- Workflow: on-screen shutdown button → checkpoint state → `sudo shutdown -h now` → visual confirmation after ~15-20s → user turns off ignition (tap precedes ignition-off, since power cuts automatically).
- SQLite WAL mode provides baseline resilience against a forgotten tap.
- Dual-output car charger required (Pi ~3A + screen ~1-2A).

---

## 11. Dev Workflow & Tooling

### 11.1 Remote access — Tailscale + SSH **(MVP — set up during initial Pi provisioning)**

- Tailscale on Pi, laptop, phone (same account) — stable hostnames regardless of physical network.
- SSH over Tailscale for pushing updates from anywhere, not just on-hotspot.

### 11.2 Three-tier dev workflow

- **Tier 1 — Desktop browser**, sized to 1024×600, using dev mock mode (Section 7.3). Majority of build time.
- **Tier 2 — Phone**, via `vite --host` on shared WiFi, for real touch/GPS testing (`useCurrentPosition()`).
- **Tier 3 — Pi**, via Tailscale, for final validation — physical proximity to the Pi not required even at this tier.

### 11.3 Responsive design target **(MVP)**

- 1024×600 assumed (standard for 7" HDMI Pi touchscreens), pending real measurement.
- Relative units throughout (`fr`, percentages) — dashboard pane system and widget internals both built this way so the real screen is a fit-and-polish pass, not a rewrite.

---

## 12. Open Items Before Build Starts

- [ ] Confirm exact console pocket dimensions — determines final screen size (7"/1024×600 assumed).
- [ ] Hinge/tilt or adjustable-arm hardware for OEM readout access — separate hardware pass.
- [ ] USB Bluetooth adapter selection.
- [ ] Cassette adapter sourcing/testing.
- [ ] Pi case selection with active cooling.
- [ ] Design token system build-out (Section 3).
