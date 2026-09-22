# fndom — Project Mindmap

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
│   ├── HTTP: Axios (auto-attaches JWT from localStorage)
│   ├── Deploy: Vercel (vercel.json)
│   └── Path alias: @/ → src/
│
├── BOOT SEQUENCE (src/main.ts → App.vue → AppInitializer.vue)
│   ├── createApp → Pinia → Router → ElementPlus → mount
│   └── AppInitializer: verify JWT + fetch feature flags → render app
│
├── STYLING
│   ├── Element Plus (light + dark CSS vars)
│   ├── main.css — CSS custom properties
│   ├── typography.css — fonts
│   ├── Dark mode: .dark on <html>, toggled by theme store
│   └── Breakpoints: S=425px, M=800px, L=801px+, CALENDAR=1200px+
│
├── ROUTER (src/router/index.ts)  — 21 active routes
│   │
│   ├── PUBLIC (no auth)
│   │   ├── /                      home → travel/TravelLandingView — now a
│   │   │     full-screen art piece in place of the old marketing/CTA content
│   │   │     (hero text/buttons/feature cards/CTA banner all removed, not
│   │   │     just hidden), but TopNavigation/FooterNavigation are still shown
│   │   │     as normal (only 'home' is in App.vue's wrapper--fullbleed route
│   │   │     list, to drop the wrapper's padding/centering — nav/footer
│   │   │     themselves are NOT conditionally hidden for this route).
│   │   │     /mountain-ridges.png (ink-wash background, object-fit:cover)
│   │   │     + /main-character-transparent.png (the purple-robed figure,
│   │   │     absolutely positioned over the peak, left:50.5%/bottom:26% —
│   │   │     tuned by eye against the old flattened hero-explore.png
│   │   │     composition, re-check if either PNG is replaced). .art-hero is
│   │   │     NOT flex:1 — this app's html/body/#app have no height:100%
│   │   │     anchor anywhere, so a flex-fill child collapses to ~0 height
│   │   │     here (learned the hard way). Desktop: `height: 100vh` —
│   │   │     deliberately taller than the header+footer-adjusted viewport,
│   │   │     so the footer sits below the fold until the user scrolls
│   │   │     (a scroll cue, not a bug). Mobile (max-width:640px) overrides
│   │   │     back to `calc(100vh - 80px - 220px)` — same calc App.vue's own
│   │   │     default .wrapper rule uses for the same header/footer heights —
│   │   │     so it still fits in one screen with no scroll there.
│   │   │     Hovering (desktop) or clicking/tapping (touch — an isFloating
│   │   │     ref toggled on the img, since touch has no hover) the character
│   │   │     triggers a CSS keyframe bob (translateY; :hover and .is-floating
│   │   │     share one animation class) AND, on click/tap specifically:
│   │   │     logged-out → opens the login dialog (layoutStore.loginDialog.
│   │   │     setTrue()), same as the header's Login button; logged-in →
│   │   │     useNav().redirectToDashboard() → /dashboard (placeholder content
│   │   │     only for now, see dashboard/DashboardView.vue below — the
│   │   │     character is this page's entry point into the app either way).
│   │   │     Header hide-on-scroll-down / show-on-scroll-up (home only): App.vue
│   │   │     listens on `window` (a scroll listener, not @scroll on .wrapper —
│   │   │     see the CSS-quirk note below) and passes a `hidden` prop into
│   │   │     TopNavigation, which applies `.header--hidden{transform:
│   │   │     translateY(-100%)}`. TopNavigation ALSO applies `.header--overlay
│   │   │     {position:fixed}` for this route specifically (see next bullet
│   │   │     for why `position:sticky` alone doesn't work) — everywhere else
│   │   │     the header is untouched (still plain `position:sticky`).
│   │   ├── /404                   404 → UnauthorizedView
│   │   ├── /travel/v/:shortCode   travel-viewer (featureGuard)
│   │   ├── /bus                   bus → bus/HomeView — geolocation-based nearest busstop + live LTA arrivals
│   │
│   │
│   ├── FEATURE-GATED (featureGuard)
│   │   ├── /pphs                  pphs → hdb/HomeView
│   │   └── /flat                  flat → flat/HomeView
│   │
│   ├── AUTH REQUIRED (authGuard)
│   │   ├── /profile               profile → ProfileView
│   │   ├── /dashboard             dashboard → dashboard/DashboardView — mostly
│   │   │     still placeholder (eyebrow/title/subtitle, more to come), but
│   │   │     now also renders dashboard/RecentTransactionsCard.vue first
│   │   │     (top-left, normal flow not absolute-positioned) — top 3 Apple
│   │   │     Pay transactions via the existing applepay store/GET /api/applepay
│   │   │     (already sorted occurred_dt desc server-side, just .slice(0,3)),
│   │   │     reusing ApplePayDashboardView's exact formatAmount/formatDate
│   │   │     helpers (duplicated, not extracted — only 2 call sites). Works
│   │   │     because Siri Shortcuts' ss_ key and the JWT session already
│   │   │     resolve to the same backend user_id (ss-key generation, Apple
│   │   │     Pay ingestion, and this GET route all key off getUser(req).id
│   │   │     or the api-key-resolved equivalent) — see the qindom MINDMAP's
│   │   │     SS API KEY MGMT / APPLE PAY DASHBOARD sections.
│   │   │     useNav().redirectToDashboard() now goes here (used to just
│   │   │     redirectTo('/') — changed since '/' is now the art hero, not a
│   │   │     real landing page — also affects LoginView's post-login
│   │   │     redirect and SideNavigation's dashboard menu item, both already
│   │   │     called this same helper)
│   │   │     Also renders dashboard/LogSearchCard.vue next to the transactions
│   │   │     card, but only `v-if="hasRole('SYSTEM_R5')"` (usePermission) —
│   │   │     a small "Request ID → search" input that navigates to
│   │   │     /admin/log-searcher?requestId=<id> (LogSearcherView auto-runs
│   │   │     the search from that query param on mount). Same admin/SYSTEM_R5
│   │   │     endpoint as the standalone /admin/log-searcher page — this is
│   │   │     just a shortcut entry point from the dashboard, not a separate
│   │   │     backend path. Also fetches GET ApiRoute.ADMIN.RECENT_REQUEST_LOGS(3)
│   │   │     on mount → qindom's RequestLogSearch.recent() (newest N requests
│   │   │     overall, lightweight DTO, no raw tree) and lists them compactly
│   │   │     (method + path + colored status icon via src/utilities/LogStatusIcon.ts
│   │   │     — shared with LogSearcherView.vue's tree rendering) below the search
│   │   │     box; fails silently on error (passive background fetch).
│   │   │     Also renders dashboard/AdminPanelCard.vue (same
│   │   │     `hasRole('SYSTEM_R5')` guard) — a simple card linking to /admin.
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
│   │         — table of transactions logged by the "When Apple Pay is used"
│   │         Shortcut (ingested via qindom's api-key-gated /v1/ss route, see
│   │         siri-shortcut/ApplePay.v1.controller.ts), with a per-row
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
│   │         addTodoItem(title, category?, coordinates?) — lightweight
│   │         unscheduled AgendaItem for Things-to-do/Places-to-visit,
│   │         skips the full AgendaDrawer file-upload bookkeeping;
│   │         assignItemDay(item, date, day) — the "assign to a day" action;
│   │         retrieveItineraryForUpdate() maps each field individually from
│   │         the fetched record onto reactive `itinerary` state (not a bulk
│   │         Object.assign) — `destination` was added to the Itinerary
│   │         interface/save payload without adding it here, so it silently
│   │         reset to blank on every page refresh despite being saved fine.
│   │         New itinerary fields need adding to BOTH this function's
│   │         mapping list AND the save payload to actually round-trip.
│   ├── pphs.ts             — PPHS/HDB records + coordinate updates
│   ├── budget.ts           — budget table CRUD (tables/items/collaborators);
│   │         activeTable holds the currently open table's items in-place so
│   │         BudgetItemTable's inline el-input/-number edits mutate it directly;
│   │         deleteItem snapshots the deleted item into lastDeletedItem + a
│   │         10s setTimeout (cleared/replaced on the next delete or on
│   │         fetchTable for a different session) — undoDelete() (button click
│   │         or BudgetTableView's Ctrl+Z) hits the restore endpoint and splices
│   │         the item back into activeTable.items, re-sorted by sortOrder
│   ├── applepay.ts         — fetch/list Apple Pay transactions + updateCategory
│   │         (splices the updated row back in by its uuid-based `id`)
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
│   │   └── WorkbenchView.vue — dashboard landing
│   │
│   ├── AUTH
│   │   ├── LoginView.vue
│   │   └── ProfileView.vue  (/profile, auth required)
│   │
│   ├── HDB / PPHS  /pphs
│   │   ├── HomeView.vue           — public housing info
│   │   ├── DebugView.vue
│   │   ├── PphsRecordCard.vue
│   │   ├── BusstopInformationComponent.vue
│   │   ├── ManagePphsDialog.vue
│   │   └── PphsCompareDialog.vue
│   │
│   ├── BUS TIMINGS  /bus  — public, no guard
│   │   └── HomeView.vue           — browser geolocation → nearest busstop(s) via PPHS.GET_NEAREST_BUSSTOPS
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
│   │   ├── FlatAnalysisCard.vue
│   │   └── ResalePriceSection.vue
│   │
│   ├── TRAVEL  /travel  — auth + feature
│   │   ├── TravelListView.vue     — list of trips; "New Trip" opens CreateTripDialog
│   │   ├── TravelPlannerView.vue  — recommendation-driven trip planner, side-nav
│   │   │     layout (not a long scroll): PlannerSideNav switches a single
│   │   │     `activeSection` (todo/places/bring/note/schedule) — only that
│   │   │     section's body renders in `.planner-section-body`.
│   │   │       • Things to do / Places to visit: NOT chip lists — explored
│   │   │         on the map itself (see TravelMapView `recommendations` prop
│   │   │         below). Section body is just the picked-items checklist +
│   │   │         a day-assign popover + hint text. useActivitySuggestions/
│   │   │         usePlaceSuggestions (composables) feed activityRecommendations/
│   │   │         placeRecommendations computeds; only the active tab's set is
│   │   │         passed to the map (mapRecommendations computed) so exploring
│   │   │         one category never visually competes with another.
│   │   │       • destinationRef (feeds both composables) falls back to
│   │   │         itinerary.sessionTitle when the separate Destination field is
│   │   │         empty, so ghost pins show as soon as a trip has a name —
│   │   │         without this, a filled-in title with a blank Destination
│   │   │         field silently yields zero suggestions on both tabs. Places
│   │   │         (Nominatim-geocoded) resolve fine even for a CJK title;
│   │   │         curated Things-to-do rows are matched by LOWER(destination_tag)
│   │   │         LIKE against English tags (e.g. "Singapore"), so a CJK-only
│   │   │         title won't surface those curated activity suggestions.
│   │   │       • destinationRef reads `committedDestination`, not the raw
│   │   │         `itinerary.destination` v-model — the Destination
│   │   │         `el-autocomplete`'s v-model updates on every keystroke, and
│   │   │         feeding that straight into the suggestion composables would
│   │   │         fire a fetch per partial keystroke ("S", "Si", "Sin"…).
│   │   │         `committedDestination` only updates on `@select` (picked a
│   │   │         dropdown suggestion) or `@blur` (typed a full value and
│   │   │         moved on), so suggestions load once per settled value. The
│   │   │         Destination-empty hint text and TravelMapView's
│   │   │         `destinationEmpty` prop still read the raw live v-model —
│   │   │         only the actual suggestion *fetch* is gated on commit.
│   │   │       • Things-to-do suggestions have no DB coordinates — geocoded
│   │   │         client-side per title+destination (throttled searchPlaces,
│   │   │         cached in activityCoordsCache) purely to place a ghost pin.
│   │   │         Both Things-to-do and Places-to-visit picks persist their
│   │   │         coordinates on add (onAddRecommendation) — the actual
│   │   │         discriminator is qindom tb_travel_agenda_item.list_type
│   │   │         ('todo'|'place', threaded through create/edit like
│   │   │         noteItems was; see AgendaItem.listType), since coordinate
│   │   │         presence alone can't split them once both carry coordinates.
│   │   │       • Schedule tab: the original day-group timeline, unchanged,
│   │   │         fed by scheduledAgendaItemsRef (items with a date) instead
│   │   │         of the full agenda list.
│   │   ├── PlannerSideNav.vue     — collapsible vertical nav (icon+label,
│   │   │     collapses to icon-only, count badge per section); collapsed
│   │   │     state persisted to localStorage (`fndom-planner-nav-collapsed`)
│   │   ├── CreateTripDialog.vue   — destination (useGeocode autocomplete,
│   │   │     resolves country too) + exact-dates-or-days-count; emits a
│   │   │     CreateTripPayload, caller decides guest-draft vs. authenticated
│   │   │     create (see TravelLandingView.vue / TravelListView.vue)
│   │   ├── PackingSuggestionPanel.vue  — "Things to bring" chip suggestions
│   │   │     (unchanged — not geo-content, stays chip-list + checklist)
│   │   ├── NoteSuggestionPanel.vue     — "Things to note", fetches
│   │   │     ApiRoute.SUGGESTION.NOTES(country); mandatory/optional badge +
│   │   │     deadline copy + "open official site" link — never a submit action
│   │   ├── TravelViewerView.vue   — public share viewer
│   │   ├── TravelMapView.vue      — extended with a `recommendations` prop
│   │   │     (ghost/outline pins, separate `recommendationGroup` Leaflet
│   │   │     layer from the confirmed-items `markerGroup`) + `add-recommendation`
│   │   │     emit. `fitToVisible()` unions confirmed + recommendation pin
│   │   │     bounds so browsing recs with zero picks yet still zooms
│   │   │     somewhere useful instead of the world view. Ghost pins render
│   │   │     at 50% opacity (85% on hover); a "Markers: All / Selected only"
│   │   │     filter chip (showRecommendations ref) toggles them off without
│   │   │     re-fetching — re-renders from `lastRecommendations` on toggle.
│   │   │     Clicking a ghost pin toggles `.place-detail-panel` (slide-in
│   │   │     overlay, not a Leaflet popup — same pin again / × closes it):
│   │   │     image gallery (or a category-icon placeholder if none),
│   │   │     description, a "Curated" badge when `source === 'curated'`
│   │   │     (has an admin-editable tb_suggestion_activity/place record),
│   │   │     and the "+ Add to trip" action. Confirmed pins keep their
│   │   │     original popup — the detail panel is recommendation-only.
│   │   │       • Empty-state text: `.map-overlay-msg` (full-bleed translucent
│   │   │         wash) is used only for the `resolving` loading state now —
│   │   │         it used to also cover "no agenda items"/"no filter matches",
│   │   │         which visually deadened ghost/recommendation pins still
│   │   │         showing underneath even with zero confirmed items. Those two
│   │   │         (plus a third, destination-specific state) now share one
│   │   │         bottom-anchored `.map-empty-label` pill instead, chosen by
│   │   │         priority: (1) `sorted.length === 0 && recommendations.length
│   │   │         > 0` → "tap a marker" (travel.recommendation.exploreHint) —
│   │   │         ghost pins are up regardless of *why* (explicit Destination
│   │   │         or TravelPlannerView's sessionTitle fallback), so this wins
│   │   │         even when Destination itself is still blank; (2)
│   │   │         `destinationEmpty && sorted.length === 0` → "fill in
│   │   │         Destination" (travel.mapStatus.noDestination), only once no
│   │   │         pins of any kind exist; (3)/(4) the original "no agenda
│   │   │         items"/"no filter matches" as before. `destinationEmpty`
│   │   │         prop = TravelPlannerView passing `!itinerary.destination?.trim()`.
│   │   │         A second, independent "fill in Destination" hint
│   │   │         (`.destination-hint`) lives inline under the Destination
│   │   │         field itself in TravelPlannerView's header — same message,
│   │   │         different surface, so the nudge appears right where the user
│   │   │         needs to act, not just on the map.
│   │   ├── AgendaDrawer.vue
│   │   ├── BookingDrawer.vue      — built, wired in the store, still unmounted
│   │   ├── PrivacyDialog.vue
│   │   └── TravelPlannerVTableColumns.ts
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
│   ├── TELEGRAM  /telegram  — auth + feature
│   │   └── HomeView.vue           — media management
│   │
│   ├── IMAGE CDN  /imghost  — SYSTEM_R5
│   │   └── HomeView.vue           — drag-drop upload → shareable Telegram CDN URL
│   │
│   ├── IPPT / STRIDER  /ippt  — SYSTEM_R5 + feature:ippt
   │   └── HomeView.vue           — single-SFC with 5-tab internal nav (dashboard, log, calculator, schedule, plan) + pushed achievements/profile; onboarding modal on first open
   │
   ├── ADMIN  /admin  — SYSTEM_R5 only
│   │   ├── AdminView.vue
│   │   ├── UserManagementView.vue
│   │   ├── FeatureFlagView.vue
│   │   ├── SuggestionAdminView.vue  (/admin/suggestions) — tabbed
│   │   │     Places/Activities CRUD table + create-edit el-dialog (title,
│   │   │     destination_tag, category, description, repeatable image-URL
│   │   │     list — paste-a-link only, no upload widget; suggest hosting
│   │   │     via the existing /imghost CDN tool first). Hits the qindom
│   │   │     admin CRUD + admin/list routes under /api/suggestion/activity
│   │   │     and /api/suggestion/place (see qindom MINDMAP's SUGGESTION section)
│   │   ├── LogSearcherView.vue  (/admin/log-searcher) — paste a req_xxxxx
│   │   │     Request ID, hits GET ApiRoute.ADMIN.SEARCH_REQUEST_LOG →
│   │   │     qindom's RequestLogSearch (parses qindom.out.log on the EC2 box,
│   │   │     no DB/persistence involved). Renders each match's already-redacted
│   │   │     ASCII tree verbatim in a <pre> block inside el-collapse (newest first).
│   │   │     Reads a ?requestId= query param on mount and auto-searches — used
│   │   │     by the Dashboard's LogSearchCard "search → redirect here" flow.
│   │   └── TelegramLogSubscriptionView.vue  (/admin/telegram-log-subscriptions) —
│   │         real matrix: one row per subscribed Telegram chat (every whitelisted
│   │         admin who's DM'd the CDN bot /start — qindom's tb_tg_stats_whitelist),
│   │         one column per backend module (imghost/analytics/applepay/etc, from
│   │         qindom's TelegramLogModules.ts registry — column header shows the
│   │         short key, full label on hover). <table> wrapped in overflow-x:auto
│   │         (22 modules is wide) with the chat-label column `position:sticky` so
│   │         it stays visible while scrolling. Each cell is an el-switch, toggled
│   │         immediately on @change (optimistic, revert + toast on failure, no
│   │         Save button), keyed by `${chatId}:${moduleKey}` for per-cell loading
│   │         state. GET ApiRoute.TELEGRAM_LOG_SUBSCRIPTION.ADMIN_LIST returns the
│   │         full { modules, chats } matrix; POST ADMIN_TOGGLE(chatId, moduleKey)
│   │         flips one cell and returns the refreshed matrix. Errors always still
│   │         alert every chat regardless of that chat's per-module toggle.
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
│   │   │     info) or, when `ring: true`, a circular SVG countdown (drains
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
│   │   ├── TopNavigation.vue      — header, theme toggle, login, profile.
│   │         `.header{position:sticky}` is latent-broken app-wide once a
│   │         page's content exceeds one viewport: main.css's `html,body{
│   │         overflow-x:hidden}` and this file's own `#app{overflow-x:hidden}`
│   │         each set only overflow-x, and per the CSS spec, setting one axis
│   │         to non-visible forces the OTHER axis to compute as auto too — so
│   │         `#app` (header's actual DOM parent) unintentionally becomes a
│   │         "scroll container" for sticky's containing-block purposes, even
│   │         though #app never itself scrolls (always exactly content-sized;
│   │         the real scrolling element is `<html>`, confirmed via
│   │         scrollHeight>clientHeight there but not on #app/body). Result:
│   │         sticky positioning resolves against #app's static box instead of
│   │         the viewport, and the header just scrolls away like `position:
│   │         static` on any tall page. Only the home hero currently has
│   │         taller-than-viewport content, so only TopNavigation's
│   │         `header--overlay` (position:fixed, home route only, see the
│   │         router section above) works around it there — this is NOT fixed
│   │         site-wide; any other page that grows past one screen will hit
│   │         the same non-sticky header.
│   │   ├── FooterNavigation.vue
│   │   ├── MobileNavigation.vue
│   │   └── SideNavigation.vue     — (commented out)
│   ├── dialogs/
│   │   ├── LoadingDialog.vue
│   │   ├── LoginAdvisoryDialog.vue
│   │   ├── ManagePphsDialog.vue
│   │   └── PphsCompareDialog.vue
│   ├── cards/
│   │   ├── flat/FlatAnalysisCard.vue
│   │   ├── flat/ResalePriceSection.vue
│   │   └── pphs/PphsRecordCard.vue
│   ├── map/
│   │   ├── MapComponent.vue       — Leaflet map
│   │   └── FlatMapComponent.vue
│   ├── clocks/UtcClock.vue
│   ├── accordions/HomeStageAccordion.vue
│   ├── icons/IconWithText.vue
│   └── wrappers/RoleGuard.vue
│
├── ANALYTICS (src/analytics/)
│   ├── index.ts               — track() core; fetch POST to VITE_SERVER_BASE_URL/api/analytics; system='fndom'
│   └── events.ts              — Analytics.{pageView, authLogin, authRegister, authVerified, authLogout, featureAccess, buttonClick}
│
├── COMPOSABLES (src/composables/)
│   ├── usePermission.ts       — role-based access (module + system level)
│   ├── useCityLabel.ts        — city label management
│   ├── useTravelDayGroups.ts  — group agenda items by date
│   ├── useGeocode.ts          — searchPlaces() (proxies /api/geocode, now
│   │         surfaces `country` too); dead nearbyPOIs()/POICategory direct-
│   │         to-Nominatim code removed (superseded by backend /api/places)
│   ├── useTravelExport.ts     — export itineraries (JSON/CSV)
│   ├── useActivitySuggestions.ts — fetch-on-destination-change for
│   │         "Things to do" (ApiRoute.SUGGESTION.ACTIVITIES, now includes
│   │         description/images_json); extracted from the now-deleted
│   │         ActivitySuggestionPanel.vue chip component. Also exports
│   │         `parseImages(images_json)` — shared JSON-string[]-parse helper
│   │         reused by the admin page and TravelPlannerView
│   ├── usePlaceSuggestions.ts    — same, for ApiRoute.PLACES.NEARBY
│   │         ("Places to visit"); extracted from the deleted PlaceSuggestionPanel.vue.
│   │         PlaceSuggestion now carries id/description/images/source
│   │         ('curated'|'overpass') per the backend's curated+live merge
│   ├── usePageTracking.ts     — router.afterEach → Analytics.pageView; called in App.vue
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
│   ├── useProfileManager.ts   — user profile management
│   └── usePphsManager.ts      — PPHS record management
│
├── HTTP / API (src/interceptors/ + src/constants/ApiRoute.ts)
│   ├── HttpClient.ts          — Axios + auto JWT Bearer header injection
│   └── ApiRoute.ts            — all endpoint constants
│       ├── /api/auth/*        — preflight, login, register, verify, password
│       ├── /api/pfp/*         — profile photo, country
│       ├── /api/hdb/*         — pphs, coordinates, busstops, mrt
│       ├── /api/lta/*         — bus services, live bus arrival timing (/timing)
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
│       │         web dashboard), backed by the same SsApplePayV1Service as
│       │         qindom's api-key-gated /v1/ss/ap/transaction (the Shortcuts
│       │         ingestion endpoint) — same uuid-as-public-id pattern as
│       │         budget items; occurred_dt is stamped server-side (Date.now())
│       │         rather than trusted from the Shortcut's own date format
│       ├── /api/file          — upload, delete
│       ├── /api/feature/*     — flags, toggle, admin
│       ├── /api/auth/admin/*  — user list, role update
│       ├── /api/meal/*        — log, range, photo
│       ├── /api/sleep/*       — log, bulk, parse-screenshot
│       ├── /api/telegram/*    — link status, media management
│       ├── /api/iot-key/*     — IoT device API key generate/status/revoke
│       ├── /api/garmin/*      — today (intraday), summary?days=N (history)
│       ├── /api/places        — nearby POIs for a destination (live Overpass)
│       └── /api/suggestion/note — country-scoped pre-trip reminders (new)
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
│   ├── PphsRecord.model.ts / ResaleTransaction.model.ts
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
│   ├── Modules: PPHS, TRAVEL, SLP, SYSTEM
│   ├── Levels: R3 (officer), R4 (admin), R5 (super admin)
│   ├── SYSTEM_R5 = full platform access
│   └── Checked via usePermission composable + RoleGuard.vue wrapper
│
└── ENVIRONMENTS
    ├── Dev: npm run dev (Vite HMR)
    ├── Build: npm run build (vite build + vue-tsc)
    └── Deploy: Vercel (vercel.json)
```
