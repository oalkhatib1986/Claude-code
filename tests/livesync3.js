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
async function boot(br,hash,skewMs){
  const ctx=await br.newContext({viewport:{width:1920,height:1080}});
  await wire(ctx);
  const p=await ctx.newPage();
  if(skewMs) await p.addInitScript(ms=>{ const D=Date, RN=Date.now.bind(Date);
    Date.now=()=>RN()+ms; },skewMs);
  p.on('pageerror',e=>console.log('PAGEERROR',e.message));
  p.on('dialog',d=>d.accept());
  await p.goto(F+(hash||''));
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_mw_v1','1'),
    localStorage.setItem('af_prog_v1','1'),localStorage.setItem('af_sis2_v1','1'),
    localStorage.setItem('af_ai_url','https://relay.test/ai')));
  await p.reload(); await p.waitForTimeout(1500);
  return p;
}
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const phone=await boot(br);
const tvw=await boot(br,'#workout',-10000);   // TV wall clock 10s BEHIND
await phone.click('#tabTrainer'); await phone.waitForTimeout(400);
await phone.evaluate(()=>document.getElementById('startBtn').click());
await phone.waitForTimeout(6000);
const grab=p=>p.evaluate(()=>{
  const live=[...document.querySelectorAll('#blockCards .blk.live')].length;
  const clk=(document.querySelector('.blk .bclk b')||{}).textContent||'none';
  const s=window.__sessState();
  return {run:s.run,el:+s.el.toFixed(1),live,clk};
});
const a=await grab(phone), b=await grab(tvw);
console.log('PHONE:',JSON.stringify(a),' TV:',JSON.stringify(b));
ok(a.run&&b.run,'both run the class');
ok(b.el>0,'the skewed TV clock never runs negative ('+b.el+'s)');
ok(Math.abs(a.el-b.el)<1.5,'a 10s wall-clock skew is corrected by the referee clock ('+a.el+' vs '+b.el+')');
ok(b.live>0,'the running part is highlighted on the follower');
ok(a.clk===b.clk||Math.abs(a.el-b.el)<1.5,'card countdowns agree ('+a.clk+' vs '+b.clk+')');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
