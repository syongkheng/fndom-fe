<script setup lang="ts">
const sanctuaries = [
  { id: 1,  coords: '237, 828' },
  { id: 2,  coords: '237, 606' },
  { id: 3,  coords: '237, 348' },
  { id: 4,  coords: '366, 237' },
  { id: 5,  coords: '588, 237' },
  { id: 6,  coords: '846, 237' },
  { id: 7,  coords: '957, 348' },
  { id: 8,  coords: '957, 606' },
  { id: 9,  coords: '957, 828' },
  { id: 10, coords: '846, 957' },
  { id: 11, coords: '606, 957' },
  { id: 12, coords: '366, 957' },
]

const fortresses = [
  { id: 1, coords: '597, 800' },
  { id: 2, coords: '400, 597' },
  { id: 3, coords: '597, 400' },
  { id: 4, coords: '800, 597' },
]

const alliances = ['VKG', 'HKL', 'Fnd', 'AHG', 'Sol', 'VKA', 'RGN', 'HKS', 'ARK', 'TTS', 'EUW', 'VKF']

const protectedAlliances = ['VKG', 'VKA', 'VKF', 'HKL', 'HKS', 'RGN', 'ARK', 'AHG', 'a36', 'Sol', 'Fnd']
</script>

<template>
  <div class="page-container">
    <header class="ag-header">
      <div class="ag-meta">UC236 Proposition · Posted 5 Feb 2026</div>
      <h1 class="ag-title">United Coalition of 236</h1>
      <p class="ag-subtitle">Server agreement governing KvK conduct, building allocations, and voting</p>
    </header>

    <el-tabs class="ag-tabs">

      <!-- OVERVIEW -->
      <el-tab-pane label="Overview">
        <div class="doc-section">
          <p class="doc-lead">
            This agreement serves as the guideline for how Kingdom 236 recognises each alliance during KvK —
            covering building distributions, voting procedures, and event rules. It is a living document;
            suggestions and opinions are always welcomed.
          </p>

          <h2 class="doc-h2">Member Alliances</h2>
          <p class="doc-body">As of the last KvK with 298, 12 alliances are tracked (in no particular order):</p>
          <div class="alliance-grid">
            <span v-for="a in alliances" :key="a" class="alliance-chip">{{ a }}</span>
          </div>

          <h2 class="doc-h2">Building Allocation Summary</h2>
          <div class="table-wrap">
            <table class="doc-table">
              <thead>
                <tr>
                  <th>KvK Rank</th>
                  <th>Fortresses</th>
                  <th>Sanctuaries</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Rank 1</td><td>1</td><td>3</td><td></td></tr>
                <tr><td>Rank 2</td><td>1</td><td>3</td><td></td></tr>
                <tr><td>Rank 3</td><td>1</td><td>2</td><td></td></tr>
                <tr><td>Rank 4</td><td>0 <span class="tag-rotate">+ rotating</span></td><td>2</td><td>Weekly rotation with Rank 5</td></tr>
                <tr><td>Rank 5</td><td>0 <span class="tag-rotate">+ rotating</span></td><td>2</td><td>Weekly rotation with Rank 4</td></tr>
              </tbody>
            </table>
          </div>
          <p class="doc-body doc-note">
            The remaining fortress rotates between Rank 4 (Week 1) and Rank 5 (Week 2) on a weekly basis.
            Buildings are selected round-robin and must be finalised at least 12 hours before the Signup deadline.
          </p>

          <h2 class="doc-h2">Document Structure</h2>
          <ul class="doc-list">
            <li><strong>Section I</strong> — Membership &amp; Vote</li>
            <li><strong>Section II</strong> — Calculations of Contributions</li>
            <li><strong>Section III</strong> — Combat (Arena, Consequences)</li>
            <li><strong>Section IV</strong> — Sanctuaries and Fortresses</li>
            <li><strong>Section V</strong> — Outposts (L4 Distributions)</li>
            <li><strong>Section VI</strong> — All-Out Events (Internal &amp; External)</li>
            <li><strong>Section VII</strong> — Castle Distribution &amp; Buff Management</li>
          </ul>
          <p class="doc-body doc-note">
            Records of Final Votes &amp; Inauguration are located in the
            <strong>236 Kingdom Diplomats</strong> channel on the Kingdom 236 Discord Server.
          </p>
        </div>
      </el-tab-pane>

      <!-- GOVERNANCE -->
      <el-tab-pane label="Governance">
        <div class="doc-section">

          <h2 class="doc-h2">Section I — Membership</h2>
          <p class="doc-body">
            Everyone in 236 is automatically included under membership and is welcomed to voice their opinions.
          </p>

          <h2 class="doc-h2">Section I — Voting &amp; Procedures</h2>
          <p class="doc-body">
            Any motion or proposal requires at least a <strong>12-hour voting window</strong>.
            Votes are cast by each alliance's nominated representative. A motion requires
            <strong>at least 51%</strong> of votes to pass. Forfeited votes are excluded from the total count.
          </p>
          <p class="doc-body">
            Vote weightage is determined by monthly Kingdom of Power contributions:
          </p>
          <div class="table-wrap">
            <table class="doc-table">
              <thead>
                <tr><th>Percentile</th><th>Votes</th><th>Alliances (KvK vs 239)</th></tr>
              </thead>
              <tbody>
                <tr><td>75th percentile</td><td>3 votes each</td><td>VKG, Fnd, HKL</td></tr>
                <tr><td>50th percentile</td><td>2 votes each</td><td>AHG, Sol, VKA</td></tr>
                <tr><td>Remaining</td><td>1 vote each</td><td>RGN, HKS, ARK, TTS, EUW, VKF</td></tr>
              </tbody>
            </table>
          </div>
          <p class="doc-body doc-note">
            Total: (3×3) + (3×2) + (6×1) = <strong>21 votes</strong>. Required to pass: <strong>11</strong>.
            Alliances may not split their votes. Farm alliances with KvK contributions receive additional votes on top of their main alliance.
          </p>

          <h3 class="doc-h3">Raising a Motion</h3>
          <ul class="doc-list">
            <li>Any alliance with votes may raise a motion — do so early to allow sufficient discussion time.</li>
            <li>Standard window: <strong>12 hours</strong></li>
            <li>Emergency window: <strong>6 hours</strong> — requires approval from 75th percentile alliances</li>
            <li>Topics may include building assignments, member transfers between alliances, or rally leader arrangements</li>
          </ul>

          <h2 class="doc-h2">Section II — Contributions Recording</h2>
          <p class="doc-body">
            Each alliance appoints a dedicated recorder to log their daily KvK contribution data.
            All entries are submitted via the designated Google Sheet
            (<strong>K236KvK</strong>) accessible in the <code>#state-files</code> channel on the Kingdom 236 Discord Server.
          </p>
        </div>
      </el-tab-pane>

      <!-- BUILDINGS -->
      <el-tab-pane label="Buildings">
        <div class="doc-section">

          <h2 class="doc-h2">Section IV — Sanctuaries</h2>
          <p class="doc-body">
            There are <strong>12 sanctuaries</strong> and <strong>4 fortresses</strong>.
            Battles at these buildings do not result in troop losses on an attacking defeat.
            All allocations are determined based on KvK contribution rankings.
          </p>
          <div class="table-wrap">
            <table class="doc-table">
              <thead><tr><th>#</th><th>Coordinates</th></tr></thead>
              <tbody>
                <tr v-for="s in sanctuaries" :key="s.id">
                  <td>Sanctuary {{ s.id }}</td>
                  <td class="coord">{{ s.coords }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 class="doc-h2">Section IV — Fortresses</h2>
          <div class="table-wrap">
            <table class="doc-table">
              <thead><tr><th>#</th><th>Coordinates</th></tr></thead>
              <tbody>
                <tr v-for="f in fortresses" :key="f.id">
                  <td>Fortress {{ f.id }}</td>
                  <td class="coord">{{ f.coords }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="doc-h3">Selection Rules</h3>
          <ul class="doc-list">
            <li>Selection must be completed at least <strong>12 hours before the Signup deadline</strong>.</li>
            <li>Round-robin order: Rank 1 picks first, then Rank 2, 3, 4, 5, cycling back to Rank 1 for each subsequent pick.</li>
            <li>The remaining fortress rotates between Rank 4 and Rank 5 weekly (Week 1 → Rank 4, Week 2 → Rank 5).</li>
          </ul>

          <h3 class="doc-h3">FFA Sanctuaries</h3>
          <ul class="doc-list">
            <li>During weeks with eligible additional buildings, sanctuaries may be offered for FFA.</li>
            <li>All FFA details must be shared in the <strong>Kingdom Diplo Discord</strong> channel.</li>
            <li>During FFA: <strong>no solo attacks</strong> for the first hit — rallies only.</li>
          </ul>

          <h2 class="doc-h2">Section V — Level 4 Outposts</h2>
          <p class="doc-body">L4 outpost arrangements remain consistent with current setup.</p>
          <div class="table-wrap">
            <table class="doc-table">
              <thead>
                <tr><th>Building</th><th>Coordinates</th><th>Non-KvK</th><th>KvK Period</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>L4 Arsenal #1</td>
                  <td class="coord">816, 486</td>
                  <td>Fnd ↔ HKL rotation</td>
                  <td>Fnd</td>
                </tr>
                <tr>
                  <td>L4 Armory #1</td>
                  <td class="coord">588, 327</td>
                  <td>AHG</td>
                  <td>Fnd</td>
                </tr>
                <tr>
                  <td>L4 Arsenal #2</td>
                  <td class="coord">387, 486</td>
                  <td>VKG</td>
                  <td>VKG</td>
                </tr>
                <tr>
                  <td>L4 Armory #2</td>
                  <td class="coord">588, 867</td>
                  <td>VKG</td>
                  <td>VKG</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="doc-body doc-note">
            KvK period is defined as the period during which the occupying alliance holds the buildings at the KvK Castle Battle.
            If HKL misses their rotation, HKL and Fnd will collaborate to reach a fair resolution.
          </p>
        </div>
      </el-tab-pane>

      <!-- EVENTS -->
      <el-tab-pane label="Events">
        <div class="doc-section">

          <h2 class="doc-h2">Section III — Combat</h2>
          <h3 class="doc-h3">Arena</h3>
          <p class="doc-body">
            Attacking someone from the same state in the Arena is <strong>strongly discouraged</strong>, but allowed.
            Avoid it where possible to let everyone progress faster, especially with Mythic gear.
          </p>

          <h3 class="doc-h3">Consequences</h3>
          <p class="doc-body">
            Individual behaviours that consistently flaunt, taunt, or harass individuals or groups are condemned
            and subject to consequences.
          </p>

          <h2 class="doc-h2">Section VI — Internal All Out</h2>

          <h3 class="doc-h3">Day 1 — Rules of Engagement</h3>
          <p class="doc-body">Tile attacks are <strong>allowed</strong> across the entire server.</p>
          <p class="doc-body">City attacks are <strong>strictly not allowed</strong> on all member alliances:</p>
          <div class="alliance-grid" style="margin-bottom: 12px;">
            <span v-for="a in protectedAlliances" :key="a" class="alliance-chip alliance-chip--protected">{{ a }}</span>
          </div>

          <h3 class="doc-h3">Day 2</h3>
          <div class="doc-callout">
            <strong>No attacks allowed across the entire server on Day 2.</strong>
            This allows all members to gather resources for Refined.
          </div>

          <h3 class="doc-h3">Internal Castle Battle</h3>
          <p class="doc-body">
            Castle Battle rules follow the same structure as External All Out, with a 1-hour FFA window built in.
            Details to be coordinated through leadership.
          </p>

          <h2 class="doc-h2">Section VI — External All Out</h2>
          <p class="doc-body">
            It is the duty of the King to liaise with the opposing King for ceasefire agreements
            before, during, and after the castle battle.
          </p>

          <h2 class="doc-h2">Section VII — Castle &amp; Kingship Rotation</h2>
          <p class="doc-body">
            Castle rotation is based on KvK contribution. Alliances determined eligible may pass
            the opportunity to another alliance if they choose.
          </p>
          <h3 class="doc-h3">King Responsibilities</h3>
          <ul class="doc-list">
            <li>Negotiate External All Out rules with the opposing King.</li>
            <li>Use forced ceasefire skills to mitigate server damage before the castle battle if needed.</li>
            <li>Manage state buff schedules during SGE and KvK.</li>
            <li>Reserve Day 1 Chief Minister and Day 4 Noble Advisor/Chief Minister appointments.</li>
            <li>Consider allocating combat appointments (Marshal, Field Commander) to alliances running bear traps.</li>
          </ul>

          <h3 class="doc-h3">State Buff Management (to be voted)</h3>
          <ul class="doc-list">
            <li><strong>Option 1:</strong> Day 1 Construction · Day 2 Research · Day 4 Troop Training</li>
            <li><strong>Option 2:</strong> Stack Construction and Research buffs on Day 5</li>
          </ul>
        </div>
      </el-tab-pane>

    </el-tabs>
  </div>
</template>

<style scoped>
.ag-header {
  text-align: center;
  padding: 24px 16px 28px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ag-meta {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 6px;
}

.ag-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--color-heading);
}

.ag-subtitle {
  font-size: 0.875rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 6px;
}

.ag-tabs {
  max-width: 860px;
  margin: 0 auto;
}

/* ── Doc typography ── */
.doc-section {
  padding: 4px 2px 24px;
}

.doc-lead {
  font-size: 0.975rem;
  line-height: 1.7;
  color: var(--color-heading);
  margin-bottom: 12px;
}

.doc-body {
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--color-text);
  margin-bottom: 12px;
}

