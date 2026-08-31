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
├── ROUTER (src/router/index.ts)  — 20 active routes
│   │
│   ├── PUBLIC (no auth)
│   │   ├── /                      home → travel/TravelLandingView (public entry now travel-only; LLM marketplace hidden from public UI, still reachable at /llm for internal/admin users)
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
│   │   └── /iot-key               iot-key → iot/IotDeviceKeyView
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
├── STORES (src/stores/)  — 8 Pinia stores
│   ├── authentication.ts   — login, register, OTP verify, logout, JWT; exposes rules + registerRules (computed, locale-reactive)
│   ├── layoutState.ts      — 10 dialog/nav toggles (loginDialog, loadingDialog, etc.)
│   ├── theme.ts            — dark/light mode (persisted to localStorage)
│   ├── featureFlags.ts     — fetch + cache feature flags
│   ├── itinerary.ts        — travel CRUD, file upload, collaborators
│   ├── pphs.ts             — PPHS/HDB records + coordinate updates
│   ├── ippt.ts             — IPPT profile, activity log, badges, plan, events (localStorage persisted)
│   ├── event.ts            — FND events (commented out)
│   ├── notice.ts           — FND notices (commented out)
│   └── iotDevice.ts        — IoT device API key: fetchApiKeyStatus, generateApiKey(deviceName), revokeApiKey
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
│   │   ├── TravelListView.vue     — list of trips
│   │   ├── TravelPlannerView.vue  — itinerary editor
│   │   ├── TravelViewerView.vue   — public share viewer
│   │   ├── TravelMapView.vue
│   │   ├── AgendaDrawer.vue
│   │   ├── BookingDrawer.vue
│   │   ├── PrivacyDialog.vue
│   │   └── TravelPlannerVTableColumns.ts
│   │
│   ├── DOUYIN  /douyin  — auth + feature
│   │   └── HomeView.vue           — live stream checker
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
│   │   └── FeatureFlagView.vue
│   │
│   └── IOT DEVICE KEY  /iot-key  — auth required
│       └── IotDeviceKeyView.vue   — generate/regenerate/revoke API key for /iot device auth
│             (mints keys via qindom's /api/iot-key/api-key; shown once on generation)
│
├── COMPONENTS (src/components/)
│   ├── illustrations/
│   │   └── HeroIllustration.vue   — travel-themed globe SVG (globe wireframe + flight arcs + city pins)
│   ├── common/
│   │   ├── AppBreadcrumb.vue
│   │   ├── EmptyState.vue
│   │   ├── OtpInput.vue
│   │   └── StatPill.vue
│   ├── navigations/
│   │   ├── TopNavigation.vue      — header, theme toggle, login, profile
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
│   ├── useGeocode.ts          — geocoding utilities
│   ├── useTravelExport.ts     — export itineraries (JSON/CSV)
│   └── usePageTracking.ts     — router.afterEach → Analytics.pageView; called in App.vue
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
│       ├── /api/file          — upload, delete
│       ├── /api/feature/*     — flags, toggle, admin
│       ├── /api/auth/admin/*  — user list, role update
│       ├── /api/douyin/*      — live, ranklist
│       ├── /api/meal/*        — log, range, photo
│       ├── /api/sleep/*       — log, bulk, parse-screenshot
│       ├── /api/telegram/*    — link status, media management
│       └── /api/iot-key/*     — IoT device API key generate/status/revoke
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
├── INTERFACES (src/interfaces/)  — 15 TypeScript interface files
│   ├── Itinerary.ts / AgendaItem.ts / ItineraryBooking.ts / FileWithPreview.ts
│   ├── PphsRecord.model.ts / ResaleTransaction.model.ts
│   ├── BusstopInformation.model.ts / BusRouteInformation.model.ts / MrtStationInformation.model.ts / BusArrivalTiming.model.ts
│   ├── OneMapResult.model.ts
│   ├── LoginForm.model.tsx / RegisterForm.model.ts
│   └── FndManageEvent.model.tsx / FndManageNotice.model.tsx
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
