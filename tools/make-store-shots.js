// Draws the Google Play phone screenshots (1080x1920) from real factories built in the store build.
// Usage: node tools/build-app.js && node tools/make-store-shots.js [phone|tablet|pc] [name]   -> store/screenshots/<mode>/
//   phone 1080x1920 portrait (touch) · tablet 1920x1080 landscape (touch) · pc 1920x1080 landscape (mouse: key hints, hover info)
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
const MODE=process.argv[2]||'phone', only=process.argv[3];
if(!only){for(const n of ['1-ironfield','2-machine-panel','3-the-deep','4-singularity','5-research'])
  require('child_process').execFileSync('node',[__filename,MODE,n],{stdio:'inherit'}); process.exit(0);}
const DEV={phone:{viewport:{width:360,height:640},deviceScaleFactor:3,hasTouch:true,isMobile:true},
  tablet:{viewport:{width:1280,height:720},deviceScaleFactor:1.5,hasTouch:true,isMobile:true},
  pc:{viewport:{width:1280,height:720},deviceScaleFactor:1.5}}[MODE];
const ZOOM={phone:1,tablet:1.55,pc:1.55}[MODE];
const OUT=path.join(__dirname,'..','store','screenshots',MODE)+'/'; fs.mkdirSync(OUT,{recursive:true});
(async()=>{
const b=await chromium.launch();
const p=await b.newPage(DEV);
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(/FAILED/.test(m.text()))console.log(m.text());});
await p.addInitScript(()=>{localStorage.setItem('ebi_prefs',JSON.stringify({audioSet:true,music:false,sfx:false}));});
await p.goto('file://'+path.join(__dirname,'..','www','index.html')); await p.evaluate(z=>{window.ZM=z;},ZOOM); await p.waitForTimeout(500);
// helpers inside the page
await p.evaluate(()=>{
  window.S={}; checkAchievements=()=>{}; toast=()=>{};
  S.fake=()=>{const real=performance.now.bind(performance);let T=real();S.T=()=>T;S.real=real;performance.now=()=>T;S.run=n=>{for(let i=0;i<n;i++){T+=250;gameTick();}};S.restore=()=>{performance.now=real;};};
  S.start=(z)=>{
    newGame(); closeModal(); if(z>1){G.perks.awarded[1]=true;transitionToZone(z);closeModal();}
    clearInterval(tickId); tickId=null;
    G.tutorial={step:-1}; G.zoneTut=-1; G.devFreeBuild=true; G.research.done=Object.keys(TECHS);
    if(openPanel)closePanel(openPanel); if(activeTab)switchTab(activeTab);
    Object.assign(G.inv,{iron_ore:184,copper_ore:126,coal:240,stone:96,iron_plate:312,copper_plate:208,iron_gear:86,copper_wire:140,circuit:42,steel:36});
  };
  S.clean=()=>{closeModal();S.applyCam();document.getElementById('toasts').innerHTML='';};
  S.clear=(x0,y0,w,h)=>{for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const t=G.map[y][x];if(t.mid!==null)tryRemove(x,y,true);t.type=0;t.res=null;t.items=[];}invalidateChunks();};
  S.ore=(x0,y0,w,h,r)=>{for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){G.map[y][x].type=1;G.map[y][x].res=r;}invalidateChunks();};
  S.put=(type,x,y,dir=0,extra)=>{placeDir=dir;const id=G.nextId;tryPlace(type,x,y);closeModal();const m=G.machines[id];if(m&&extra)Object.assign(m,extra);if(!m)console.log('FAILED',type,x,y);return m;};
  S.belt=(x0,y0,x1,y1,dir)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)S.put('belt',x,y,dir);};
  S.cam=(x,y,zoom)=>{S.want=[x,y,zoom*(window.ZM||1)];S.applyCam();};
  S.applyCam=()=>{if(!S.want)return;const[x,y,zoom]=S.want;G.cam.zoom=zoom;const r=document.getElementById('wrap').getBoundingClientRect(),ts=TILE*zoom;G.cam.x=x*ts-r.width/2;G.cam.y=y*ts-r.height/2;};
  S.fuel=()=>{for(const m of Object.values(G.machines)){if(['generator','burner'].includes(m.type))m.inBuf.coal=9999;if(m.type==='stone_furnace'||m.type==='blast_furnace')m.inBuf.coal=999;if(m.type==='combustion_gen'||m.type==='scrubber')m.inBuf.refined_fuel=999;if(m.type==='reactor')m.inBuf.luminite_rod=99;}};
});
// Each shot runs in a fresh page (run with no name to do them all); 2 and 5 build on the scene before them.
const NEEDS={'2-machine-panel':'1-ironfield','5-research':'4-singularity'};
async function shot(name,fn,settle=1200){
  const prep=only&&NEEDS[only]===name;
  if(only&&only!==name&&!prep)return;
  if(prep){await p.evaluate(fn); await p.waitForTimeout(900); await p.evaluate(()=>S.clean()); return;}
  await p.evaluate(fn); await p.waitForTimeout(900); await p.evaluate(()=>S.clean()); await p.waitForTimeout(settle);
  await p.screenshot({path:OUT+name+'.png'}); console.log('shot',name);
}

