// THE CONTROLS SIT IN THE PAGE, NOT ON IT (builds 419-421). Omar rejected
// the floating bar twice — 418's default-open and 419's remembered-open
// both hovered over the workout ("remove it from down!") — so the dock and
// its chevron are GONE from the DOM, and the subhead strip (#ovCtl) is the
// ONE control surface on the Workout page. Idle: the athletes picker
// (Control's own, build 421 — "I should also be able to set the number of
// athletes from here") + Start. Running: the lock-guarded transport row.
// In flow always — it can never cover a card. And every part's shareline
// footnote pins to the card's bottom edge so a row of cards reads as one
// line of footnotes ("they must align to bottom together").
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
  localStorage.setItem('af_ai_url','https://relay.test/ai'),
  localStorage.setItem('af_dock_v1','1')));   // 418's poisoned preference must be DEAD
await p.reload(); await p.waitForTimeout(1800);
const seen=async id=>p.evaluate(i=>{ const x=document.getElementById(i);
  return !!x&&x.offsetParent!==null; },id);
const clearOfCards=async()=>p.evaluate(()=>{
  const s=document.getElementById('ovCtl').getBoundingClientRect();
  const c=document.querySelector('#blockCards .blk');
  if(!c) return true;
  const r=c.getBoundingClientRect();
  return s.bottom<=r.top+1||s.right<=r.left||s.left>=r.right;
});
// 1) THE FLOATING BAR IS GONE — even for a device 418 wrote "open" onto
ok(await p.evaluate(()=>!document.getElementById('bdock')&&!document.getElementById('bdockTab')),
  'no dock, no chevron — nothing can hover over the workout');
// 2) idle strip: the athletes PICKER + Start, no transport
ok(await seen('ovCtl'),'the control strip sits in the subhead');
ok(!await seen('ovNext')&&!await seen('ovPause')&&!await seen('ovLock'),
  'idle: the transport icons are not drawn');
ok(await seen('ovStart')&&await p.evaluate(()=>document.getElementById('ovStart').textContent===
  document.getElementById('startBtn').textContent),'Start is there, label mirroring the real button');
ok(await p.evaluate(()=>!!document.querySelector('#ovPick .mfield')),
  'the athletes picker is IN the strip');
ok(await clearOfCards(),'idle: the strip clears the first card');
// a SCORED board keeps its free tags — claiming is real there (424)
ok(await p.evaluate(()=>{ const m=document.querySelector('#blockCards .teams .t.unnamed .mtag');
  return !m||getComputedStyle(m).display!=='none'; }),
  'a scored board keeps its FREE tags — claiming is live there');
// the stacked pills wear ONE width (Omar: "the pills need to be same size!")
await p.waitForTimeout(600);
{ const w=await p.evaluate(()=>({s:document.getElementById('ovStart').getBoundingClientRect().width,
    e:document.getElementById('bEditBtn').getBoundingClientRect().width}));
  ok(Math.abs(w.s-w.e)<=1.5,'Start and Edit workout are the SAME width ('
    +Math.round(w.s)+' vs '+Math.round(w.e)+'px)'); }
// 3) SET THE CLASS SIZE FROM THE STRIP — same picker as Control
await p.click('#ovPick .mfield'); await p.waitForTimeout(300);
await p.fill('#ovPick .msearch','23');
await p.press('#ovPick .msearch','Enter'); await p.waitForTimeout(600);
{ const c=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  ok(c.crews.length===Math.ceil(23/(c.teamSize||4)),'typing 23 athletes sizes the class from the strip');
  const lab=await p.evaluate(()=>document.querySelector('#ovPick .mfield').textContent);
  ok(/23 athletes/.test(lab),'and the field reads it back: '+lab);
  const lab2=await p.evaluate(()=>document.querySelector('#tcPick .mfield').textContent);
  ok(/23 athletes/.test(lab2),'Control\'s picker agrees — one number, two places'); }
