// THE CONTROLS SIT IN THE PAGE, NOT ON IT (build 419 — Omar rejected 418's
// always-open floating bar: "I don't like how it covers the workout", and
// circled the empty space beside the title). The subhead strip (#ovCtl)
// rides that void IN FLOW: idle it offers athletes-today + Start; running
// it becomes the transport row (lock-guarded, publishing) under the clock.
// On a phone it wraps to its own full-width row and PUSHES the cards down —
// it can never cover one. The floating dock is opt-in again (chevron,
// remembered), and its idle shape drops the start-flow paragraph that
// ballooned it into the slab.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
let sessPuts=[], sess=null;
async function wire(ctx){
  await ctx.route('https://relay.test/**',async route=>{
    const req=route.request();
    const cors={'access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS',
      'access-control-allow-headers':'content-type'};
    if(req.method()==='OPTIONS') return route.fulfill({status:204,headers:cors});
    let b={}; try{ b=JSON.parse(req.postData()||'{}'); }catch(e){}
    const json=o=>route.fulfill({status:200,headers:{'content-type':'application/json',...cors},body:JSON.stringify(o)});
    if(b.op==='lib.put') return json({ok:1});
    if(b.op==='lib.list') return json({presets:[]});
    if(b.op==='s.put'){ sessPuts.push(b.v); sess=b.v; return json({ok:1}); }
    if(b.op==='s.get') return json({v:sess});
    return route.fulfill({status:500,headers:cors,body:'not mocked'});
  });
}
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await br.newContext({viewport:{width:1440,height:1000}});
await wire(ctx);
const p=await ctx.newPage();
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
await p.goto(F);
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1'),
  localStorage.setItem('af_ai_url','https://relay.test/ai')));
await p.reload(); await p.waitForTimeout(1800);
const seen=async id=>p.evaluate(i=>{ const x=document.getElementById(i);
  return !!x&&x.offsetParent!==null; },id);
// the strip never overlaps the first workout card — it lives in the flow
const clearOfCards=async()=>p.evaluate(()=>{
  const s=document.getElementById('ovCtl').getBoundingClientRect();
  const c=document.querySelector('#blockCards .blk');
  if(!c) return true;
  const r=c.getBoundingClientRect();
  return s.bottom<=r.top+1||s.right<=r.left||s.left>=r.right;
});
// 1) NOTHING FLOATS BY DEFAULT: the dock is opt-in again
ok(await p.evaluate(()=>document.getElementById('bdock').classList.contains('tucked')),
  'the floating dock boots TUCKED — nothing covers the workout');
// 2) idle strip: athletes + Start in the subhead, no transport
ok(await seen('ovCtl'),'the control strip sits in the subhead');
ok(await p.evaluate(()=>!document.getElementById('ovCtl').classList.contains('run')),
  'idle: no transport row');
ok(!await seen('ovNext')&&!await seen('ovPause')&&!await seen('ovLock'),
  'idle: the transport icons are not drawn');
ok(await seen('ovStart')&&await p.evaluate(()=>document.getElementById('ovStart').textContent===
  document.getElementById('startBtn').textContent),'Start is there, label mirroring the real button');
{ const w=await p.evaluate(()=>document.getElementById('ovWho').textContent);
  ok(await seen('ovWho')&&/athlete/i.test(w),'the athletes pill reads attendance: '+w); }
ok(await clearOfCards(),'idle: the strip clears the first card');
// 3) the athletes pill is a door to Control
await p.click('#ovWho'); await p.waitForTimeout(500);
ok(await seen('tcLabel'),'tapping the athletes pill lands on Control');
await p.click('#tabBoard'); await p.waitForTimeout(500);
// 4) start from the strip — transport row appears, pill makes way
await p.evaluate(()=>document.getElementById('ovStart').click());
await p.waitForTimeout(900);
ok(await p.evaluate(()=>document.getElementById('ovCtl').classList.contains('run')),
  'starting turns the strip into the transport row');
