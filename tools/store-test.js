// Play Store app test. Usage: node tools/store-test.js  (Playwright + Chromium)
// Builds www/ (tools/build-app.js), loads it with Capacitor's App plugin and Google Play Billing
// (cordova-plugin-purchase) mocked, and checks the store build: bundled font, no dev menu outside a sandbox,
// no install button, the Supporter Pack purchase, the Android back button and the background pause.
// Then checks the web game (index.html) shows none of it.
const {chromium}=require('playwright'); const path=require('path');
require('child_process').execFileSync('node',[path.join(__dirname,'build-app.js')],{stdio:'inherit'});

const MOCK=()=>{ // Capacitor App plugin + CdvPurchase, just enough of each
  window.__ebi={listeners:{},orders:0,min:false,cancel:false};
  window.Capacitor={Plugins:{App:{addListener:(ev,fn)=>{__ebi.listeners[ev]=fn;},minimizeApp:()=>{__ebi.min=true;},exitApp:()=>{}}}};
  const owned=new Set(), cbs={};
  const product={id:'supporter_pack',pricing:{price:'£2.99'},getOffer:()=>({id:'base'})};
  const when={productUpdated(f){cbs.pu=f;return when;},approved(f){cbs.ap=f;return when;},finished(f){cbs.fi=f;return when;},receiptUpdated(f){cbs.ru=f;return when;}};
  window.CdvPurchase={ProductType:{NON_CONSUMABLE:'non consumable'},Platform:{GOOGLE_PLAY:'android-playstore'},LogLevel:{WARNING:1},ErrorCode:{PAYMENT_CANCELLED:6777006},
    store:{register(){},when:()=>when,error(f){cbs.err=f;},initialize:()=>Promise.resolve([]),get:id=>id==='supporter_pack'?product:undefined,owned:id=>owned.has(id),
      order(){__ebi.orders++; return new Promise(r=>setTimeout(()=>{
        if(__ebi.cancel){r({code:6777006,message:'cancelled'});return;}
        const t={finish(){owned.add('supporter_pack');cbs.fi&&cbs.fi(t);}}; cbs.ap(t); r(undefined);},20));},
      restorePurchases:()=>Promise.resolve(undefined)}};
};

