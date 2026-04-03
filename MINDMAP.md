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
│   │   ├── /                      home → WorkbenchView
│   │   ├── /404                   404 → UnauthorizedView
│   │   ├── /travel/v/:shortCode   travel-viewer (featureGuard)
│   │   └── /wedding/dates/v/:shortCode  wedding-dates-viewer (featureGuard)
│   │
│   ├── FEATURE-GATED (featureGuard)
│   │   ├── /ks                    kingshot → HomeView
│   │   ├── /ks/agreement          ks-agreement
│   │   ├── /ks/kop                kop-form
│   │   ├── /ks/kop/res            kop-form-res → AppointmentView
│   │   ├── /pphs                  pphs → hdb/HomeView
│   │   └── /flat                  flat → flat/HomeView
│   │
│   ├── AUTH REQUIRED (authGuard)
│   │   └── /profile               profile → ProfileView
│   │
│   ├── AUTH + FEATURE REQUIRED (authAndFeatureGuard)
│   │   ├── /travel                travel → TravelListView
│   │   ├── /travel/:sessionId     travel-planner → TravelPlannerView
│   │   ├── /douyin                douyin → HomeView
│   │   ├── /meal                  meal → HomeView
│   │   ├── /sleep                 sleep → HomeView
│   │   ├── /wedding               wedding → HomeView
│   │   ├── /expense               expense → HomeView
│   │   └── /telegram              telegram → HomeView
│   │
│   ├── ADMIN ONLY (systemR5Guard — SYSTEM_R5 role)
│   │   ├── /admin                 admin → AdminView
│   │   ├── /admin/users           admin-users → UserManagementView
│   │   └── /admin/features        admin-features → FeatureFlagView
│   │
│   └── COMMENTED OUT
│       ├── /schedule              ScheduleHomeView
│       └── /habit                 HabitHomeView
│
├── ROUTE GUARDS (src/hooks/useRouteGuards.ts)
│   ├── featureGuard         — check feature flag enabled
│   ├── authGuard            — check JWT token present
│   ├── authAndFeatureGuard  — both auth + feature flag
│   └── systemR5Guard        — SYSTEM_R5 role required
│
├── STORES (src/stores/)  — 8 Pinia stores
│   ├── authentication.ts   — login, register, OTP verify, logout, JWT
│   ├── layoutState.ts      — 10 dialog/nav toggles (loginDialog, loadingDialog, etc.)
│   ├── theme.ts            — dark/light mode (persisted to localStorage)
│   ├── featureFlags.ts     — fetch + cache feature flags
│   ├── itinerary.ts        — travel CRUD, file upload, collaborators
│   ├── pphs.ts             — PPHS/HDB records + coordinate updates
│   ├── event.ts            — FND events (commented out)
│   └── notice.ts           — FND notices (commented out)
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
│   ├── KINGSHOT (KS)  /ks  — Kingdom 236 scheduling
│   │   ├── HomeView.vue
│   │   ├── AgreementView.vue
│   │   ├── KopFormView.vue        — KOP form submission
│   │   └── AppointmentView.vue    — appointment result
│   │
│   ├── HDB / PPHS  /pphs
│   │   ├── HomeView.vue           — public housing info
│   │   ├── DebugView.vue
│   │   ├── PphsRecordCard.vue
│   │   ├── BusstopInformationComponent.vue
│   │   ├── ManagePphsDialog.vue
│   │   └── PphsCompareDialog.vue
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
│   ├── WEDDING  /wedding  — auth + feature
│   │   ├── HomeView.vue           — events, guests, tables, dates
│   │   └── WeddingDatesViewerView.vue  — public date viewer
│   │
│   ├── EXPENSE  /expense  — auth + feature
│   │   └── HomeView.vue
│   │
│   ├── TELEGRAM  /telegram  — auth + feature
│   │   └── HomeView.vue           — media management
│   │
│   └── ADMIN  /admin  — SYSTEM_R5 only
│       ├── AdminView.vue
│       ├── UserManagementView.vue
│       └── FeatureFlagView.vue
│
├── COMPONENTS (src/components/)
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
├── COMPOSABLES (src/composables/)
│   ├── usePermission.ts       — role-based access (module + system level)
│   ├── useCityLabel.ts        — city label management
│   ├── useTravelDayGroups.ts  — group agenda items by date
│   ├── useGeocode.ts          — geocoding utilities
│   └── useTravelExport.ts     — export itineraries (JSON/CSV)
│
├── HOOKS (src/hooks/)
│   ├── useRouteGuards.ts      — featureGuard, authGuard, authAndFeatureGuard, systemR5Guard
│   ├── useNav.ts              — redirectTo*, navigation helpers
│   ├── useTokenVerification.ts — JWT validation on app init
│   ├── useBreakpointManager.ts — responsive breakpoint detection
│   ├── useProfileManager.ts   — user profile management
│   ├── usePphsManager.ts      — PPHS record management
│   └── useKopRegistration.ts  — KOP registration flow
│
├── HTTP / API (src/interceptors/ + src/constants/ApiRoute.ts)
│   ├── HttpClient.ts          — Axios + auto JWT Bearer header injection
│   └── ApiRoute.ts            — all endpoint constants
│       ├── /api/auth/*        — preflight, login, register, verify, password
│       ├── /api/pfp/*         — profile photo, country
│       ├── /api/hdb/*         — pphs, coordinates, busstops, mrt
│       ├── /api/lta/*         — bus services
│       ├── /api/itinerary/*   — CRUD, share, collaborator, challenge
│       ├── /api/file          — upload, delete
│       ├── /api/feature/*     — flags, toggle, admin
│       ├── /api/auth/admin/*  — user list, role update
│       ├── /api/douyin/*      — live, ranklist
│       ├── /api/meal/*        — log, range, photo
│       ├── /api/sleep/*       — log, bulk, parse-screenshot
│       ├── /api/wedding/*     — events, guests, tables, dates, sessions
│       ├── /api/expense/*     — balance, transactions, cards
│       └── /api/telegram/*    — link status, media management
│
├── UTILITIES (src/utilities/)
│   ├── StorageUtils.ts        — localStorage wrapper (keys: JWT, EXISTING_SESSION, ITINERARY_IDEMPOTENCY_KEY, DOUYIN_RECENT)
│   ├── DateUtils.ts           — formatting, duration
│   ├── FileUtils.ts           — file ops
│   ├── GeneratorUtils.ts      — UUID generation
│   ├── HeartbeatUtils.ts      — periodic heartbeat pings
│   ├── ListUtils.ts           — array helpers
│   └── lunarCalendar.ts       — Chinese lunar calendar conversion
│
├── INTERFACES (src/interfaces/)  — 14 TypeScript interface files
│   ├── Itinerary.ts / AgendaItem.ts / ItineraryBooking.ts / FileWithPreview.ts
│   ├── PphsRecord.model.ts / ResaleTransaction.model.ts
│   ├── BusstopInformation.model.ts / BusRouteInformation.model.ts / MrtStationInformation.model.ts
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
│   ├── LoginFormRules.ts
│   └── RegisterFormRules.ts
│
├── ROLES & PERMISSIONS
│   ├── Format: {MODULE}_{LEVEL}
│   ├── Modules: PPHS, KS, TRAVEL, SLP, SYSTEM
│   ├── Levels: R3 (officer), R4 (admin), R5 (super admin)
│   ├── SYSTEM_R5 = full platform access
│   └── Checked via usePermission composable + RoleGuard.vue wrapper
│
└── ENVIRONMENTS
    ├── Dev: npm run dev (Vite HMR)
    ├── Build: npm run build (vite build + vue-tsc)
    └── Deploy: Vercel (vercel.json)
```
