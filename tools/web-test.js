// Website checks. Usage: node tools/web-test.js  (Playwright + Chromium)
// The game lives only on the website (v2.0.50, the Play Store app was dropped). Checks: the Ko-fi support screen from the
// title and the ☰ menu, the old app's Supporter Pack leftovers cleaned up, backup files download, and a save that
// won't load is kept, never replaced by a new game.
const {chromium}=require('playwright'); const path=require('path');
const URL='file://'+path.resolve(__dirname,'..','index.html');
(async()=>{
  const b=await chromium.launch(); const errs=[]; const R={};
  const ok=(k,v,info)=>{R[k]=v?'PASS':'FAIL '+(info!==undefined?JSON.stringify(info):'');};

  // ── support: title button and ☰ tile open the Ko-fi screen
  { const p=await b.newPage({viewport:{width:400,height:800}}); p.on('pageerror',e=>errs.push('support: '+e.message));
    await p.goto(URL); await p.waitForTimeout(300);
    const t=await p.evaluate(async()=>{
      const btn=document.getElementById('titleSupport'), shown=!!btn&&getComputedStyle(btn).display!=='none'&&/KO-FI/.test(btn.innerText);
      btn.click(); const body=document.getElementById('mBody'), link=body.querySelector(`a[href="${KOFI_URL}"]`), more=body.querySelector(`a[href="${GAMES_URL}"]`);
      const title={link:!!link&&link.target==='_blank',more:!!more,free:/free/i.test(body.innerText),close:/CLOSE/.test(document.getElementById('mFoot').innerText)};
      closeModal();
      newGame(); await new Promise(r=>setTimeout(r,800)); closeModal(); clearInterval(tickId);
      openBigMenu(); const menu=document.getElementById('mBody').innerText, dev=/DEV/.test(menu), tile=/SUPPORT/.test(menu);
      openBigMenu('support'); const inGame=!!document.querySelector(`#mBody a[href="${KOFI_URL}"]`)&&/MENU/.test(document.getElementById('mFoot').innerText);
      closeModal();
      return {shown,title,dev,tile,inGame,kofi:KOFI_URL};});
    ok('support_kofi',t.shown&&t.title.link&&t.title.more&&t.title.free&&t.title.close&&t.dev&&t.tile&&t.inGame&&t.kofi==='https://ko-fi.com/salvationbacon',t);
    await p.close(); }

  // ── the Play Store app's Supporter Pack leftovers: Golden Hour theme falls back, prefs keys dropped, no gilded sprites
  { const p=await b.newPage({viewport:{width:400,height:800}}); p.on('pageerror',e=>errs.push('leftovers: '+e.message));
    await p.addInitScript(()=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');
      localStorage.setItem('ebi_prestige',JSON.stringify({stardust:4,total:4,bangs:1,owned:{},theme:'golden'}));
      localStorage.setItem('ebi_prefs',JSON.stringify({fps:60,supporter:true,gild:true}));}});
    await p.goto(URL); await p.waitForTimeout(300);
    const t=await p.evaluate(()=>{openStardustShop(); const shop=document.getElementById('mBody').innerText; closeModal();
      return {theme:PRESTIGE.theme,amber:getComputedStyle(document.documentElement).getPropertyValue('--amber').trim(),
        prefs:'supporter' in PREFS||'gild' in PREFS,golden:/Golden Hour/.test(shop),gild:typeof GILD!=='undefined',store:typeof STORE_BUILD!=='undefined'};});
    ok('supporter_pack_gone',t.theme==='default'&&t.amber==='#f5a623'&&!t.prefs&&!t.golden&&!t.gild&&!t.store,t);
    await p.close(); }

  // ── backup files download (no share sheet any more)
  { const p=await b.newPage({viewport:{width:400,height:800},acceptDownloads:true}); p.on('pageerror',e=>errs.push('file: '+e.message));
    await p.goto(URL); await p.waitForTimeout(300);
    await p.evaluate(async()=>{newGame(); await new Promise(r=>setTimeout(r,800)); closeModal(); clearInterval(tickId); await exportBackup();});
    const label=await p.evaluate(()=>[...document.querySelectorAll('#mFoot button')].map(x=>x.textContent).join('|'));
    const [dl]=await Promise.all([p.waitForEvent('download',{timeout:3000}).catch(()=>null),
      p.evaluate(()=>[...document.querySelectorAll('#mFoot button')].find(x=>/FILE/.test(x.textContent))?.click())]);
    const name=dl?dl.suggestedFilename():'';
    ok('backup_file_downloads',/FILE/.test(label)&&!/SHARE/.test(label)&&/^8bit-industry-backup-.*\.txt$/.test(name),{label,name});
    await p.close(); }

  // ── a save that won't load is kept, never replaced by a new game (v2.0.39)
  { const p=await b.newPage({viewport:{width:400,height:800}}); p.on('pageerror',e=>errs.push('broken: '+e.message));
    await p.goto(URL); await p.waitForTimeout(300);
    const r=await p.evaluate(()=>{const bad='{"ver":"2.0.39","zone":1,"map":"#!garbage","machines":7}'; localStorage.setItem(SAVE_KEY,bad);
      continueGame(); const kept=localStorage.getItem(SAVE_KEY)===bad, copy=localStorage.getItem(BROKEN_KEY)===bad, msg=document.getElementById('mBody').innerText;
      closeModal(); localStorage.removeItem(SAVE_KEY); localStorage.removeItem(BROKEN_KEY); return {kept,copy,title:onTitle(),noGame:G===null,msg:/left exactly as it is/.test(msg)};});
    ok('broken_save_kept',r.kept&&r.copy&&r.title&&r.noGame&&r.msg,r); await p.close(); }

  for(const[k,v]of Object.entries(R))console.log(v.startsWith('PASS')?'  ':'✗ ',k.padEnd(32),v);
  console.log(errs.join('\n')||'no page errors'); await b.close();
  if(Object.values(R).some(v=>!v.startsWith('PASS'))||errs.length)process.exitCode=1;
})();
