// STAGE 1 OF THE CONTROL/OVERVIEW MERGE (build 418 — Omar: "combining the
// control and overview pages… do what you think is best"). The dock was
// already Control's promise on the Workout page — fully wired, publishing,
// lock included — but it booted hidden behind the edge chevron. Now it
// shows itself: open by default (tuck remembered per device), an IDLE shape
// offering the two things Control offers before the clock (athletes today +
// Start) with the dead transport out of sight, and the page keeps its last
// card clear of the floating bar. Running brings the transport back;
// a hold park (running stays true) never flips it to idle.
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
const disp=async id=>p.evaluate(i=>getComputedStyle(document.getElementById(i)).display,id);
const seen=async id=>p.evaluate(i=>{ const x=document.getElementById(i);
  return !!x&&x.offsetParent!==null; },id);
// 1) the dock shows itself on first boot — no chevron hunt
ok(await p.evaluate(()=>!document.getElementById('bdock').classList.contains('tucked')),
  'the dock is OPEN by default on the Workout page');
// 2) idle shape: Start + athletes, no dead transport icons
ok(await p.evaluate(()=>document.getElementById('bdock').classList.contains('idle')),
  'before the clock the dock wears its idle shape');
ok(await seen('bdStart'),'Start is on the dock');
ok(await p.evaluate(()=>document.getElementById('bdStart').textContent===
  document.getElementById('startBtn').textContent),'its label mirrors the real Start button');
ok(!await seen('bdNext')&&!await seen('bdPause')&&!await seen('bdReset'),
  'the transport icons stay out of sight while there is nothing to drive');
{ const w=await p.evaluate(()=>document.getElementById('bdWho').textContent);
  ok(await seen('bdWho')&&/athlete/i.test(w),'the athletes pill reads attendance: '+w); }
// 3) the floating bar never covers the last card
ok(await p.evaluate(()=>parseFloat(getComputedStyle(document.getElementById('viewBoard')).paddingBottom)>=80),
  'the page keeps its bottom clear of the open dock');
// 4) the athletes pill is a door to Control
await p.click('#bdWho'); await p.waitForTimeout(500);
ok(await seen('tcLabel'),'tapping the athletes pill lands on Control');
await p.click('#tabBoard'); await p.waitForTimeout(500);
// 5) start from the dock — the transport comes back
await p.evaluate(()=>document.getElementById('bdStart').click());
await p.waitForTimeout(900);
ok(await p.evaluate(()=>!document.getElementById('bdock').classList.contains('idle')),
  'starting drops the idle shape');
ok(await seen('bdNext')&&await seen('bdPause'),'the transport is back for the running class');
ok(!await seen('bdWho'),'the athletes pill makes way');
// 6) the lock still guards the skip buttons, and the dock can unlock itself
ok(await p.evaluate(()=>document.getElementById('bdNext').disabled),
  'skip is LOCKED until the trainer unlocks');
await p.click('#bdLock'); await p.waitForTimeout(600);
ok(await p.evaluate(()=>!document.getElementById('bdNext').disabled),
  'the dock\'s own lock button arms the transport');
// 7) skipping a part from the dock PUBLISHES (one unwired button = a phone
// a part ahead of the wall)
{ const before=await p.evaluate(()=>document.querySelector('#blockCards .blk.live .bwhere').textContent);
  const n0=sessPuts.length;
  await p.click('#bdNext'); await p.waitForTimeout(900);
  const after=await p.evaluate(()=>document.querySelector('#blockCards .blk.live .bwhere').textContent);
  ok(before!==after,'next-part moves the class ('+before+' -> '+after+')');
  ok(sessPuts.length>n0,'and the skip is published to the room'); }
// 8) pause freezes the clock, resume releases it
await p.click('#bdPause'); await p.waitForTimeout(400);
{ const t1=await p.evaluate(()=>document.getElementById('clock').textContent);
  await p.waitForTimeout(1300);
  const t2=await p.evaluate(()=>document.getElementById('clock').textContent);
  ok(t1===t2,'pause holds the clock ('+t1+')');
  await p.click('#bdPause'); await p.waitForTimeout(1300);
  const t3=await p.evaluate(()=>document.getElementById('clock').textContent);
  ok(t3!==t2,'resume lets it run again ('+t2+' -> '+t3+')'); }
// 9) the chevron's tuck is REMEMBERED per device
await p.click('#bdockTab'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>document.getElementById('bdock').classList.contains('tucked')),
  'the chevron still tucks the dock away');
await p.reload(); await p.waitForTimeout(1600);
ok(await p.evaluate(()=>document.getElementById('bdock').classList.contains('tucked')),
  'a tucked dock STAYS tucked across reloads');
await p.click('#bdockTab'); await p.waitForTimeout(300);
await p.reload(); await p.waitForTimeout(1600);
ok(await p.evaluate(()=>!document.getElementById('bdock').classList.contains('tucked')),
  'and an opened one stays open');
// 10) the projection route carries NO trainer chrome
const p2=await ctx.newPage();
p2.on('pageerror',e=>{fail++;console.log('FAIL pageerror(route):',e.message);});
await p2.goto(F+'#workout'); await p2.waitForTimeout(1400);
ok(await p2.evaluate(()=>getComputedStyle(document.getElementById('bdock')).display==='none'
  &&getComputedStyle(document.getElementById('bdockTab')).display==='none'),
  'the TV route shows neither dock nor chevron');
await p2.close();
// 11) phone width: the dock fits and nothing scrolls sideways
await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(700);
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
  'phone 390: no sideways scroll with the dock open');
ok(await p.evaluate(()=>{ const r=document.getElementById('bdock').getBoundingClientRect();
  return r.left>=0&&r.right<=innerWidth+1; }),'phone 390: the dock stays inside the screen');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
