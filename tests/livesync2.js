// A DEVICE LISTENS BEFORE IT SPEAKS. A reloaded phone must never overwrite a
// running class with its own stale idle state; a running screen that hears
// such an edit re-publishes the truth; and after the reload the phone REJOINS
// the class, so its Reset button commands the room again.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
let sess=null;
async function wire(ctx){
  await ctx.route('https://relay.test/**',async route=>{
    const req=route.request();
    const cors={'access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS',
      'access-control-allow-headers':'content-type'};
    if(req.method()==='OPTIONS') return route.fulfill({status:204,headers:cors});
    let b={}; try{ b=JSON.parse(req.postData()||'{}'); }catch(e){}
    const json=o=>route.fulfill({status:200,headers:{'content-type':'application/json',...cors},body:JSON.stringify(o)});
    if(b.op==='s.put'){ sess=b.v; return json({ok:1}); }
    if(b.op==='s.get') return json({v:sess});
    if(b.op==='lib.list') return json({presets:[]});
    if(b.op==='lib.put') return json({ok:1});
    return route.fulfill({status:500,headers:cors,body:'not mocked'});
  });
}
async function boot(br,label){
  const ctx=await br.newContext({viewport:{width:1440,height:1000}});
  await wire(ctx);
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror('+label+'):',e.message);});
  p.on('dialog',d=>d.accept());
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_mw_v1','1'),
    localStorage.setItem('af_prog_v1','1'),localStorage.setItem('af_sis2_v1','1'),
    localStorage.setItem('af_ai_url','https://relay.test/ai')));
  await p.reload(); await p.waitForTimeout(1500);
  return p;
}
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const phone=await boot(br,'phone');
const tv=await boot(br,'tv');
// start a class from the phone
await phone.click('#tabTrainer'); await phone.waitForTimeout(500);
await phone.evaluate(()=>document.getElementById('startBtn').click());
await phone.waitForTimeout(400);
ok(sess&&sess.run&&sess.run.act===true,'class started and published');
await tv.waitForTimeout(3200);
ok((await tv.evaluate(()=>window.__sessState())).run===true,'the TV runs the class');
// RELOAD the phone mid-class: its boot saves must NOT overwrite the room
await phone.reload(); await phone.waitForTimeout(2600);   // past save-debounce AND first pull
ok(sess.run.act===true,'the reloaded phone did not overwrite the running class (room still act)');
const pj=await phone.evaluate(()=>window.__sessState());
ok(pj.run===true&&pj.act===true,'the reloaded phone REJOINED the running class');
// a stale idle EDIT from elsewhere is refused AND the truth is re-published
sess={ts:Date.now()+5,src:'zzzzzz',kind:'edit',cfg:sess.cfg,run:{mode:'rotation',act:false,run:false}};
await tv.waitForTimeout(3200);
ok((await tv.evaluate(()=>window.__sessState())).run===true,'a running screen ignores the stale idle edit');
ok(sess.run&&sess.run.act===true,'and re-publishes the truth to the room');
// reset from the reloaded phone commands the whole room
await phone.evaluate(()=>document.getElementById('resetBtn').click());
await phone.waitForTimeout(300);   // a running class asks before it dies (build 367)
await phone.evaluate(()=>{ const d=document.querySelector('.dlg .dok'); if(d) d.click(); });
await phone.waitForTimeout(400);
ok(sess.run.act===false,'reset from the reloaded phone publishes idle');
await tv.waitForTimeout(3200);
ok((await tv.evaluate(()=>window.__sessState())).act===false,'and the TV stops');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
