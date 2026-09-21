// GET READY COUNTDOWN (build 490 — Omar: "when the trainer starts the workout,
// and whenever he needs to start the next block or part on the app, before the
// workout time starts, I'd like a 10 second countdown so people just get ready…
// it also has to have a beep at 5 seconds"). Approved: manual starts by default,
// an opt-in toggle for automatic block transitions, the beep shared with
// Countdown beeps. A get-ready is modelled as a LABELLED REST — it inherits the
// rest clock, the sync and the countdown beeps — and at 0 does what it was
// counting into (start the block, or resume a held part). This suite pins:
//   - default 10s count-in on a manual start (rot.getReady, phase rest, ~10s)
//   - the wall clock label reads "Get ready", not "Rest"
//   - readyN=off skips it (straight into the block)
//   - after the count-in the block actually runs
//   - readyAuto OFF: an automatic blockRest transition inserts NO get-ready
//   - readyAuto ON: it does
//   - a custom length (5s) is honoured
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
// a simple two-part together board; blockRest between parts drives the auto path
function cfgFor(ready,readyAuto,blockRest){
  return {ready,readyAuto,blockRest};
}
async function boot(br,{ready,readyAuto,blockRest}){
  const ctx=await br.newContext({viewport:{width:1440,height:960}});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  p.on('dialog',d=>d.accept());
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate(({ready,readyAuto,blockRest})=>{
    const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    Object.assign(c,{name:'ReadyTest',wkName:'ReadyTest',mode:'rotation',teamKind:'solo',
      together:true,noScore:true,scoreSrc:'manual'});
    c.display=Object.assign(c.display||{},{voice:false});
    if(ready!=null) c.display.ready=ready;
    if(readyAuto!=null) c.display.readyAuto=readyAuto;
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:blockRest||0,sameRest:true,blocks:[
      {name:'Part A',rounds:1,items:[{name:'',dur:30,scored:false,exercises:[{name:'Row',amounts:[10],unit:'reps'}]}]},
      {name:'Part B',rounds:1,items:[{name:'',dur:30,scored:false,exercises:[{name:'Ski',amounts:[10],unit:'reps'}]}]}
    ]});
    c.crews=[{name:'A1'}];
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
  },{ready,readyAuto,blockRest});
  await p.reload(); await p.waitForTimeout(1300);
  return {ctx,p};
}
const startBtn=p=>p.evaluate(()=>document.getElementById('startBtn').click());
const ready=p=>p.evaluate(()=>window.__ready());
const clockLab=p=>p.evaluate(()=>{const e=document.getElementById('clockLab');return e?e.textContent:'';});
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

// ---- DEFAULT is 10s on a manual start: no cfg.display.ready set ----
{ const {p}=await boot(br,{});
  const secs=await p.evaluate(()=>window.__ready().secs);
  ok(secs===10,'default get-ready length is 10s ['+secs+']');
  await startBtn(p); await p.waitForTimeout(250);
  const r=await ready(p);
  ok(r.on===true&&r.phase==='rest','manual start begins a GET READY (labelled rest) ['+JSON.stringify(r)+']');
  ok(r.act==='block','the count-in is aimed at the block start ['+r.act+']');
  ok(r.dur===10&&r.remain>7&&r.remain<=10,'count-in shows ~10s on the clock ['+r.remain+']');
  const lab=await clockLab(p);
  ok(/get ready/i.test(lab),'the wall clock label reads "Get ready", not "Rest" ['+lab+']');
  await p.close(); }

// ---- after the count-in, the block actually runs ----
{ const {p}=await boot(br,{ready:10});
  await startBtn(p); await p.waitForTimeout(200);
  // seek the labelled rest to its end; frameRest at 0 fires readyFire -> startBlock
  await p.evaluate(()=>window.__seek&&window.__seek(11));
  await p.waitForTimeout(500);
  const r=await ready(p);
  const st=await p.evaluate(()=>window.__sessState());
  ok(r.on===false&&st.phase==='run'&&st.run===true,'after the count-in the block is running ['+JSON.stringify(st)+']');
  await p.close(); }

// ---- readyN = off: a manual start goes STRAIGHT into the block, no count-in ----
{ const {p}=await boot(br,{ready:0});
  await startBtn(p); await p.waitForTimeout(250);
  const r=await ready(p);
  const st=await p.evaluate(()=>window.__sessState());
  ok(r.on===false&&st.phase==='run','ready=off: no count-in, block runs immediately ['+st.phase+']');
  await p.close(); }

// ---- a custom length (5s) is honoured ----
{ const {p}=await boot(br,{ready:5});
  await startBtn(p); await p.waitForTimeout(250);
  const r=await ready(p);
  ok(r.on===true&&r.dur===5&&r.remain>3&&r.remain<=5,'custom 5s count-in honoured ['+r.remain+']');
  await p.close(); }

// ---- readyAuto OFF (default): an automatic blockRest transition inserts NO
// get-ready — after the rest the next block just begins (build 464 unchanged) ----
{ const {p}=await boot(br,{ready:10,readyAuto:false,blockRest:6});
  await startBtn(p); await p.waitForTimeout(200);
  // skip the opening get-ready, then run Part A to its end into the blockRest
  await p.evaluate(()=>window.__seek&&window.__seek(11));   // end get-ready -> Part A runs
  await p.waitForTimeout(400);
  await p.evaluate(()=>window.__seek&&window.__seek(31));   // end Part A (dur 30) -> blockRest
  await p.waitForTimeout(400);
  let r=await ready(p);
  ok(r.phase==='rest'&&r.on===false,'auto off: Part A end is a plain rest, not a get-ready ['+JSON.stringify(r)+']');
  // run the blockRest to its end; with readyAuto off it goes straight to Part B
  await p.evaluate(()=>window.__seek&&window.__seek(7));
  await p.waitForTimeout(500);
  r=await ready(p);
  const st=await p.evaluate(()=>window.__sessState());
  ok(r.on===false&&st.phase==='run'&&st.round===1,'auto off: after the blockRest Part B just begins ['+st.round+'/'+st.phase+']');
  await p.close(); }

// ---- readyAuto ON: the same blockRest transition DOES insert a get-ready ----
{ const {p}=await boot(br,{ready:10,readyAuto:true,blockRest:6});
  await startBtn(p); await p.waitForTimeout(200);
  await p.evaluate(()=>window.__seek&&window.__seek(11));   // end opening get-ready
  await p.waitForTimeout(400);
  await p.evaluate(()=>window.__seek&&window.__seek(31));   // end Part A -> blockRest
  await p.waitForTimeout(400);
  await p.evaluate(()=>window.__seek&&window.__seek(7));    // end blockRest
  await p.waitForTimeout(500);
  const r=await ready(p);
  ok(r.on===true&&r.act==='block'&&r.phase==='rest','auto on: the blockRest end inserts a GET READY before Part B ['+JSON.stringify(r)+']');
  await p.close(); }

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
