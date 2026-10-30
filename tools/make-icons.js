// Draws the app icon as 32×32 pixel art and writes the PNGs. Usage: node tools/make-icons.js (Playwright + Chromium)
//   icon-192.png, icon-512.png       full-bleed ("any")
//   icon-maskable-512.png             art at ~80% so Android's round/squircle masks never cut it
//   apple-touch-icon.png (180×180)    iOS rounds the corners itself
const {chromium}=require('playwright');
const fs=require('fs'), path=require('path');

function art(P,R,C){
  const BG='#0d0d0d';
  R(0,0,32,32,BG);
  // warm glow behind the factory
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const d=Math.hypot(x-15.5,y-17);if(d<14)P(x,y,d<9?'#1b150c':'#14110b');}
  // smoke
  C(11,4,2,'#5e5e5e'); P(10,3,'#7a7a7a'); C(14,2,1,'#4a4a4a');
  C(21,5,2,'#4e4e4e'); P(20,4,'#6a6a6a'); C(24,3,1,'#3e3e3e');
  // chimneys with a red band
  R(10,7,3,8,'#4a4a4a'); R(10,7,3,1,'#6e6e6e'); R(10,9,3,1,'#e53935'); R(12,8,1,7,'#383838');
  R(20,8,3,7,'#4a4a4a'); R(20,8,3,1,'#6e6e6e'); R(20,10,3,1,'#e53935'); R(22,9,1,6,'#383838');
  // sawtooth roof
  for(let k=0;k<4;k++){const x0=6+k*5;for(let i=0;i<5;i++){const h=Math.floor(i*0.75);R(x0+i,14-h,1,h+1,i===4?'#ffd27a':'#f5a623');}}
  // walls
  R(6,15,20,9,'#2a2a2a'); R(6,15,20,1,'#a86c08'); R(6,15,1,9,'#363636'); R(25,15,1,9,'#1c1c1c'); R(6,23,20,1,'#1c1c1c');
  // glowing windows
  for(const x of[8,12,16]){R(x,17,3,3,'#26c6a0');P(x,17,'#b8fff0');P(x+1,17,'#8af0d0');R(x,20,3,1,'#145a48');}
  // door
  R(20,18,4,5,'#151515'); R(20,18,4,1,'#3a3a3a'); P(23,20,'#f5a623');
  // belt with plates riding it
  R(3,25,26,3,'#2b2b2b'); R(3,25,26,1,'#5a5a5a'); R(3,27,26,1,'#161616');
  for(let x=4;x<29;x+=4)P(x,25,'#f5a623');
  [[5,'#d0dae6','#8a96a8'],[11,'#ffb070','#c87a3a'],[17,'#d0dae6','#8a96a8'],[23,'#ffb070','#c87a3a']].forEach(([x,hi,lo])=>{R(x,26,3,1,lo);R(x,26,2,1,hi);});
}

(async()=>{
  const b=await chromium.launch(); const p=await b.newPage();
  const out=await p.evaluate(src=>{
    const art=eval('('+src+')');
    const base=document.createElement('canvas'); base.width=base.height=32;
    const g=base.getContext('2d');
    const P=(x,y,c)=>{g.fillStyle=c;g.fillRect(x,y,1,1);}, R=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
    const C=(cx,cy,r,c)=>{for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r+r*.6)P(cx+x,cy+y,c);};
    art(P,R,C);
    // size: output px; scale: px per art pixel (whole numbers keep it crisp); the rest is background
    const make=(size,scale)=>{const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');
      x.fillStyle='#0d0d0d';x.fillRect(0,0,size,size);x.imageSmoothingEnabled=false;
      const d=32*scale, o=Math.round((size-d)/2); x.drawImage(base,o,o,d,d); return c.toDataURL('image/png').split(',')[1];};
    return {'icon-192.png':make(192,6),'icon-512.png':make(512,16),'icon-maskable-512.png':make(512,13),'apple-touch-icon.png':make(180,5)};
  },art.toString());
  for(const[f,b64]of Object.entries(out)){fs.writeFileSync(path.resolve(__dirname,'..',f),Buffer.from(b64,'base64'));console.log('wrote',f);}
  await b.close();
})();
