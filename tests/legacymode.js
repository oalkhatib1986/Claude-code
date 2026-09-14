// A LEGACY BOARD RENDERS, IT NEVER CRASHES THE APP (Omar, build 380: an old
// waves-mode "Engine" from the room library took down the whole page). The
// rotation redesign removed .sub from the lane; every legacy-mode write to
// it must be guarded — waves and sequence boards render and RUN clean.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1366,height:1000}});
let errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/Claude-code/leaderboard.html');
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  c.mode='waves'; c.name='Engine';
  c.segments=[{name:'Row',machine:'Row',format:'distance',target:1000,duration:300},
    {name:'5-Min Run',machine:'Run',format:'time',target:0,duration:300}];
  localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); });
await p.reload(); await p.waitForTimeout(1500);
ok(errs.length===0,'a waves board BOOTS clean'+(errs[0]?' — '+errs[0]:''));
await p.click('#tabTrainer'); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1800);
await p.click('#tabBoard'); await p.waitForTimeout(800);
ok(errs.length===0&&await p.evaluate(()=>document.querySelectorAll('#lanes .lane').length>0),
  'a waves board RUNS and paints lanes without a single error');
// the retired engines cannot be SWITCHED INTO any more (build 383): the mode
// pill is gone from Setup, and a legacy board says how to get back
await p.click('#stSetup'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>!document.getElementById('segMode')),
  'the Blocks/Waves engine pill is GONE from Setup');
ok(await p.evaluate(()=>/RETIRED format/i.test((document.getElementById('modeExplain')||{}).textContent||'')),
  'a legacy board explains itself and points back to the picker');
await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  c.mode='sequence'; localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); });
await p.reload(); await p.waitForTimeout(1500);
ok(errs.length===0,'a sequence board renders clean too');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