.doc-note {
  opacity: 0.7;
  font-style: italic;
}

.doc-h2 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 24px 0 8px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--color-border);
}

.doc-h3 {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 16px 0 6px;
}

.doc-list {
  font-size: 0.875rem;
  line-height: 1.75;
  color: var(--color-text);
  padding-left: 20px;
  margin-bottom: 12px;
}

.doc-list li {
  margin-bottom: 4px;
}

.doc-callout {
  font-size: 0.85rem;
  line-height: 1.6;
  background: var(--color-background-mute);
  border-left: 3px solid var(--color-border-hover);
  border-radius: 4px;
  padding: 10px 14px;
  margin: 12px 0;
  color: var(--color-text);
}

/* ── Alliance chips ── */
.alliance-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.alliance-chip {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid var(--color-border-hover);
  background: var(--color-background-soft);
  color: var(--color-heading);
}

.alliance-chip--protected {
  border-color: #f87171;
  color: #f87171;
  background: transparent;
}

/* ── Tables ── */
.table-wrap {
  overflow-x: auto;
  margin-bottom: 12px;
}

.doc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.83rem;
}

.doc-table th {
  text-align: left;
  padding: 7px 12px;
  font-weight: 600;
  color: var(--color-heading);
  background: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border-hover);
}

.doc-table td {
  padding: 7px 12px;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}

.doc-table tr:last-child td {
  border-bottom: none;
}

.coord {
  font-family: monospace;
  font-size: 0.82rem;
}

.tag-rotate {
  font-size: 0.72rem;
  font-weight: 600;
  color: #60a5fa;
  margin-left: 4px;
}

code {
  font-size: 0.82rem;
  background: var(--color-background-mute);
  border-radius: 3px;
  padding: 1px 5px;
}

@media (min-width: 640px) {
  .ag-title {
    font-size: 2.2rem;
  }
}
</style>
