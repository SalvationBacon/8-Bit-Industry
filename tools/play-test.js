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
  // its reach ghosts draw while its panel is open and while placing one, without throwing
  { let thrown=null; const li=Object.values(G.machines).find(m=>m.type==='long_inserter');
    try{ openMachinePanel(li); draw(); closePanel('machine'); setTool('long_inserter'); hov.x=20; hov.y=20; draw(); setTool('select'); }catch(e){thrown=e.message;}
    ok('long_inserter_reach_draws',!thrown&&typeof drawInsReach==='function',thrown); }
  // ── belt lines: dragging back shortens, blocked tiles are skipped, running short stops the line
  reset(); setTool('belt'); hov.x=30; hov.y=30; lineStart({x:30,y:30},0,0);
  lineMove({x:36,y:30}); lineMove({x:36,y:33}); lineMove({x:36,y:31}); lineEnd();
  ok('line_backtrack_shortens',line.path.length===8&&line.path[7].y===31,line.path);
  put('chest',33,30); setTool('belt'); hov.x=30; hov.y=30; lineStart({x:30,y:30},0,0); lineMove({x:36,y:30}); lineEnd();
  G.devFreeBuild=false; G.crafted.belt=2; G.inv.iron_plate=3;
  const lnp=linePlan(); confirmPlace();
  const lineBelts=Object.values(G.machines).filter(m=>m.type==='belt');
  ok('line_skips_blocked_and_short',lnp.bad===1&&lnp.ok===5&&lineBelts.length===5&&G.crafted.belt===0&&G.inv.iron_plate===0&&G.map[30][36].mid===null,{lp:{ok:lnp.ok,short:lnp.short,bad:lnp.bad},n:lineBelts.length,crafted:G.crafted.belt,plate:G.inv.iron_plate});
  undoLast();
  ok('line_undo_refunds',Object.values(G.machines).filter(m=>m.type==='belt').length===0&&G.crafted.belt===2&&G.inv.iron_plate===3,{crafted:G.crafted.belt,plate:G.inv.iron_plate});
  // pipes draw lines too (no direction needed), and the line follows a corner
  G.devFreeBuild=true; G.research.done=Object.keys(TECHS); setTool('pipe'); hov.x=40; hov.y=40; lineStart({x:40,y:40},0,0); lineMove({x:42,y:42}); lineEnd(); confirmPlace();
  ok('pipe_line',[[40,40],[41,40],[42,40],[42,41],[42,42]].every(([x,y])=>G.machines[G.map[y][x].mid]?.type==='pipe'),line.path);
  setTool('select');
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
  // reactor with 2 sinks fed coolant (an enzyme pump, pipes and a stocked Relief Valve) stays below SCRAM for long
  res(26,20,2,2,'enzymes'); put('enzyme_pump',26,20); put('pipe',24,20); put('pipe',24,21); put('pipe',25,20); put('pipe',25,21);
  const rv=put('relief_valve',24,22); rv.inBuf.gasket=10;
  const re=put('reactor',20,20); re.inBuf.lum_rod=20; const s1=put('heat_sink',23,20), s2=put('heat_sink',23,21); const burst0=G.stats.bursts||0; run(1200);
  ok('z4_reactor_two_sinks_stable',!(re.scram>0)&&re.heat<100&&s1._wet&&s2._wet&&(G.stats.bursts||0)===burst0,{heat:re.heat,scram:re.scram,wet:[s1._wet,s2._wet],bursts:(G.stats.bursts||0)-burst0});
  // dry sinks (no coolant) don't cool: the same reactor SCRAMs
  const re2=put('reactor',40,30); re2.inBuf.lum_rod=20; put('heat_sink',43,30); put('heat_sink',43,31); run(400);
  ok('z4_dry_sinks_scram',(G.stats.scrams||0)>0&&machineRates(re2).notes.join(' ').includes('coolant'),{heat:re2.heat,scram:re2.scram,scrams:G.stats.scrams});
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
  // Satisfactory numbers: inserters move 60 · 120 · 270 items/min (2 minutes of chest → chest, emptied as it fills)
  { const moved=tier=>{reset(); power(2,2); const a=put('chest',10,10); a.chestInv.coal=9999; const i=put('inserter',11,10,0); i.tier=tier; const b=put('chest',12,10);
      run(40); b.chestInv={}; let n=0; for(let t=0;t<480;t++){run(1); n+=b.chestInv.coal||0; b.chestInv={};} return n/2;};
    const t1=moved(1), t2=moved(2), t3=moved(3);
    ok('inserter_tiers_faster',Math.abs(t1-60)<=1&&Math.abs(t2-120)<=1&&Math.abs(t3-270)<=2,{t1,t2,t3});
    const li=put('long_inserter',20,20,0); li.tier=3;
    ok('inserter_tier_rates',machineRates(li).notes.some(n=>n.includes('270 items/min'))&&tierBonus('inserter',2)==='120 items/min',machineRates(li).notes); }
  // inserter upgrades cost INS_TIER_COSTS, and demolish refunds them
  { reset(); G.devFreeBuild=false; const i=put('inserter',30,30,0)||null; G.devFreeBuild=true; if(!i){G.inv.iron_plate=9;G.inv.iron_gear=9;}
    G.inv={...G.inv,iron_gear:10,circuit:10,steel_plate:10,iron_plate:10};
    const ins=Object.values(G.machines).find(m=>m.type==='inserter');
    upgradeMachine(ins.id); upgradeMachine(ins.id);
    const after={g:G.inv.iron_gear,c:G.inv.circuit,s:G.inv.steel_plate};
    tryRemove(ins.x,ins.y,true);
    ok('inserter_upgrade_cost_refund',ins.tier===3&&after.g===8&&after.c===7&&after.s===9&&G.inv.iron_gear===11&&G.inv.circuit===10&&G.inv.steel_plate===10,{tier:ins.tier,after,inv:{g:G.inv.iron_gear,c:G.inv.circuit,s:G.inv.steel_plate}}); }
  // EDIT → Upgrade: pick an area, filter a type off, upgrade what you can afford
  { reset(); res(40,40,3,1,'iron_ore'); const ms=[put('miner',40,40),put('miner',41,40),put('miner',42,40)];
    const is=[put('inserter',40,41,1),put('inserter',41,41,1)]; const ch=put('chest',40,42);
    G.devFreeBuild=false; setTool('upgrade');
    handleTap({x:40,y:40},false); handleTap({x:42,y:42},false);
    const picked=upgState.ids.length;
    upgToggle('miner');
    G.inv={...G.inv,iron_gear:4,circuit:2,iron_plate:0};
    const plan=upgPlan(); upgradeSelected();
    const insT=is.map(m=>m.tier||1), minT=ms.map(m=>m.tier||1);
    // a second press with everything turned back on: each machine goes up one more tier
    upgToggle('miner'); G.inv={...G.inv,iron_plate:100,iron_gear:100,circuit:100,steel_plate:100}; upgradeSelected();
    ok('upgrade_tool_area',picked===5&&!upgState.ids.includes(ch.id)&&plan.list.length===2&&insT.join()==='2,2'&&minT.join()==='1,1,1'
      &&ms.every(m=>m.tier===2)&&is.every(m=>m.tier===3),{picked,plan:plan.list.length,insT,minT,after:[...ms,...is].map(m=>m.tier)});
    setTool('select'); ok('upgrade_tool_clears',document.getElementById('upgradeBar').classList.contains('hidden')&&upgState.ids.length===0); G.devFreeBuild=true; }
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
  // ── busy belts: every item glides at belt speed and never steps back, whether the belt flows, queues or drains
  { const scen=(build,tier=1,release)=>{ reset(); G.research.done=Object.keys(TECHS); power(2,2); build();
      G.cam.zoom=.5; sizeCanvas(); G.cam.zoom=.5; G.cam.x=6*TILE*.5; G.cam.y=36*TILE*.5;
      const uid=new WeakMap(); let nid=0, frame=null; const o=window.beltItemWorld;
      window.beltItemWorld=function(it,...a){const w=o(it,...a); if(frame&&w){if(!uid.has(it))uid.set(it,nid++); frame[uid.get(it)]=w;} return w;};
      const lim=1.55*BELT_T1_SPEED*BELT_TIER_SPEED[tier]/5; let last={}, worst=0, backs=0; // catch-up after a pickup is capped at 1.5x belt speed
      for(let t=0;t<260;t++){ const ft=G.map[40][8]; if(beltRoom(ft,0))ft.items.push({id:'coal',prog:0}); if(t===150&&release)release();
        run(1); const t0=T; for(let f=0;f<5;f++){ T=t0+f*50; frame={}; draw();
          for(const k in frame)if(last[k]){const dx=frame[k][0]-last[k][0], d=Math.hypot(dx,frame[k][1]-last[k][1]); worst=Math.max(worst,d/lim); if(dx<-1e-6)backs++;}
          last=frame; } T=t0; }
      window.beltItemWorld=o; return {worst:+worst.toFixed(2),backs}; };
    const line=(tier,end)=>()=>{for(let x=8;x<20;x++){const b=put('belt',x,40,0); b.tier=tier;} end();};
    const r={flow:scen(line(1,()=>put('chest',20,40))), queue:scen(line(1,()=>{})),
      drain:scen(line(2,()=>{put('inserter',20,40,0);put('chest',21,40);}),2),
      tunnel:scen(()=>{for(let x=8;x<12;x++)put('belt',x,40,0); put('tunnel',12,40,0); put('tunnel',15,40,0); for(let x=16;x<20;x++)put('belt',x,40,0); put('inserter',20,40,0); put('chest',21,40);}),
      side:scen(line(1,()=>{const c=put('chest',12,38); c.chestInv.coal=999; put('inserter',12,39,1); put('inserter',20,40,0); put('chest',21,40);}))};
    ok('belt_busy_smooth',Object.values(r).every(v=>v.worst<=1&&v.backs===0),r);
    // a full line that starts moving again: every item sets off at belt speed, no surge (the queue is spaced in the sim)
    const lim1=1.05/1.55, rel={t1:scen(line(1,()=>{}),1,()=>put('chest',20,40)), t3:scen(line(3,()=>{}),3,()=>put('chest',20,40)),
      extend:scen(line(1,()=>{}),1,()=>{for(let x=20;x<24;x++)put('belt',x,40,0);put('chest',24,40);})};
    ok('belt_queue_restart',Object.values(rel).every(v=>v.worst<=lim1&&v.backs===0),rel); }
  // same, on belts of mixed tiers (T1/T2/T3 side by side)
  { reset(); G.research.done=Object.keys(TECHS);
    for(let x=10;x<16;x++)put('belt',x,40,0); put('belt',16,40,1); for(let y=41;y<44;y++)put('belt',16,y,1);
    put('belt',16,44,0); put('splitter',17,44,0); for(let x=18;x<22;x++)put('belt',x,44,0); put('chest',22,44);
    for(const m of Object.values(G.machines))if(BELT_TYPES.includes(m.type))m.tier=1+(m.x+m.y)%3;
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
    ok('belt_item_smooth_mixed_tiers',missing===0&&maxStep<0.2&&maxStill===0&&delivered,{missing,maxStep:+maxStep.toFixed(3),maxStill,delivered,frames}); }
  // ── no item may sit on two tiles at once (T2/T3 speed sums landed just under 1 and copied items), full belts carry
  //    the same in every direction, and a tunnel mouth holds 4 like a belt
  { const line=(tier,dir,n)=>{reset(); const[dx,dy]=D_VEC[dir], sx=40-dx*10, sy=40-dy*10;
      for(let k=0;k<20;k++){const b=put('belt',sx+dx*k,sy+dy*k,dir); b.tier=tier;} const ch=put('chest',sx+dx*20,sy+dy*20);
      const src=G.map[sy][sx]; let dup=0;
      for(let t=0;t<n;t++){while(src.items.length<4)src.items.push({id:'coal',prog:0}); runBelts();
        const seen=new Set(); for(let k=0;k<20;k++)for(const it of G.map[sy+dy*k][sx+dx*k].items){if(seen.has(it))dup++;seen.add(it);}}
      return {dup,got:ch.chestInv.coal||0};};
    const r={t2:line(2,0,600),t3:line(3,1,600),right:line(3,0,960).got,left:line(3,2,960).got,down:line(1,1,960).got,up:line(1,3,960).got};
    ok('belt_no_duplicates',r.t2.dup===0&&r.t3.dup===0&&r.t3.got>=180,r);
    ok('belt_same_speed_every_way',Math.abs(r.right-r.left)<=4&&Math.abs(r.down-r.up)<=4,r);
    reset(); for(let x=10;x<14;x++)put('belt',x,60,0); const ta=put('tunnel',14,60,0), tb=put('tunnel',17,60,0); // exit leads nowhere: blocked
    for(let t=0;t<400;t++){if(G.map[60][10].items.length<4)G.map[60][10].items.push({id:'coal',prog:0}); runBelts();}
    ok('tunnel_mouth_holds_4',G.map[60][14].items.length<=4&&G.map[60][17].items.length<=4,{mouth:G.map[60][14].items.length,exit:G.map[60][17].items.length,linked:ta.tunnelId===tb.id}); }
  // ── an old save with a stuffed tunnel mouth: the extras go to the inventory on load
  { reset(); const tn=put('tunnel',20,62,0); put('tunnel',23,62,0); G.map[62][20].items=Array.from({length:30},()=>({id:'coal',prog:.5}));
    G.map[63][25].items=[{id:'iron_plate',prog:.5}]; const c0=G.inv.coal||0, i0=G.inv.iron_plate||0;
    saveGame(); G=null; continueGame(); await new Promise(r=>setTimeout(r,50)); closeModal(); clearInterval(tickId);
    ok('old_save_tunnel_items_returned',G.map[62][20].items.length===BELT_CAP&&G.map[63][25].items.length===0&&G.inv.coal===c0+30-BELT_CAP&&G.inv.iron_plate===i0+1,{left:G.map[62][20].items.length,coal:G.inv.coal-c0,plate:G.inv.iron_plate-i0});
    G.devFreeBuild=true; }
  // ── Satisfactory throughput, one to one: Miner 60/120/240, belt 60/120/270, and a whole chain keeps up
  { const r={};
    for(const tier of [1,2,3]){
      reset(); power(2,2); res(10,40,1,1,'iron_ore'); const mi=put('miner',10,40); mi.tier=tier;
      let n=0; for(let t=0;t<480;t++){run(1); n+=mi.outBuf.iron_ore||0; mi.outBuf={};} r['miner'+tier]=n/2;
      reset(); power(2,2); res(10,40,1,1,'iron_ore'); const m2=put('miner',10,40); m2.tier=tier; put('inserter',11,40,0).tier=tier;
      for(let x=12;x<24;x++)put('belt',x,40,0).tier=tier; put('inserter',24,40,0).tier=tier; const ch=put('chest',25,40);
      run(200); ch.chestInv={}; n=0; for(let t=0;t<480;t++){run(1); n+=ch.chestInv.iron_ore||0; ch.chestInv={};} r['chain'+tier]=n/2;
      reset(); for(let x=5;x<45;x++){put('belt',x,44,0).tier=tier; G.map[44][x].items=[{id:'coal',prog:0},{id:'coal',prog:.5}];} const pc=put('chest',45,44);
      for(let t=0;t<40;t++)runBelts(); r['belt'+tier]=(pc.chestInv.coal||0)*6;
    }
    ok('satisfactory_rates',r.miner1===60&&r.miner2===120&&r.miner3===240&&r.belt1===60&&r.belt2===120&&r.belt3===270,r);
    ok('satisfactory_chain_keeps_up',r.chain1>=58&&r.chain2>=116&&r.chain3>=232,r);
    reset(); G.research.done=G.research.done.filter(t=>t!=='logistics'); const lb=put('belt',30,30,0); G.inv={...G.inv,iron_gear:5};
    upgradeMachine(lb.id); const locked=lb.tier===undefined||lb.tier===1;
    G.research.done.push('logistics'); upgradeMachine(lb.id);
    ok('belt_upgrade_needs_logistics',locked&&lb.tier===2,{tier:lb.tier}); }
  // ── machines: every recipe is whole seconds with clean per-minute rates, and tiers are ×1 / ×2 / ×4 speed
  { const NICE=[0.5,0.75,1,1.5,2,2.5,3,3.75,4,5,6,7.5,10,12,15,20,30,45,60,90,120,180,240], bad=[];
    for(const[id,r]of Object.entries(RECIPES)){const c=240/r.time; if(r.time%4)bad.push(id+' time');
      for(const[k,n]of Object.entries({...r.in,...(r.fluid||{}),...r.out}))if(!NICE.some(v=>Math.abs(v-n*c)<1e-9))bad.push(id+' '+k);}
    ok('recipes_clean_rates',!bad.length,bad);
    const r={};
    for(const[type,rid]of [['stone_furnace','fn_iron'],['electric_smelter','es_iron'],['assembler','mk_gear']])for(const tier of [1,2,3]){
      reset(); power(2,2); const m=put(type,20,20); m.recipe=rid; m.tier=tier; const rec=RECIPES[rid], k=Object.keys(rec.out)[0]; let n=0;
      for(let t=0;t<480;t++){for(const[i,q]of Object.entries(rec.in))m.inBuf[i]=50; run(1); n+=m.outBuf[k]||0; m.outBuf[k]=0;}
      r[`${rid}_T${tier}`]=n/2; r[`${rid}_T${tier}_panel`]=machineRates(m).out[k]; }
    ok('machine_tiers_x1_x2_x4',r.fn_iron_T1===15&&r.fn_iron_T2===30&&r.fn_iron_T3===60&&r.es_iron_T1===60&&r.es_iron_T3===240&&r.mk_gear_T2===120&&r.mk_gear_T3===240
      &&Object.keys(r).filter(k=>!k.endsWith('panel')).every(k=>Math.abs(r[k]-r[k+'_panel'])<0.01),r); }
  // ── the machine panel shows the maths: per-minute rates per recipe, which arm can carry each, lab time for research
  { reset(); power(2,2); const a=put('assembler',30,30); a.tier=2; a.recipe='mk_gear';
    const R=recipeRates(a,'mk_circuit'); const keep=a.recipe==='mk_gear';
    openMachinePanel(a); const html=document.getElementById('pMachBody').innerHTML; closePanel('machine');
    ok('panel_shows_rates',keep&&R.out.circuit===60&&R.in.copper_wire===180&&armHint(60)==='T1 arm'&&armHint(180)==='T3 arm'&&armHint(600)==='3 T3 arms'
      &&html.includes('PER MIN')&&html.includes('T3 makes')&&Math.abs(labMinutes(TECHS.rocket_tech.cost)-14)<1e-6,{R,keep}); }
  // ── inserters take straight from a splitter's two cells, and can drop onto one (it used to vanish into the splitter)
  { reset(); power(2,2); const src=put('chest',10,40); src.chestInv.coal=9999; put('inserter',11,40,0);
    put('belt',12,40,0); const sp=put('splitter',13,40,0); // cells (13,40) and (13,41), flowing right
    put('inserter',14,40,0); const ca=put('chest',15,40); put('inserter',14,41,0); const cb=put('chest',15,41);
    run(480);
    const viaBelt={a:ca.chestInv.coal||0,b:cb.chestInv.coal||0};
    reset(); power(2,2); const s2=put('chest',10,50); s2.chestInv.coal=9999; put('inserter',11,50,0); const sp2=put('splitter',12,50,0);
    put('belt',13,50,0); put('belt',13,51,0); put('inserter',14,50,0); const c2=put('chest',15,50); put('inserter',14,51,0); const c3=put('chest',15,51);
    run(480);
    ok('inserters_use_splitters',viaBelt.a>=50&&Math.abs(viaBelt.a-viaBelt.b)<=2&&(c2.chestInv.coal||0)+(c3.chestInv.coal||0)>=40&&!Object.values(sp2.inBuf).some(n=>n>0),
      {viaBelt,dropped:{a:c2.chestInv.coal||0,b:c3.chestInv.coal||0},inBuf:sp2.inBuf}); }
  // ── an inserter on a splitter takes only its own side; if one side is blocked, the other still runs
  { reset(); power(2,2); const src=put('chest',10,40); src.chestInv.coal=9999; put('inserter',11,40,0); put('belt',12,40,0); put('splitter',13,40,0);
    put('inserter',14,40,0); const ca=put('chest',15,40); const ib=put('inserter',14,41,0); const cb=put('chest',15,41); cb.chestInv={stone:200}; // full
    run(480); ok('splitter_side_blocked',(ca.chestInv.coal||0)>=60&&(cb.chestInv.coal||0)===0,{a:ca.chestInv.coal,b:cb.chestInv}); }
  // ── a machine's output arrow drops straight onto a belt: no inserter needed to take things out
  { reset(); power(2,2); res(10,40,1,1,'iron_ore'); put('miner',10,40); for(let x=11;x<20;x++)put('belt',x,40,0); const ch=put('chest',20,40);
    run(120); ch.chestInv={}; let n=0; for(let t=0;t<480;t++){run(1); n+=ch.chestInv.iron_ore||0; ch.chestInv={};} // 9 tiles at 2s each before the first one arrives
    // a furnace fed by inserters, its plates leave on a belt
    reset(); power(2,2); const ore=put('chest',8,44); ore.chestInv.iron_ore=999; put('inserter',9,44,0); const fu=put('stone_furnace',10,44); fu.recipe='fn_iron';
    const coal=put('chest',10,42); coal.chestInv.coal=999; put('inserter',10,43,1); for(let x=11;x<16;x++)put('belt',x,44,0); const pc=put('chest',16,44);
    run(480);
    // a belt pointing back into the machine is left alone
    reset(); power(2,2); res(10,48,1,1,'iron_ore'); const mb=put('miner',10,48); const back=put('belt',11,48,2); run(40);
    // a Cracker's right arrow carries only raw fuel (plastic leaves by the bottom arrow, unbelted here)
    reset(); power(2,2); G.research.done=Object.keys(TECHS); const cr=put('cracker',10,52); cr.outBuf={raw_fuel:6,plastic:6};
    for(let x=12;x<20;x++){put('belt',x,52,0);} const cc=put('chest',20,52); run(120);
    ok('outputs_onto_belts',Math.abs(n/2-60)<=1&&(pc.chestInv.iron_plate||0)>=25&&G.map[48][11].items.length===0&&(mb.outBuf.iron_ore||0)>0
      &&(cc.chestInv.raw_fuel||0)>=4&&!cc.chestInv.plastic&&cr.outBuf.plastic===6, // plastic has its own (bottom) arrow
      {miner:n/2,plates:pc.chestInv.iron_plate,back:G.map[48][11].items.length,crack:cc.chestInv}); }
  // ── a two-output recipe puts one item out of each arrow: Cracker raw fuel right, plastic bottom
  { reset(); power(2,2); G.research.done=Object.keys(TECHS); const cr=put('cracker',20,20); cr.recipe='z2_crack'; cr.outBuf={raw_fuel:10,plastic:10};
    for(let x=22;x<26;x++)put('belt',x,20,0); const right=put('chest',26,20);     // right arrow → belt → chest
    for(let y=22;y<26;y++)put('belt',20,y,1); const down=put('chest',20,26);      // bottom arrow → belt → chest
    run(160);
    const beltOK=(right.chestInv.raw_fuel||0)>=8&&!right.chestInv.plastic&&(down.chestInv.plastic||0)>=8&&!down.chestInv.raw_fuel;
    // inserters on each arrow take only that arrow's item
    reset(); power(2,2); G.research.done=Object.keys(TECHS); const c2=put('cracker',20,30); c2.recipe='z2_crack'; c2.outBuf={raw_fuel:10,plastic:10};
    put('inserter',22,30,0); const ri=put('chest',23,30); put('inserter',21,32,1); const bi=put('chest',21,33);
    run(160);
    const insOK=(ri.chestInv.raw_fuel||0)>=5&&!ri.chestInv.plastic&&(bi.chestInv.plastic||0)>=5&&!bi.chestInv.raw_fuel;
    openMachinePanel(c2); const html=document.getElementById('pMachBody').innerHTML; closePanel('machine');
    ok('two_outputs_two_arrows',beltOK&&insOK&&html.includes('RIGHT ARROW')&&html.includes('BOTTOM ARROW'),
      {right:right.chestInv,down:down.chestInv,ri:ri.chestInv,bi:bi.chestInv}); }
  // ── smog: a pump + cracker + refinery raise it, a fuelled Scrubber brings it down, and panel rates hold still
  { const z0=G.zone; reset(); G.zone=2; G.research.done=Object.keys(TECHS); power(2,2); G.smog=0;
    res(10,40,2,2,'oil'); const pu=put('oil_pump',10,40); pu.mineRes='oil'; for(let x=12;x<16;x++)put('belt',x,40,0); put('chest',16,40);
    const ck=put('cracker',20,40); ck.recipe='z2_crack'; const rf=put('refinery',24,40); rf.recipe='z2_refine';
    const feed=()=>{ck.inBuf.crude_oil=50;rf.inBuf.raw_fuel=50;ck.outBuf={};rf.outBuf={};};
    for(let t=0;t<240;t++){feed();run(1);} const rose=G.smog;
    const r0=JSON.stringify(machineRates(ck).out); G.smog=60; const r60=JSON.stringify(machineRates(ck).out); const note=machineRates(ck).notes.join(' ');
    const sc=put('scrubber',30,40); for(let t=0;t<480;t++){feed();sc.inBuf.refined_fuel=50;run(1);} const fell=G.smog;
    G.zone=z0;
    ok('smog_rises_and_scrubs',rose>=25&&fell<60&&r0===r60&&note.includes('Smog is slowing it')&&note.includes('smog/min'),{rose:+rose.toFixed(1),fell:+fell.toFixed(1),r0,r60}); }
  // ── power panel: tap the gauge; generators, consumers, idle ones, and what to build
  { reset(); G.research.done=Object.keys(TECHS).filter(k=>!TECHS[k].zone||TECHS[k].zone<=1);
    const g1=put('generator',2,2); g1.inBuf.coal=50; const g2=put('generator',2,5);   // one fuelled, one empty
    for(let i=0;i<6;i++){const a=put('assembler',10+i*3,10); a.recipe='mk_gear';}
    run(2); updateHUD(); document.querySelector('#hudRes [aria-label="Power details"]')?.click(); const opened=openPanel==='power';
    const r1=powerReport(), h1=document.getElementById('pPowerBody').innerText;
    g2.inBuf.coal=50; run(2); refreshOpenPanel(); const r2=powerReport(), h2=document.getElementById('pPowerBody').innerText;
    closePanel('power');
    ok('power_panel',opened&&r1.supply===60&&Math.abs(r1.demand-72*perkMult().power)<1e-9&&h1.includes('SHORT')&&h1.includes('idle: 1 no fuel')&&h1.includes('FIND IDLE GENERATORS (1)')
      &&h1.includes('enough')&&h1.includes('Assembler')&&r2.supply===120&&h2.includes('Running')&&h2.includes('Burning')&&h2.includes('30 coal'),
      {opened,s1:r1.supply,d1:r1.demand,s2:r2.supply,h1:h1.slice(0,500)}); }
  // ── music: every zone has its own playlist of tracks; each compiles cleanly, keeps its hook and varies the rest
  { const per={}; for(const t of MTRACKS)per[t.ctx]=(per[t.ctx]||0)+1;
    const bad=[], lens=[];
    const leadOf=(song,from,to)=>JSON.stringify(song.ev.filter(e=>e.t>=from&&e.t<to&&e.lead).map(e=>[+e.t.toFixed(3),+e.f.toFixed(1)]));
    let hook=true, varies=true, simple=true;
    for(const tr of MTRACKS){ const a=compileSong(tr,1), c=compileSong(tr,2); lens.push(Math.round(a.len));
      if(a.ev.some(e=>!isFinite(e.t)||!isFinite(e.f)||!isFinite(e.v)||!(e.d>0)||e.f>0&&e.f<55))bad.push(tr.name);
      if(!tr.raw){ const bar=240/tr.bpm, A0=MFORMS[tr.form][1]*bar; // the first A section starts after the intro
        if(leadOf(a,A0,A0+4*bar)!==leadOf(c,A0,A0+4*bar)||leadOf(a,A0,A0+4*bar)==='[]')hook=false;
        if(JSON.stringify(a.ev)===JSON.stringify(c.ev))varies=false;
        // simple melodies: in each phrase the motif repeats, so bars 1-3 share one rhythm
        const rhythm=k=>JSON.stringify(a.ev.filter(e=>e.lead&&e.t>=A0+k*bar-1e-6&&e.t<A0+(k+1)*bar-1e-6).map(e=>+(e.t-A0-k*bar).toFixed(3)));
        if(!(rhythm(0)===rhythm(1)&&rhythm(1)===rhythm(2)&&rhythm(4)===rhythm(5)))simple=false; } }
    const zonesOk=[1,2,3,4,5].every(z=>per[z]>=3)&&per.title>=2;
    const ctxGame=musicCtx();
    ok('music_playlists',zonesOk&&!bad.length&&lens.every(l=>l>=90&&l<=240)&&hook&&varies&&simple&&ctxGame===G.zone,{per,bad,lens,hook,varies,simple,ctxGame}); }
  // ── build menu: grouped by job; every machine appears once, and only in the zones it belongs to
  { const z0=G.zone, all=DRAWER_DEFS.build.flatMap(c=>c.items.map(i=>i.id)), dupes=all.filter((x,i)=>all.indexOf(x)!==i);
    const missing=Object.keys(MDEFS).filter(t=>!MDEFS[t].stub&&!all.includes(t));
    const at={}; for(const z of[1,2,3,4,5]){G.zone=z; at[z]=Object.fromEntries(drawerCats('build').map(c=>[c.label,c.items.map(i=>i.id)]));}
    G.zone=z0;
    const okZ=!at[1].Liquids&&!at[1]['Clean Air']&&at[1].Power.join()==='burner,generator'&&at[2].Power.includes('combustion_gen')&&at[2]['Clean Air']
      &&at[2].Liquids.join()==='oil_pump'&&at[3].Liquids.join()==='brine_pump,pipe,fluid_tank,relief_valve'
      &&at[3].Power.includes('lumen_panel')&&at[4].Power.includes('reactor')&&!at[4].Refining&&at[5].Mining.join()==='miner'&&at[5].Liquids.length===6;
    ok('build_menu_groups',!dupes.length&&!missing.length&&okZ,{dupes,missing,z1:Object.keys(at[1]),z2:at[2].Power}); }
  // ── recipe book: every recipe and resource of the zone, search, item pages, icons that open them
  { const z0=G.zone; reset(); G.zone=3; G.research.done=Object.keys(TECHS);
    for(let y=10;y<12;y++)for(let x=10;x<12;x++){G.map[y][x].type=1;G.map[y][x].res='rare_earth';G.map[y+5][x].type=1;G.map[y+5][x].res='brine';}
    rbFocus=null; rbHist=[]; rbBack=null; recipeSearch('',true); showPanel('recipes');
    rbOpen=new Set(['mine','hand',...Object.keys(MDEFS)]); renderRecipesPanel();
    const body=()=>document.getElementById('pRecipesBody').innerText;
    const cards=document.querySelectorAll('#pRecipesBody .rb-card').length, recs=rbRecipes().length;
    const allShown=cards>=recs&&body().includes('Separate Rare Earth')&&body().includes('Brine Pump on a brine pool');
    const fnTime=rbCard({...RECIPES.fn_iron,id:'fn_iron',secs:RECIPES.fn_iron.time/4}).includes('4s per craft');
    document.getElementById('rbSearch').value='oxide'; recipeSearch('oxide'); const srch=body();
    const searchOk=srch.includes('Rare Earth Oxide')&&srch.includes('Separator')&&srch.includes('Magnet')&&srch.includes('(piped)');
    recipeSearch('',true); G.inv.re_oxide=2; showPanel('inv'); document.querySelector('#pInvBody .inv-chip[onclick*="re_oxide"]')?.click();
    const fromInv=openPanel==='recipes'&&rbFocus==='re_oxide';
    document.querySelector('#pRecipesBody .rb-card img.ico[data-i="magnet"]')?.click(); const hop=rbFocus==='magnet';
    rbGoBack(); const back1=rbFocus==='re_oxide'; rbGoBack(); const back2=openPanel==='inv';
    const asm=put('assembler',20,20); asm.recipe='z3_magnet'; openMachinePanel(asm);
    const ic=[...document.querySelectorAll('#pMachBody img.ico[data-i]')].find(i=>!i.closest('button,[onclick]'));
    ic?.click(); const fromMach=openPanel==='recipes'&&rbFocus===ic?.dataset.i; rbGoBack(); const toMach=openPanel==='machine';
    closePanel(openPanel); G.zone=z0;
    ok('recipe_book',allShown&&fnTime&&searchOk&&fromInv&&hop&&back1&&back2&&fromMach&&toMach,{cards,recs,allShown,fnTime,searchOk,fromInv,hop,back1,back2,fromMach,toMach}); }
  // ── tutorial text that says BUILD → group names a real group that holds that machine
  { const bad=[]; const z0=G.zone;
    for(const [z,t] of Object.entries(TUTORIALS))for(const st of t.steps){const m=st.text.match(/BUILD → (\w[\w ]*?) → \[\[(\w+)\]\]/); if(!m)continue;
      G.zone=+z; const g=drawerCats('build').find(c=>c.label===m[1]); if(!g||!g.items.some(i=>i.id===m[2]))bad.push(m[0]);}
    G.zone=z0; ok('tutorial_menu_names',!bad.length,bad); }
  // ── relief valves vent half a T1 pump each and wear out gaskets; jammed valves let pressure build
  { const z0=G.zone;
    const net=(valves,spares)=>{ reset(); G.zone=3; G.research.done=Object.keys(TECHS); power(2,2); G.stats.bursts=0;
      res(10,40,2,2,'brine'); put('brine_pump',10,40); for(let x=12;x<22;x++)put('pipe',x,40);
      const vs=[]; for(let i=0;i<valves;i++){const v=put('relief_valve',12+i*3,41); v.inBuf.gasket=spares; vs.push(v);}
      return vs; };
    let vs=net(1,10); run(240*3); const one=G.stats.bursts;
    vs=net(2,10); run(240*3); const two=G.stats.bursts, used=20-vs.reduce((a,v)=>a+(v.inBuf.gasket||0),0);
    vs=net(2,0); run(240*4); const dry=G.stats.bursts, jam=vs.every(v=>valveJammed(v));
    // an inserter feeds a valve only gaskets, and stops at its 10
    reset(); G.zone=3; G.research.done=Object.keys(TECHS); power(2,2);
    const c=put('chest',30,30); c.chestInv.coal=20; c.chestInv.gasket=30; put('inserter',31,30,0); const v=put('relief_valve',32,30);
    run(240); const fed=v.inBuf.gasket||0, noCoal=!v.inBuf.coal&&c.chestInv.coal===20;
    G.zone=z0;
    ok('valve_gaskets',one>0&&two===0&&used>0&&dry>0&&jam&&fed===10&&noCoal,{one,two,used,dry,jam,fed,noCoal}); }
  // ── every machine that makes items has an output side; an Algae Vat's algae goes onto a belt and into an inserter
  { const missing=Object.keys(MDEFS).filter(t=>MDEFS[t].recipes?.length&&!PORTS[t]);
    const z0=G.zone; reset(); G.zone=4; G.research.done=Object.keys(TECHS); power(2,2);
    const av=put('algae_vat',20,40); av.recipe='z4_algae'; av.outBuf.algae=6; av.vit=60;
    for(let x=22;x<26;x++)put('belt',x,40,0); const ch=put('chest',26,40);
    const av2=put('algae_vat',20,44); av2.outBuf.algae=6; put('inserter',22,44,0); const ch2=put('chest',23,44);
    run(120); G.zone=z0;
    ok('living_machines_output',!missing.length&&(ch.chestInv.algae||0)>=4&&(ch2.chestInv.algae||0)>=4,{missing,belt:ch.chestInv,ins:ch2.chestInv}); }
  // ── every top-bar gauge opens its own live panel (Zone 5 shows them all), and the gauge row scrolls
  { const z0=G.zone; reset(); G.zone=5; G.research.done=Object.keys(TECHS); power(2,2);
    res(10,40,2,2,'brine'); put('brine_pump',10,40); for(let x=12;x<16;x++)put('pipe',x,40);
    const r=put('reactor',30,40); r.inBuf.lum_rod=5; put('heat_sink',33,40);
    const v=put('algae_vat',40,40); v.vit=10; put('lumen_panel',50,40);
    run(8); updateHUD();
    const got={};
    for(const[label,kind,word]of[['Smog details','smog','MAKING SMOG'],['Pressure details','pressure','pump'],['Living machine details','decay','Algae Vat'],['Reactor details','heat','Reactor #1'],['Glow tide details','glow','Lumen Panels']]){
      document.querySelector(`#hudRes [aria-label="${label}"]`)?.click();
      const body=document.getElementById(kind==='smog'?'pSmogBody':'pHazBody').innerText;
      got[kind]=(kind==='smog'?openPanel==='smog':openPanel==='haz'&&hazKind===kind)&&body.toLowerCase().includes(word.toLowerCase());
    }
    const heatBody=(openHazard('heat'),document.getElementById('pHazBody').innerText); const needs=heatBody.includes('needs 1 more sink');
    openHazard('heat'); const toggled=openPanel!=='haz';
    const scroll=getComputedStyle(document.getElementById('hudRes')).overflowX;
    G.zone=z0;
    ok('hud_gauges_open_panels',Object.values(got).every(Boolean)&&needs&&toggled&&scroll==='auto',{got,needs,toggled,scroll}); }
  // ── smog panel: tap the gauge; it lists every source, the Scrubbers, and how many to add
  { const z0=G.zone; reset(); G.zone=2; G.research.done=Object.keys(TECHS); power(2,2); G.smog=30;
    res(10,40,2,2,'oil'); const pu=put('oil_pump',10,40); pu.mineRes='oil'; for(let x=12;x<16;x++)put('belt',x,40,0); put('chest',16,40);
    const ck=put('cracker',20,40); ck.recipe='z2_crack'; const rf=put('refinery',24,40); rf.recipe='z2_refine'; put('refinery',28,40);
    const feed=()=>{ck.inBuf.crude_oil=50;rf.inBuf.raw_fuel=50;ck.outBuf={};rf.outBuf={};};
    for(let t=0;t<8;t++){feed();run(1);}
    updateHUD(); document.querySelector('#hudRes [aria-label="Smog details"]')?.click(); const opened=openPanel==='smog';
    const rep=smogReport(); const h1=document.getElementById('pSmogBody').innerText;
    const sc=put('scrubber',34,40); feed(); run(1); refreshOpenPanel(); const h2=document.getElementById('pSmogBody').innerText;
    sc.inBuf.refined_fuel=50; feed(); run(1); refreshOpenPanel(); const h3=document.getElementById('pSmogBody').innerText;
    findMachines(String(sc.id)); const found=openPanel==='machine'&&inspectId===sc.id; closePanel('machine');
    G.zone=z0; G.smog=0;
    ok('smog_panel',opened&&Math.abs(rep.make-50)<1e-9&&rep.needNow===1&&rep.needMax===1&&h1.includes('Add 1 Scrubber')&&h1.includes('idle: 1 waiting for input')
      &&h2.includes('1 out of refined fuel')&&h2.includes('FIND IDLE SCRUBBERS (1)')&&h3.includes('Enough')&&h3.includes('1 cleaning')&&found,
      {opened,make:rep.make,need:rep.needNow,found,h1:h1.slice(0,400)}); }
  // ── belt tiers: an item crosses 6 tiles faster on T2 / T3 belts; tier costs are per tile
  { const travel=tier=>{reset(); for(let x=10;x<17;x++){const b=put('belt',x,50,0); b.tier=tier;} G.map[50][10].items=[{id:'coal',prog:0}];
      let t=0; while(t<300&&!G.map[50][16].items.length){run(1);t++;} return t;};
    const a=travel(1), b=travel(2), c=travel(3);
    const w=machineWorth('belt',3);
    ok('belt_tiers_faster',b<=a*0.75&&c<=a*0.55&&w.iron_plate===1&&w.iron_gear===1&&w.steel_plate===1,{a,b,c,w});
    const bt=put('belt',10,52,0); bt.tier=3;
    ok('belt_tier_rates',machineRates(bt).notes.some(n=>n.includes('270 items/min'))&&tierBonus('belt',2)==='120 items/min',machineRates(bt).notes); }
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
    BLUEPRINTS=[{name:'t',data:L.map(e=>({...e}))}]; const before=key(BLUEPRINTS[0].data);
    startPasteBlueprint(0); transformGhost('rot'); transformGhost('v');
    ok('layout_blueprint_untouched',key(BLUEPRINTS[0].data)===before&&key(blueprintState.data)!==before,{});
    ghostCancel(); setTool('select'); }
  // ── every machine turns to all four directions, including the 1×2 Scrubber
  { reset(); G.research.done=Object.keys(TECHS); const at=(x,y)=>G.map[y][x].mid;
    const sc=put('scrubber',50,50,1); const flat=sc&&at(50,50)===sc.id&&at(51,50)===sc.id&&at(50,51)===null;
    rotateM(sc.id); const up=at(50,50)===sc.id&&at(50,51)===sc.id&&at(51,50)===null&&sc.dir===2;
    put('chest',51,50); rotateM(sc.id); const blocked=sc.dir===2&&at(51,50)!==sc.id;   // no room: stays upright
    ok('scrubber_four_ways',flat&&up&&blocked,{flat,up,blocked});
    // a layout with a Scrubber rotates cleanly: footprints never overlap once placed
    const L=[{type:'scrubber',rx:0,ry:0,dir:0},{type:'chest',rx:1,ry:0,dir:0},{type:'chest',rx:1,ry:1,dir:0}];
    let fits=true; for(let k=0,d=L;k<4;k++){d=rotateLayout(d); const cells=new Set(); for(const e of d){const[w,h]=machSize(e.type,e.dir);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=(e.rx+x)+','+(e.ry+y); if(cells.has(c))fits=false; cells.add(c);}}}
    multiselState.clipboard=L.map(e=>({...e})); setTool('multisel'); multiselStartPaste(); transformGhost('rot'); multiselState.pasteAnchor={x:60,y:60}; ghostConfirm();
    const s2=Object.values(G.machines).find(m=>m.type==='scrubber'&&m.x>=60);
    ok('layout_rotate_scrubber',fits&&s2&&s2.dir===1&&machSize(s2)[0]===2,{fits,dir:s2?.dir});
    multiselClear(); setTool('select'); }
  // ── inserters keep working after a reload (their arm timers used the old page clock)
  { reset(); power(2,2); const sA=put('chest',70,10); sA.chestInv.coal=500; put('inserter',71,10,0); const dA=put('chest',72,10);
    run(60); saveGame(); const T0=T;
    T=500; G=null; continueGame(); await new Promise(r=>setTimeout(r,50)); closeModal(); clearInterval(tickId);   // a fresh page: the clock starts near zero
    const d2=Object.values(G.machines).find(m=>m.type==='chest'&&m.x===72), before=d2.chestInv.coal||0;
    run(120); const moved=(d2.chestInv.coal||0)-before;
    const ins=Object.values(G.machines).find(m=>m.type==='inserter');
    ok('inserter_after_reload',moved>=15&&(!ins._arm||ins._arm.stateStart<=T),{moved,arm:ins._arm});
    T=Math.max(T,T0); }
  // ── inserters sharing one output take turns
  { reset(); G.research.done=Object.keys(TECHS); power(2,2);
    const n=c=>Object.values(c.chestInv).reduce((a,b)=>a+b,0);
    const bf=put('blast_furnace',10,10,0); bf.recipe='bf_iron'; Object.keys(RECIPES.bf_iron.in).forEach(k=>bf.inBuf[k]=999);
    put('inserter',12,10,0); const c1=put('chest',13,10); put('inserter',12,11,0); const c2=put('chest',13,11);
    run(1200); ok('shared_output_alternates',Math.abs(n(c1)-n(c2))<=2&&n(c1)+n(c2)>=140,{top:n(c1),bottom:n(c2)});
    // one side blocked (a dead-end belt fills up): the other inserter carries on with everything
    reset(); power(2,2); const bf2=put('blast_furnace',10,20,0); bf2.recipe='bf_iron'; Object.keys(RECIPES.bf_iron.in).forEach(k=>bf2.inBuf[k]=999);
    put('inserter',12,20,0); put('belt',13,20,0); put('inserter',12,21,0); const c3=put('chest',13,21);
    run(600); const mid=n(c3); run(600);
    ok('shared_output_blocked_side',n(c3)-mid>=60,{first:mid,second:n(c3)-mid});
    // a chest feeding two inserters splits too
    reset(); power(2,2); const src=put('chest',10,30); src.chestInv.coal=300;
    put('inserter',11,30,0); const d1=put('chest',12,30); put('inserter',10,31,1); const d2=put('chest',10,32);
    run(400); ok('shared_chest_alternates',Math.abs(n(d1)-n(d2))<=2&&n(d1)>20,{a:n(d1),b:n(d2)}); }
  // ── achievements: new counters earn their awards, and the Stardust bonus is capped at the old maximum
  { reset(); G.research.done=Object.keys(TECHS); power(2,2); G.achievements=[];
    multiselState.clipboard=[{type:'chest',rx:0,ry:0,dir:0}]; setTool('multisel'); multiselStartPaste(); transformGhost('h'); multiselState.pasteAnchor={x:80,y:40}; ghostConfirm(); multiselClear(); setTool('select');
    undoLast();
    const bf=put('blast_furnace',80,44,0); bf.recipe='bf_iron'; put('inserter',82,44,0); put('chest',83,44); put('inserter',82,45,0); put('chest',83,45);
    run(8); checkAchievements(); const has=id=>G.achievements.includes(id);
    ok('achievements_new_counters',has('first_paste')&&has('first_flip')&&has('first_undo')&&has('shared_output'),G.achievements);
    G.achievements=ACHIEVEMENTS.map(a=>a.id);
    ok('achievement_dust_capped',achDust()===10+ACH_DUST_MAX&&ACHIEVEMENTS.length>=120,{dust:achDust(),n:ACHIEVEMENTS.length});
    G.achievements=[]; }
  // ── Factory Floor: open ground below every zone's ore fields
  { const z0=G.zone; const res=[];
    for(const z of [1,2,3,4,5]){ transitionToZone(z); closeModal(); clearInterval(tickId);
      const clear=G.map.slice(G.floorY).every(row=>row.every(t=>!t.res&&t.type===T_FLOOR));
      res.push(G.map.length===ZONES[z].mapSize[1]+FLOOR_ROWS&&MAP_H===G.map.length&&clear); }
    ok('factory_floor_every_zone',res.every(Boolean),res);
    // Zone 5 expansion adds deposits only in the ore band
    expandMap(32,16); const clear5=G.map.slice(G.floorY).every(row=>row.every(t=>!t.res));
    ok('factory_floor_expansion_clear',clear5&&MAP_W===ZONES[5].mapSize[0]+32,{clear5,w:MAP_W});
    // an old save (no floor) gains one on load; its machines stay put
    transitionToZone(1); closeModal(); clearInterval(tickId); G.devFreeBuild=true; placeDir=0; tryPlace('chest',30,30); closeModal();
    G.map=G.map.slice(0,G.floorY); delete G.floorY; saveGame(); G=null; continueGame(); await new Promise(r=>setTimeout(r,50)); closeModal(); clearInterval(tickId);
    ok('factory_floor_old_save',G.floorY===64&&G.map.length===64+FLOOR_ROWS&&G.machines[G.map[30][30].mid]?.type==='chest',{floorY:G.floorY,h:G.map.length});
    // a v2.0.2 save had 64 floor rows: empty rows past the new size go, rows in use stay
    const deep=()=>{for(let k=0;k<64-FLOOR_ROWS;k++)G.map.push(Array.from({length:MAP_W},()=>({type:T_FLOOR,res:null,mid:null,items:[]})));MAP_H=G.map.length;};
    deep(); saveGame(); G=null; continueGame(); await new Promise(r=>setTimeout(r,50)); closeModal(); clearInterval(tickId);
    const h1=G.map.length;
    deep(); tryPlace('chest',5,G.floorY+40); closeModal(); saveGame(); G=null; continueGame(); await new Promise(r=>setTimeout(r,50)); closeModal(); clearInterval(tickId);
    ok('factory_floor_trims_old_64',h1===64+FLOOR_ROWS&&FLOOR_ROWS===32&&G.map.length===64+41&&MAP_H===G.map.length&&G.machines[G.map[64+40][5].mid]?.type==='chest',{h1,h2:G.map.length}); }
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
  // ── blueprints are one library for the device: old saves' blueprints move in, zone changes keep them, codes share them
  { const L=[{type:'belt',rx:0,ry:0,dir:0},{type:'assembler',rx:1,ry:0,dir:0,recipe:'mk_gear',tier:2}];
    BLUEPRINTS=[]; saveBlueprints();
    G.blueprints=[{name:'Old <b>one</b>',data:L}]; saveGame(); G=null; continueGame(); await new Promise(r=>setTimeout(r,50)); closeModal(); clearInterval(tickId);
    const moved=BLUEPRINTS.length===1&&!/[<>]/.test(BLUEPRINTS[0].name)&&BLUEPRINTS[0].data[1].tier===2&&!('blueprints' in G)&&JSON.parse(localStorage.getItem(BP_KEY)).length===1;
    const z0=G.zone; G.perks.awarded[G.zone]=true; transitionToZone(2); closeModal(); clearInterval(tickId); const kept=BLUEPRINTS.length===1;
    const code=await makeBlueprintCode(BLUEPRINTS), back=await readBlueprintCode(code);
    const r1=addBlueprints(back);                       // the same one again: skipped
    const r2=addBlueprints([{name:'Two',data:[{type:'chest',rx:0,ry:0,dir:0}]},{name:'Junk',data:[{type:'nope',rx:0,ry:0}]}]);
    let bad=''; try{await readBlueprintCode('EBI1.abc');}catch(e){bad=e.message;}
    const bk=await readBackupCode(await makeBackupCode()); const inBackup=JSON.parse(bk.blueprints).length===2;
    showPanel('blueprint'); const panel=document.getElementById('pBlueprintBody').innerText; closePanel('blueprint');
    BLUEPRINTS=[]; saveBlueprints(); G.zone=z0;
    ok('blueprint_library',moved&&kept&&code.startsWith('EBP')&&back.length===1&&r1.added===0&&r1.dupes===1&&r2.added===1&&!!bad&&inBackup&&panel.includes('EXPORT ALL')&&panel.includes('/30'),
      {moved,kept,r1,r2,bad,inBackup,lib:BLUEPRINTS.length}); }
  // ── Quantum Storage: belts and inserters feed it, everything lands in the inventory; it is a Stardust unlock
  { const saved=JSON.stringify(PRESTIGE); PRESTIGE.owned={};
    const hidden=!drawerCats('build').some(c=>c.items.some(i=>i.id==='quantum_chest'));
    PRESTIGE.owned.quantum_storage=1; const shown=drawerCats('build').find(c=>c.label==='Handling').items.some(i=>i.id==='quantum_chest');
    reset(); G.zone=1; power(2,2); G.inv={};
    for(let x=10;x<14;x++)put('belt',x,G.floorY+4,0); const q1=put('quantum_chest',14,G.floorY+4); G.map[G.floorY+4][10].items=[{id:'coal',prog:0},{id:'coal',prog:.5}];
    const src=put('chest',20,G.floorY+4); src.chestInv.iron_plate=5; put('inserter',21,G.floorY+4,0); const q2=put('quantum_chest',22,G.floorY+4);
    run(120);
    const okInv=(G.inv.coal||0)===2&&(G.inv.iron_plate||0)===5&&!Object.keys(q2.inBuf).some(k=>q2.inBuf[k]>0)&&q1.produced===2;
    PRESTIGE=JSON.parse(saved); savePrestige();
    const noFloorNote=![1,2,3,4,5].some(z=>ZONES[z].arrivalHtml.includes('Factory Floor'))&&typeof FLOOR_NOTE==='undefined';
    ok('quantum_storage',hidden&&shown&&okInv&&noFloorNote,{hidden,shown,inv:G.inv,q2:q2.inBuf,q1:q1.produced,noFloorNote}); }
  // ── Stardust upgrades with levels, the unique unlocks, the big Singularity and the ascension ladder (runs last: moves to Zone 5)
  { const saved=JSON.stringify(PRESTIGE); G.perks.spent={};
    PRESTIGE.owned={}; const y0=perkMult().yield, b0=beltBaseSpeed();
    PRESTIGE.owned={cosmic_yield:true}; const oldOwned=Math.abs(perkMult().yield/y0-1.15)<1e-9;           // an upgrade bought before levels counts as level 1
    PRESTIGE.owned={cosmic_yield:5,swift_belts:5,quick_hands:5,bright_minds:5,stable_reality:3,cosmic_perk:3,cosmic_start:3};
    const lv=Math.abs(perkMult().yield/y0-1.55)<1e-9&&Math.abs(beltBaseSpeed()/b0-1.5)<1e-9&&Math.abs(insMs(460,{tier:1})-460/1.5)<1e-9
      &&labBoost({type:'lab'})===2&&Math.abs(hazardEase()-.55)<1e-9&&toolsFor(3).length===9;
    const before=new Set(echoTechs(5)); PRESTIGE.owned.cosmic_research=3; const e3=echoTechs(5); PRESTIGE.owned.cosmic_research=4; const e4=echoTechs(5);
    const echo=!before.size&&e3.includes('expansion_1')&&!e3.includes('expansion_2')&&e4.includes('expansion_2')&&!e4.includes('singularity')&&echoTechs(1).length===Object.keys(TECHS).filter(k=>!TECHS[k].zone).length-1;
    // the Quantum Extractor: only in the build menu once bought; pulls 30 a minute
    const hidden=!drawerCats('build').some(c=>c.items.some(i=>i.id==='quantum_extractor'));
    PRESTIGE.owned.quantum_extractor=1; const shown=drawerCats('build').find(c=>c.label==='Mining').items.some(i=>i.id==='quantum_extractor');
    reset(); G.zone=1; const qx=put('quantum_extractor',40,G.floorY+4); setExtract(qx.id,'iron_ore'); run(40); const unpowered=qx.produced===0;   // 400 kW: nothing without power
    for(let k=0;k<7;k++)power(2+k*3,G.floorY+10); const q0=qx.produced; run(240); const qn=qx.produced-q0;
    // Singularity sizes per universe
    const sz=singReqsFor(0).stellar_casing===1000&&singReqsFor(0).grav_lens===500&&singReqsFor(2).grav_lens===750;
    // Echoes and the Cargo Hold on arrival: Zone 5 starts with its Expansions done (map grown) and a share of the inventory
    PRESTIGE.owned.cargo_hold=3; G.inv={iron_plate:1000};
    transitionToZone(5); closeModal(); clearInterval(tickId);
    const arrive=G.research.done.includes('expansion_2')&&!G.research.done.includes('singularity')&&MAP_W===ZONES[5].mapSize[0]+2*EXPAND_W&&MAP_H===G.floorY+FLOOR_ROWS+2*EXPAND_H&&(G.inv.iron_plate||0)>=300;
    // ascension: Universe 3 pays 1.5x
    PRESTIGE.bangs=2; const d0=PRESTIGE.stardust, want=Math.round(achDust()*1.5); G.bigBang=false; triggerBigBang(); const paid=PRESTIGE.stardust-d0;
    // a Zone 5 save that expanded by the old step (32 columns, 16 rows each) is topped up to the new size on load
    G.bigBang=false; G.map=G.map.slice(0,G.floorY+FLOOR_ROWS+32).map(r=>r.slice(0,ZONES[5].mapSize[0]+64)); MAP_W=G.map[0].length; MAP_H=G.map.length;
    saveGame(); G=null; continueGame(); await new Promise(r=>setTimeout(r,50)); closeModal(); clearInterval(tickId);
    const migrated=MAP_W===ZONES[5].mapSize[0]+2*EXPAND_W&&MAP_H===G.floorY+FLOOR_ROWS+2*EXPAND_H&&G.map.every(r=>r.length===MAP_W);
    PRESTIGE=JSON.parse(saved); savePrestige();
    ok('stardust_upgrades',oldOwned&&lv&&echo&&hidden&&shown&&unpowered&&Math.abs(qn-30)<=1&&sz&&arrive&&paid===want&&migrated,{oldOwned,lv,echo,hidden,shown,unpowered,qn,sz,arrive,paid,want,migrated,w:MAP_W,h:MAP_H}); }
  // ── Relief Valve setting: each valve opens at 60/70/80/85%, the lowest opens first, layouts and undo keep it
  { const z0=G.zone;
    const net=(at)=>{ reset(); G.zone=3; G.research.done=Object.keys(TECHS); power(2,2); G.stats.bursts=0;
      res(10,40,2,2,'brine'); put('brine_pump',10,40); for(let x=12;x<22;x++)put('pipe',x,40);
      const vs=[0,1].map(i=>{const v=put('relief_valve',12+i*3,41); v.inBuf.gasket=10; return v;}); vs.forEach(v=>setRelief(v.id,at)); return vs; };
    let vs=net(60); run(240*3); const p60=pressureOf(vs[0]._net), b60=G.stats.bursts;
    vs=net(85); run(240*3); const p85=pressureOf(vs[0]._net), b85=G.stats.bursts;
    vs=net(80); setRelief(vs[1].id,70); run(240*2); const s0=vs[0].seal, s1=vs[1].seal, mixed=s1<VALVE_SEAL, vented=v=>(10-v.inBuf.gasket)*VALVE_SEAL+VALVE_SEAL-v.seal, onlyLow=vented(vs[1])>vented(vs[0]); // the 70% valve opens first and vents more
    const bad=(setRelief(vs[0].id,90),vs[0].relief===80);
    openMachinePanel(vs[1]); const panel=document.getElementById('pMachBody')?.innerText||''; closePanel('machine');
    const bp=cleanBlueprint({name:'v',data:[{type:'relief_valve',rx:0,ry:0,dir:0,relief:70},{type:'relief_valve',rx:1,ry:0,dir:0,relief:90}]});
    const st=stampMachine(bp.data[0],40,G.floorY+10); const kept=bp.data[0].relief===70&&bp.data[1].relief===undefined&&st.relief===70;
    tryRemove(st.x,st.y); undoLast(); const back=Object.values(G.machines).find(m=>m.type==='relief_valve'&&m.x===40&&m.y===G.floorY+10);
    G.zone=z0;
    ok('valve_threshold',p60<=61&&p60>=58&&p85>84&&p85<=86&&b60===0&&b85===0&&mixed&&onlyLow&&bad&&/OPENS AT/.test(panel)&&kept&&back?.relief===70,
      {p60:+p60.toFixed(1),p85:+p85.toFixed(1),b60,b85,s0,s1,mixed,onlyLow,bad,panel:/OPENS AT/.test(panel),kept,back:back?.relief}); }
  // ── Run timer: an optional clock per zone and run, frozen at each launch, bests on the device, never with dev tools
  { const savedT=localStorage.getItem(TIMES_KEY), savedPref=PREFS.timer, z0=G.zone;
    TIMES={z:{},run:null}; saveTimes(); reset(); G.zone=1; G.runSplits={}; G.runDev=false;
    PREFS.timer=false; const hidden=!hudHazardsHtml().includes('Run timer')&&timerCardHtml()==='';
    PREFS.timer=true; G.devFreeBuild=false; G.devFreeCraft=false; G.devMode=false; G.timerDev=false; G.tick=4*90; run(4);
    const shown=hudHazardsHtml().includes('Run timer')&&hudHazardsHtml().includes('1:31')&&timerCardHtml().includes('RUN TIMER');
    // launch Zone 1: the split freezes and sets the first best
    for(const r of rocketReqs())G.inv[r.id]=(G.inv[r.id]||0)+r.need;
    launchRocket(); const msg=document.getElementById('mBody')?.innerText||''; closeModal();
    const t1=G.runSplits[1]; run(40); const frozen=zoneTicks()===t1&&TIMES.z[1]===t1&&/FIRST BEST/.test(msg)&&/1:31/.test(msg);
    // a slower go doesn't beat it; a faster one does
    G.runSplits={}; G.tick=t1+400; const slow=recordSplit(1); G.runSplits={}; G.tick=t1-40; const fast=recordSplit(1);
    const bests=!slow.nb&&slow.prev===t1&&fast.nb&&TIMES.z[1]===t1-40&&/\+1:40/.test(splitLine('x',slow))&&/faster/.test(splitLine('x',fast));
    // dev tools taint the zone and the run
    G.runSplits={}; G.devFreeBuild=true; run(1); G.devFreeBuild=false; const dev=recordSplit(1); const noBest=!dev.eligible&&TIMES.z[1]===t1-40&&G.runDev;
    // splits ride along to the next zone; a full clean run sets a run best
    G.runDev=false; G.timerDev=false; G.runSplits={1:400}; G.perks.awarded[1]=true; transitionToZone(2); closeModal(); clearInterval(tickId);
    const carried=G.runSplits[1]===400&&G.tick===0&&runWhole();
    G.runSplits={1:400,2:500,3:600,4:700}; G.tick=800; G.devFreeBuild=false; G.devFreeCraft=false; G.devMode=false; G.timerDev=false; recordSplit(5); const rr=recordRun();
    const runBest=rr&&rr.t===3000&&rr.nb&&TIMES.run===3000;
    const bk=await readBackupCode(await makeBackupCode()); const inBackup=JSON.parse(bk.times).run===3000;
    openSettings(); const st=document.getElementById('mBody')?.innerText||''; closeModal();
    if(savedT)localStorage.setItem(TIMES_KEY,savedT);else localStorage.removeItem(TIMES_KEY); TIMES=loadTimes(); PREFS.timer=savedPref; savePrefs(); G.zone=z0;
    ok('run_timer',hidden&&shown&&frozen&&bests&&noBest&&carried&&runBest&&inBackup&&/TIMER/.test(st),{hidden,shown,frozen,t1,bests,noBest,carried,runBest,inBackup,settings:/TIMER/.test(st)}); }
  // ── Every machine panel has the same action bar; every build keeps going until CANCEL; paused inserters stop
  { reset(); power(2,2); const y=G.floorY+6; let x=8; const bad=[];
    for(const t of Object.keys(MDEFS)){ if(MDEFS[t].stub)continue;
      const m=mkMachine(t,x,y,0); G.machines[m.id]=m; x+=12; inspectId=m.id; renderMachPanel();
      const btns=[...document.querySelectorAll('#pMachBody .mach-actions .ma-btn')].map(b=>b.innerText.replace(/\s+/g,' ').trim());
      const body=document.getElementById('pMachBody').innerText, demolish=(body.match(/DEMOLISH/g)||[]).length;
      const order=btns.length===4&&/ROTATE/.test(btns[0])&&/MOVE/.test(btns[1])&&/PAUSE|RESUME/.test(btns[2])&&/DEMOLISH/.test(btns[3]);
      if(!order||demolish!==1)bad.push(t);
      delete G.machines[m.id]; }
    inspectId=null;
    // the bar's ROTATE works on an assembler (it used to have none) and is dimmed on a pipe
    reset(); power(2,2); const asm=put('assembler',20,y); inspectId=asm.id; renderMachPanel(); document.querySelector('#pMachBody .ma-btn').click(); const turned=asm.dir===1;
    const pp=put('pipe',30,y); inspectId=pp.id; renderMachPanel(); const pipeDim=document.querySelector('#pMachBody .ma-btn').classList.contains('dim'); inspectId=null;
    // keep building: two placements, a blocked one and a short one all keep the tool
    reset(); power(2,2); G.devFreeBuild=false; G.inv.iron_plate=1000; G.inv.iron_gear=1000; G.inv.circuit=1000; G.inv.copper_wire=1000;
    setTool('stone_furnace'); G.inv.stone=10; placeDir=0; tryPlace('stone_furnace',20,y); tryPlace('stone_furnace',22,y); const two=activeTool==='stone_furnace';
    tryPlace('stone_furnace',20,y); const blocked=activeTool==='stone_furnace'; G.inv.stone=0; tryPlace('stone_furnace',24,y); const short=activeTool==='stone_furnace';
    cancelBuild(); const cancelled=activeTool==='select'; G.devFreeBuild=true;
    // a blueprint stays in hand after a paste
    blueprintState={mode:'holding',data:[{type:'chest',rx:0,ry:0,dir:0}]}; pasteBlueprintAt(blueprintState.data,40,y); const held=blueprintState.mode==='holding';
    pasteBlueprintAt(blueprintState.data,42,y); const chests=Object.values(G.machines).filter(m=>m.type==='chest').length===2; ghostCancel();
    // a paused inserter moves nothing
    reset(); power(2,2); const c1=put('chest',10,y); c1.chestInv.coal=20; const ins=put('inserter',11,y,0); const c2=put('chest',12,y);
    toggleM(ins.id); run(80); const stopped=!c2.chestInv.coal; toggleM(ins.id); run(80); const resumed=(c2.chestInv.coal||0)>0;
    const belt=put('belt',14,y); toggleM(belt.id); const beltStays=belt.active;
    ok('machine_actions_and_building',!bad.length&&turned&&pipeDim&&two&&blocked&&short&&cancelled&&held&&chests&&stopped&&resumed&&beltStays,
      {bad,turned,pipeDim,two,blocked,short,cancelled,held,chests,stopped,resumed,beltStays}); }
  // ── A splitter placed on a belt line takes up the belt under it (refunded, items kept); undo puts the belt back
  { reset(); power(2,2); const y=G.floorY+8; G.devFreeBuild=false; G.inv={iron_plate:500,iron_gear:500,circuit:50,copper_wire:50};
    const c1=put('chest',10,y); c1.chestInv.coal=200; put('inserter',11,y,0);
    for(let x=12;x<20;x++)put('belt',x,y,0); put('inserter',20,y,0); const c2=put('chest',21,y);
    run(120); const before=c2.chestInv.coal||0;
    const b15=G.machines[G.map[y][15].mid]; G.map[y][15].items=[{id:'coal',prog:.2}]; const inv0={...G.inv};
    placeDir=0; setTool('splitter'); hov={x:15,y}; const ghostOk=canPlace('splitter',15,y,0,true), pasteNo=!stampFits([{type:'splitter',rx:0,ry:0,dir:0}],15,y);
    confirmPlace(); const sp=G.machines[G.map[y][15].mid];
    const replaced=sp?.type==='splitter'&&!G.machines[b15.id]&&G.map[y+1][15].mid===sp.id&&G.map[y][15].items.length===1&&(G.inv.coal||0)===(inv0.coal||0);
    const refunded=Object.entries(MDEFS.splitter.cost).every(([k,n])=>G.inv[k]===inv0[k]-n+(MDEFS.belt.cost[k]||0));
    run(240); const flows=(c2.chestInv.coal||0)>before+5;
    const chestNo=!canPlace('splitter',21,y,0,true); // not over anything that isn't a belt
    undoLast(); const back=G.machines[G.map[y][15].mid]?.type==='belt'&&G.map[y+1][15].mid===null&&!Object.values(G.machines).some(m=>m.type==='splitter');
    setTool('select'); G.devFreeBuild=true;
    ok('splitter_over_belts',ghostOk&&pasteNo&&replaced&&refunded&&flows&&chestNo&&back,{ghostOk,pasteNo,replaced,refunded,flows,before,after:c2.chestInv.coal,chestNo,back}); }
  // ── Stats graphs: machine output per item per 10s and per minute, power made and used, drawn in the Stats panel
  { reset(); G.prodLog=null; G.tick=0; power(2,2); res(10,G.floorY+4,1,1,'iron_ore'); const mi=put('miner',10,G.floorY+4); put('chest',11,G.floorY+4);
    G.inv.iron_ore=0; run(480);
    const L=prodLog(), f=L.f, c=L.c, sumF=f.reduce((a,b)=>a+(b.d.iron_ore||0),0);
    const logged=f.length===12&&c.length===2&&sumF===mi.produced&&f.every(b=>b.po===60)&&f[f.length-1].pi>0;
    showPanel('stats'); const cv=document.getElementById('statCvP'), body=document.getElementById('pStatsBody').innerText;
    const drawn=!!cv&&cv.width>0&&!!document.getElementById('statCvW')&&body.includes('Iron Ore')&&body.includes('10 MIN');
    statToggle('iron_ore'); const hid=document.querySelector('.stat-chip.off')!==null; statToggle('iron_ore');
    setStatSpan('c'); const hour=document.getElementById('pStatsBody').innerText.includes('Iron Ore'); setStatSpan('f');
    statHover({currentTarget:cv,clientX:cv.getBoundingClientRect().right-20},'p'); const read=document.getElementById('statReadP').innerText.includes('/min');
    closePanel('stats'); statHov=null;
    const back=JSON.parse(serializeG()).prodLog; const saved=back&&back.f.length===12;
    ok('stats_graph',logged&&drawn&&hid&&hour&&read&&saved,{logged,f:f.length,c:c.length,sumF,made:mi.produced,po:f.map(b=>b.po).slice(0,3),drawn,hid,hour,read,saved}); }
  // ── Colour-blind mode: a device setting that swaps the status colours in the panels (CSS) and on the map (PAL)
  { setColourBlind(true);
    const css=getComputedStyle(document.body), on=document.body.classList.contains('cb')&&PAL===PAL_CB&&css.getPropertyValue('--green').trim()==='#3d8bff'&&css.getPropertyValue('--red').trim()==='#ff3d8b'
      &&JSON.parse(localStorage.getItem(PREFS_KEY)).cb===true&&insArmSpr(false,2)!==insArmSpr(false,0);
    openSettings(); const row=document.getElementById('mBody')?.innerText||document.body.innerText; closeModal();
    setColourBlind(false); const off=!document.body.classList.contains('cb')&&PAL===PAL_STD&&getComputedStyle(document.body).getPropertyValue('--green').trim()==='#4caf50';
    ok('colour_blind_mode',on&&off&&/COLOURS/.test(row),{on,off,settings:/COLOURS/.test(row)}); }
  // ── Cave walls in The Deep: caverns all joined, deposits clear, the floor open, nothing builds on rock, tunnels pass under, saves keep it
  { const z0=[MAP_W,MAP_H]; let gen=true, fr=[];
    for(let k=0;k<6;k++){ MAP_W=96;MAP_H=64; const m=carveCaves(buildZoneMap(DEPOSITS_Z3,0x0dee9+k*977),0x5ca7e+k*31);
      let walls=0,open=0; for(const row of m)for(const t of row){if(t.type===T_WALL)walls++;else open++;}
      const seen=new Set(), q=[[CAVE_START[0],CAVE_START[1]]]; seen.add(CAVE_START[1]*96+CAVE_START[0]);
      for(let x=0;x<96;x++)if(m[63][x].type!==T_WALL){seen.add(63*96+x);q.push([x,63]);} // the bottom row opens onto the floor
      while(q.length){const[x,y]=q.pop();for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=96||ny>=64)continue;const i=ny*96+nx;if(seen.has(i)||m[ny][nx].type===T_WALL)continue;seen.add(i);q.push([nx,ny]);}}
      const f=walls/(96*64); fr.push(+f.toFixed(2)); if(!(f>.15&&f<.45&&seen.size===open))gen=false; }
    MAP_W=96;MAP_H=64; const zm=addFactoryFloor(ZONES[3].buildMap());
    const floorClear=zm.length===96&&zm.slice(64).every(r=>r.every(t=>t.type!==T_WALL))&&zm.slice(0,64).some(r=>r.some(t=>t.type===T_WALL));
    [MAP_W,MAP_H]=z0;
    reset(); power(2,2); const wy=G.floorY+6;
    for(let y=wy-2;y<=wy+2;y++)for(let x=14;x<17;x++)G.map[y][x].type=T_WALL;
    const blocked=!canPlace('belt',15,wy)&&!canPlace('pipe',15,wy)&&!canPlace('assembler',13,wy)&&!canPlace('quantum_extractor',15,wy)&&canPlace('belt',13,wy);
    const src=put('chest',10,wy); src.chestInv.iron_plate=20; put('inserter',11,wy,0); put('belt',12,wy,0); const t1=put('tunnel',13,wy,0); const t2=put('tunnel',17,wy,0); put('belt',18,wy,0); put('inserter',19,wy,0); const dst=put('chest',20,wy);
    run(400); const under=!!(t1&&t2&&t1.tunnelId===t2.id&&(dst.chestInv.iron_plate||0)>=5);
    const back=unpackMap(JSON.parse(JSON.stringify(packMap(G.map))),G.machines); const kept=back[wy][15].type===T_WALL&&back[wy][13].mid===t1.id&&back[wy][15].mid===null&&back[wy][12].type===T_FLOOR;
    reset();
    ok('cave_walls',gen&&floorClear&&blocked&&under&&kept,{gen,fr,floorClear,blocked,under,dst:dst?.chestInv,kept}); }
  // ── Sandbox: locked until the first Big Bang; any zone, everything researched and free, its own save, no rewards
  { const saved=JSON.stringify(PRESTIGE), realSave=localStorage.getItem(SAVE_KEY);
    PRESTIGE.bangs=0; const locked=!sandboxUnlocked(); openSandboxMenu(); closeModal();
    PRESTIGE.bangs=1; localStorage.removeItem(SANDBOX_KEY);
    startSandbox(3); closeModal(); clearInterval(tickId);
    const z3=G.zone===3&&G.sandbox&&G.devFreeBuild&&G.devFreeCraft&&Object.keys(TECHS).every(t=>G.research.done.includes(t))&&G.zoneTut===undefined;
    const quantum=drawerCats('build').some(c=>c.items.some(i=>i.id==='quantum_extractor'))&&drawerCats('build').some(c=>c.items.some(i=>i.id==='quantum_chest'));
    saveGame(); const own=JSON.parse(localStorage.getItem(SANDBOX_KEY)||'{}').zone===3&&localStorage.getItem(SAVE_KEY)===realSave;
    G.stats.placed=999; G.stats.launched=5; const a0=G.achievements.length; checkAchievements(); const noAch=G.achievements.length===a0;
    sandboxZone(5); closeModal(); clearInterval(tickId);
    const z5=G.zone===5&&G.sandbox&&MAP_W===ZONES[5].mapSize[0]+2*EXPAND_W&&G.research.done.includes('singularity');
    const d0=PRESTIGE.stardust, b0=PRESTIGE.bangs; G.bigBang=false; triggerBigBang(); const noDust=PRESTIGE.stardust===d0&&PRESTIGE.bangs===b0;
    G.bigBang=false; saveGame(); G=null; continueGame(SANDBOX_KEY); await new Promise(r=>setTimeout(r,50)); closeModal(); clearInterval(tickId);
    const back=G.sandbox&&G.zone===5&&localStorage.getItem(SAVE_KEY)===realSave;
    startSandbox(1); closeModal(); clearInterval(tickId); const z1=G.zone===1&&G.tutorial.step===-1&&G.sandbox;
    localStorage.removeItem(SANDBOX_KEY); PRESTIGE=JSON.parse(saved); savePrestige();
    ok('sandbox_mode',locked&&z3&&quantum&&own&&noAch&&z5&&noDust&&back&&z1,{locked,z3,quantum,own,noAch,z5,noDust,back,z1,w:MAP_W}); }
  // ── Sound is one setting for the device: it survives a zone change and a new game; an old save hands its choice over once
  { const keep={sfx:PREFS.sfx,music:PREFS.music,musicVol:PREFS.musicVol,audioSet:PREFS.audioSet};
    PREFS.sfx=true; PREFS.audioSet=false; toggleSfx(); setMusicVol(0.3);
    const set=PREFS.sfx===false&&PREFS.musicVol===0.3&&PREFS.audioSet===true&&JSON.parse(localStorage.getItem(PREFS_KEY)).sfx===false;
    G.perks.awarded[G.zone]=true; transitionToZone(2); closeModal(); clearInterval(tickId);
    const kept=PREFS.sfx===false&&PREFS.musicVol===0.3&&!('sfx' in G)&&!('musicVol' in G)&&!('music' in G);
    // an older save carries its own sound: the first one loaded on this build hands it over, then it leaves the save
    PREFS.audioSet=false; PREFS.sfx=true; G.sfx=false; G.musicVol=0.55; G.music=true; localStorage.setItem(SAVE_KEY,serializeG()); G=null; continueGame(); await new Promise(r=>setTimeout(r,50)); closeModal(); clearInterval(tickId);
    const moved=PREFS.sfx===false&&PREFS.musicVol===0.55&&PREFS.audioSet===true&&!("sfx" in G)&&!("musicVol" in G);
    G.sfx=true; G.musicVol=0.9; migrateSave(); const once=PREFS.sfx===false&&PREFS.musicVol===0.55&&!('sfx' in G); // after that, saves never override it
    openSettings(); const inGame=document.getElementById('mBody').innerText; closeModal();
    Object.assign(PREFS,keep); savePrefs();
    ok('sound_is_device_wide',set&&kept&&moved&&once&&/SFX/.test(inGame)&&/RESTART ZONE/.test(inGame),{set,kept,moved,once,ui:/SFX/.test(inGame)}); }
  // ── Settings from the title screen: device settings only, changes redraw the window (runs last: leaves the game)
  { const cb0=PREFS.cb; quitToTitle(); closeModal();
    document.getElementById('titleSettings').click(); const t1=document.getElementById('mBody').innerText;
    const devOnly=/FPS/.test(t1)&&/COLOURS/.test(t1)&&/TIMER/.test(t1)&&/SFX/.test(t1)&&/Music/.test(t1)&&/Vol/.test(t1)&&!/RESTART ZONE/.test(t1);
    setColourBlind(!cb0); const t2=document.getElementById('mBody')?.innerText||''; const redrawn=!!document.getElementById('settingsRoot')&&/COLOURS/.test(t2)&&PREFS.cb===!cb0;
    setPref('fps',30); const stays=!!document.getElementById('settingsRoot'); setPref('fps',60); setColourBlind(cb0); closeModal();
    ok('title_settings',devOnly&&redrawn&&stays,{devOnly,redrawn,stays}); }
  return R;
});
for(const[k,v]of Object.entries(r))console.log(v.startsWith('PASS')?'  ':'✗ ',k.padEnd(32),v);
console.log(errs.join('\n')||'no page errors'); await b.close();})();
