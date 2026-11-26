# fndom — Project Mindmap
> Brand: the product is **Awense** (awense.com). The repo, package name, analytics `system='fndom'` and all localStorage keys keep the `fndom` name on purpose (renaming keys would wipe saved data). Only user-facing text says Awense.
> **Look (2026-11-02, v2): warm "super-app" style replaced Blueprint/CAD** — cream/vermilion/gold palette, 16px radius, soft shadows, pill buttons, Nunito + Noto Sans SC, SVG line icons via `components/common/AppIcon.vue` (name -> path map; no emoji anywhere in UI), lantern-glow body background. Token and class names (`--color-*`, `--font-mono`, `.bp-*`) are unchanged but now mean the soft versions; `--font-mono` is a rounded sans. Phones get `BottomTabBar.vue` (fixed, 4 tabs; `--tabbar-h` var offsets main + /house height). Workbench has hero banner (daily tip), quick-entry tiles + Surprise-me. Older notes below that say "blueprint/drafting grid/mono" are historical.
> Redesign (House + Budget, blueprint style): `/` is now a workbench home (transactions, budget tables, flat plan, itinerary). Nav = Workbench, House, Budget, Trips, Apple Pay, Admin. Flat/Bus/IPPT/Imghost/ss-key remain routable but are out of the nav. Kingshot/Douyin do not exist in this codebase.