// 4) start from the strip — transport row appears, picker makes way
await p.evaluate(()=>document.getElementById('ovStart').click());
await p.waitForTimeout(900);
ok(await p.evaluate(()=>document.getElementById('ovCtl').classList.contains('run')),
  'starting turns the strip into the transport row');
ok(await seen('ovNext')&&await seen('ovPause')&&await seen('ovLock'),'lock + transport are drawn');
// THE WHOLE transport (422 — Omar: "what happened to the rest of the
// controls?!"): seeks and Reset ride the strip like they rode Control
ok(await seen('ovB10')&&await seen('ovB5')&&await seen('ovF5')&&await seen('ovF10')&&await seen('ovReset'),
  '±10/±5 seek and Reset are on the strip');
// THE STATUS BOX IS GONE (422 — "do we even need this box?!")
ok(await p.evaluate(()=>getComputedStyle(document.getElementById('phaseBanner')).display==='none'),
  'the Block-1-of-3-working box no longer prints on the Workout page');
ok(await p.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.beditrow')).marginTop)>=10),
  'the Edit row keeps its breathing room above');
ok(!await p.evaluate(()=>{ const x=document.getElementById('ovPick');
  return x&&x.offsetParent!==null; }),'the picker makes way while running');
ok(await clearOfCards(),'running: the strip still clears the cards');
// 5) lock guards the skips; the strip unlocks itself; skips PUBLISH
ok(await p.evaluate(()=>document.getElementById('ovNext').disabled),
  'skip is LOCKED until the trainer unlocks');
await p.click('#ovLock'); await p.waitForTimeout(600);
ok(await p.evaluate(()=>!document.getElementById('ovNext').disabled),
  'the strip\'s own lock button arms the transport');
{ const before=await p.evaluate(()=>document.querySelector('#blockCards .blk.live .bwhere').textContent);
  const n0=sessPuts.length;
  await p.click('#ovNext'); await p.waitForTimeout(900);
  const after=await p.evaluate(()=>document.querySelector('#blockCards .blk.live .bwhere').textContent);
  ok(before!==after,'next-part moves the class ('+before+' -> '+after+')');
  ok(sessPuts.length>n0,'and the skip is published to the room'); }
// seeking from the strip moves the clock AND publishes
{ const n0=sessPuts.length;
  const t1=await p.evaluate(()=>document.getElementById('clock').textContent);
  await p.click('#ovB10'); await p.waitForTimeout(600);
  const t2=await p.evaluate(()=>document.getElementById('clock').textContent);
  ok(t1!==t2,'seek -10 moves the clock ('+t1+' -> '+t2+')');
  ok(sessPuts.length>n0,'and the seek is published'); }
// 6) pause freezes the clock, resume releases it
await p.click('#ovPause'); await p.waitForTimeout(400);
{ const t1=await p.evaluate(()=>document.getElementById('clock').textContent);
  await p.waitForTimeout(1300);
  const t2=await p.evaluate(()=>document.getElementById('clock').textContent);
  ok(t1===t2,'pause holds the clock ('+t1+')');
  await p.click('#ovPause'); await p.waitForTimeout(1300);
  const t3=await p.evaluate(()=>document.getElementById('clock').textContent);
  ok(t3!==t2,'resume lets it run again ('+t2+' -> '+t3+')'); }
// 7) the projection surfaces carry NO trainer chrome
const p2=await ctx.newPage();
p2.on('pageerror',e=>{fail++;console.log('FAIL pageerror(route):',e.message);});
await p2.goto(F+'#workout'); await p2.waitForTimeout(1400);
ok(await p2.evaluate(()=>getComputedStyle(document.getElementById('ovCtl')).display==='none'),
  'the TV route shows no strip');
