<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 480 440"
    fill="none"
    style="width: 100%; height: auto; display: block"
    aria-hidden="true"
  >
    <!-- Background radial glow -->
    <circle cx="240" cy="220" r="190" class="bg-glow" />

    <!-- Outer decorative rings -->
    <circle cx="240" cy="220" r="174" class="deco-ring" />
    <circle cx="240" cy="220" r="158" class="deco-ring deco-ring--inner" />

    <!-- Globe outline -->
    <circle cx="240" cy="220" r="145" class="globe" />

    <!-- Latitude lines -->
    <ellipse cx="240" cy="220" rx="145" ry="28" class="grid-line" />
    <ellipse cx="240" cy="183" rx="127" ry="22" class="grid-line" />
    <ellipse cx="240" cy="257" rx="127" ry="22" class="grid-line" />
    <ellipse cx="240" cy="146" rx="88" ry="15" class="grid-line grid-line--faint" />
    <ellipse cx="240" cy="294" rx="88" ry="15" class="grid-line grid-line--faint" />

    <!-- Longitude lines -->
    <ellipse cx="240" cy="220" rx="28" ry="145" class="grid-line" />
    <ellipse cx="240" cy="220" rx="28" ry="145" transform="rotate(55 240 220)" class="grid-line" />
    <ellipse cx="240" cy="220" rx="28" ry="145" transform="rotate(-55 240 220)" class="grid-line" />

    <!-- Flight arc: London → Singapore (primary) -->
    <path d="M 162,162 Q 240,72 302,248" class="arc arc--primary" stroke-dasharray="6 4" />
    <!-- Flight arc: Singapore → Tokyo (secondary) -->
    <path d="M 302,248 Q 350,150 344,162" class="arc" stroke-dasharray="4 4" />

    <!-- Airplane at London→SG arc midpoint (~236, 139), angle ~32° -->
    <g transform="translate(236,139) rotate(32)">
      <path d="M 0,-8 L 15,0 L 0,8 L 4,0 Z" class="plane" />
    </g>

    <!-- City: London -->
    <circle cx="162" cy="162" r="16" class="city-halo" />
    <circle cx="162" cy="162" r="8"  class="city-dot" />

    <!-- City: Singapore — focal point -->
    <circle cx="302" cy="248" r="22" class="city-halo city-halo--focal" />
    <circle cx="302" cy="248" r="12" class="city-dot city-dot--focal" />
    <circle cx="302" cy="248" r="5"  class="city-inner" />

    <!-- City: Tokyo -->
    <circle cx="344" cy="162" r="14" class="city-halo" />
    <circle cx="344" cy="162" r="7"  class="city-dot" />

    <!-- Singapore callout -->
    <line x1="314" y1="252" x2="400" y2="298" class="callout-line" />
    <rect x="402" y="289" width="72" height="22" rx="6" class="callout-bg" />
    <text x="438" y="304" text-anchor="middle" class="callout-text">Singapore</text>

    <!-- Crosshair around Singapore -->
    <line x1="281" y1="248" x2="269" y2="248" class="cross" />
    <line x1="323" y1="248" x2="335" y2="248" class="cross" />
    <line x1="302" y1="227" x2="302" y2="215" class="cross" />
    <line x1="302" y1="269" x2="302" y2="281" class="cross" />

    <!-- Floating dots -->
    <circle cx="126" cy="96"  r="5.5" class="fdot" />
    <circle cx="398" cy="124" r="4"   class="fdot fdot--sm" />
    <circle cx="415" cy="316" r="3.5" class="fdot fdot--xs" />
    <circle cx="100" cy="308" r="3"   class="fdot fdot--xs" />
    <circle cx="68"  cy="202" r="2.5" class="fdot fdot--xs" />
    <circle cx="440" cy="222" r="2.5" class="fdot fdot--xs" />
    <circle cx="342" cy="375" r="3"   class="fdot fdot--sm" />
    <circle cx="152" cy="356" r="2"   class="fdot fdot--xs" />
    <circle cx="74"  cy="142" r="3"   class="fdot fdot--sm" />

    <!-- Sparkle: top-right -->
    <g transform="translate(404,84)">
      <line x1="0" y1="-10" x2="0"   y2="-16" class="sparkle-ray" />
      <line x1="0" y1="10"  x2="0"   y2="16"  class="sparkle-ray" />
      <line x1="-10" y1="0" x2="-16" y2="0"   class="sparkle-ray" />
      <line x1="10"  y1="0" x2="16"  y2="0"   class="sparkle-ray" />
      <line x1="-7"  y1="-7" x2="-11" y2="-11" class="sparkle-ray" />
      <line x1="7"   y1="-7" x2="11"  y2="-11" class="sparkle-ray" />
      <line x1="-7"  y1="7"  x2="-11" y2="11"  class="sparkle-ray" />
      <line x1="7"   y1="7"  x2="11"  y2="11"  class="sparkle-ray" />
      <circle cx="0" cy="0" r="4" class="sparkle-center" />
    </g>

    <!-- Sparkle: lower-left (smaller) -->
    <g transform="translate(72,342)">
      <line x1="0" y1="-7" x2="0"  y2="-12" class="sparkle-ray sparkle-ray--sm" />
      <line x1="0" y1="7"  x2="0"  y2="12"  class="sparkle-ray sparkle-ray--sm" />
      <line x1="-7" y1="0" x2="-12" y2="0"  class="sparkle-ray sparkle-ray--sm" />
      <line x1="7"  y1="0" x2="12"  y2="0"  class="sparkle-ray sparkle-ray--sm" />
      <circle cx="0" cy="0" r="3" class="sparkle-center sparkle-center--sm" />
    </g>
  </svg>