```
fndom (Vue 3 + TypeScript + Vite + Pinia + Element Plus)
│
├── INFRASTRUCTURE
│   ├── Framework: Vue 3 (Composition API + <script setup>)
│   ├── Build: Vite 6.1.0
│   ├── Language: TypeScript ~5.7.3 (strict)
│   ├── State: Pinia
│   ├── UI Kit: Element Plus v2.9.4
│   ├── Maps: Leaflet
│   ├── Charts: Chart.js
│   ├── Video: HLS.js
│   ├── 3D: Three.js 0.187 (house planner only; separate vendor-three chunk)
│   ├── HTTP: Axios (auto-attaches JWT from localStorage)
│   ├── Deploy: Vercel (vercel.json)
│   └── Path alias: @/ → src/
│
├── BOOT SEQUENCE (src/main.ts → App.vue → AppInitializer.vue)
│   ├── createApp → Pinia → Router → ElementPlus → mount
│   └── AppInitializer: verify JWT + fetch feature flags → render app
│
├── STYLING — Blueprint / CAD (redesign)
│   ├── base.css: palette (--vt-c-* → semantic --color-*, plus --color-primary/accent/danger/success,
│   │     --font-sans IBM Plex Sans, --font-mono JetBrains Mono, --radius 2px, --grid-minor/major);
│   │     body paints an 8px/64px drafting grid. Light = drafting paper + blue ink, Dark = navy + cyan.
│   ├── main.css: .bp-label / .bp-panel (corner ticks) / .bp-dim / .bp-btn utilities; global
│   │     .room-marker + .measure-label (Three.js CSS2D elements); Element Plus overrides under
│   │     `:root, html.dark` (2px radius, no shadows, --el-bg/fill/border/text mapped to --color-*)
│   ├── typography.css: headings in mono (no longer re-imports base/main)
│   ├── Fonts: Google Fonts link in index.html
│   ├── Dark mode: .dark on <html>, toggled by theme store
│   └── Breakpoints: S=425px, M=800px, L=801px+, CALENDAR=1200px+
│
├── ROUTER (src/router/index.ts)  — 21 active routes
│   │
│   ├── PUBLIC (no auth)
│   │   ├── /                      home → dashboard/DashboardView — the Awense workbench. PUBLIC, no
│   │   │     guard: signed-out visitors see the same grid and each card shows a SignInPrompt.
│   │   │     (LandingHomeView.vue is kept on disk but no longer routed; landingGuard in
│   │   │     useRouteGuards is now unused.) /dashboard is a redirect to '/'. useNav
│   │   │     redirectToDashboard + PageBackButton default now go to '/'.
│   │   ├── /house                 house → house/HousePlannerView — 3D HDB floor plan +
│   │   │     furniture planner. PUBLIC (no guard; layout is localStorage-only).
│   │   │     meta: { fullbleed: true, hideFooter: true } — App.vue reads route.meta.fullbleed
│   │   │     (edge-to-edge, overflow hidden) and route.meta.hideFooter. Lazy chunk; three.js
│   │   │     is its own manualChunk (vendor-three).
│   │   │   ├── /todo                  todo → todo/TodoView — personal to-do list. AUTH REQUIRED (authGuard), backed by qindom
│   │   │     `/todo` (see qindom MINDMAP TODO) — optimistic updates + rollback toast, refetch on focus / every 15s
│   │   │     while visible (skipped during writes/drags) for cross-device sync. Widget: `scriptable/todo-widget.js`
│   │   │     (Scriptable accessoryRectangular) reads qindom `GET /v1/ss/todo` with the user's ss_ key. Add, check off, inline edit, delete with
│   │   │     5s Undo toast, pin max 3 (MAX_PINNED), Pointer-Events drag to reorder (within pinned / unpinned
│   │   │     group), collapsed Done section with "N done this week". Nav: TopNavigation + MobileNavigation.
│   │   ├── /camera                camera → camera/CameraDashboardView — live previews + remote start/stop for
│   │     phones running the fndom-react-native recorder app. AUTH REQUIRED (authGuard). "Add phone" claims the
│   │     6-digit code shown on the phone (ApiRoute.CAMERA.CLAIM, rate-limited server-side), grid of
│   │     CameraDeviceTile (2 per row, 1 on phones): canvas preview (createImageBitmap, newest-frame-wins),
│   │     online/REC/elapsed/battery/free space/heat/preview fps/dropped frames, quality select, start/stop,
│   │     remove (el-popconfirm); Start all / Stop all + start offset from phone acks; stale overlay after 3 s
│   │     without a frame. Nav: TopNavigation + MobileNavigation (signed in only). Protocol:
│   │     qindom/docs/camera-protocol.md (master copy).
│   ├── /404                   404 → UnauthorizedView
│   │   ├── /travel/v/:shortCode   travel-viewer (featureGuard)
│   │   ├── /bus                   bus → bus/HomeView — geolocation-based nearest busstop + live LTA arrivals
│   │
│   │
│   ├── FEATURE-GATED (featureGuard)
│   │   └── /flat                  flat → flat/HomeView
│   │
│   ├── AUTH REQUIRED (authGuard)
│   │   ├── /profile               profile → ProfileView
│   │   ├── /dashboard             → redirect '/'. (History of the widget grid, now at '/'): no
│   │   │     header/eyebrow text (the "Welcome back" placeholder block was
│   │   │     removed 2026-09-22, dashboard.eyebrow/title/subtitle locale
│   │   │     keys removed with it). Instead a draggable/resizable widget
│   │   │     grid (2026-09-22): `.dash-widgets` is a 4-col CSS grid (2 cols
│   │   │     ≤900px, 1 col ≤500px, plain media queries — no JS breakpoint
│   │   │     logic needed), each `.dash-widget-slot` sets `grid-column: span
│   │   │     var(--col-span)`. A `WIDGETS` registry (component + optional
│   │   │     `requiresRole`) drives both the render list and a persisted
│   │   │     `order: WidgetId[]` (localStorage `fndom-dashboard-widget-order`)
│   │   │     and `spans: Record<WidgetId, number>` (localStorage
│   │   │     `fndom-dashboard-widget-sizes`) — stored order/spans are merged
│   │   │     against `DEFAULT_ORDER`/per-widget `span` on load so a widget added
│   │   │     later still shows up for existing users. Two small per-slot
│   │   │     handles, both Pointer Events (mouse + touch, no dnd library):
│   │   │     top-right grip (Rank icon) drags to reorder — live-swaps
│   │   │     `order` via `document.elementFromPoint` under the pointer as
│   │   │     you drag, `TransitionGroup` (name disabled mid-drag to avoid
│   │   │     fighting the dragged item's own inline transform) animates the
│   │   │     rest sliding into place, release does a rAF-delayed settle
│   │   │     animation back to (0,0); bottom-right corner (small SVG
│   │   │     diagonal-lines grip) drags to resize — column width is measured
│   │   │     once at drag start (`grid.getBoundingClientRect().width /
│   │   │     currentColumnCount`), live span = startSpan + round(dx /
│   │   │     columnWidth), clamped to [1, currentColumnCount] so it snaps in
│   │   │     whole-column steps and auto-caps to however many columns the
│   │   │     current breakpoint has. Both handles are siblings of the actual
│   │   │     card component (not descendants), so a card's own click-to-
│   │   │     navigate keeps working untouched under the handles. Widget card
│   │   │     components (RecentTransactionsCard/TravelPlanningCard/
│   │   │     BudgetCard/AdminPanelCard/LogSearchCard) all had their old
│   │   │     `max-width: 300-340px` cap removed (`width/height: 100%;
│   │   │     box-sizing: border-box` instead) so they actually grow to fill
│   │   │     a wider `--col-span` grid cell.
│   │   │       • RecentTransactionsCard.vue — top 3 Apple Pay transactions
│   │   │         via the existing applepay store/GET /api/applepay (already
│   │   │         sorted occurred_dt desc server-side, just .slice(0,3)),
│   │   │         reusing ApplePayDashboardView's exact formatAmount/formatDate
│   │   │         helpers (duplicated, not extracted — only 2 call sites).
│   │   │         Works because Siri Shortcuts' ss_ key and the JWT session
│   │   │         already resolve to the same backend user_id (ss-key
│   │   │         generation, Apple Pay ingestion, and this GET route all key
│   │   │         off getUser(req).id or the api-key-resolved equivalent) —
│   │   │         see the qindom MINDMAP's SS API KEY MGMT / APPLE PAY
│   │   │         DASHBOARD sections.
│   │   │       • TravelPlanningCard.vue (NO LONGER on the dashboard — redesign replaced it with HousePlanCard; file kept) (2026-09-22, always shown, no role
│   │   │         gate) — simple click-through card → /travel/trips.
│   │   │       • BudgetCard.vue (2026-09-22, always shown, no role gate) —
│   │   │         simple click-through card → /budget.
│   │   │       • LogSearchCard.vue (`hasRole('SYSTEM_R5')` only) — a small
│   │   │         "Request ID → search" input that navigates to
│   │   │         /admin/log-searcher?requestId=<id> (LogSearcherView auto-runs
│   │   │         the search from that query param on mount). Same
│   │   │         admin/SYSTEM_R5 endpoint as the standalone /admin/log-searcher
│   │   │         page — this is just a shortcut entry point from the
│   │   │         dashboard, not a separate backend path. Also fetches GET
│   │   │         ApiRoute.ADMIN.RECENT_REQUEST_LOGS(3) on mount → qindom's
│   │   │         RequestLogSearch.recent() (newest N requests overall,
│   │   │         lightweight DTO, no raw tree) and lists them compactly
│   │   │         (method + path + colored status icon via
│   │   │         src/utilities/LogStatusIcon.ts — shared with
│   │   │         LogSearcherView.vue's tree rendering) below the search box;
│   │   │         fails silently on error (passive background fetch).
│   │   │       • AdminPanelCard.vue (`hasRole('SYSTEM_R5')` only) — a simple
│   │   │         card linking to /admin.
│   │   │     useNav().redirectToDashboard() now goes here (used to just
│   │   │     redirectTo('/') — changed since '/' is now the art hero, not a
│   │   │     real landing page — also affects LoginView's post-login
│   │   │     redirect and SideNavigation's dashboard menu item, both already
│   │   │     called this same helper)
│   │   ├── /iot-key               iot-key → iot/IotDeviceKeyView
│   │   ├── /ss-key                ss-key → ss-key/SsApiKeyView — generic
│   │   │     "ss_" API key management (generate/regenerate/revoke), used by
│   │   │     whichever Siri Shortcuts integration needs it — currently Apple
│   │   │     Pay only. Split out of the removed Baby Tracker feature (was
│   │   │     BabyTrackerView's "API Key" tab, backed by src/stores/babyTracking.ts
│   │   │     — the key itself was never baby-specific, just misnamed by
│   │   │     association); backend moved qindom's src/baby/BabyApiKey.* to
│   │   │     src/ss-api-key/SsApiKey.*, mounted at /api/ss-key (was /api/baby)
│   │   ├── /health                health → health/GarminHealthView — personal
│   │   │     Garmin sleep/stress dashboard, not linked in public footer
│   │   ├── /budget                budget → budget/BudgetListView — list of
│   │   │     owned + shared budget tables
│   │   ├── /budget/:sessionId     budget-table → budget/BudgetTableView —
│   │   │     Notion-style budgeting table (Category/To Buy/Bought/All tabs),
│   │   │     soft-deleted rows, owner + collaborator access (see qindom
│   │   │     MINDMAP's BUDGET section: tb_budget_table/_item/_collaborator)
│   │   └── /apple-pay             apple-pay → applepay/ApplePayDashboardView
│   │         — table of transactions logged by the bank-SMS Shortcut
│   │         (ingested via qindom's api-key-gated /v2/ss/ap/sms, see
│   │         siri-shortcut/ApplePay.v2.controller.ts; the V1 "When Apple Pay
│   │         is used" route was removed Nov 2026, old v1 rows still list),
│   │         plus manual entries, with a per-row
│   │         category el-select (filterable + allow-create, same pattern as
│   │         Budget's) and a category filter above the table
│   │
│   ├── ADMIN ONLY (systemR5Guard — SYSTEM_R5 role)
│   │   ├── /admin                 admin → AdminView
│   │   ├── /admin/users           admin-users → UserManagementView
│   │   └── /admin/features        admin-features → FeatureFlagView
│   │
│   └── COMMENTED OUT
│       └── /habit                 HabitHomeView
│
├── ROUTE GUARDS (src/hooks/useRouteGuards.ts)
│   ├── featureGuard         — check feature flag enabled
│   ├── authGuard            — check JWT token present
│   └── systemR5Guard        — SYSTEM_R5 role required
│
├── STORES (src/stores/)  — 9 Pinia stores
│   ├── authentication.ts   — login, register, OTP verify, logout, JWT; exposes rules + registerRules (computed, locale-reactive)
│   ├── layoutState.ts      — 10 dialog/nav toggles (loginDialog, loadingDialog, etc.)
│   ├── theme.ts            — dark/light mode (persisted to localStorage)
│   ├── featureFlags.ts     — fetch + cache feature flags
│   ├── itinerary.ts        — travel CRUD, file upload, collaborators;
│   │         noteItems (add/remove/update/toggle, mirrors packingItems);
│   │         addQuickAgendaItem(title, {listType?, day?, date?}) — lightweight
│   │         AgendaItem for the planner's inline quick-add inputs (replaced
│   │         the old addTodoItem), skips the AgendaDrawer file bookkeeping;
│   │         assignItemDay(item, date, day) — the "move to a day" action
│   │         (planner's scheduleItem derives `date` from `day`);
│   │         `country` is now mapped in retrieveItineraryForUpdate (was the
│   │         same silent-reset bug as `destination` below, fixed 2026-11-12);
│   │         resetItinerary() also clears destination/country/dates/shortCode;
│   │         retrieveItineraryForUpdate() maps each field individually from
│   │         the fetched record onto reactive `itinerary` state (not a bulk
│   │         Object.assign) — `destination` was added to the Itinerary
│   │         interface/save payload without adding it here, so it silently
│   │         reset to blank on every page refresh despite being saved fine.
│   │         New itinerary fields need adding to BOTH this function's
│   │         mapping list AND the save payload to actually round-trip.
│   ├── budget.ts           — budget table CRUD (tables/items/collaborators);
│   │         activeTable holds the currently open table's items in-place so
│   │         BudgetItemTable's inline el-input/-number edits mutate it directly;
│   │         deleteItem snapshots the deleted item into lastDeletedItem + a
│   │         10s setTimeout (cleared/replaced on the next delete or on
│   │         fetchTable for a different session) — undoDelete() (button click
│   │         or BudgetTableView's Ctrl+Z) hits the restore endpoint and splices
│   │         the item back into activeTable.items, re-sorted by sortOrder
│   ├── applepay.ts         — fetch/list Apple Pay transactions + updateCategory
│   │         (splices the updated row back in by its uuid-based `id`);
│   │         deleteTransaction returns the removed row snapshot (or null);
│   │         restoreTransaction(snapshot) hits APPLEPAY.RESTORE and re-inserts
│   │         it by occurredDt. Dashboard deletes have NO confirm (row button,
│   │         sheet button, long swipe) — a 6 s ring toast with Undo instead.
│   ├── todo.ts             — to-do list: tasks[] (array order = manual order), open (pinned first) / done getters,
│   │         optimistic add (temp id)/toggle/rename/togglePin/remove+restore (undo snapshot)/move+saveOrder
│   │         against ApiRoute.TODO.*; fetchTasks(background) skips while inflight/dragging; reset() on sign-out
│   ├── camera.ts           — camera relay dashboard: devices (GET /camera/device), claim/remove, one WebSocket to
│   │         `${VITE_SERVER_BASE_URL}/camera/ws/dashboard` (cookie auth; reconnect 1→30 s backoff with jitter),
│   │         live[deviceId] {online,status,statusAt}; binary frames ([1B len][deviceId][JPEG]) go to per-tile
│   │         onFrame listeners (outside reactivity) + frameAge(); sendCommand(start|stop|set_quality, id|'all');
│   │         lastStart acks → startOffsetMs. Types in interfaces/Camera.model.ts.
│   ├── housePlan.ts        — house planner: items, selection, mode (arrange|3d), camera preset,
│   │         measure state, undo/redo (100), localStorage `fndom-house-layout-v1`, import/export JSON,
│   │         custom catalogue items, conflicts (wall/item overlap via utilities/houseGeometry.ts);
│   │         toasts via useToast + i18n.global.t; displayName() localises catalogue names
│   ├── ssApiKey.ts         — generic ss_ key: fetchApiKeyStatus, generateApiKey,
│   │         revokeApiKey (stores the raw key in localStorage StorageKey.SS_API_KEY
│   │         on generate — not that the frontend actually sends it anywhere itself,
│   │         Shortcuts calls the API directly; this is just for the reveal-once UI)
│   ├── ippt.ts             — IPPT profile, activity log, badges, plan, events (localStorage persisted)
│   ├── event.ts            — FND events (commented out)
│   ├── notice.ts           — FND notices (commented out)
│   ├── iotDevice.ts        — IoT device API key: fetchApiKeyStatus, generateApiKey(deviceName), revokeApiKey
│   └── garminHealth.ts     — fetchToday(), fetchSummary(days) against qindom's /api/garmin/*
│
├── MODULES (pages / views)
│   │
│   ├── WORKBENCH  /  (home)
│   │   (route /workbench, SYSTEM_R5 only; NOT the home page. No featureFlags store/feature guards exist — gating = authGuard / systemR5Guard / landingGuard)
│   │   └── WorkbenchView.vue — dashboard landing
│   │
│   ├── AUTH
│   │   ├── LoginView.vue
│   │   └── ProfileView.vue  (/profile, auth required)
│   │
│   ├── HOUSE PLANNER  /house  — public, localStorage
│   │   ├── views/house/HousePlannerView.vue — layout (toolbar / canvas+legend / info bar) + keyboard
│   │   │     shortcuts (arrows nudge 5cm, Shift 1cm, R, Del, Ctrl+Z / Shift+Z / Y, Esc) + PNG download
│   │   ├── components/house/{PlannerCanvas,Toolbar,FurniturePicker,RoomLegend,InfoBar}.vue
│   │   │     Toolbar layout: one primary row (Arrange hammer / View eye mode toggle, picker, Rotate/Duplicate/Delete only while a piece is selected, undo/redo, save chip, Layouts, More); "More" is a popover (outside-click / Esc closes) grouped Tools / Plan / File + Shortcuts; view controls (mode-dependent: Arrange shows Fit/Zoom/Labels/Clearance/Measure, View shows 3D/Top/Eye presets + Fit/Zoom/Labels; Fit, Zoom, Labels, Clearance, Measure) live in components/house/ViewPanel.vue, an always-visible top-left stage overlay (no toggle; wraps into a strip on phones); wall-tool row appears below when active. Touch: one finger = drag/orbit, two fingers = pan OR pinch-zoom (scene.ts twoFingerLock locks to whichever the fingers do more of). Phones (<760px): ViewPanel collapses behind a "View" toggle (top-left, matchMedia), RoomLegend top-right, FurnitureMenu bottom-right (36vh max); all start collapsed.
│   │   ├── SHARE LINKS + FURNITURE MENU (2026-11-09): public route `/house/view/:token` (name `house-view`, no guard) -> views/house/HouseSharedView.vue: fetches ApiRoute.HOUSE_SHARE.VIEW (qindom /house/view/:token, public), `store.viewShared(data)` shows it read-only in View (3D) mode (housePlan.readOnly: save() skipped, user's draft held in memory and restored by `leaveShared()` on unmount; houseLayouts autosave/updateCurrent are blocked while readOnly). "Share" toolbar button -> stores/houseShares.ts + components/house/ShareDialog.vue (login required; snapshot of layoutData() -> link; copy / list / revoke; ApiRoute.HOUSE_SHARE.*). components/house/FurnitureMenu.vue = bottom-right collapsible list of pieces grouped by room with W × D × H cm (same figures as the print sheet; click = select + zoom), mounted in BOTH HousePlannerView and HouseSharedView.
│   │   ├── SAVED LAYOUTS (2026-11-04): stores/houseLayouts.ts + components/house/LayoutsDialog.vue ("Layouts" toolbar button)
│   │   │     against ApiRoute.HOUSE_LAYOUT.* (qindom /house-layout, JWT). Save as new / update current / load (one undo step via
│   │   │     housePlan.applyLayout) / delete (inline confirm). Payload = housePlan.layoutData() (same as Export JSON). Logged out:
│   │   │     dialog shows sign-in prompt; planner still uses localStorage. Cleared on sign-out.
│   │   ├── QoL (2026-11-09): double-click / double-tap a piece (interaction.ts `registerTap`, 350 ms / 24 px, works for mouse + touch + after
│   │   │     a no-move press that began a drag) -> hooks.onEdit -> select + openBuilder(true). Keys: Enter = edit shape (ignored on a focused
│   │   │     button), Ctrl/Cmd+D = duplicate.
│   │   ├── WALL SNAP + LABELS (2026-11-09): dragging a piece within 15 cm of a wall face (and running alongside it) snaps it flush —
│   │   │     houseGeometry.snapFlush (flush to walls AND other pieces' footprints, plus edge-alignment with touching neighbours; 15 cm) -> housePlan.snapDrag -> interaction onMove (Alt held = off); uses the edited walls
│   │   │     (wallBoxes). Labels (quiet style, 2026-11-10): the selected piece always shows a chip with name + "W × D × H cm" (W/D swapped when turned 90/270); the toolbar "Labels" toggle (store.showLabels, localStorage `fndom-house-labels`, default on) adds faint name-only text on pieces >= 0.9 m long. furnitureMesh adds a CSS2DObject per labelled piece (PieceLabel); `.item-label` / `.is-selected` in main.css; PlannerCanvas.labelOf builds it, re-syncs on locale change.
│   │   ├── CORNER RESIZE (2026-11-10): the selected piece (arrange mode, no measure/wall tool) shows 4 corner handles — CSS2D `.resize-handle`
│   │   │     elements in overlayGroup (constant screen size, own pointer events, 20 px touch hit area). interaction.ts: pointerdown on a
│   │   │     handle starts a `resize` (opposite corner = anchor, 5 cm grid), hooks resizable/onResizeStart/onResize ->
│   │   │     housePlan.beginResize (one undo step on first movement) / resizeTo (anchor fixed, W/D swapped when turned 90/270, moving
│   │   │     edges snap to wall + other-piece faces via houseGeometry.snapEdge, Alt = off, min 10 cm). Built-in models rebuild from w/d; pieces
│   │   │     with own `parts` are stretched from their starting shape (px/sx by w ratio, pz/sz by d ratio). Height stays in the shape editor.
│   │   ├── COPY/PASTE (2026-11-10): Ctrl/Cmd+C / X / V (HousePlannerView.onKey; only intercepted when a piece is selected / clipboard
│   │   │     has one). housePlan.clipboard (in-memory deep clone, survives layout loads) + copySelected/cutSelected/paste(at). Paste centres
│   │   │     on the mouse (interaction.cursor(), last floor point, cleared on pointerleave; 5 cm grid) else steps 30 cm down-right per paste.
│   │   ├── CONTEXT MENU + LOCK + CLEARANCE (2026-11-10): right-click (a press that doesn't move; right-drag still pans) or touch long-press ->
│   │   │     interaction hooks.onContext -> components/house/HouseContextMenu.vue (Teleport to body; edit shape / rotate / duplicate / copy /
│   │   │     cut / lock / delete on a piece, "Paste here" on empty floor; closes on outside press, Esc, wheel, resize; i18n `house.menu.*`).
│   │   │     Lock = optional `PlacedItem.locked` (persisted/exported; cleanItem keeps it; copies start unlocked): blocks drag (interaction
│   │   │     isLocked -> select only), corner handles, nudge, rotate. Clearance: houseGeometry.clearanceIssues(items, walls, thickness)
│   │   │     -> store.clearance (Map uid -> 'tight' | 'door'; toolbar "Clearance" toggle, localStorage `fndom-house-clearance`, default on).
│   │   │     'tight' = obstacle (wall/other piece) inside the 60 cm strip in front (frontZone; back-to-north at rot 0) of wardrobe /
│   │   │     fitted_wardrobe / shoe / fridge / washer; 'door' = any piece within 45 cm either side of a door opening (doorZones).
│   │   │     Shown as an amber model tint (ModelState 'warning', below conflict/selected), info-bar messages + count.
│   │   ├── DOOR CUT (2026-11-10): drawing a door opening along the inside of an existing wall segment cuts that wall around it
│   │   │     (housePlan.addWall splits the host into remainders >= 10 cm) - no erase first. (Windows were tried and removed.)
│   │   ├── QoL BATCH (2026-11-11):
│   │   │     • Size fields: InfoBar W/D/H number inputs (cm, plan orientation) -> housePlan.setSelectedSize (stretches own `parts`, keeps the piece in the plan, disabled when locked).
│   │   │     • Autosave + status: houseLayouts store tracks `savedSnapshot` (= house.exportJson() at last save/load) -> `dirty`/`status` (local|saved|unsaved|saving|error),
│   │   │       toolbar chip (click = save now) + "Autosave" toggle (localStorage `fndom-house-autosave`, default on; 2 s debounce, silent updateCurrent(true), never saves an empty plan).
│   │   │       `detach()` after sample/import/delete so those become new drafts instead of overwriting the open saved layout. beforeunload prompt in HousePlannerView while unsaved.
│   │   │     • Shortcuts sheet: ShortcutsDialog.vue (`?` / toolbar "?"), store.helpOpen; `F` = zoom to selection / fit plan (scene.zoomToRect / fitPlan, PlannerCanvas.zoomToSelection).
│   │   │     • PlannerHints.vue: empty-plan card (Sample home) + one-time tips card (store.tipsSeen, localStorage `fndom-house-tips-seen`; hidden < 760 px).
│   │   │     • Distance guides: houseGeometry.nearestGaps -> store.guidesFor -> interaction.showGuides (blue line + cm label to the nearest wall/piece on each side) while dragging/resizing.
│   │   │     • Room totals: floorplan.hdb5RoomAreas + roomIdAt (approximate rects per numbered room) -> store.roomContents; RoomLegend shows a count badge (title = contents) + "Outside rooms".
│   │   │     • Rotate handle: `.rotate-handle` CSS2D circle above the selected piece; click = +90 (rotateSelected), drag = free angle (store.beginRotate/rotateTo, one undo step): whole degrees, clicks onto 0/90/180/270 within 4°, Shift = 15° steps, Alt = no snapping. Rotation is any angle (cleanItem keeps 0.1°): InfoBar Rot field (setSelectedRotation), `[` / `]` = ±15° (rotateBy). houseGeometry: isQuarterTurn/planSize (w/d swap only at quarter turns), footprint = bounding box at free angles, itemPolygon + SAT in findConflicts (itemsOverlap/itemHitsRect); frontZone null for free angles (no 'tight' check); corner resize handles hidden for free angles (resizable().quarter); dashboard HousePlanCard draws rotated rects.
│   │   │     • Print / PDF: utilities/housePrint.ts (hidden iframe + window.print): current view image (WebGL canvas only, so no CSS2D labels/room numbers) + furniture list grouped by room.
│   │   │     • Undo toasts: store.toastUndo on delete / cut / clear all (Undo only acts if that delete is still the latest history entry).
│   │   ├── SAMPLE HOME (2026-11-07): constants/houseplan/presets.ts `couplesHome` (21 catalogue pieces for two: main bedroom,
│   │   │     gaming room = Bedroom 2, closet room = Bedroom 3, study nook, living/dining, kitchen). Toolbar "Sample home" (More row)
│   │   │     -> housePlan.applyLayout (one undo step; inline confirm when items exist). Conflict- and clearance-warning-free.
│   │   ├── WALL EDITOR (2026-11-04): store.walls = editable copy of floorplan.walls (axis-aligned only); wallTool
│   │   │     'draw'|'erase'|null + wallKind (wall|door|parapet), toolbar "Edit walls" + sub-row. interaction.ts: taps
│   │   │     place start/end (5 cm grid, snaps to wall ends, end aligns to nearby wall coords, chain until the last point
│   │   │     is tapped again); erase highlights + removes on tap. buildPlan.setWalls() rebuilds wall meshes
│   │   │     (PlannerScene.planObjs). Undo history snapshots {items, walls}; walls persist/export as optional `walls`
│   │   │     (only when edited); overlap checks + snap points read the edited walls. Esc leaves the tool.
│   │   ├── FURNITURE MODELS (2026-11-04): every piece is a list of FurniturePart (box w/ corner rounding,
│   │   │     cylinder/cone via taper, sphere/oval, roll = lying cylinder, half-round; size, position, rotation,
│   │   │     colour). Built-ins: constants/houseplan/furnitureModels.ts (generators keyed by catalogue id, sized from
│   │   │     w/d/h so the bounding box == footprint; resolveParts() = own parts -> built-in -> plain box). User pieces
│   │   │     store `parts` on the CatalogItem and on each PlacedItem (old saves without parts still load).
│   │   │     utilities/furniturePartsGeometry.ts = pure helpers (partsBounds/partsSize/normalizeParts/cleanParts) —
│   │   │     w/d/h and overlap checks always come from the parts' bounding box, so houseGeometry.ts is unchanged.
│   │   │     three/house/furnitureParts.ts builds a lit mesh per part (RoundedBoxGeometry etc.) shared by the planner
│   │   │     (furnitureMesh.ts, adds ambient+sun lights; rebuilds an entry if item.parts/dims change) and the builder.
│   │   │     components/house/FurnitureBuilder.vue = Teleport modal opened from Toolbar ("Build furniture…" /
│   │   │     "Edit shape…"), store.builder holds the draft: own small three scene (orbit, click a part to select),
│   │   │     parts list, numeric/slider editor, "Start from" any catalogue piece, mirror/duplicate, save / save+place /
│   │   │     update (editing a custom piece updates its placed copies as one undo step). Scratch check for built-in
│   │   │     footprints: see git history of this note — run partsBounds() over catalogue vs builtinParts().
│   │   ├── three/house/{scene,buildPlan,furnitureMesh,interaction}.ts — Three objects kept outside Vue
│   │   │     reactivity; ortho top-down "arrange" camera (pan/zoom) + perspective OrbitControls "3d"
│   │   │     (presets 3d/top/eye); drag via capture-phase pointerdown + stopPropagation; measure tool
│   │   │     snaps to corners within 14px; theme follows theme store (PlannerCanvas watches isDark)
│   │   ├── constants/houseplan/{floorplan,furniture}.ts — typed data (add a plan = new FloorPlan,
│   │   │     point activePlan at it); room/furniture names are i18n keys (house.rooms.rN /
│   │   │     house.furniture.<id>); utilities/houseGeometry.ts; interfaces/House.model.ts
│   │   └── dashboard/HousePlanCard.vue — item/overlap summary from the housePlan store
│
│   ├── BUS TIMINGS  /bus  — public, no guard
│   │   └── HomeView.vue           — browser geolocation → nearest busstop(s) via LTA.GET_NEARBY_BUS_STOPS
│   │                                (radius auto-expands 300/500/1000/2000m); stops rendered as an
│   │                                el-collapse accordion (single-open) — arrivals fetched lazily per
│   │                                stop on expand via LTA.GET_BUS_ARRIVAL_TIMING, cached in
│   │                                arrivalsByStop keyed by busstop_code; load status (SEA/SDA/LSD)
│   │                                shown as a colored dot + legend instead of full-text tags; DD/BD
│   │                                deck-type badge from NextBus.Type; manual refresh (current
│   │                                accordion stop only) via a floating action button (Teleport to
│   │                                body) for one-thumb mobile use
│   │
│   ├── FLAT ANALYSIS  /flat
│   │   ├── HomeView.vue           — HDB resale price lookup
│   │   ├── FlatAnalysisCard.vue     — nearby bus stops (LTA.GET_NEARBY_BUS_STOPS) + nearest MRT (LTA.GET_NEAREST_MRT_STATIONS)
│   │   ├── BusstopInformationComponent.vue
│   │   └── ResalePriceSection.vue
│   │
│   ├── TRAVEL  /travel  — /travel/trips + /travel/:sessionId need auth; /travel/draft is a guest draft
│   │   ├── TravelListView.vue     — trips grouped Happening now / Upcoming (incl. undated) / Past by
│   │   │     start/end vs today; cover cards (per-trip tint from destination hash, initial, countdown
│   │   │     badge "In N days"/"Starts today"/"On now"/"Ended", dates, N days, pax), hover/focus
│   │   │     actions (view / copy link / delete), 3/2/1-col grid, empty hero with "Create your first
│   │   │     trip". "New trip" opens CreateTripDialog. "Shared with Me" only renders when the API
│   │   │     returns shared trips (qindom's add-collaborator is a stub).
│   │   ├── TravelPlannerView.vue  — DAY-BOARD PLANNER (2026-11-12 redesign; was a 5-section side-nav).
│   │   │     Three tabs: Plan / Packing / Notes (`activeTab`, counts). Plan = `.plan-grid`:
│   │   │       • Ideas tray (left, sticky) = unscheduled agenda items (dayOf() undefined), filter
│   │   │         chips All / Things to do / Places on `listType`. QuickAddInput at the foot (title +
│   │   │         Enter -> store.addQuickAgendaItem), "Add with details" opens AgendaDrawer. Tray is
│   │   │         also a drop zone that unschedules.
│   │   │       • Day board (right) = Day 1..N always rendered (`board` computed; N = durationInDays,
│   │   │         grown to the max item day on undated trips). Each day: header (badge + date or
│   │   │         "Day n"), cards sorted by time, QuickAddInput "Add to Day n", HTML5 drop zone.
│   │   │         `outsideItems` = dated items beyond the trip's dates (dated trips only).
│   │   │       • Scheduling = `scheduleItem(item, day)` -> store.assignItemDay(item, date, day): sets
│   │   │         `day` and, when the trip has a start date, the matching `date`. Entry points:
│   │   │         drag (pointer), DayChipMenu.vue (one-tap Day grid, touch-friendly), AgendaDrawer's
│   │   │         Day select. Items keep their day number when trip dates change (`onDatesChange`
│   │   │         pins day then re-derives dates). Header: title, destination, date range, Days
│   │   │         number (disabled once dated), Pax.
│   │   │       • Cards: click = edit (AgendaDrawer), chip menu, edit, delete (toast.action Undo
│   │   │         6 s, restores and un-queues the id from _agendaIdsToDelete). No per-card
│   │   │         Saved/Unsaved badges any more.
│   │   │       • Save = AUTOSAVE ONLY (no Save buttons): watch(JSON of itinerary) -> 'pending' ->
│   │   │         1.5 s -> runSave (waits for drawer uploads, re-runs if edits landed mid-flight) ->
│   │   │         header `save-chip` (pending = click to save now / saving / saved / error).
│   │   │         beforeunload prompt while pending/saving. Drafts write localStorage instead.
│   │   │       • Map is progressive: `hasGeo` (any item with coordinates/place/city) gates a
│   │   │         "Map" toggle (topbar on desktop, FAB on phones; localStorage
│   │   │         `fndom-planner-map-open`). Desktop = 380px sticky pane, phone = replaces content.
│   │   │       • Share = TravelShareDialog.vue (link + copy, preview in new tab, access-code
│   │   │         switch + OtpInput). Nothing auto-opens; PrivacyDialog.vue is no longer mounted.
│   │   │       • Phone FAB (<=600px, Teleport to body) = "Add" + "Map", bottom offset
│   │   │         `calc(var(--tabbar-h) + 12px)` so it clears BottomTabBar.
│   │   │       • Guest draft (/travel/draft): add/edit are NOT auth-gated; AgendaDrawer gets
│   │   │         `allow-images=false` (the image CDN needs a session). Sign-in migrates the draft.
│   │   │       • Dead code dropped: table mode (TravelPlannerVTableColumns.ts no longer imported),
│   │   │         PlannerSideNav.vue + PrivacyDialog.vue unused (files kept).
│   │   ├── QuickAddInput.vue      — dashed one-line input, Enter/plus submits `submit(text)`
│   │   ├── DayChipMenu.vue        — popover grid of Day 1..N (+ date when dated) + "Remove from schedule"
│   │   ├── TravelShareDialog.vue  — share sheet (see above); emits update:challenge / login
│   │   ├── CreateTripDialog.vue   — destination (useGeocode autocomplete,
│   │   │     resolves country too) + exact-dates-or-days-count; emits a
│   │   │     CreateTripPayload, caller decides guest-draft vs. authenticated
│   │   │     create (see TravelLandingView.vue / TravelListView.vue)
│   │   ├── PackingSuggestionPanel.vue  — "Things to bring" chip suggestions
│   │   │     (unchanged — not geo-content, stays chip-list + checklist)
│   │   ├── NoteSuggestionPanel.vue     — "Things to note", fetches
│   │   │     ApiRoute.SUGGESTION.NOTES(country); mandatory/optional badge +
│   │   │     deadline copy + "open official site" link — never a submit action
│   │   ├── TravelViewerView.vue   — public share viewer: full-bleed map hero (title, destination,
│   │   │     pills: dates / N days / travellers / views), sticky "Day" jump strip (chips scroll to
│   │   │     `#viewer-day-<key>`, expand a collapsed day first) + expand/collapse all, day timeline
│   │   │     (date heading + "Day N" sub-label, per-item "Open in Maps" Google Maps link when the
│   │   │     item has coordinates), bookings (only when returned), i18n'd CTA bar, PIN gate.
│   │   │     Uses useTravelDayGroups with {startKey, durationInDays} so day numbers match the planner.
│   │   ├── TravelMapView.vue      — confirmed-items map: day-colored pins/route lines, category+day
│   │   │     filter chips, fullscreen toggle, stepper nav, `startKey` prop for day numbers.
│   │   │     TILES (2026-11-12): street = OpenStreetMap standard tiles (default; CARTO Voyager was
│   │   │     dropped — it now needs an API key and rendered blank), satellite = Esri World Imagery +
│   │   │     labels. Leaflet attribution control ON (bottom-right, OSM policy) and zoom control
│   │   │     top-left under the fullscreen button; tile choice persisted in localStorage
│   │   │     `fndom-travel-map-tiles`. Controls styled with theme tokens (dark-mode safe).
│   │   │     (`recommendations` prop / ghost pins / place-detail-panel were removed with Trip
│   │   │     Recommendation.) `fitToVisible()` bounds the confirmed-items `markerGroup`.
│   │   ├── AgendaDrawer.vue       — props dayCount/startKey/allowImages; Date field replaced by a
│   │   │     Day select (0 = unscheduled); the planner derives `date` from `day` on save
│   │   ├── BookingDrawer.vue      — built, wired in the store, still unmounted (viewer only shows
│   │   │     Bookings when the API returns some)
│   │   ├── PrivacyDialog.vue      — unmounted since 2026-11-12 (TravelShareDialog replaced it)
│   │   ├── PlannerSideNav.vue     — unmounted since 2026-11-12
│   │   └── TravelPlannerVTableColumns.ts — dead (table mode removed)
│   │
│   ├── BUDGET  /budget  — auth required
│   │   ├── BudgetListView.vue     — "My Tables" + "Shared with Me" grids,
│   │   │     create-table dialog (name + a required main-category/template
│   │   │     select: home_reno/wedding/travel/other — BudgetTemplates.ts;
│   │   │     fixes which preset category list the table's items get, see
│   │   │     BudgetTableView below); template icon (BudgetIconSvg.ts, via
│   │   │     TravelIcon.vue) shown on each card and in the create dialog
│   │   ├── BudgetTableView.vue    — table header (inline-editable name, owner
│   │   │     only, template icon), collaborator avatars + Share dialog (invite
│   │   │     by email, owner-only add/remove), Category/To Buy/Bought/All tab
│   │   │     bar, sum-budget/sum-actual footer (per active tab, hidden on
│   │   │     Category); categoryOptions computed merges the table's template
│   │   │     preset list with any custom categories already used, passed down
│   │   │     to every BudgetItemTable instance; window keydown listener
│   │   │     (mounted/unmounted here, not per-row-table) turns Ctrl/Cmd+Z into
│   │   │     budgetStore.undoDelete() whenever canUndoDelete is true
│   │   └── BudgetItemTable.vue    — reusable row renderer (used for the 3 flat
│   │         tabs and once per category group under Category); every cell is
│   │         always-editable (el-input/-input-number bound straight to the
│   │         store item, saved on blur/change — no separate edit-mode toggle);
│   │         category is an el-select (filterable + allow-create) over the
│   │         categoryOptions prop, not free text; status is a clickable el-tag
│   │         toggling to_buy/bought (toast.success on change, via useToast);
│   │         trailing "+ add" row creates a new item inline; delete calls
│   │         budgetStore.deleteItem then toast.action(...) — a ring+Undo-button
│   │         toast (see common/Toast.vue below), duration BUDGET_UNDO_WINDOW_MS,
│   │         whose button calls budgetStore.undoDelete(). BudgetTableView's
│   │         window keydown listener (Ctrl/Cmd+Z) calls the same store method
│   │         independently — both are safe to race (undoDelete() no-ops once
│   │         lastDeletedItem is already cleared) — and additionally calls
│   │         toast.dismissActionToasts() so a stale Undo button doesn't linger.
│   │
│   ├── APPLE PAY  /apple-pay  — auth required
│   │   └── ApplePayDashboardView.vue — flat el-table of transactions ingested
│   │         from the Shortcut, newest first; a category filter (el-select)
│   │         above narrows the table + the total-spent summary block; each
│   │         row's Category cell is its own el-select (filterable +
│   │         allow-create, categoryOptions merges ApplePayCategories.ts'
│   │         starter list with whatever's already been used), calling
│   │         applepay store's updateCategory on change — v-model binds
│   │         straight to the row object from the store's array, same
│   │         mutate-in-place pattern as BudgetItemTable
│   │
│   ├── MEAL  /meal  — auth + feature
│   │   └── HomeView.vue
│   │
│   ├── SLEEP  /sleep  — auth + feature
│   │   └── HomeView.vue           — sleep log + AI screenshot parsing
│   │
│   │
│   ├── IMAGE CDN  /imghost  — SYSTEM_R5
│   │   └── HomeView.vue           — drag-drop upload → shareable Telegram CDN URL
│   │
│   ├── IPPT / STRIDER  /ippt  — SYSTEM_R5 + feature:ippt
   │   └── HomeView.vue           — single-SFC with 5-tab internal nav (dashboard, log, calculator, schedule, plan) + pushed achievements/profile; onboarding modal on first open
   │
   ├── ADMIN  /admin  — SYSTEM_R5 only