await p2.close();
// 8) SHARELINES ALIGN TO THE BOTTOM TOGETHER (421 — Omar's card row read
// ragged): every card's footnote bottom sits on the row's shared line
// its own context: the main page's RUNNING session would board-follow the
// seeded cfg right back out from under the test
const ctx3=await br.newContext({viewport:{width:1440,height:1000}});
const p3=await ctx3.newPage();
p3.on('pageerror',e=>{fail++;console.log('FAIL pageerror(share):',e.message);});
await p3.goto(F);
await p3.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p3.reload(); await p3.waitForTimeout(1200);
await p3.evaluate(()=>{
  const K='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(K));
  Object.assign(cfg,{name:'Align Test',teamKind:'solo',together:true,noScore:true,autoCrews:false});
  cfg.crews=Array.from({length:15},(_,i)=>({name:'Athlete '+(i+1)}));
  cfg.gear=[{name:'Rack',n:6},{name:'Sled',n:6}];
  cfg.exGear={'back squat':'Rack','sled push':'Sled'};
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:0,blocks:[
    {name:'Part A',rounds:1,items:[
      {name:'Set 1',dur:150,fmt:'share',scored:false,group:true,exercises:[
        {name:'Back Squat',amounts:[8],unit:'reps',max:false}]},
      {name:'Set 2',dur:150,fmt:'share',scored:false,group:true,exercises:[
        {name:'Back Squat',amounts:[6],unit:'reps',max:false}]},
      {name:'Set 3',dur:150,fmt:'share',scored:false,group:true,exercises:[
        {name:'Back Squat',amounts:[5],unit:'reps',max:false}]}]},
    {name:'Part B',rounds:1,items:[
      {name:'Push',dur:300,fmt:'share',scored:false,group:true,exercises:[
        {name:'Sled Push',amounts:[20],unit:'m',max:false}]}]}]});
  localStorage.setItem(K,JSON.stringify(cfg));
});
await p3.reload(); await p3.waitForTimeout(1600);
{ const r=await p3.evaluate(()=>{
    const sl=[...document.querySelectorAll('#blockCards .blk .shareline')]
      .filter(x=>x.offsetParent).map(x=>Math.round(x.getBoundingClientRect().bottom));
    const cards=[...document.querySelectorAll('#blockCards .blk')]
      .map(x=>Math.round(x.getBoundingClientRect().bottom));
    return {sl,cards};
  });
  ok(r.sl.length>=2,'both parts carry a shareline ('+r.sl.length+')');
  ok(r.sl.length>=2&&Math.max(...r.sl)-Math.min(...r.sl)<=2,
    'the footnotes sit on ONE line: bottoms '+r.sl.join(', ')); }
// THE HEADCOUNT STAYS WHEN THE SPLIT DEPENDS ON IT (422 — Omar's unscored
// Lower Body printed "2-3 per station" with nowhere to set the class size):
// this board is unscored, ergless AND gear-split — the picker must show
ok(await p3.evaluate(()=>!document.body.classList.contains('noroster')),
  'an unscored gear-split board keeps the roster');
ok(await p3.evaluate(()=>{ const x=document.getElementById('ovPick');
  return !!x&&x.offsetParent!==null&&/athlete/i.test(x.textContent); }),
  'the athletes picker shows on it — the split is settable');
// …and the 369 law HOLDS where nothing depends on the count: a bare floor
// board (no ergs, no leaderboard, no gear) still counts nobody
await p3.evaluate(()=>{ const K='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(K));
  c.gear=[]; c.exGear={}; localStorage.setItem(K,JSON.stringify(c)); });
await p3.reload(); await p3.waitForTimeout(1400);
ok(await p3.evaluate(()=>document.body.classList.contains('noroster')
  &&document.getElementById('ovPick').offsetParent===null),
  'a bare floor board still hides the headcount (369 law)');
await ctx3.close();
// 9) phone 390: the strip wraps to its own row, no h-scroll
await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(700);
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
  'phone 390 running: no sideways scroll');
ok(await clearOfCards(),'phone 390 running: the transport row clears the cards');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
