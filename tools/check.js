// Headless regression check for 8-Bit Industry.
// Usage: node tools/check.js   (needs Playwright + Chromium, preinstalled in Claude cloud sessions)
// Checks: inline-script syntax, every zone completable from its own deposits,
// a full Zone 1 → 5 run with dev helpers through the Big Bang, and no page errors.
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const file = 'file://' + path.resolve(__dirname, '..', 'index.html');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(file);
  await page.waitForTimeout(300);

  const result = await page.evaluate(async () => {
    const out = { failures: [] };
    const wait = ms => new Promise(r => setTimeout(r, ms));

    // 1. Syntax
    document.querySelectorAll('script:not([src])').forEach((s, i) => {
      try { new Function(s.textContent); } catch (e) { out.failures.push(`script ${i}: ${e.message}`); }
    });

    // 2. Reachability — research carries forward zone by zone
    const deposits = { 1: ['iron_ore', 'copper_ore', 'coal', 'stone'], 2: ['oil', 'iron_ore', 'copper_ore', 'coal', 'stone'],
      3: DEPOSITS_Z3.map(d => d[0]), 4: DEPOSITS_Z4.map(d => d[0]), 5: DEPOSITS_Z5.map(d => d[0]) };
    const research = new Set();
    for (let z = 1; z <= 5; z++) {
      const have = new Set();
      const machineOk = t => { const d = MDEFS[t]; return d && (!d.unlock || research.has(d.unlock)) && Object.keys(d.cost).every(i => have.has(i)); };
      for (let changed = true, guard = 0; changed && guard < 200; guard++) {
        changed = false;
        const add = i => { if (!have.has(i)) { have.add(i); changed = true; } };
        for (const r of deposits[z]) {
          if (!FLUID_RES[r]) { add(r); continue; }
          const pump = Object.entries(MDEFS).find(([k, d]) => d.pumps === r || (r === 'oil' && k === 'oil_pump'));
          if (pump && machineOk(pump[0])) add(r === 'oil' ? 'crude_oil' : r);
        }
        for (const hc of HAND_CRAFTS)
          if ((!hc.unlock || research.has(hc.unlock)) && Object.keys(hc.in).every(i => have.has(i))) Object.keys(hc.out).forEach(add);
        for (const r of Object.values(RECIPES)) {
          if (r.unlock && !research.has(r.unlock)) continue;
          if (!machineOk(r.machine) || (r.fluid && !machineOk('pipe'))) continue;
          if ([...Object.keys(r.in), ...Object.keys(r.fluid || {})].every(i => have.has(i))) Object.keys(r.out).forEach(add);
        }
        for (const [id, t] of Object.entries(TECHS)) {
          if (research.has(id) || (z < 5 && (t.zone || 1) !== z) || !t.req.every(r => research.has(r))) continue;
          if (Object.keys(t.cost).every(i => have.has(i))) { research.add(id); changed = true; }
        }
      }
      const goal = z < 5 ? rocketReqsFor(z) : Object.keys(SING_REQS);
      const missing = [...zoneTechs(z).map(([k]) => k).filter(k => !research.has(k)), ...goal.filter(i => !have.has(i))];
      if (missing.length) out.failures.push(`zone ${z} unreachable: ${missing.join(', ')}`);
    }
    function rocketReqsFor(z) { return ZONES[z].parts.map(p => p.id).concat(ZONES[z].fuel ? [ZONES[z].fuel.item] : []); }

    // 3. Full run with dev helpers
    localStorage.removeItem(PRESTIGE_KEY); PRESTIGE = loadPrestige();
    newGame(); await wait(50); closeModal();
    for (let z = 1; z <= 4; z++) {
      devCompleteZone(); launchRocket();
      if (!G.stats.launched) out.failures.push(`zone ${z} launch failed`);
      continueToNextZone(); await wait(30); closeModal();
    }
    clearInterval(tickId);
    if (G.zone !== 5) out.failures.push(`expected zone 5, got ${G.zone}`);
    devCompleteZone(); G.devFreeBuild = true;
    const spot = (type) => { for (let y = 2; y < MAP_H - 12; y++) for (let x = 2; x < MAP_W - 12; x++) if (canPlace(type, x, y)) return [x, y]; };
    tryPlace('singularity', ...spot('singularity'));
    depositToSingularity(); gameTick();
    for (let i = 0; i < 3; i++) {
      tryPlace('reactor', ...spot('reactor'));
      Object.values(G.machines).filter(m => m.type === 'reactor').pop().inBuf.lum_rod = 50;
    }
    for (let t = 0; t < 260; t++) gameTick();
    if (!G.bigBang) out.failures.push('Big Bang did not trigger');
    if (!(PRESTIGE.stardust > 0)) out.failures.push('no Stardust awarded');
    try { saveGame(); JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { out.failures.push('save failed: ' + e.message); }
    out.perks = G.perks.points; out.stardust = PRESTIGE.stardust;
    return out;
  });

  await page.waitForTimeout(2200);
  await browser.close();
  const failures = [...result.failures, ...errors.map(e => 'page error: ' + e)];
  if (failures.length) { console.error('FAIL\n' + failures.join('\n')); process.exit(1); }
  console.log(`OK: all zones reachable, full run to Big Bang (${result.perks} perk points, ${result.stardust} Stardust)`);
})();
