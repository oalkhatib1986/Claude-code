// BLOCK TRANSITIONS (build 464 — Omar's Upper Body 21 Sept). A configured
// blockRest is an AUTOMATIC transition: the rest counts down and the next
// block just begins — it is NOT a hold and must not require press-start. A
// press-start wait belongs only to blockRest 0/omitted (or an it.hold item),
// and then the clock previews the next block, never a phantom countdown for
// the finished set. Part A = one item dur 600, one exercise sets 4
// ("Every 2:30 × 4"), hold false; Part B = dur 300.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
async function board(p,blockRest){
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate((blockRest)=>{
    const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    Object.assign(c,{name:'Upper Body',wkName:'Upper Body',mode:'rotation',teamKind:'solo',
      together:true,noScore:true,scoreSrc:'manual',titleSet:false});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest,sameRest:true,blocks:[
      {name:'Part A',rounds:1,items:[{name:'',dur:600,scored:false,hold:false,
        exercises:[{name:'Bench Press',amounts:[8],unit:'reps',sets:4}]}]},
      {name:'Part B',rounds:1,items:[{name:'',dur:300,scored:false,hold:false,
        exercises:[{name:'Pull Ups',amounts:[8],unit:'reps',sets:3}]}]} ]});
    c.crews=[{name:'A1'}];
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
  },blockRest);
  await p.reload(); await p.waitForTimeout(1300);
}
const snap=p=>p.evaluate(()=>{
  const blk=document.querySelector('#blockCards .blk.live');
  return {cs:(document.getElementById('clockState')||{}).textContent,
    clk:(document.getElementById('clock')||{}).textContent,
    btn:(document.getElementById('startBtn')||{}).textContent,
    live:blk?(blk.querySelector('.bh b')||{}).textContent:null}; });
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// ---- blockRest 60: rest runs automatically, Part B auto-starts at 11:00 ----
{ const p=await br.newPage({viewport:{width:1440,height:960}});
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror(60):',e.message);});
  await p.goto('file:///home/user/Claude-code/leaderboard.html');
  await board(p,60);
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(250);
  await p.evaluate(()=>window.__seek&&window.__seek(605)); await p.waitForTimeout(350);   // 10:05 — inside the rest
  let s=await snap(p);
  ok(/rest/i.test(s.cs)&&!/press start/i.test(s.cs),'blockRest 60: at 10:05 the REST is counting down, not a press-start hold ['+s.cs+']');
  await p.evaluate(()=>window.__seek&&window.__seek(60)); await p.waitForTimeout(400);     // 11:05 — Part B should be running
  s=await snap(p);
  ok(s.live==='Part B'&&/running/i.test(s.btn),'blockRest 60: Part B auto-starts after the rest (no press-start) ['+s.live+' / '+s.btn+']');
  await p.close(); }
// ---- blockRest 0: engine waits for press-start, clock previews Part B ----
{ const p=await br.newPage({viewport:{width:1440,height:960}});
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror(0):',e.message);});
  await p.goto('file:///home/user/Claude-code/leaderboard.html');
  await board(p,0);
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(250);
  await p.evaluate(()=>window.__seek&&window.__seek(605)); await p.waitForTimeout(400);     // past 10:00
  const s=await snap(p);
  ok(/start block/i.test(s.btn),'blockRest 0: the engine waits for press-start at block end ['+s.btn+']');
  ok(s.clk==='5:00','blockRest 0: the clock previews Part B (5:00), not the longest block ['+s.clk+']');
  ok(s.live!=='Part A','blockRest 0: Part A is not held live with a phantom countdown ['+s.live+']');
  await p.close(); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