</template>

<style scoped>
/* Background */
.bg-glow     { fill: var(--el-color-primary); opacity: 0.05; }

/* Outer rings */
.deco-ring          { stroke: var(--el-color-primary); stroke-width: 1; opacity: 0.09; }
.deco-ring--inner   { opacity: 0.06; }

/* Globe */
.globe              { stroke: var(--el-color-primary); stroke-width: 2; opacity: 0.22; }
.grid-line          { stroke: var(--el-color-primary); stroke-width: 1; fill: none; opacity: 0.14; }
.grid-line--faint   { opacity: 0.07; }

/* Arcs */
.arc                { stroke: var(--el-color-primary); stroke-width: 1.5; fill: none; opacity: 0.45; }
.arc--primary       { stroke-width: 2; opacity: 0.58; }

/* Airplane */
.plane              { fill: var(--el-color-primary); }

/* City markers */
.city-halo          { fill: var(--el-color-primary); opacity: 0.10; }
.city-halo--focal   { opacity: 0.15; }
.city-dot           { fill: var(--el-color-primary); }
.city-dot--focal    { fill: var(--el-color-primary); }
.city-inner         { fill: white; }

/* Callout */
.callout-line  {
  stroke: var(--el-color-primary);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  opacity: 0.45;
}
.callout-bg    {
  fill: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  stroke: color-mix(in srgb, var(--el-color-primary) 30%, transparent);
  stroke-width: 1;
}
.callout-text  {
  fill: var(--el-color-primary);
  font-size: 10px;
  font-weight: 700;
  font-family: system-ui, sans-serif;
}

/* Crosshair */
.cross              { stroke: var(--el-color-primary); stroke-width: 1.5; opacity: 0.45; }

/* Floating dots */
.fdot               { fill: var(--el-color-primary); opacity: 0.30; }
.fdot--sm           { opacity: 0.20; }
.fdot--xs           { opacity: 0.13; }

/* Sparkles */
.sparkle-ray        { stroke: var(--el-color-primary); stroke-width: 1.5; stroke-linecap: round; opacity: 0.50; }
.sparkle-ray--sm    { opacity: 0.35; }
.sparkle-center     { fill: var(--el-color-primary); opacity: 0.60; }
.sparkle-center--sm { opacity: 0.40; }
</style>
