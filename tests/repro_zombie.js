const {chromium}=require('playwright');
const F='file:///home/user/Claude-code/leaderboard.html';
let sess=null;
async function wire(ctx){
  await ctx.route('https://relay.test/**',async route=>{
    const req=route.request();
    const cors={'access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'};
    if(req.method()==='OPTIONS') return route.fulfill({status:204,headers:cors});
    let b={}; try{ b=JSON.parse(req.postData()||'{}'); }catch(e){}
    const json=o=>route.fulfill({status:200,headers:{'content-type':'application/json',...cors},body:JSON.stringify(o)});
    if(b.op==='s.put'){ sess=b.v; return json({ok:1,now:Date.now()}); }
    if(b.op==='s.get') return json({v:sess,now:Date.now()});
    if(b.op==='lib.list') return json({presets:[]});
    if(b.op==='lib.put') return json({ok:1});
    return route.fulfill({status:500,headers:cors,body:'x'});
  });
}
async function boot(br,hash){
  const ctx=await br.newContext({viewport:{width:1920,height:1080}});
  await wire(ctx);
  const p=await ctx.newPage();
  p.on('pageerror',e=>console.log('PAGEERROR',e.message));
  p.on('dialog',d=>d.accept());
  await p.goto(F+(hash||''));
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_mw_v1','1'),
    localStorage.setItem('af_prog_v1','1'),localStorage.setItem('af_sis2_v1','1'),
    localStorage.setItem('af_ai_url','https://relay.test/ai')));
  await p.reload(); await p.waitForTimeout(1500);
  return p;
}
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const phone=await boot(br);
const tvw=await boot(br,'#workout');
await phone.click('#tabTrainer'); await phone.waitForTimeout(400);
await phone.evaluate(()=>document.getElementById('startBtn').click());
await phone.waitForTimeout(5500);   // TV joins the class
console.log('tv joined:',JSON.stringify(await tvw.evaluate(()=>window.__sessState())));
await phone.evaluate(()=>document.getElementById('resetBtn').click());
await phone.waitForTimeout(4000);   // TV should have applied idle
const snap=async p=>p.evaluate(()=>{
  const clk=els=>els.map(e=>e.textContent.trim()).join('|');
  return { st:window.__sessState(),
    head:(document.getElementById('clock')||{}).textContent,
    state:(document.getElementById('clockState')||{}).textContent,
    bclk:clk([...document.querySelectorAll('.blk .bclk b')]),
    cards:[...document.querySelectorAll('#blockCards .blk')].map(c=>c.className.replace(/\s+/g,' ')).join(' / ') };
});
const t1=await snap(tvw);
await tvw.waitForTimeout(2000);
const t2=await snap(tvw);
console.log('TV t1:',JSON.stringify(t1));
console.log('TV t2:',JSON.stringify(t2));
console.log('TICKING AFTER RESET:', t1.head!==t2.head||t1.bclk!==t2.bclk ? 'YES — reproduced' : 'no');
await br.close();
})();
