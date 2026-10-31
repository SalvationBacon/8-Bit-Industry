// Headless play test for 8-Bit Industry. Usage: node tools/play-test.js  (Playwright + Chromium)
// Real-play simulation: builds factories with tryPlace and runs real ticks on a fake clock
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:400,height:800}});
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message+' @ '+(e.stack||'').split('\n').slice(1,3).join(' | ')));
await p.goto('file://'+require('path').resolve(__dirname,'..','index.html')); await p.waitForTimeout(300);
const r=await p.evaluate(async()=>{
  const R={}; const ok=(k,v,info)=>{R[k]=v?'PASS':'FAIL '+(info!==undefined?JSON.stringify(info):'');};
  let T=performance.now(); performance.now=()=>T; Date.now=(()=>{const base=Date.now();return()=>base+(T-performance.now.base||0);})();
  const run=n=>{for(let i=0;i<n;i++){T+=250;gameTick();}};
  newGame(); await new Promise(r=>setTimeout(r,800)); closeModal(); clearInterval(tickId); clearInterval(tickId);
  const reset=()=>{G.machines={};for(const row of G.map)for(const t of row){t.mid=null;t.items=[];t.type=0;t.res=null;}G.devFreeBuild=true;G.research.done=Object.keys(TECHS).filter(k=>!TECHS[k].zone||TECHS[k].zone<=G.zone);};
  const put=(type,x,y,dir=0)=>{placeDir=dir;const before=G.nextId;tryPlace(type,x,y);closeModal();return G.machines[before]||null;};
  const res=(x,y,w,h,r)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){G.map[j][i].type=1;G.map[j][i].res=r;}};
  const power=(x,y)=>{const b=put('generator',x,y);if(b)b.inBuf.coal=9999;return b;};
  // ── Z1 A: miner → inserter → chest
  reset(); power(2,2); res(10,10,1,1,'iron_ore');
  const mi=put('miner',10,10); put('inserter',11,10,0); const ch=put('chest',12,10);
  run(200); ok('z1_miner_inserter_chest',(ch.chestInv.iron_ore||0)>5,ch.chestInv);
  // ── B: miner → inserter → belt line → inserter → chest
  reset(); power(2,2); res(10,10,1,1,'iron_ore'); put('miner',10,10); put('inserter',11,10,0);
  for(let x=12;x<18;x++)put('belt',x,10,0); put('inserter',18,10,0); const ch2=put('chest',19,10);
  run(400); ok('z1_belt_transport',(ch2.chestInv.iron_ore||0)>3,ch2.chestInv);
  // belt turning a corner
  reset(); power(2,2); res(10,10,1,1,'iron_ore'); put('miner',10,10); put('inserter',11,10,0);
  put('belt',12,10,0);put('belt',13,10,0);put('belt',14,10,1);put('belt',14,11,1);put('belt',14,12,1);put('inserter',14,13,1);const ch3=put('chest',14,14);
  run(400); ok('z1_belt_corner',(ch3.chestInv.iron_ore||0)>2,ch3.chestInv);
  // ── C: splitter splits to both outputs
  reset(); power(2,2); res(10,10,1,1,'iron_ore'); put('miner',10,10); put('inserter',11,10,0);
  put('belt',12,10,0); put('belt',13,10,0); const sp=put('splitter',14,10,0);
  put('belt',15,10,0);put('belt',16,10,0);put('inserter',17,10,0);const cA=put('chest',18,10);
  put('belt',15,11,0);put('belt',16,11,0);put('inserter',17,11,0);const cB=put('chest',18,11);
  run(800); ok('z1_splitter_both',(cA.chestInv.iron_ore||0)>0&&(cB.chestInv.iron_ore||0)>0,{A:cA.chestInv,B:cB.chestInv,sp:!!sp});
  // ── D: tunnel
  reset(); power(2,2); res(10,10,1,1,'iron_ore'); put('miner',10,10); put('inserter',11,10,0);
  put('belt',12,10,0); const tA=put('tunnel',13,10,0); put('stone_furnace',14,10); const tB=put('tunnel',16,10,0);
  put('belt',17,10,0); put('inserter',18,10,0); const cT=put('chest',19,10);
  run(600); ok('z1_tunnel',(cT.chestInv.iron_ore||0)>0,{linked:tA?.tunnelId,chest:cT.chestInv});
  // tunnel placed exit-first still links; removing one end unlinks the other
  reset(); const ex=put('tunnel',16,12,0); const en=put('tunnel',13,12,0);
  ok('tunnel_reverse_order_link',en&&en.tunnelId===ex.id,{en:en?.tunnelId,ex:ex.id});
  tryRemove(13,12); ok('tunnel_remove_unlinks',ex.tunnelId===null,{ex:ex.tunnelId});
  // removing a belt returns the items riding on it
  reset(); const bb=put('belt',20,20,0); G.map[20][20].items=[{id:'circuit',prog:.3},{id:'circuit',prog:.6}]; const c0=G.inv.circuit||0;
  tryRemove(20,20); ok('belt_remove_refunds_items',(G.inv.circuit||0)===c0+2,{c0,now:G.inv.circuit});
  // ── E: long inserter
  reset(); power(2,2); const src=put('chest',10,10); src.chestInv.iron_plate=20; put('long_inserter',12,10,0); const dst=put('chest',14,10);
  run(200); ok('z1_long_inserter',(dst.chestInv.iron_plate||0)>0,dst.chestInv);
  // ── F: furnace fed iron + coal, output pulled to chest
  reset(); power(2,2);
  const io=put('chest',10,10); io.chestInv.iron_ore=40; put('inserter',11,10,0); const fu=put('stone_furnace',12,10); fu.recipe='fn_iron';
  const co=put('chest',12,8); co.chestInv.coal=40; put('inserter',12,9,1);
  put('inserter',13,10,0); const out=put('chest',14,10);
  run(800); ok('z1_furnace_chain',(out.chestInv.iron_plate||0)>2,{out:out.chestInv,fu:fu.inBuf});
  // ── G: assembler gears with power
  reset(); power(2,2);
  const pl=put('chest',10,10); pl.chestInv.iron_plate=60; put('inserter',11,10,0); const as=put('assembler',12,10); as.recipe='mk_gear';
  put('inserter',14,10,0); const go=put('chest',15,10);
  run(600); ok('z1_assembler',(go.chestInv.iron_gear||0)>2,{go:go.chestInv,as:as.inBuf,pwr:G.power});
  // no power → nothing
  reset(); const pl2=put('chest',10,10); pl2.chestInv.iron_plate=60; put('inserter',11,10,0); const as2=put('assembler',12,10); as2.recipe='mk_gear'; put('inserter',14,10,0); const go2=put('chest',15,10);
  const gen=power(2,2); gen.inBuf.coal=0; run(200); ok('z1_no_power_stops',!(go2.chestInv.iron_gear>0),go2.chestInv);
  // ── H: upgrade + module
  reset(); power(2,2); const up=put('assembler',10,10); G.devFreeBuild=false; Object.assign(G.inv,{iron_plate:500,iron_gear:500,circuit:500,steel_plate:500,engine:50,speed_module:2});
  upgradeMachine(up.id); ok('z1_upgrade_t2',up.tier===2,up.tier); upgradeMachine(up.id); ok('z1_upgrade_t3',up.tier===3,up.tier);
  installModule(up.id,0,'speed_module'); ok('z1_module',(up.modules||[]).includes('speed_module'),up.modules);
  // ── I: remove refunds
  reset(); G.devFreeBuild=false; G.inv.iron_plate=50; G.inv.iron_gear=50; const rm=put('miner',20,20); res(20,20,1,1,'coal'); const rm2=put('miner',20,20);
  const before=G.inv.iron_plate; tryRemove(20,20); ok('z1_remove_refund',G.inv.iron_plate===before+5&&!G.machines[rm2?.id],{before,after:G.inv.iron_plate});
  G.devFreeBuild=true;
  // ── J: multisel move + copy/paste, blueprint
  reset(); power(2,2); put('chest',10,10); put('chest',11,10);
  setTool('multisel'); handleTap({x:10,y:10}); handleTap({x:11,y:10}); const sel=multiselState.ids.length;
  multiselStartMove(); handleTap({x:10,y:14});
  ok('multisel_move',sel===2&&G.map[14][10].mid!==null&&G.map[10][10].mid===null,{sel,at14:G.map[14][10].mid,at10:G.map[10][10].mid,mode:multiselState.mode});
  multiselClear(); setTool('select');
  // single machine MOVE button
  const mv=put('chest',20,20); moveSingleMachine(mv.id); handleTap({x:22,y:22});
  ok('panel_move_button',G.map[22][22].mid===mv.id,{mode:multiselState.mode});
  multiselClear(); setTool('select');
  // ── K: hand craft
  reset(); G.devFreeCraft=false; G.inv.iron_ore=10; G.inv.iron_plate=0; startCraft('iron_plate'); for(let i=0;i<5;i++)hammerClick();
  ok('hand_craft',G.inv.iron_plate>=1,{plate:G.inv.iron_plate,ore:G.inv.iron_ore});
  // ── L: mining taps
  res(30,30,1,1,'stone'); const st0=G.inv.stone||0; openResInfo('stone',30,30); for(let i=0;i<4;i++)doMineTap(); closeResInfo();
  ok('mine_tap',(G.inv.stone||0)===st0+Math.max(1,Math.round(perkMult().yield)),{st0,now:G.inv.stone});
  // ── research via doResearch
  G.research.done=[]; G.inv.sci_red=5; doResearch('automation'); ok('research',G.research.done.includes('automation')&&G.inv.sci_red===0);
  // ── Z2: oil chain + smog + scrubber
  G.perks.awarded[1]=true; transitionToZone(2); closeModal(); clearInterval(tickId); reset(); power(2,2); power(2,5);
  res(10,10,2,2,'oil'); const op=put('oil_pump',10,10); put('inserter',12,10,0); const cr=put('cracker',13,10); put('inserter',15,10,0); const cc=put('chest',16,10);
  run(800); ok('z2_oil_cracker',(cc.chestInv.raw_fuel||0)>0,{cc:cc.chestInv,pump:op?.outBuf,cr:cr?.inBuf});
  ok('z2_smog_rises',G.smog>0,G.smog);
  const scr=put('scrubber',20,20); scr.inBuf.refined_fuel=50; G.smog=60; const s0=G.smog; G.machines[op.id].active=false; run(100); ok('z2_scrubber',G.smog<s0-10,{s0,now:G.smog});
  // ── Z3: rod press needs ≥60% pressure; accumulator covers dim glow
  G.perks.awarded[2]=true; transitionToZone(3); closeModal(); clearInterval(tickId); reset(); power(2,2); power(2,5);
  res(10,10,2,2,'brine'); put('brine_pump',10,10); for(let x=12;x<16;x++)put('pipe',x,10); put('fluid_tank',16,9);
  const rp=put('rod_press',12,11); rp.recipe='z3_rod'; rp.inBuf.lattice_core=5; rp.inBuf.radiant_dust=25;
  run(30); const lowP=pressureOf(rp._nets[0]); const madeLow=rp.prog>0;
  run(600); const hiP=pressureOf(rp._nets[0]);
  ok('z3_rod_press_pressure_gate',!madeLow&&(rp.outBuf.fuel_rod||0)>0,{lowP,hiP,out:rp.outBuf,st:rp._fluidStatus});
  // lumen + accumulator: during dim, accumulator should cover
  reset(); const lp=put('lumen_panel',10,10); const acc=put('accumulator',13,10); const asm=put('assembler',15,10); asm.recipe='mk_gear'; asm.inBuf.iron_plate=40;
  G.tick=0; run(700); const chargeEnd=acc.charge; G.tick=720; run(4); const dimRatio=powerRatio();
  ok('z3_accumulator_night',chargeEnd>0&&dimRatio===1,{chargeEnd,dimRatio,pwr:G.power});
  { const bp=Object.values(G.machines).find(m=>m.type==='brine_pump'); }
  reset(); res(10,10,2,2,'brine'); res(20,20,1,1,'quartz'); const bp=put('brine_pump',10,10); const fz=put('assembler',30,30);
  setTool('multisel'); multiselState.ids=[bp.id]; multiselState.mode='selected'; multiselStartMove(); handleTap({x:14,y:10});
  ok('move_pump_off_pool_refused',bp.x===10,{x:bp.x});
  multiselClear(); multiselState.ids=[fz.id]; multiselState.mode='selected'; multiselStartMove(); handleTap({x:20,y:20});
  ok('move_onto_ore_refused',fz.x===30,{x:fz.x}); multiselClear(); setTool('select');
  // pasting a layout: pump learns its pool, furnace refused on ore
  reset(); res(30,30,2,2,'brine'); res(40,40,2,2,'quartz');
  const lay=[{type:'brine_pump',rx:0,ry:0,dir:0},{type:'pipe',rx:2,ry:0,dir:0}];
  pasteBlueprintAt(lay,30,30); const pp=Object.values(G.machines).find(m=>m.type==='brine_pump');
  ok('paste_pump_sets_resource',pp&&pp.mineRes==='brine',pp?.mineRes);
  const before2=Object.keys(G.machines).length; pasteBlueprintAt([{type:'assembler',rx:0,ry:0,dir:0}],40,40);
  ok('paste_refused_on_ore',Object.keys(G.machines).length===before2);
  // ── Z4: algae vat fed paste by inserter grows
  G.perks.awarded[3]=true; transitionToZone(4); closeModal(); clearInterval(tickId); reset(); power(2,2);
  res(10,10,2,2,'enzymes'); put('enzyme_pump',10,10); put('pipe',12,10); put('pipe',13,10);
  const vat=put('algae_vat',14,10); const pc=put('chest',14,13); pc.chestInv.nutrient=40; put('inserter',14,12,3);
  const v0=vat.vit; run(400); ok('z4_vat_fed_grows',vat.vit>v0&&(vat.outBuf.algae||0)>0,{v0,v:vat.vit,algae:vat.outBuf.algae,st:vat._fluidStatus});
  // reactor with 2 sinks stays below SCRAM for long
  const re=put('reactor',20,20); re.inBuf.lum_rod=20; put('heat_sink',23,20); put('heat_sink',23,21); run(1200);
  ok('z4_reactor_two_sinks_stable',!(re.scram>0)&&re.heat<100,{heat:re.heat,scram:re.scram});
  // ── Z5: singularity fed by inserter
  G.perks.awarded[4]=true; transitionToZone(5); closeModal(); clearInterval(tickId); reset(); power(2,2);
  const sg=put('singularity',20,20); const feed=put('chest',18,22); Object.assign(feed.chestInv,{grav_lens:10,stellar_casing:20}); put('inserter',19,22,0);
  run(600); ok('z5_singularity_inserter_feed',((sg.built||{}).grav_lens||0)+((sg.built||{}).stellar_casing||0)>5,sg.built);
  // ── save → load round trip (zone 5 state)
  saveGame(); const snap={n:Object.keys(G.machines).length,built:JSON.stringify(sg.built),zone:G.zone,w:MAP_W};
  G=null; continueGame(); await new Promise(r=>setTimeout(r,50)); closeModal(); clearInterval(tickId);
  ok('save_load_roundtrip',Object.keys(G.machines).length===snap.n&&G.zone===snap.zone&&MAP_W===snap.w&&JSON.stringify(Object.values(G.machines).find(m=>m.type==='singularity').built)===snap.built,{snap,n:Object.keys(G.machines).length});
  // ── undo: place (from crafted and from materials), demolish, group demolish, move, rotate, paste
  reset(); G.devFreeBuild=false; clearUndo(); Object.assign(G.inv,{iron_plate:100,iron_gear:100,stone:100,copper_wire:100,circuit:100});
  G.crafted.chest=1; const uc=put('chest',30,30); const plates0=G.inv.iron_plate;
  undoLast(); ok('undo_place_crafted',!G.machines[uc.id]&&G.crafted.chest===1&&G.inv.iron_plate===plates0,{cr:G.crafted.chest,p:G.inv.iron_plate,plates0});
  const p0=G.inv.iron_plate; const ua=put('assembler',30,30); undoLast();
  ok('undo_place_materials',!G.machines[ua.id]&&G.inv.iron_plate===p0,{p0,now:G.inv.iron_plate});
  const ud=put('assembler',30,30); ud.recipe='mk_gear'; ud.inBuf.iron_plate=7; const p1=G.inv.iron_plate; tryRemove(30,30); undoLast();
  const back=G.machines[G.map[30][30].mid];
  ok('undo_demolish',back&&back.type==='assembler'&&back.recipe==='mk_gear'&&G.inv.iron_plate===p1+7,{t:back?.type,r:back?.recipe,p1,now:G.inv.iron_plate});
  const g1=put('chest',40,40), g2=put('chest',41,40); setTool('multisel'); handleTap({x:40,y:40}); handleTap({x:41,y:40}); multiselDemolish();
  undoLast(); ok('undo_group_demolish',G.map[40][40].mid!==null&&G.map[40][41].mid!==null,{a:G.map[40][40].mid,b:G.map[40][41].mid});
  setTool('select'); const um=put('chest',44,44); setTool('move'); handleTap({x:44,y:44}); handleTap({x:46,y:46}); undoLast(); setTool('select');
  ok('undo_move',um.x===44&&um.y===44&&G.map[44][44].mid===um.id&&G.map[46][46].mid===null,{x:um.x,y:um.y});
  const ub=put('belt',50,50,0); rotateM(ub.id); rotateM(ub.id); undoLast(); undoLast(); ok('undo_rotate',ub.dir===0,ub.dir);
  multiselState.clipboard=[{type:'chest',rx:0,ry:0,dir:0},{type:'chest',rx:1,ry:0,dir:0}]; setTool('multisel'); multiselStartPaste(); multiselState.pasteAnchor={x:52,y:30}; ghostConfirm();
  const pasted=G.map[30][52].mid!==null&&G.map[30][53].mid!==null; undoLast();
  ok('undo_paste',pasted&&G.map[30][52].mid===null&&G.map[30][53].mid===null,{pasted});
  multiselClear(); setTool('select');
  put('chest',60,60); tryRemove(60,60); undoBusy=true; stampMachine({type:'belt',dir:0},60,60); undoBusy=false; const nU=undoStack.length; undoLast();
  ok('undo_blocked_rebuild_refused',undoStack.length===nU&&G.machines[G.map[60][60].mid].type==='belt',{nU,now:undoStack.length});
  // demolish refunds upgrade steps and modules; undo charges them again and restores the machine
  const inv0={...G.inv}; Object.assign(G.inv,{steel_plate:50,engine:10,speed_module:1});
  const t3=put('assembler',30,34); upgradeMachine(t3.id); upgradeMachine(t3.id); installModule(t3.id,0,'speed_module');
  const afterUp={...G.inv}; tryRemove(30,34);
  const w=machineWorth('assembler',3,['speed_module']); const gotBack=Object.entries(w).every(([k,n])=>(G.inv[k]||0)-(afterUp[k]||0)===n);
  ok('demolish_refunds_upgrades_modules',gotBack&&w.engine===2&&w.speed_module===1,{w});
  undoLast(); const rb=G.machines[G.map[34][30].mid];
  ok('undo_rebuild_charges_worth',rb&&rb.tier===3&&rb.modules[0]==='speed_module'&&Object.keys(afterUp).every(k=>(G.inv[k]||0)===(afterUp[k]||0)),{tier:rb?.tier,mods:rb?.modules});
  // pasting a T3 copy pays for its tier
  const cost3=blueprintCost([{type:'assembler',rx:0,ry:0,dir:0,tier:3}]), cost1=blueprintCost([{type:'assembler',rx:0,ry:0,dir:0,tier:1}]);
  const e0=G.inv.engine||0; multiselState.clipboard=[{type:'assembler',rx:0,ry:0,dir:0,tier:3}]; setTool('multisel'); multiselStartPaste(); multiselState.pasteAnchor={x:36,y:34}; ghostConfirm();
  ok('paste_charges_tier',cost3.engine===2&&!cost1.engine&&(G.inv.engine||0)===e0-2&&G.machines[G.map[34][36].mid]?.tier===3,{cost3,e0,now:G.inv.engine});
  undoLast(); ok('undo_paste_refunds_tier',(G.inv.engine||0)===e0&&G.map[34][36].mid===null,{e0,now:G.inv.engine});
  multiselClear(); setTool('select');
  G.devFreeBuild=true;
  // ── one coal Miner keeps a Burner running (and the Burner fills up)
  reset(); res(10,10,1,1,'coal'); put('miner',10,10); put('inserter',11,10,0); const bn=put('burner',12,10); bn.inBuf.coal=2;
  run(1200); ok('burner_self_sustains',(bn.inBuf.coal||0)>10&&G.power.out>0,{coal:bn.inBuf.coal,out:G.power.out});
  // inserter throughput: about one item per 1.7s, not one per 4s
  reset(); power(2,2); const s9=put('chest',10,10); s9.chestInv.coal=999; put('inserter',11,10,0); const d9=put('chest',12,10);
  run(240); ok('inserter_throughput',(d9.chestInv.coal||0)>=30,{moved:d9.chestInv.coal});
  // ── opening any menu closes the manual mining popup
  { const hidden=()=>document.getElementById('resInfo').classList.contains('hidden'); const r=[];
    for(const open of [()=>switchTab('craft'),()=>switchTab('build'),()=>openBigMenu(),()=>showPanel('inv')]){
      openResInfo('iron_ore',5,5); const shown=!hidden(); open(); r.push(shown&&hidden()&&!mineTap.active);
      closeModal(); if(openPanel)closePanel(openPanel); if(activeTab)switchTab(activeTab); }
    ok('menus_close_mining_popup',r.every(Boolean),r); }
  // ── machine panel rates match the simulation over one game minute
  reset(); power(2,2); res(10,10,1,1,'coal'); const qm=put('miner',10,10); const qf=put('stone_furnace',14,10); qf.recipe='fn_iron'; qf.inBuf.iron_ore=999; qf.inBuf.coal=999;
  const qb=put('burner',16,10); qb.inBuf.coal=500; const pM=machineRates(qm).out.coal, pF=machineRates(qf).out.iron_plate, pB=machineRates(qb).in.coal;
  const m0=qm.produced, f0=qf.produced, b0=qb.inBuf.coal;
  for(let i=0;i<240;i++){run(1); qm.outBuf={}; qf.outBuf={};}
  const aM=qm.produced-m0, aF=qf.produced-f0, aB=b0-qb.inBuf.coal;
  ok('rates_match_sim',Math.abs(aM-pM)<=1.5&&Math.abs(aF-pF)<=1.5&&Math.abs(aB-pB)<=1,{pM,aM,pF,aF,pB,aB});
  // ── closing EDIT returns to Select and puts a picked-up machine back
  reset(); const em=put('chest',40,40); switchTab('tools'); setTool('move'); handleTap({x:40,y:40}); switchTab('tools');
  ok('edit_close_selects',activeTool==='select'&&G.map[40][40].mid===em.id&&em.x===40,{tool:activeTool,at:G.map[40][40].mid});
  switchTab('tools'); setTool('demolish'); switchTab('craft'); ok('edit_leave_selects',activeTool==='select',activeTool); switchTab('craft');
  // ── zone notes only in their zone (and Zone 5)
  { const z0=G.zone; const at=z=>{G.zone=z;return ['sci_scar','sci_deep','sci_bloom','nutrient','z2_sci_scar','z3_sci_deep','z4_sci_bloom','z5_sci_void','sci_red','fn_iron'].filter(zoneRecipeOk).join(',');};
    const r={1:at(1),2:at(2),4:at(4),5:at(5)}; G.zone=z0;
    ok('zone_notes_gated',r[1]==='sci_red,fn_iron'&&r[2]==='sci_scar,z2_sci_scar,sci_red,fn_iron'&&r[4]==='sci_bloom,nutrient,z4_sci_bloom,sci_red,fn_iron'&&r[5].split(',').length===10,r); }
  // ── belt animation: an item is drawn every frame and never jumps, along straights, corners and a splitter
  { reset(); G.research.done=Object.keys(TECHS);
    for(let x=10;x<16;x++)put('belt',x,40,0); put('belt',16,40,1); for(let y=41;y<44;y++)put('belt',16,y,1);
    put('belt',16,44,0); put('splitter',17,44,0); for(let x=18;x<22;x++)put('belt',x,44,0); put('chest',22,44);
    G.map[40][10].items=[{id:'eff_module',prog:0}];
    G.cam.zoom=.5; G.cam.x=8*TILE*.5; G.cam.y=36*TILE*.5; sizeCanvas(); G.cam.zoom=.5; G.cam.x=8*TILE*.5; G.cam.y=36*TILE*.5;
    const pts=[]; const orig=drawItem; let frame=null;
    window.drawItem=(c,id,x,y,sz)=>{if(id==='eff_module')frame.push([x,y]);};
    let maxStep=0, missing=0, last=null, frames=0, still=0, maxStill=0;
    for(let t=0;t<130;t++){ run(1); const t0=T; for(let f=0;f<5;f++){ T=t0+f*50; frame=[]; draw(); frames++;
        const inChest=Object.values(G.machines).some(m=>m.type==='chest'&&m.chestInv.eff_module);
        if(!frame.length){ if(!inChest)missing++; last=null; continue; }
        const [x,y]=frame[0]; if(last){const d=Math.hypot(x-last[0],y-last[1])/(TILE*.5); maxStep=Math.max(maxStep,d); still=d<1e-6?still+1:0; maxStill=Math.max(maxStill,still);} last=[x,y]; }
      T=t0; }
    window.drawItem=orig;
    const delivered=Object.values(G.machines).some(m=>m.type==='chest'&&m.chestInv.eff_module);
    ok('belt_item_smooth',missing===0&&maxStep<0.2&&maxStill===0&&delivered,{missing,maxStep:+maxStep.toFixed(3),maxStill,delivered,frames}); }
  // ── rotate / flip a copied layout before pasting
  { reset(); G.research.done=Object.keys(TECHS);
    const L=[{type:'belt',rx:0,ry:0,dir:0},{type:'inserter',rx:1,ry:0,dir:0},{type:'assembler',rx:2,ry:0,dir:0,recipe:'mk_gear'},{type:'splitter',rx:4,ry:0,dir:0}];
    const key=d=>JSON.stringify(d.map(e=>[e.type,e.rx,e.ry,e.dir]).sort());
    const twiceH=flipLayout(flipLayout(L,'h'),'h'), twiceV=flipLayout(flipLayout(L,'v'),'v');
    let r=L; for(let i=0;i<4;i++)r=rotateLayout(r);
    ok('layout_flip_rotate_identity',key(twiceH)===key(L)&&key(twiceV)===key(L)&&key(r)===key(L),{h:key(twiceH),r:key(r)});
    const fh=flipLayout(L,'h'), byT=t=>fh.find(e=>e.type===t);
    ok('layout_flip_mirrors',byT('belt').rx===4&&byT('belt').dir===2&&byT('inserter').rx===3&&byT('inserter').dir===2&&byT('assembler').rx===1&&byT('splitter').rx===0&&byT('assembler').recipe==='mk_gear',fh);
    const rot=rotateLayout(L), sp=rot.find(e=>e.type==='splitter');
    ok('layout_rotate_turns',rot.find(e=>e.type==='belt').dir===1&&sp.dir===1&&rot.every(e=>e.rx>=0&&e.ry>=0),rot);
    // paste the flipped layout for real
    multiselState.clipboard=L.map(e=>({...e})); setTool('multisel'); multiselStartPaste(); transformGhost('h'); multiselState.pasteAnchor={x:40,y:40}; ghostConfirm();
    const at=(x,y)=>G.machines[G.map[y][x].mid];
    ok('layout_flip_paste',at(44,40)?.type==='belt'&&at(44,40).dir===2&&at(43,40)?.type==='inserter'&&at(43,40).dir===2&&at(41,40)?.type==='assembler'&&at(41,40).recipe==='mk_gear'&&at(40,40)?.type==='splitter',{b:at(44,40)?.type});
    multiselClear(); setTool('select');
    // a saved blueprint is never changed by flipping while placing it
    G.blueprints=[{name:'t',data:L.map(e=>({...e}))}]; const before=key(G.blueprints[0].data);
    startPasteBlueprint(0); transformGhost('rot'); transformGhost('v');
    ok('layout_blueprint_untouched',key(G.blueprints[0].data)===before&&key(blueprintState.data)!==before,{});
    ghostCancel(); setTool('select'); }
  // ── belt corners: a belt fed only from the side curves; fed from behind stays straight
  reset(); const k1=put('belt',10,20,0), k2=put('belt',11,20,1), k3=put('belt',11,21,1);
  ok('belt_corner_detect',beltTurn(k2)===3&&beltTurn(k3)===0&&beltTurn(k1)===0,{k2:beltTurn(k2),k3:beltTurn(k3)});
  const k4=put('belt',11,19,1); ok('belt_sideload_straight',beltTurn(k2)===0,beltTurn(k2));
  const[ex0,ey0]=beltItemPos(1,3,0), [ex1,ey1]=beltItemPos(1,3,1);
  ok('belt_corner_item_path',Math.abs(ex0+.5)<1e-9&&Math.abs(ey0)<1e-9&&Math.abs(ex1)<1e-9&&Math.abs(ey1-.5)<1e-9,{ex0,ey0,ex1,ey1});
  // ── backup code round trip, and save-on-hide
  saveGame(); const code=await makeBackupCode(); const d=await readBackupCode(code);
  ok('backup_roundtrip',code.startsWith('EBI')&&d.save===localStorage.getItem(SAVE_KEY)&&d.prestige===localStorage.getItem(PRESTIGE_KEY),{len:code.length});
  let bad=''; try{await readBackupCode('EBI1.nope');}catch(e){bad=e.message;} ok('backup_rejects_garbage',!!bad,bad);
  const tk=G.tick; G.tick=tk+12345; tickId=tickId||1; document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide'));
  ok('save_on_hide',JSON.parse(localStorage.getItem(SAVE_KEY)).tick===tk+12345,{});
  return R;
});
for(const[k,v]of Object.entries(r))console.log(v.startsWith('PASS')?'  ':'✗ ',k.padEnd(32),v);
console.log(errs.join('\n')||'no page errors'); await b.close();})();
