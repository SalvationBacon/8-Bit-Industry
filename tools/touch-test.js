// Headless touch test for 8-Bit Industry. Usage: node tools/touch-test.js  (Playwright + Chromium)
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();
for(const [name,w,h] of [['portrait',390,844],['landscape',844,390]]){
  const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,hasTouch:true,isMobile:true});
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file://'+require('path').resolve(__dirname,'..','index.html')); await p.waitForTimeout(400);
  await p.evaluate(()=>{localStorage.clear();});
  const R={}; const ok=(k,v,i)=>R[k]=v?'PASS':'FAIL '+JSON.stringify(i);
  const tapEl=async sel=>{const bb=await p.locator(sel).first().boundingBox(); if(!bb)return false; await p.touchscreen.tap(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(250); return true;};
  const tapTile=async(tx,ty)=>{const pt=await p.evaluate(([tx,ty])=>{const r=document.getElementById('wrap').getBoundingClientRect();const ts=TILE*G.cam.zoom;return{x:r.left+tx*ts-G.cam.x+ts/2,y:r.top+ty*ts-G.cam.y+ts/2};},[tx,ty]); await p.touchscreen.tap(pt.x,pt.y); await p.waitForTimeout(250);};
  await tapEl('button:has-text("NEW GAME")'); await p.waitForTimeout(1200);
  ok('new_game',await p.evaluate(()=>!!G&&!document.getElementById('sGame').classList.contains('hidden')));
  await tapEl('#mFoot button'); await p.waitForTimeout(300);
  ok('intro_closed',await p.evaluate(()=>document.getElementById('mOverlay').classList.contains('hidden')));
  // find a visible ore tile away from the floating card
  const ore=await p.evaluate(()=>{const r=document.getElementById('wrap').getBoundingClientRect(),ts=TILE*G.cam.zoom;
    for(let ty=0;ty<MAP_H;ty++)for(let tx=0;tx<MAP_W;tx++){const t=G.map[ty][tx];if(t.type!==1||t.res!=='iron_ore')continue;
      const sx=tx*ts-G.cam.x+ts/2, sy=ty*ts-G.cam.y+ts/2; if(sx>20&&sx<r.width-20&&sy>r.height*.45&&sy<r.height*.7)return{tx,ty};}
    // none visible: put one there
    const tx=Math.floor((G.cam.x+r.width/2)/ts), ty=Math.floor((G.cam.y+r.height*.55)/ts); G.map[ty][tx]={type:1,res:'iron_ore',mid:null,items:[]}; return{tx,ty};});
  await tapTile(ore.tx,ore.ty);
  ok('ore_popup',await p.evaluate(()=>!document.getElementById('resInfo').classList.contains('hidden')));
  for(let i=0;i<4;i++)await tapEl('#mineTapBtn');
  const m1=await p.evaluate(()=>({taps:G.stats.taps,ore:G.inv.iron_ore}));
  ok('mine_4_taps_once_each',m1.taps===4&&m1.ore===1,m1);
  await tapEl('#resInfo .ph-x');
  // build a chest via the drawer + PLACE
  await p.evaluate(()=>{G.inv.iron_plate=50;});
  await tapEl('#tab-build');
  ok('drawer_open',await p.evaluate(()=>document.getElementById('tabDrawer').classList.contains('open')));
  await p.locator('.ditem:has-text("Chest")').scrollIntoViewIfNeeded(); await tapEl('.ditem:has-text("Chest")');
  ok('tool_chest',await p.evaluate(()=>activeTool==='chest'),await p.evaluate(()=>activeTool));
  const spot=await p.evaluate(()=>{const r=document.getElementById('wrap').getBoundingClientRect(),ts=TILE*G.cam.zoom;
    const tx=Math.floor((G.cam.x+r.width*.3)/ts), ty=Math.floor((G.cam.y+r.height*.5)/ts); G.map[ty][tx]={type:0,res:null,mid:null,items:[]}; return{tx,ty};});
  await tapTile(spot.tx,spot.ty);
  ok('tap_moves_ghost_not_place',await p.evaluate(([x,y])=>G.map[y][x].mid===null,[spot.tx,spot.ty]));
  await tapEl('#buildConfirmBtn');
  ok('place_button_builds',await p.evaluate(([x,y])=>G.map[y][x].mid!==null,[spot.tx,spot.ty]));
  await tapEl('#tab-build'); // close drawer → select mode
  await tapTile(spot.tx,spot.ty);
  ok('tap_machine_opens_sheet',await p.evaluate(()=>openPanel==='machine'),await p.evaluate(()=>openPanel));
  await tapEl('#pMachine .ph-x');
  // tabs
  for(const t of ['craft','research','goal']){await tapEl('#tab-'+t); ok('tab_'+t,await p.evaluate(()=>!!openPanel),await p.evaluate(()=>openPanel)); await tapEl('#tab-'+t);}
  // menu tile
  await tapEl('#hud .hbtn:has-text("☰")'); await tapEl('.menu-tile:has-text("INVENTORY")');
  ok('menu_inventory',await p.evaluate(()=>openPanel==='inv'));
  await tapEl('#pInv .ph-x');
  // quit + continue, then mine again: taps must not double
  await p.evaluate(()=>{quitToTitle();}); await p.waitForTimeout(300);
  await tapEl('#titleSlots button:has-text("LOAD")'); await p.waitForTimeout(800);
  await p.evaluate(()=>closeModal());
  const t0=await p.evaluate(()=>G.stats.taps);
  await tapTile(ore.tx,ore.ty); for(let i=0;i<2;i++)await tapEl('#mineTapBtn');
  const t1=await p.evaluate(()=>G.stats.taps);
  ok('no_double_input_after_reload',t1-t0===2,{t0,t1});
  for(const[k,v]of Object.entries(R))console.log(name.padEnd(10),v.startsWith('PASS')?'  ':'✗ ',k.padEnd(30),v);
  console.log(name, errs.join('\n')||'no page errors'); await p.close();
}
await b.close();})();
