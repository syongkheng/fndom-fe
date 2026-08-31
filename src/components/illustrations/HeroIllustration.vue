<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 480 440"
    fill="none"
    style="width: 100%; height: auto; display: block"
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="paper-vignette" cx="50%" cy="42%" r="72%">
        <stop offset="60%" stop-color="#000000" stop-opacity="0" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.10" />
      </radialGradient>
      <filter id="ink-blur" x="-20%" y="-40%" width="140%" height="180%">
        <feGaussianBlur stdDeviation="2.6" />
      </filter>
    </defs>

    <!-- Parchment ground -->
    <rect x="0" y="0" width="480" height="440" class="parchment" />
    <rect x="0" y="0" width="480" height="440" fill="url(#paper-vignette)" />
    <!-- Foxing / paper texture -->
    <ellipse cx="60"  cy="60"  rx="30" ry="18" class="foxing" />
    <ellipse cx="430" cy="330" rx="26" ry="34" class="foxing" />
    <ellipse cx="410" cy="40"  rx="18" ry="12" class="foxing" />

    <!-- Mountains, far → near -->
    <path class="mtn-far" filter="url(#ink-blur)"
      d="M0,190 C40,150 80,145 120,165 C160,185 190,140 230,155 C270,170 300,135 340,150
         C380,165 420,145 460,160 C470,163 475,165 480,166 L480,230 L0,230 Z" />
    <path class="mtn-mid" filter="url(#ink-blur)"
      d="M0,225 C50,180 90,195 130,215 C170,235 210,175 250,195 C290,215 330,180 370,200
         C410,220 440,190 480,205 L480,262 L0,262 Z" />
    <path class="mtn-near" filter="url(#ink-blur)"
      d="M0,260 C40,225 80,240 120,258 C160,276 200,220 245,238 C285,254 320,215 365,235
         C400,251 430,225 480,242 L480,300 L0,300 Z" />

    <!-- Distant birds -->
    <path d="M110,66 q9,-9 18,0 q9,-9 18,0" class="bird" />
    <path d="M360,50 q7,-7 14,0 q7,-7 14,0" class="bird bird--sm" />

    <!-- Ground shadow beneath figure -->
    <ellipse cx="248" cy="300" rx="55" ry="8" class="ground-shade" />

    <!-- Winding trail -->
    <path class="trail-fill"
      d="M14,428 C76,384 116,362 156,342 C198,321 228,308 244,300
         C230,308 202,321 162,342 C123,362 84,384 26,436 Z" />
    <path class="trail-edge-l" d="M14,428 C76,384 116,362 156,342 C198,321 228,308 244,300" />
    <path class="trail-edge-r" d="M26,436 C84,384 123,362 162,342 C202,321 230,308 244,300" />
    <ellipse cx="70"  cy="392" rx="6" ry="3.5" class="rock" transform="rotate(-18 70 392)" />
    <ellipse cx="188" cy="332" rx="5" ry="3"   class="rock" transform="rotate(-14 188 332)" />

    <!-- ═══ Traveler ═══ -->
    <!-- Wind-blown train, attached at the back/shoulder, streaming out and tapering to a point (drawn behind the body) -->
    <path class="robe-train"
      d="M260,124
         C310,104 372,108 420,138
         C440,150 452,168 458,192
         C445,208 415,206 390,220
         C365,234 350,214 330,196
         C310,178 285,155 250,130 Z" />

    <!-- Robe body: shoulders → A-line hem near the feet -->
    <path class="robe-body"
      d="M238,120
         C228,170 218,225 222,288
         C236,296 252,296 266,292
         C270,225 272,165 268,118
         C258,114 248,114 238,120 Z" />
    <!-- Sash / waist bands -->
    <path d="M234,150 C246,156 258,157 268,150" class="sash" />
    <path d="M232,164 C246,171 260,172 270,164" class="sash" />

    <!-- Feet, mid-stride at the hem -->
    <path d="M226,290 C222,296 218,300 213,304" class="foot" />
    <path d="M258,292 C264,297 270,300 276,302" class="foot" />

    <!-- Hair mass -->
    <ellipse cx="258" cy="97" rx="15" ry="17" class="hair-mass" />
    <!-- Wind-swept hair strands -->
    <path d="M266,88 C310,74 360,66 420,80 C438,85 450,90 460,96" class="hair hair--1" />
    <path d="M268,95 C315,86 370,82 430,102" class="hair hair--2" />
    <path d="M267,102 C305,100 345,108 395,124" class="hair hair--3" />
    <path d="M262,109 C285,114 305,124 322,138" class="hair hair--4" />

    <!-- Ink splatter -->
    <circle cx="140" cy="80"  r="2.4" class="ink-dot" />
    <circle cx="120" cy="110" r="1.6" class="ink-dot" />
    <circle cx="470" cy="220" r="2"   class="ink-dot" />
    <circle cx="452" cy="260" r="1.4" class="ink-dot" />
    <circle cx="60"  cy="180" r="1.8" class="ink-dot" />
    <circle cx="200" cy="70"  r="1.4" class="ink-dot" />
    <circle cx="330" cy="60"  r="1.6" class="ink-dot" />
    <circle cx="90"  cy="260" r="1.4" class="ink-dot" />
    <circle cx="418" cy="120" r="2.2" class="ink-dot" />
    <circle cx="392" cy="150" r="1.3" class="ink-dot ink-dot--warm" />
    <circle cx="430" cy="170" r="1.6" class="ink-dot ink-dot--warm" />

    <!-- Seal mark -->
    <g transform="translate(444,392) rotate(-4)">
      <rect x="0" y="0" width="20" height="20" rx="2" class="seal" />
      <path d="M5,7 L15,7 M5,13 L15,13 M10,4 L10,16" class="seal-mark" />
    </g>
  </svg>