ok(await seen('ovNext')&&await seen('ovPause')&&await seen('ovLock'),'lock + transport are drawn');
ok(!await seen('ovWho'),'the athletes pill makes way');
ok(await clearOfCards(),'running: the strip still clears the cards');
// 5) lock guards the skips; the strip unlocks itself
ok(await p.evaluate(()=>document.getElementById('ovNext').disabled),
  'skip is LOCKED until the trainer unlocks');
await p.click('#ovLock'); await p.waitForTimeout(600);
ok(await p.evaluate(()=>!document.getElementById('ovNext').disabled),
  'the strip\'s own lock button arms the transport');
// 6) skipping a part PUBLISHES (one unwired button = a phone a part ahead)
{ const before=await p.evaluate(()=>document.querySelector('#blockCards .blk.live .bwhere').textContent);
  const n0=sessPuts.length;
  await p.click('#ovNext'); await p.waitForTimeout(900);
  const after=await p.evaluate(()=>document.querySelector('#blockCards .blk.live .bwhere').textContent);
  ok(before!==after,'next-part moves the class ('+before+' -> '+after+')');
  ok(sessPuts.length>n0,'and the skip is published to the room'); }
// 7) pause freezes the clock, resume releases it
await p.click('#ovPause'); await p.waitForTimeout(400);
{ const t1=await p.evaluate(()=>document.getElementById('clock').textContent);
  await p.waitForTimeout(1300);
  const t2=await p.evaluate(()=>document.getElementById('clock').textContent);
  ok(t1===t2,'pause holds the clock ('+t1+')');
  await p.click('#ovPause'); await p.waitForTimeout(1300);
  const t3=await p.evaluate(()=>document.getElementById('clock').textContent);
  ok(t3!==t2,'resume lets it run again ('+t2+' -> '+t3+')'); }
// 8) the opt-in dock still works, remembers, and stays slim while idle
await p.evaluate(()=>{ const b=document.querySelector('.dlg-back .dok'); if(b) b.click(); });
await p.click('#bdockTab'); await p.waitForTimeout(400);
ok(await p.evaluate(()=>!document.getElementById('bdock').classList.contains('tucked')),
  'the chevron still opens the dock for whoever wants it');
await p.reload(); await p.waitForTimeout(1600);
ok(await p.evaluate(()=>!document.getElementById('bdock').classList.contains('tucked')),
  'an opened dock is remembered');
ok(await p.evaluate(()=>{ const f=document.getElementById('bdFlow');
  return !f||f.offsetParent===null; }),
  'the idle dock carries NO start-flow paragraph (the 418 slab)');
await p.click('#bdockTab'); await p.waitForTimeout(300);
await p.reload(); await p.waitForTimeout(1600);
ok(await p.evaluate(()=>document.getElementById('bdock').classList.contains('tucked')),
  'and a tucked one stays tucked');
// 9) the projection surfaces carry NO trainer chrome
const p2=await ctx.newPage();
p2.on('pageerror',e=>{fail++;console.log('FAIL pageerror(route):',e.message);});
await p2.goto(F+'#workout'); await p2.waitForTimeout(1400);
ok(await p2.evaluate(()=>getComputedStyle(document.getElementById('ovCtl')).display==='none'
  &&getComputedStyle(document.getElementById('bdock')).display==='none'),
  'the TV route shows neither strip nor dock');
await p2.close();
// 10) phone 390: the strip wraps to its own row, pushes cards down, no h-scroll
await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(700);
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
  'phone 390 idle: no sideways scroll');
ok(await clearOfCards(),'phone 390 idle: the strip clears the cards');
await p.evaluate(()=>document.getElementById('ovStart').click());
await p.waitForTimeout(900);
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
  'phone 390 running: no sideways scroll');
ok(await clearOfCards(),'phone 390 running: the transport row clears the cards');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