// 1. Ironfield: ore → miners → belts → furnaces → plates → assemblers making gears
await shot('1-ironfield',()=>{
  S.start(1); S.fake();
  const X=8,Y=G.floorY+4; S.clear(X-4,Y-3,26,20);
  S.ore(X,Y,6,1,'iron_ore'); S.ore(X,Y+9,6,1,'copper_ore');
  for(let i=0;i<6;i++){S.put('miner',X+i,Y,1);S.put('miner',X+i,Y+9,1);}
  // power
  S.put('generator',X-3,Y+2); S.put('generator',X-3,Y+5);
  S.belt(X,Y+1,X+13,Y+1,0); S.belt(X,Y+10,X+13,Y+10,0);
  for(const [row,ore] of [[Y+1,'iron'],[Y+10,'copper']]){
    for(let i=0;i<4;i++){const fx=X+2+i*3; S.put('inserter',fx,row+1,1); S.put('stone_furnace',fx,row+2,1,{recipe:'fn_'+ore});}
    S.belt(X+1,row+3,X+13,row+3,0);
  }
  // gears from iron plates
  for(let i=0;i<3;i++){const ax=X+3+i*3; S.put('inserter',ax,Y+5,1); S.put('assembler',ax,Y+6,0,{recipe:'mk_gear'});}
  S.fuel(); S.run(700); S.restore(); S.cam(X+5.5,Y+6.2,.62);
});

if(MODE==='pc'&&only==='1-ironfield'){ // rest the mouse on an assembler: hover info + key hints
  const pt=await p.evaluate(()=>{const a=Object.values(G.machines).find(m=>m.type==='assembler'),r=document.getElementById('wrap').getBoundingClientRect(),ts=TILE*G.cam.zoom;return{x:r.left+(a.x+1)*ts-G.cam.x,y:r.top+(a.y+1)*ts-G.cam.y};});
  await p.mouse.move(pt.x,pt.y); await p.mouse.move(pt.x+2,pt.y+2); await p.waitForTimeout(700);
  await p.screenshot({path:OUT+'1-ironfield.png'}); console.log('shot 1-ironfield (hover)'); await p.mouse.move(5,5);
}
// 2. machine panel with per-minute rates
await shot('2-machine-panel',()=>{
  S.want=null; const a=Object.values(G.machines).find(m=>m.type==='assembler'); selectMachineById(a.id);
});

// 3. The Deep: pipes, pressure, cave walls
await shot('3-the-deep',()=>{
  if(openPanel)closePanel(openPanel); S.start(3); S.fake();
  const X=10,Y=G.floorY+4; S.clear(X-4,Y-3,28,20);
  S.ore(X,Y,2,2,'brine'); S.ore(X,Y+6,2,2,'brine');
  S.put('brine_pump',X,Y); S.put('brine_pump',X,Y+6);
  for(let y=Y;y<=Y+8;y++)S.put('pipe',X+2,y);
  for(let x=X+3;x<=X+12;x++)S.put('pipe',x,Y+4);
  S.put('fluid_tank',X+4,Y+2); S.put('relief_valve',X+6,Y+3);
  S.put('evaporator',X+8,Y+5,0,{recipe:'z3_lithium'}); S.put('evaporator',X+11,Y+5,0,{recipe:'z3_lithium'});
  S.put('separator',X+8,Y+2,0); S.put('separator',X+11,Y+2,0);
  S.put('lumen_panel',X+4,Y+9); S.put('lumen_panel',X+7,Y+9); S.put('accumulator',X+10,Y+9); S.put('accumulator',X+11,Y+9); S.put('accumulator',X+10,Y+10); S.put('accumulator',X+11,Y+10);
  S.put('generator',X-3,Y+2); S.put('generator',X-3,Y+5); S.put('generator',X-3,Y+8); S.put('generator',X-3,Y+11);
  S.fuel(); S.run(300); S.restore(); S.cam(X+5,Y+5.5,.62);
});

// 4. The Singularity
await shot('4-singularity',()=>{
  S.start(5); S.fake();
  const X=20,Y=G.floorY+4; S.clear(X-6,Y-4,30,22);
  const s=S.put('singularity',X,Y);
  if(s){s.built={};for(const[k,v]of Object.entries(SING_REQS))s.built[k]=Math.round(v*.7);}
  S.put('reactor',X-5,Y); S.put('heat_sink',X-2,Y+1); S.put('reactor',X-5,Y+5);
  for(let y=Y;y<Y+10;y++){S.put('belt',X+11,y,3);} for(let i=0;i<4;i++)S.put('inserter',X+10,Y+1+i*2,2);
  S.put('assembler',X+12,Y+1,0,{recipe:'z5_lens'}); S.put('assembler',X+12,Y+4,0,{recipe:'z5_casing'}); S.put('assembler',X+12,Y+7,0,{recipe:'z5_engine'});
  for(let i=0;i<4;i++)S.put('generator',X+15,Y+i*3);
  S.fuel(); S.run(200); S.restore(); S.cam(X+4,Y+5,.42);
});

// 5. research panel
await shot('5-research',()=>{ switchTab('research'); },900);

console.log(errs.join('\n')||'no page errors'); await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