</template>

<style scoped>
svg {
  --ink-black: #1c1815;
  --ink-gray-1: #cfc9bc;
  --ink-gray-2: #a39c8d;
  --ink-gray-3: #787162;
  --ink-red: #a7402c;
  --paper: #efe6d3;
  --paper-tan: #d9c9a3;
}

.parchment    { fill: var(--paper); }
.foxing       { fill: #b8a878; opacity: 0.08; }

.mtn-far      { fill: var(--ink-gray-1); opacity: 0.55; }
.mtn-mid      { fill: var(--ink-gray-2); opacity: 0.55; }
.mtn-near     { fill: var(--ink-gray-3); opacity: 0.6; }

.bird         { stroke: var(--ink-black); stroke-width: 1.4; opacity: 0.45; fill: none; }
.bird--sm     { stroke-width: 1.1; opacity: 0.32; }

.ground-shade { fill: var(--ink-black); opacity: 0.08; }

.trail-fill   { fill: var(--paper-tan); opacity: 0.55; }
.trail-edge-l,
.trail-edge-r { stroke: var(--ink-gray-3); stroke-width: 1.2; opacity: 0.5; fill: none; }
.rock         { fill: var(--ink-gray-3); opacity: 0.4; }

.robe-train   { fill: var(--ink-red); stroke: var(--ink-black); stroke-width: 1.8; stroke-linejoin: round; opacity: 0.85; }
.robe-body    { fill: var(--ink-red); stroke: var(--ink-black); stroke-width: 2; stroke-linejoin: round; opacity: 0.94; }
.sash         { stroke: var(--ink-black); stroke-width: 2; fill: none; opacity: 0.65; }
.foot         { stroke: var(--ink-black); stroke-width: 2.4; stroke-linecap: round; fill: none; opacity: 0.8; }

.hair-mass    { fill: var(--ink-black); opacity: 0.92; }
.hair         { stroke: var(--ink-black); fill: none; stroke-linecap: round; }
.hair--1      { stroke-width: 3;   opacity: 0.85; }
.hair--2      { stroke-width: 2;   opacity: 0.65; }
.hair--3      { stroke-width: 1.4; opacity: 0.5; }
.hair--4      { stroke-width: 1.2; opacity: 0.4; }

.ink-dot      { fill: var(--ink-black); opacity: 0.35; }
.ink-dot--warm{ fill: #d9702f; opacity: 0.55; }

.seal         { fill: var(--ink-red); opacity: 0.85; }
.seal-mark    { stroke: var(--paper); stroke-width: 1.2; opacity: 0.9; }
</style>
