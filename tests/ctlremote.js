// FULL-SCREEN REMOTE (build 507 — Omar: "on the control on mobile, I want a
// button to make it full screen and only the highlighted things are showing,
// like a remote control with an x in the corner to exit full screen"). The
// remote is launched from Control > Session, shows the clock + NOW/NEXT part +
// the whole transport, and drives the SAME engine (each rc* control acts and
// publishes like tbc*/ov*). This suite boots a rotation board on a phone-width
// viewport and pins: the launcher shows, the overlay opens/closes, the clock
// mirrors the real clock, and Start / Pause / Next / seek all drive the engine.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
async function boot(br){
  const ctx=await br.newContext({viewport:{width:390,height:820}});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ const k='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(k));
    Object.assign(c,{name:'Remote Test',wkName:'Remote Test',mode:'rotation',teamKind:'teams',teamSize:2,
      together:true,noScore:false,scoreSrc:'manual'});
    c.inventory=Object.assign(c.inventory||{},{Run:6});
    c.display=Object.assign(c.display||{},{ready:0,voice:false});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:0,sameRest:true,blocks:[
      {name:'A',rounds:1,items:[
        {dur:60,name:'Row hard',scored:true,metric:'metres',exercises:[{who:'',name:'Run',amounts:[],unit:'m',max:true}]},
        {dur:60,name:'Ski steady',exercises:[{who:'',name:'Run',amounts:['20'],unit:'cal'}]},
        {dur:60,name:'Bike sprint',exercises:[{who:'',name:'Run',amounts:['15'],unit:'cal'}]}
      ]}]});
    c.crews=[{name:'Team 1'},{name:'Team 2'}];
    localStorage.setItem(k,JSON.stringify(c)); });
  await p.reload(); await p.waitForTimeout(1400);
  await p.evaluate(()=>document.getElementById('tabTrainer').click());
  await p.waitForTimeout(400);
  return {ctx,p};
}
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const {p}=await boot(br);

// ---- the launcher shows on a phone ----
const btnVis=await p.evaluate(()=>{ const b=document.getElementById('ctlRemoteBtn');
  if(!b) return false; const s=getComputedStyle(b); return s.display!=='none'; });
ok(btnVis,'phone: the Full-screen remote launcher is visible on Control > Session');

// ---- opening the remote ----
await p.evaluate(()=>document.getElementById('ctlRemoteBtn').click());
await p.waitForTimeout(300);
const openState=await p.evaluate(()=>{ const e=document.getElementById('ctlRemote');
  const vis=e&&!e.hidden&&getComputedStyle(e).display!=='none';
  return {vis, hasClock:!!document.getElementById('rcClock'),
    hasNow:!!document.getElementById('rcNowP'), hasNext:!!document.getElementById('rcNextP'),
    hasX:!!document.getElementById('rcX'),
    trans:document.querySelectorAll('#ctlRemote .tico').length,
    wk:(document.getElementById('rcWk')||{}).textContent||''}; });
ok(openState.vis,'open: the overlay is shown full-screen');
ok(openState.hasClock&&openState.hasNow&&openState.hasNext,'open: clock + NOW + NEXT are present');
ok(openState.trans>=7,'open: the transport has all 7 tico controls ['+openState.trans+']');
ok(openState.wk==='Remote Test','open: the workout name shows ['+openState.wk+']');

// ---- the clock mirrors the trainer clock ----
const mirror=await p.evaluate(()=>({rc:document.getElementById('rcClock').textContent,
  real:document.getElementById('tClock').textContent}));
ok(mirror.rc===mirror.real,'idle: rcClock mirrors the trainer clock ['+mirror.rc+' / '+mirror.real+']');

// NOW/NEXT before start: NOW previews the block, NEXT names the first part
const idleNN=await p.evaluate(()=>({now:document.getElementById('rcNowP').textContent,
  next:document.getElementById('rcNextP').textContent}));
ok(idleNN.now&&idleNN.now.length>0,'idle: NOW shows something ['+idleNN.now+']');

// ---- Start from the remote ----
await p.evaluate(()=>document.getElementById('rcStart').click());
await p.waitForTimeout(600);
const started=await p.evaluate(()=>({state:document.getElementById('rcState').textContent,
  now:document.getElementById('rcNowP').textContent,
  clk:document.getElementById('rcClock').textContent}));
ok(started.now&&/row/i.test(started.now),'start: NOW is the first running part ['+started.now+']');

// ---- Next part from the remote advances NOW ----
await p.evaluate(()=>document.getElementById('rcNext').click());
await p.waitForTimeout(500);
const after=await p.evaluate(()=>document.getElementById('rcNowP').textContent);
ok(after&&after!==started.now&&/ski/i.test(after),'next: rcNext advanced NOW to the second part ['+after+']');

// ---- Pause toggles the engine (body.tkp) ----
await p.evaluate(()=>document.getElementById('rcPause').click());
await p.waitForTimeout(300);
const paused=await p.evaluate(()=>document.body.classList.contains('tkp'));
ok(paused,'pause: rcPause paused the class (body.tkp)');
await p.evaluate(()=>document.getElementById('rcPause').click());
await p.waitForTimeout(300);
const resumed=await p.evaluate(()=>!document.body.classList.contains('tkp'));
ok(resumed,'pause: a second tap resumed');

// ---- Seek changes the clock ----
const before=await p.evaluate(()=>document.getElementById('rcClock').textContent);
await p.evaluate(()=>document.getElementById('rcB10').click());
await p.waitForTimeout(300);
const afterSeek=await p.evaluate(()=>document.getElementById('rcClock').textContent);
ok(afterSeek!==before,'seek: rcB10 changed the clock ['+before+' -> '+afterSeek+']');

// ---- Reset lights up while running and clears the session ----
const resetOn=await p.evaluate(()=>!document.getElementById('rcReset').disabled);
ok(resetOn,'reset: rcReset is enabled while a session runs');

// ---- the X closes the overlay ----
await p.evaluate(()=>document.getElementById('rcX').click());
await p.waitForTimeout(300);
const closed=await p.evaluate(()=>{ const e=document.getElementById('ctlRemote'); return !!e.hidden; });
ok(closed,'exit: the X closed the overlay');

// ---- navigating away closes it even if left open ----
await p.evaluate(()=>document.getElementById('ctlRemoteBtn').click());
await p.waitForTimeout(200);
await p.evaluate(()=>document.getElementById('tabBoard').click());
await p.waitForTimeout(300);
const navClosed=await p.evaluate(()=>{ const e=document.getElementById('ctlRemote');
  return !!e.hidden&&!document.body.classList.contains('ctlrcon'); });
ok(navClosed,'nav: leaving Control closes the remote');

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
