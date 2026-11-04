// Google Play graphics drawn from the game itself. Usage: node tools/build-app.js && node tools/make-store-art.js
//   store/feature-graphic.png       1024x500  phone/tablet listing banner (logo card over the Singularity title scene)
//   store/pc-feature-graphic.png    1920x1080 Google Play Games on PC feature graphic (game card background: scene only, no text)
//   store/supporter-pack-icon.png   512x512   the Supporter Pack product image (gilded assembler + heart)
//   store/pc-logo.png               600x400   Google Play Games on PC logo (transparent; Google lays it over the PC feature graphic)
const {chromium}=require('playwright'),path=require('path');
process.chdir(path.join(__dirname,'..'));
const SCENE=async(p,zone)=>p.evaluate(z=>{Math.random=(()=>{let x=7;return()=>(x=(x*16807)%2147483647)/2147483647;})();TITLE.order=[z];TITLE.idx=0;nextTitleScene(performance.now()-20000);},zone);
(async()=>{const b=await chromium.launch();
  // phone/tablet feature graphic
  let p=await b.newPage({viewport:{width:1024,height:500},deviceScaleFactor:1});
  await p.goto('file://'+path.resolve('www/index.html'));await p.waitForTimeout(600);
  await p.addStyleTag({content:`.tc-menu,#titleMute,#titleSoundHint,#titleCaption,.v-num,#titleSupporter{display:none!important}
.title-card{background:rgba(13,13,13,.72)!important;display:block!important;max-width:820px!important;width:820px!important;padding:26px 30px!important;border:2px solid #f5a623!important}
.tc-brand{transform:scale(1.15);transform-origin:center}`});
  await SCENE(p,5); await p.waitForTimeout(400);
  await p.screenshot({path:'store/feature-graphic.png'}); await p.close();
  // PC feature graphic: the scene alone (Google overlays the logo)
  p=await b.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1.5});
  await p.goto('file://'+path.resolve('www/index.html'));await p.waitForTimeout(600);
  await p.addStyleTag({content:`.title-card,#titleMute,#titleSoundHint,#titleCaption,.title-glow{display:none!important}`});
  await SCENE(p,5); await p.waitForTimeout(400);
  await p.screenshot({path:'store/pc-feature-graphic.png'}); await p.close();
  // PC logo: the title logo on a transparent background
  p=await b.newPage({viewport:{width:600,height:400},deviceScaleFactor:1});
  await p.goto('file://'+path.resolve('www/index.html'));await p.waitForTimeout(600);
  await p.evaluate(()=>stopTitleScene());
  await p.addStyleTag({content:`html,body,#sTitle,.screen{background:transparent!important}
body::after{display:none!important}
#titleCanvas,.title-glow,.tc-menu,.tagline,#titleMute,#titleSoundHint,#titleCaption,.v-num,#titleSupporter{display:none!important}
.title-card{background:transparent!important;border:none!important;box-shadow:none!important;backdrop-filter:none!important;position:fixed!important;inset:0!important;max-width:none!important;width:600px!important;height:400px!important;display:flex!important;align-items:center;justify-content:center;padding:0!important;margin:0!important;transform:none!important}
.logo-icon{display:inline-block!important}
.tc-brand{transform:translate(15px,40px) scale(2);transform-origin:center;text-shadow:0 0 6px rgba(0,0,0,.9),0 2px 0 #000}`});
  await p.waitForTimeout(300);
  await p.screenshot({path:'store/pc-logo.png',omitBackground:true}); await p.close();
  await b.close(); console.log('store art written');
})();
// store/supporter-pack-icon.png  512x512  the Supporter Pack product image: a gilded assembler and the supporter heart
(async()=>{const b=await chromium.launch(); const p=await b.newPage();
  await p.goto('file://'+path.resolve('www/index.html')); await p.waitForTimeout(500);
  const url=await p.evaluate(()=>{
    const c=document.createElement('canvas'); c.width=c.height=512; const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
    x.fillStyle='#0d0d0d'; x.fillRect(0,0,512,512);
    for(let r=15;r>0;r--){x.fillStyle=`rgba(255,200,70,${0.035})`;x.beginPath();x.arc(256,268,r*16,0,Math.PI*2);x.fill();} // warm glow in pixel steps
    const old=GILD; GILD=true; const m=machineSpr('assembler',1,true); GILD=old;
    x.drawImage(m,256-144,268-144,288,288);                    // 32px sprite at 9x
    const h=uiSpr('support'); x.drawImage(h,512-48-128,48,128,128); // heart badge, 16px at 8x
    x.fillStyle='#f5a623'; for(const[sx,sy]of[[70,96],[96,70],[430,420],[404,446],[84,430]]){x.fillRect(sx,sy,8,8);x.fillRect(sx-8,sy+8,24,8);x.fillRect(sx,sy+16,8,8);} // sparkles
    return c.toDataURL('image/png');});
  require('fs').writeFileSync('store/supporter-pack-icon.png',Buffer.from(url.split(',')[1],'base64'));
  await b.close(); console.log('supporter icon written');
})();
