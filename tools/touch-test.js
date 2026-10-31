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
  // title screen: the first tap on the speaker must start the music, not mute it
  ok('title_sound_hint',await p.evaluate(()=>!document.getElementById('titleSoundHint').classList.contains('hidden')));
  await tapEl('#titleMute'); await p.waitForTimeout(300);
  ok('title_speaker_starts_music',await p.evaluate(()=>_music.running&&PREFS.music!==false&&_ac.state==='running'),await p.evaluate(()=>({m:_music.running,p:PREFS.music,c:_ac&&_ac.state})));
  await tapEl('button:has-text("NEW GAME")'); await p.waitForTimeout(1200);
  ok('new_game',await p.evaluate(()=>!!G&&!document.getElementById('sGame').classList.contains('hidden')));
  // audio must actually be running after real taps (a context made on pointerdown stays suspended: silent game)
  ok('audio_running',await p.evaluate(()=>!!_ac&&_ac.state==='running'),await p.evaluate(()=>_ac&&_ac.state));
  await tapEl('#mFoot button'); await p.waitForTimeout(300);
  ok('intro_closed',await p.evaluate(()=>document.getElementById('mOverlay').classList.contains('hidden')));
  // switching apps suspends audio; the next tap wakes it
  await p.evaluate(()=>_ac.suspend()); await p.touchscreen.tap(200,200); await p.waitForTimeout(300);
  ok('audio_wakes_after_suspend',await p.evaluate(()=>_ac.state==='running'),await p.evaluate(()=>_ac.state));
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
  // belt line: tap to set the ghost, drag from it (right 4, down 2), PLACE builds 7 belts facing along the path
  const cdp=await p.context().newCDPSession(p);
  const tilePt=([tx,ty])=>p.evaluate(([tx,ty])=>{const r=document.getElementById('wrap').getBoundingClientRect();const ts=TILE*G.cam.zoom;return{x:r.left+tx*ts-G.cam.x+ts/2,y:r.top+ty*ts-G.cam.y+ts/2};},[tx,ty]);
  const dragPath=async pts=>{let a=await tilePt(pts[0]); await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
    for(const q of pts.slice(1)){const b2=await tilePt(q); for(let k=1;k<=6;k++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b2.x-a.x)*k/6,y:a.y+(b2.y-a.y)*k/6}]}); a=b2;}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await p.waitForTimeout(250);};
  const ls=await p.evaluate(()=>{setTool('belt'); const r=document.getElementById('wrap').getBoundingClientRect(),ts=TILE*G.cam.zoom;
    // a 5×3 patch with no machines (belts may sit on ore), every tile visible and not under a floating card
    const x0=Math.ceil(G.cam.x/ts), y0=Math.ceil(G.cam.y/ts), x1=Math.floor((G.cam.x+r.width)/ts)-5, y1=Math.floor((G.cam.y+r.height)/ts)-3;
    const clear=(x,y)=>{const t=G.map[y][x]; if(t.mid!==null)return false;
      const e=document.elementFromPoint(r.left+x*ts-G.cam.x+ts/2,r.top+y*ts-G.cam.y+ts/2); return e&&e.tagName==='CANVAS';};
    let tx=-1,ty=-1;
    for(let y=y0;y<=y1&&tx<0;y++)for(let x=x0;x<=x1&&tx<0;x++){let free=true;for(let j=0;j<3&&free;j++)for(let i=0;i<5&&free;i++)if(!clear(x+i,y+j))free=false;if(free){tx=x;ty=y;}}
    G.inv.iron_plate=50; return{tx,ty};});
  await tapTile(ls.tx,ls.ty);
  await dragPath([[ls.tx,ls.ty],[ls.tx+4,ls.ty],[ls.tx+4,ls.ty+2]]);
  ok('belt_drag_draws_line',await p.evaluate(()=>line.path.length===7&&!line.drawing),await p.evaluate(()=>line.path.length));
  const cam0=await p.evaluate(()=>G.cam.x);
  await tapEl('#buildConfirmBtn');
  const lr=await p.evaluate(([tx,ty])=>{const d=[];for(let x=tx;x<=tx+4;x++)d.push(G.machines[G.map[ty][x].mid]?.dir);d.push(G.machines[G.map[ty+1][tx+4].mid]?.dir,G.machines[G.map[ty+2][tx+4].mid]?.dir);return{d,camSame:true};},[ls.tx,ls.ty]);
  ok('belt_line_places_facing_path',lr.d.join()==='0,0,0,0,1,1,1',lr);
  ok('belt_line_no_pan',await p.evaluate(c=>G.cam.x===c,cam0));
  await p.evaluate(()=>undoLast());
  ok('belt_line_one_undo',await p.evaluate(([tx,ty])=>G.map[ty][tx].mid===null&&G.map[ty+2][tx+4].mid===null,[ls.tx,ls.ty]));
  // a drag that starts away from the ghost still pans the map
  const camA=await p.evaluate(()=>({x:G.cam.x,y:G.cam.y}));
  { const r=await p.evaluate(()=>{const b=document.getElementById('wrap').getBoundingClientRect();return{x:b.left+b.width*.75,y:b.top+b.height*.45};});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[r]});
    for(let k=1;k<=6;k++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x-k*12,y:r.y-k*8}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await p.waitForTimeout(250); }
  ok('drag_off_ghost_pans',await p.evaluate(a=>(G.cam.x!==a.x||G.cam.y!==a.y)&&line.path.length===0,camA),await p.evaluate(()=>({cam:G.cam,hov,len:line.path.length})));
  await p.evaluate(a=>{G.cam.x=a.x;G.cam.y=a.y;},camA);
  await p.evaluate(()=>setTool('select'));
  await tapEl('#tab-build'); // close drawer → select mode
  await tapTile(spot.tx,spot.ty);
  ok('tap_machine_opens_sheet',await p.evaluate(()=>openPanel==='machine'),await p.evaluate(()=>openPanel));
  await tapEl('#pMachine .ph-x');
  // tabs
  for(const t of ['craft','research','goal']){await tapEl('#tab-'+t); ok('tab_'+t,await p.evaluate(()=>!!openPanel),await p.evaluate(()=>openPanel)); await tapEl('#tab-'+t);}
  // menu tile
  await tapEl('#hud .hbtn[title="Menu"]'); await tapEl('.menu-tile:has-text("INVENTORY")');
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
