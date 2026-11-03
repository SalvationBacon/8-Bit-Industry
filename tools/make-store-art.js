// Draws the Google Play feature graphic (1024×500) from the Singularity title scene. Usage: node tools/build-app.js && node tools/make-store-art.js
const {chromium}=require('playwright'),path=require('path');
process.chdir(path.join(__dirname,'..'));
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1024,height:500},deviceScaleFactor:1});
await p.goto('file://'+path.resolve('www/index.html'));await p.waitForTimeout(600);
await p.addStyleTag({content:`.tc-menu,#titleMute,#titleSoundHint,#titleCaption,.v-num,#titleSupporter{display:none!important}
.title-card{background:rgba(13,13,13,.72)!important;display:block!important;max-width:820px!important;width:820px!important;padding:26px 30px!important;border:2px solid #f5a623!important}
.tc-brand{transform:scale(1.15);transform-origin:center}`});
await p.evaluate(()=>{Math.random=(()=>{let x=7;return()=>(x=(x*16807)%2147483647)/2147483647;})();TITLE.order=[5];TITLE.idx=0;nextTitleScene(performance.now()-20000);});
await p.waitForTimeout(400);
await p.screenshot({path:'store/feature-graphic.png'});await b.close();})();