│   │   ├── AdminView.vue           — card launchpad; "Marketplace Pricing"
│   │   │     (/admin/llm-pricing → MarketplacePricingView.vue) and "Trip
│   │   │     Recommendations" (/admin/suggestions → SuggestionAdminView.vue)
│   │   │     cards were removed (2026-09-22) — Marketplace Pricing's backend
│   │   │     (/api/llm/admin/*) was never actually implemented; Trip
│   │   │     Recommendations' activity/place admin CRUD + the Travel
│   │   │     Planner's "explore the map" suggestion pins were removed
│   │   │     together (see TRAVEL section above and qindom MINDMAP's
│   │   │     SUGGESTION section) — Packing/Note suggestions (a separate,
│   │   │     non-admin sub-feature) are untouched.
│   │   ├── UserManagementView.vue
│   │   ├── TgImageAdminView.vue    (/admin/tg-image)
│   │   ├── AnalyticsAccessView.vue  (/admin/analytics-access) — per analytics system: grant/revoke
│   │   │     viewers by awense.com username, edit allowed origins (ApiRoute.ANALYTICS.ADMIN_*).
│   │   ├── LogSearcherView.vue  (/admin/log-searcher) — paste a req_xxxxx
│   │   │     Request ID, hits GET ApiRoute.ADMIN.SEARCH_REQUEST_LOG →
│   │   │     qindom's RequestLogSearch (parses qindom.out.log on the EC2 box,
│   │   │     no DB/persistence involved). Renders each match's already-redacted
│   │   │     ASCII tree verbatim in a <pre> block inside el-collapse (newest first).
│   │   │     Reads a ?requestId= query param on mount and auto-searches — used
│   │   │     by the Dashboard's LogSearchCard "search → redirect here" flow.
│   │   └── TelegramLogSubscriptionView.vue  (/admin/telegram-log-subscriptions) —
│   │         real matrix: one row per backend module (imghost/analytics/applepay/
│   │         etc, ~20+ from qindom's TelegramLogModules.ts registry — row label
│   │         shows the short key, full label on hover), one column per subscribed
│   │         Telegram chat (every whitelisted admin who's DM'd the CDN bot /start
│   │         — qindom's tb_tg_stats_whitelist, usually just 1-3). Modules as rows
│   │         (not columns) deliberately — with 20+ modules but few chats, a wide
│   │         table with one column per module didn't fit/scroll well; rows scroll
│   │         vertically instead, which is normal. <table> still wrapped in
│   │         overflow-x:auto with the module-label column `position:sticky` (in
│   │         case chat count ever grows past what fits). Each cell is an
│   │         el-switch, toggled immediately on @change (optimistic, revert + toast
│   │         on failure, no Save button), keyed by `${chatId}:${moduleKey}` for
│   │         per-cell loading state. GET ApiRoute.TELEGRAM_LOG_SUBSCRIPTION.ADMIN_LIST
│   │         returns the full { modules, chats } payload (unchanged shape — only
│   │         the frontend's row/column orientation changed); POST
│   │         ADMIN_TOGGLE(chatId, moduleKey) flips one cell and returns the
│   │         refreshed data. Errors always still alert every chat regardless of
│   │         that chat's per-module toggle.
│   │
│   ├── IOT DEVICE KEY  /iot-key  — auth required
│   │   └── IotDeviceKeyView.vue   — generate/regenerate/revoke API key for /iot device auth
│   │         (mints keys via qindom's /api/iot-key/api-key; shown once on generation)
│   │
│   └── GARMIN HEALTH  /health  — auth required, personal (not in public footer)
│       └── GarminHealthView.vue   — stat cards (sleep score, resting HR, body
│             battery, current stress; latter two taken from the most recent
│             *non-null* intraday poll, not just the last row — polls fetch
│             stress/bodyBattery/HR independently and any one can be null)
│             + today's intraday chart with a metric filter (stress/body
│             battery/heart rate/all — stress & body battery share a 0-100
│             left axis, heart rate gets its own right axis; high-stress
│             windows highlighted on the stress line) + sleep/stress trend
│             chart (7/14/30-day toggle); pull-based only, no push notifications
│
├── COMPONENTS (src/components/)
│   ├── illustrations/
│   │   └── HeroIllustration.vue   — hand-drawn ink-wash SVG (mountains, a
│   │         wind-blown-robe traveler, birds, seal mark) — UNUSED, no
│   │         importers anywhere in src/ (this description previously said
│   │         "globe wireframe + flight arcs + city pins", which doesn't match
│   │         the file's actual contents — already stale before the home page
│   │         became the PNG-based art hero above; ask before deleting)
│   ├── common/
│   │   ├── AppBreadcrumb.vue
│   │   ├── EmptyState.vue
│   │   ├── OtpInput.vue
│   │   ├── StatPill.vue
│   │   ├── Toast.vue             — one toast card: type icon (success/error/
│   │   │     info/warning — useToast is the ONLY toast system: no ElMessage anywhere; ElMessageBox stays for confirm dialogs) or, when `ring: true`, a circular SVG countdown (drains
│   │   │     full→empty over `duration` via a CSS stroke-dashoffset
│   │   │     transition, restarted per-instance on mount since each toast is
│   │   │     a fresh component instance) in its place; optional action button
│   │   │     (calls the action then emits dismiss)
│   │   └── ToastHost.vue         — mount once (App.vue, above LoginView) —
│   │         Teleport-to-body list of Toast.vue driven by useToast()'s shared
│   │         `toasts` ref, fixed top-center at the same 96px offset as the
│   │         .el-message override in assets/main.css (so anything still using
│   │         raw ElMessage lines up with this). This is the app's single
│   │         standardised toast surface — call useToast() from anywhere
│   │         instead of ElMessage or a bespoke per-feature toast component
│   │         (the budget module's delete/undo toast used to be one; see
│   │         BudgetItemTable above)
│   ├── navigations/
│   │   ├── TopNavigation.vue      — 64px sticky header: SVG mark + mono AWENSE wordmark, primary
│   │   │     links (Workbench, House, Budget, Trips, Apple Pay when authed, Admin when SYSTEM_R5), EN/中 toggle,
│   │   │     SVG theme toggle, login/profile, hamburger (<800px) → MobileNavigation. Sticky now
│   │   │     works: main.css uses overflow-x:clip (was hidden, which made #app a scroll container).
│   │   │     The home-route fixed-overlay / hide-on-scroll hack was removed (App.vue no longer
│   │   │     listens to scroll).
│   │   ├── FooterNavigation.vue   — modules (House/Budget/Apple Pay/Admin) + general links; hidden on meta.hideFooter routes
│   │   ├── MobileNavigation.vue   — numbered drawing-index menu: Home, House, Budget, Apple Pay, Admin
│   │   └── SideNavigation.vue     — (commented out)
│   ├── dialogs/
│   │   ├── LoadingDialog.vue
│   │   ├── LoginAdvisoryDialog.vue
│   ├── cards/
│   │   ├── flat/FlatAnalysisCard.vue
│   │   ├── flat/BusstopInformationComponent.vue
│   │   └── flat/ResalePriceSection.vue
│   ├── map/
│   │   └── FlatMapComponent.vue   — Leaflet map
│   ├── clocks/UtcClock.vue
│   ├── icons/IconWithText.vue
│   └── wrappers/RoleGuard.vue
│
├── ANALYTICS (src/analytics/)
│   ├── index.ts               — track() core; fetch POST to VITE_SERVER_BASE_URL/analytics/collect (contract v1: v, screen.{width,height,breakpoint S|M|CALENDAR|L, size small|medium|large}); system='fndom'
│   ├── DASHBOARDS: /analytics (AnalyticsHomeView, authGuard) lists systems from stores/analytics.ts
│   │     (GET ApiRoute.ANALYTICS.SYSTEMS — server returns all for SYSTEM_R5, granted ones otherwise);
│   │     /analytics/:systemKey (AnalyticsDashboardView) — KPI tiles, chart.js hourly line (24h/7d),
│   │     horizontal bars + tables for sessions by breakpoint and by size, top pages. "Analytics" nav
│   │     link (Top/MobileNavigation) shows when the list is non-empty; loaded in AppInitializer on login.
│   └── events.ts              — Analytics.{pageView, authLogin, authRegister, authVerified, authLogout, featureAccess, buttonClick}
│
├── COMPOSABLES (src/composables/)
│   ├── usePermission.ts       — role-based access (module + system level)
│   ├── useCityLabel.ts        — city label management
│   ├── useTravelDayGroups.ts  — DAY MODEL (2026-11-12): useTravelDayGroups(items, ctx?{startKey,
│   │         durationInDays}) -> dayOf(item) (explicit `day` wins, else date measured from
│   │         startKey, else legacy distinct-date numbering), groupedByDate (keyed by date, or
│   │         `__day_N` for undated trips, `__tbc__`), collapse helpers. Standalone exports:
│   │         resolveStartKey(itineraryDateRaw, startDate) -> local YYYY-MM-DD of day 1,
│   │         dateKeyForDay, dayForDateKey, formatShortDate, sortByTime, getItemTimeMinutes.
│   │         Used by planner, viewer and TravelMapView (`startKey` prop). Labels via i18n.global.
│   ├── useGeocode.ts          — searchPlaces() (proxies /api/geocode, now
│   │         surfaces `country` too); dead nearbyPOIs()/POICategory direct-
│   │         to-Nominatim code removed. (useActivitySuggestions.ts /
│   │         usePlaceSuggestions.ts — the "explore the map" suggestion
│   │         fetchers for Things-to-do/Places-to-visit — were deleted
│   │         2026-09-22 with the Trip Recommendation feature; see TRAVEL
│   │         section above.)
│   ├── useTravelExport.ts     — export itineraries (JSON/CSV)
│   ├── usePageTracking.ts     — router.afterEach → Analytics.pageView; called in App.vue
│   ├── useKeyboardViewport.ts — called once in App.vue. Mirrors window.visualViewport into
│   │         <html> CSS vars --vv-height / --kb-inset (+ `kb-open` class) so `.el-drawer.btt`
│   │         sheets (main.css) sit ON the iOS keyboard and cap to the visible height; focusin
│   │         inside a drawer body scrolls the field to centre after the keyboard animates.
│   │         Pairs with: viewport meta `interactive-widget=resizes-content` (Android) and the
│   │         main.css touch rule forcing 16px text fields (stops iOS focus-zoom). New bottom
│   │         sheets get this for free; don't set vh-based max-heights on them (use --vv-height).
│   └── useToast.ts            — module-level (not Pinia) reactive `toasts`
│         list + push/dismiss; `success/error/info(message)` for simple
│         one-off feedback, `action(message, {label, onClick}, opts)` for a
│         toast with a button (optional `ring: true` + `duration` to also draw
│         a countdown ring around the icon — see common/Toast.vue). Rendered
│         by the single <ToastHost /> mounted in App.vue — this replaced a
│         mix of raw ElMessage() calls and a one-off budget-only UndoToast
│         component; new code should call this instead of ElMessage directly
│
├── HOOKS (src/hooks/)
│   ├── useRouteGuards.ts      — featureGuard, authGuard, systemR5Guard
│   ├── useNav.ts              — redirectTo*, navigation helpers
│   ├── useTokenVerification.ts — JWT validation on app init
│   ├── useBreakpointManager.ts — responsive breakpoint detection
│   └── useProfileManager.ts   — user profile management
│
├── HTTP / API (src/interceptors/ + src/constants/ApiRoute.ts)
│   ├── HttpClient.ts          — Axios + auto JWT Bearer header injection
│   └── ApiRoute.ts            — all endpoint constants
│       ├── /api/auth/*        — preflight, login, register, verify, password
│       ├── /api/pfp/*         — profile photo, country
│       ├── /api/lta/*         — bus services, live bus arrival timing (/timing), nearby bus stops, nearest MRT
│       ├── /api/itinerary/*   — CRUD, share, collaborator, challenge
│       ├── /api/budget/*      — table CRUD, item CRUD (soft delete + a restore
│       │         endpoint that flips record_status back to 'A', used by the
│       │         10s undo-delete toast/Ctrl+Z), collaborator add/remove by
│       │         email (owner only); owner or active collaborator can
│       │         read/edit items (see qindom's Budget.service.ts assertAccess).
│       │         Items never expose their auto-increment DB id — every item
│       │         response's "id" is actually tb_budget_item.uuid (generated on
│       │         create, same pattern as tb_budget_table.session_id), and
│       │         that's what /item/:itemId/... routes match on. Table list
│       │         summaries (GET /api/budget) similarly carry only sessionId,
│       │         never the table's own auto-increment id.
│       ├── /api/applepay/*    — GET list + POST :id/category (mw.auth, the
│       │         web dashboard), backed by the same ApplePayService as
│       │         qindom's api-key-gated /v2/ss/ap/sms (the Shortcuts
│       │         ingestion endpoint) — same uuid-as-public-id pattern as
│       │         budget items; occurred_dt is stamped server-side (Date.now())
│       │         rather than trusted from the Shortcut's own date format
│       ├── /api/file          — upload, delete
│       ├── /api/feature/*     — flags, toggle, admin
│       ├── /api/auth/admin/*  — user list, role update
│       ├── /api/meal/*        — log, range, photo
│       ├── /api/sleep/*       — log, bulk, parse-screenshot
│       ├── /api/iot-key/*     — IoT device API key generate/status/revoke
│       ├── /api/garmin/*      — today (intraday), summary?days=N (history)
│       ├── /api/suggestion/packing, /api/suggestion/note — Things-to-bring/
│       │         Things-to-note suggestions (Packing/Note sub-features only —
│       │         Suggestion activity/place + /api/places were removed
│       │         2026-09-22 with the Trip Recommendation admin feature)
│       └── /v1/llm/models    — the only surviving MARKETPLACE route; the
│                 rest (wallet/chat/api-key/admin pricing) were never backed
│                 by a real qindom endpoint — admin pricing UI removed
│                 2026-09-22, consumer chat/wallet UI left as-is (out of scope).
│                 2026-09-26: qindom moved this router from a bare /api/llm
│                 mount to /v1/llm (matching /v1/ss versioning) — ApiRoute.ts
│                 and HttpClient.ts's CHAT_ENDPOINTS matcher updated to match.
│                 Telegram Storage (/telegram) and Scenic Spots (/scenic)
│                 modules removed from fndom entirely the same day — their
│                 qindom backends (src/telegram, src/scenic) no longer exist
│                 (not moved, deleted), so the frontend routes/views/store/
│                 workbench tiles/locale strings were dead code hitting 404s.
│
├── UTILITIES (src/utilities/)
│   ├── StorageUtils.ts        — localStorage wrapper; getVisitorSessionId() used by analytics
│   ├── DateUtils.ts           — formatting, duration
│   ├── FileUtils.ts           — file ops
│   ├── GeneratorUtils.ts      — UUID generation
│   ├── HeartbeatUtils.ts      — fetch-based heartbeat; sends system='fndom'; active via AppInitializer
│   ├── ListUtils.ts           — array helpers
│   └── lunarCalendar.ts       — Chinese lunar calendar conversion
│
├── INTERFACES (src/interfaces/)  — 16 TypeScript interface files
│   ├── Itinerary.ts / AgendaItem.ts / ItineraryBooking.ts / FileWithPreview.ts
│   ├── ResaleTransaction.model.ts
│   ├── BusstopInformation.model.ts / BusRouteInformation.model.ts / MrtStationInformation.model.ts / BusArrivalTiming.model.ts
│   ├── OneMapResult.model.ts
│   ├── LoginForm.model.tsx / RegisterForm.model.ts
│   ├── FndManageEvent.model.tsx / FndManageNotice.model.tsx
│   └── Garmin.model.ts — GarminToday, GarminDailySummary, GarminSleep, GarminIntradayPoint, GarminHighStressWindow
│
├── CONSTANTS (src/constants/)
│   ├── ApiRoute.ts            — all API endpoints
│   ├── Country.ts             — 197 countries
│   ├── TravelCategories.ts    — travel categories with emoji
│   ├── Roles.ts               — role definitions + GRANTABLE_ROLES
│   └── Breakpoint.ts          — S/M/L/CALENDAR breakpoints
│
├── VALIDATIONS (src/validations/)
│   ├── LoginFormRules.ts          — getLoginFormRules(t) — accepts t() for i18n messages
│   └── RegisterFormRules.ts       — getRegisterFormRules({ password }, t) — accepts t() for i18n messages
│
├── ROLES & PERMISSIONS
│   ├── Format: {MODULE}_{LEVEL}
│   ├── Modules: TRAVEL, SLP, SYSTEM (PPHS removed Nov 2026; stored PPHS_R* roles are inert)
│   ├── Levels: R3 (officer), R4 (admin), R5 (super admin)
│   ├── SYSTEM_R5 = full platform access
│   └── Checked via usePermission composable + RoleGuard.vue wrapper
│
└── ENVIRONMENTS
    ├── Dev: npm run dev (Vite HMR)
    ├── Build: npm run build (vite build + vue-tsc)
    └── Deploy: Vercel (vercel.json)
```

## Workbench (2026-11-02, route '/')
DashboardView widgets: `transactions` (RecentTransactionsCard, span 2), `todo` (TodoCard: top 3 open tasks, pinned first, from the todo store), `budget` (BudgetCard: 3 newest tables with
actual/budget bar, via budget store), `housePlan` (HousePlanCard: SVG thumbnail of the saved layout from the housePlan
store), `itinerary` (ItineraryCard: soonest 3 non-finished trips, HttpClient ITINERARY.GET_ALL, links /travel/:id),
`adminPanel` + `logSearch` (SYSTEM_R5). Shared `SignInPrompt.vue` is the signed-out state. Header strip uses
`dashboard.workbench.*` keys. At <=500px every slot is forced to span 1 (a span-2 in a 1-col grid would add a column).
