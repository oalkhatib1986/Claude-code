const {chromium}=require('playwright');
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1600,height:900}});
p.on('dialog',d=>d.accept());
await p.goto('file:///home/user/Claude-code/leaderboard.html');
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(()=>document.getElementById('tabScreen').click()); await p.waitForTimeout(300);
await p.evaluate(()=>{const l=document.getElementById('smLead');if(l)l.click();}); await p.waitForTimeout(400);
await p.evaluate(()=>document.fonts&&document.fonts.ready);
const el=await p.$('#lbLive');
const b=await el.boundingBox();
await p.screenshot({path:'/tmp/claude-0/divider.png',clip:{x:b.x,y:b.y,width:b.width,height:120}});
await br.close();
})();
