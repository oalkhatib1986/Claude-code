// A SUPERSET'S CLOCK BEATS EVERY SET (Omar, build 377): a group item whose
// exercises share one sets count is an "EVERY dur/sets" piece — the heading
// already says 3 ROUNDS × 3 MINUTES, so the big clock, the card clock and
// the tablet count THE SET, never the whole 9:00 window; the card and the
// tablet say which set the class is in. A trainer-started transition
// (it.hold) still stops the clock between the two supersets.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1366,height:1000}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
await p.goto('file:///home/user/Claude-code/leaderboard.html');
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(()=>{
  const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  Object.assign(cfg,{name:'Push Day',wkName:null,mode:'rotation',teamKind:'solo',
    together:true,noScore:true,scoreSrc:'manual'});
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:0,blocks:[
    {name:'Part B',rounds:1,items:[
      {dur:540,group:true,hold:true,scored:false,exercises:[
        {name:'Pendlay Row',amounts:[6],unit:'reps',max:false,sets:3},
        {name:'Incline DB Bench Press',amounts:[6],unit:'reps',max:false,sets:3}]},
      {dur:540,group:true,scored:false,exercises:[
        {name:'Pull Ups',amounts:['8-10'],unit:'reps',max:false,sets:3},
        {name:'Plate Front Raises',amounts:[10],unit:'reps',max:false,sets:3}]}]},
    {name:'Part C',rounds:1,items:[
      {dur:180,group:true,scored:false,exercises:[
        {name:'Row',amounts:[],unit:'cal',max:true},
        {name:'Push Ups',amounts:[10],unit:'reps',max:false}]}]}]});
  cfg.rotation.blocks[1].items[0].exercises.forEach(x=>x.sets=3);
  cfg.crews=[{name:'Alpha'},{name:'Bravo'}];
  localStorage.setItem(k,JSON.stringify(cfg));
});
await p.reload(); await p.waitForTimeout(1600);
const MS=t=>{ const m=String(t).match(/(\d+):(\d\d)/); return m?(+m[1]*60)+ +m[2]:-1; };
// idle card still reads the scheme
{ const t=await p.evaluate(()=>document.querySelector('#blockCards .blk').innerText.replace(/\s+/g,' '));
  ok(/3 ROUNDS × 3 MINUTES/i.test(t),'idle: the heading promises 3 ROUNDS × 3 MINUTES'); }
await p.click('#tabTrainer'); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1200);
await p.click('#tabBoard'); await p.waitForTimeout(700);
// set 1: both clocks count 3:00, not 9:00
{ const r=await p.evaluate(()=>({big:document.getElementById('clock').textContent,
    bclk:(document.querySelector('#blockCards .blk.live .bclk b')||{}).textContent||'',
    where:(document.querySelector('#blockCards .blk.live .bwhere')||{}).textContent||''}));
  ok(MS(r.big)>0&&MS(r.big)<=180,'set 1: the BIG clock counts the set ('+r.big+' ≤ 3:00)');
  ok(MS(r.bclk)>0&&MS(r.bclk)<=180,'set 1: the card clock counts the set ('+r.bclk+')');
  ok(/Set 1 of 3/i.test(r.where),'set 1: the card says Set 1 of 3 ('+r.where.trim()+')'); }
await p.evaluate(()=>window.__seek(190)); await p.waitForTimeout(800);
{ const r=await p.evaluate(()=>({big:document.getElementById('clock').textContent,
    where:(document.querySelector('#blockCards .blk.live .bwhere')||{}).textContent||''}));
  ok(/Set 2 of 3/i.test(r.where),'t≈3:11: the card says Set 2 of 3');
  ok(MS(r.big)<=180,'set 2: the big clock still counts a 3:00 window ('+r.big+')'); }
// the HOLD between the supersets: the clock stops until the trainer starts
await p.evaluate(()=>window.__seek(355)); await p.waitForTimeout(1000);   // past 9:00
{ const r=await p.evaluate(()=>({state:document.getElementById('clockState').textContent,
    btn:document.getElementById('startBtn').textContent,dis:document.getElementById('startBtn').disabled}));
  ok(/press start/i.test(r.state)&&!r.dis,
    'after the 3rd set the clock HOLDS for the trainer ('+r.state.trim()+' / '+r.btn.trim()+')'); }
await p.click('#tabTrainer'); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1000);
await p.click('#tabBoard'); await p.waitForTimeout(600);
{ const r=await p.evaluate(()=>({where:(document.querySelector('#blockCards .blk.live .bwhere')||{}).textContent||'',
    now:(document.querySelector('#blockCards .exg.pnow')||{}).innerText||''}));
  ok(/Part 2 of 2/i.test(r.where)&&/Set 1 of 3/i.test(r.where),
    'the trainer starts superset 2 — Part 2 of 2 · Set 1 of 3 ('+r.where.trim()+')');
  ok(/Pull Ups/i.test(r.now),'the NOW slab moved to the second superset'); }
// the tablet says the set too (an erg block, so the tablet exists)
await p.evaluate(()=>window.__seek(560)); await p.waitForTimeout(900);   // into Part C? no — Part C starts after B
await p.click('#tabTablet'); await p.waitForTimeout(700);
await p.evaluate(()=>window.__tbOpen('Row:1')); await p.waitForTimeout(700);
{ const r=await p.evaluate(()=>({lab:(document.querySelector('.tk-clk i')||{}).textContent||'',
    val:(document.querySelector('.tk-clk b')||{}).textContent||''}));
  // wherever the clock landed, a shared-sets window must label its set
  ok(!/Time left in this block/i.test(r.lab)||MS(r.val)<=185,
    'tablet: a sets window is never a bare 9:00 block clock ('+r.lab.trim()+' '+r.val+')'); }
// a mixed-sets group (no shared count) still runs one window — no false beat
{ const r=await p.evaluate(()=>{
    const cfg=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    cfg.rotation.blocks[0].items[0].exercises[1].sets=4;   // 3 vs 4 — no shared cadence
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(cfg)); return 1; });
  await p.reload(); await p.waitForTimeout(1500);
  await p.click('#tabTrainer'); await p.waitForTimeout(300);
  await p.evaluate(()=>document.getElementById('startBtn').click());
  await p.waitForTimeout(1200);
  const t=await p.evaluate(()=>document.getElementById('clock').textContent);
  ok(MS(t)>420,'mixed sets counts (3 vs 4): the window stays whole ('+t+') — no invented beat'); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
