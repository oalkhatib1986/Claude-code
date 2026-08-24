// SKIPPING IS A CLOCK ACT. Next/previous part from the trainer's transport
// publishes like start/reset — the TV lands on the same part, same banner.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
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
  const ctx=await br.newContext({viewport:{width:1440,height:1000}});
  await wire(ctx);
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
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
const tv=await boot(br,'#workout');
await phone.click('#tabTrainer'); await phone.waitForTimeout(500);
await phone.evaluate(()=>document.getElementById('startBtn').click());
await phone.waitForTimeout(4000);
ok((await tv.evaluate(()=>window.__sessState())).run===true,'the TV runs the class');
// unlock the transport, skip to the next part
await phone.evaluate(()=>document.getElementById('bdLock')?document.getElementById('bdLock').click():document.getElementById('tkLockBtn').click());
await phone.waitForTimeout(300);
await phone.evaluate(()=>document.getElementById('bdNext').click());
await phone.waitForTimeout(500);
ok(!!sess&&!!sess.run,'the skip published at once');
await tv.waitForTimeout(3200);
const [ps,ts]=await Promise.all([phone.evaluate(()=>window.__sessState()),
  tv.evaluate(()=>window.__sessState())]);
console.log(' phone:',JSON.stringify(ps),' tv:',JSON.stringify(ts));
ok(ts.round===ps.round&&ts.phase===ps.phase,'the TV lands on the same part/phase ('+ts.round+'/'+ts.phase+' vs '+ps.round+'/'+ps.phase+')');
ok(Math.abs(ts.el-ps.el)<2,'and the same clock ('+ts.el.toFixed(1)+' vs '+ps.el.toFixed(1)+')');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