(async()=>{
  const b=await chromium.launch(); const errs=[]; const R={};
  const ok=(k,v,info)=>{R[k]=v?'PASS':'FAIL '+(info!==undefined?JSON.stringify(info):'');};
  // ── the store build
  const p=await b.newPage({viewport:{width:400,height:800}}); p.on('pageerror',e=>errs.push('store: '+e.message));
  await p.addInitScript(MOCK);
  await p.goto('file://'+path.resolve(__dirname,'..','www','index.html')); await p.waitForTimeout(400);
  const boot=await p.evaluate(async()=>{await document.fonts.ready; const vis=id=>{const e=document.getElementById(id);return !!e&&getComputedStyle(e).display!=='none';};
    return {store:STORE_BUILD,font:document.fonts.check('12px "Press Start 2P"'),web:!!document.querySelector('link[href*="fonts.googleapis"]'),
      support:vis('titleSupport'),install:vis('titleInstall'),back:typeof __ebi.listeners.backButton==='function',billing:billing.init&&billing.ready};});
  ok('store_boot',boot.store&&boot.font&&!boot.web&&boot.support&&!boot.install&&boot.back&&boot.billing,boot);

  const r=await p.evaluate(async()=>{
    const R={}; const ok=(k,v,info)=>{R[k]=v?'PASS':'FAIL '+(info!==undefined?JSON.stringify(info):'');};
    const wait=ms=>new Promise(r=>setTimeout(r,ms)), body=()=>document.getElementById('mBody')?.innerText||'', modal=()=>!document.getElementById('mOverlay').classList.contains('hidden');
    newGame(); await wait(800); closeModal(); clearInterval(tickId);
    // no dev menu: no DEV tile, the unlock does nothing, and a save with dev mode on (a web backup) loads with it off
    openBigMenu(); const menu=body(); closeModal();
    promptDevUnlock(); const unlock=modal(); closeModal();
    G.devMode=true; G.devFreeBuild=true; G.devTickSpeed=5; saveGame(); G=null; continueGame(); await wait(50); closeModal(); clearInterval(tickId);
    const off=!G.devMode&&!G.devFreeBuild&&(G.devTickSpeed||1)===1&&document.getElementById('btnSpeed').style.display==='none';
    ok('store_no_dev_menu',!/DEV/.test(menu)&&/SUPPORT/.test(menu)&&!/INSTALL/.test(menu)&&!unlock&&off,{menu,unlock,off});
    // the Supporter Pack: price from Google Play, a cancelled order changes nothing, a purchase unlocks theme + gilded machines
    openSupport(); const shop=body();
    __ebi.cancel=true; buySupporter(); await wait(60); const cancelled=!supporter()&&!billing.err&&!billing.busy; __ebi.cancel=false;
    const spr0=machineSpr('assembler',0,false);
    buySupporter(); await wait(60);
    const amber=getComputedStyle(document.documentElement).getPropertyValue('--amber').trim();
    const spr1=machineSpr('assembler',0,false), thanks=body();
    ok('supporter_pack_purchase',/BUY · £2\.99/.test(shop)&&/RESTORE PURCHASE/.test(shop)&&cancelled&&supporter()&&PREFS.supporter===true&&PRESTIGE.theme==='golden'
      &&amber==='#ffd54a'&&GILD&&spr0!==spr1&&/Thank you/.test(thanks)&&/GILDED MACHINES: ON/.test(thanks)&&__ebi.orders===2,
      {shop:shop.slice(0,60),cancelled,sup:supporter(),theme:PRESTIGE.theme,amber,GILD,diff:spr0!==spr1,orders:__ebi.orders});
    // the supporter's switches, and the Stardust shop lists Golden Hour for them
    setGild(false); const g0=!GILD&&PREFS.gild===false; setGild(true);
    setSupporterTheme(false); const t0=PRESTIGE.theme==='default'; setSupporterTheme(true); closeModal();
    openStardustShop(); const dust=/Golden Hour/.test(body()); closeModal();
    ok('supporter_switches',g0&&GILD&&t0&&PRESTIGE.theme==='golden'&&dust,{g0,t0,dust});
    // Android back button: closes the newest thing first, then opens the menu; on the title screen it leaves the app
    const back=()=>__ebi.listeners.backButton();
    showPanel('inv'); back(); const panelShut=!openPanel;
    setTool('belt'); back(); const buildStop=activeTool==='select';
    back(); const menuOpen=modal()&&/QUIT/.test(document.getElementById('mFooter')?.innerText||document.body.innerText);
    back(); const menuShut=!modal();
    quitToTitle(); closeModal(); back(); const left=__ebi.min&&onTitle();
    ok('android_back_button',panelShut&&buildStop&&menuOpen&&menuShut&&left,{panelShut,buildStop,menuOpen,menuShut,left});
    // in the background the factory stops (not an idle game) and comes back on resume
    continueGame(); await wait(50); closeModal();
    const t0k=G.tick; __ebi.listeners.pause(); const stopped=tickId===null&&simPaused; await wait(600); const still=G.tick===t0k;
    __ebi.listeners.resume(); const again=!!tickId&&!simPaused; clearInterval(tickId);
    ok('background_pause',stopped&&still&&again,{stopped,still,again});
    // the sandbox keeps its dev panel
    startSandbox(1); closeModal(); clearInterval(tickId); openBigMenu(); const sbx=/DEV/.test(body()); closeModal();
    localStorage.removeItem(SANDBOX_KEY);
    ok('store_sandbox_keeps_dev',sbx&&G.devFreeBuild,{sbx});
    return R;
  });
  Object.assign(R,r);
  const badge=await p.evaluate(()=>{quitToTitle();closeModal();return getComputedStyle(document.getElementById('titleSupporter')).display!=='none';});
  ok('supporter_title_badge',badge);
  // a reinstall: Google Play still owns the pack, so a fresh device gets it back on launch
  const p2=await b.newPage(); p2.on('pageerror',e=>errs.push('reinstall: '+e.message));
  await p2.addInitScript(MOCK); await p2.addInitScript(()=>{localStorage.clear();const o=CdvPurchase.store.owned;CdvPurchase.store.owned=id=>id==='supporter_pack'||o(id);});
  await p2.goto('file://'+path.resolve(__dirname,'..','www','index.html')); await p2.waitForTimeout(400);
  ok('supporter_restored_on_launch',await p2.evaluate(()=>supporter()&&GILD));
  await p2.close();

  // ── the web game shows none of it
  const w=await b.newPage({viewport:{width:400,height:800}}); w.on('pageerror',e=>errs.push('web: '+e.message));
  await w.goto('file://'+path.resolve(__dirname,'..','index.html')); await w.waitForTimeout(300);
  const web=await w.evaluate(async()=>{
    const sup=getComputedStyle(document.getElementById('titleSupport')).display!=='none';
    newGame(); await new Promise(r=>setTimeout(r,800)); closeModal(); clearInterval(tickId);
    openBigMenu(); const menu=document.getElementById('mBody').innerText; closeModal();
    return {store:STORE_BUILD,sup,dev:/DEV/.test(menu),support:/SUPPORT/.test(menu),golden:!PRESTIGE.owned.theme_golden};
  });
  ok('web_build_unchanged',!web.store&&!web.sup&&web.dev&&!web.support,web);

  for(const[k,v]of Object.entries(R))console.log(v.startsWith('PASS')?'  ':'✗ ',k.padEnd(32),v);
  console.log(errs.join('\n')||'no page errors'); await b.close();
  if(Object.values(R).some(v=>!v.startsWith('PASS'))||errs.length)process.exitCode=1;
})();
