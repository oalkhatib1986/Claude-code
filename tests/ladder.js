// A LADDER READS ONCE (Omar, build 386): same exercises over shrinking
// windows collapse to the coach's slide — heading, the work times on one
// line, the rests on the next, the exercises once. Live, the running window
// is underlined. Uniform intervals read "6 × 3 minutes / 0:45 between".
// Two different supersets never collapse.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1600,height:1000}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
await p.goto('file:///home/user/Claude-code/leaderboard.html');
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1500);
const rung=(d,r)=>[{dur:d,fmt:'rotate',scored:false,exercises:[
    {name:'Max cal SkiErg',amounts:[],unit:'cal',max:true},
    {name:'Max Wall Balls',amounts:[],unit:'reps',max:true}]},
  {rest:true,dur:r,exercises:[]}];
await p.evaluate(()=>{});
await p.evaluate(rungs=>{
  const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  Object.assign(cfg,{name:'Engine',wkName:null,mode:'rotation',teamKind:'solo',
    together:false,noScore:true,scoreSrc:'manual'});
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:120,sameRest:true,blocks:[
    {name:'Part A',rounds:1,items:rungs},
    {name:'Part B',rounds:1,items:[
      {dur:540,exercises:[{name:'Pendlay Row',amounts:[6],unit:'reps',sets:3}]},
      {rest:true,dur:60,exercises:[]},
      {dur:540,exercises:[{name:'Pull Ups',amounts:[8],unit:'reps',sets:3}]},
      {rest:true,dur:60,exercises:[]},
      {dur:540,exercises:[{name:'Dips',amounts:[10],unit:'reps',sets:3}]},
      {rest:true,dur:60,exercises:[]}]}]});
  cfg.crews=[{name:'Alpha'},{name:'Bravo'}];
  localStorage.setItem(k,JSON.stringify(cfg));
},[...[180,45],...[180,45],...[120,30],...[120,30],...[60,15],...[60,15]]
  .reduce((a,v,i)=>{ if(i%2===0) a.push({dur:v,fmt:'rotate',scored:false,exercises:[
      {name:'Max cal SkiErg',amounts:[],unit:'cal',max:true},
      {name:'Max Wall Balls',amounts:[],unit:'reps',max:true}]});
    else a.push({rest:true,dur:v,exercises:[]}); return a; },[]));
await p.reload(); await p.waitForTimeout(1600);
const A=await p.evaluate(()=>{ const c=document.querySelectorAll('#blockCards .blk')[0];
  return {txt:c.innerText.replace(/\s+/g,' '),
    groups:c.querySelectorAll('.exg').length,
    skis:(c.innerText.match(/Max cal SkiErg/gi)||[]).length,
    toks:c.querySelectorAll('.ladt').length}; });
ok(A.groups===1,'the ladder is ONE group, not twelve ('+A.groups+')');
ok(/LADDER/i.test(A.txt)&&/stations swap/i.test(A.txt),'heading reads LADDER · stations swap');
ok(/Work:\s*3:00 · 3:00 · 2:00 · 2:00 · 1:00 · 1:00/i.test(A.txt),'the work times sit on ONE line');
ok(/Rest:\s*0:45 · 0:45 · 0:30 · 0:30 · 0:15 · 0:15/i.test(A.txt),'the rests sit on the next');
ok(A.skis===1,'the exercises print ONCE ('+A.skis+'×)');
ok(/15:00 total/i.test(A.txt),'the total survives the collapse');
ok(await p.evaluate(()=>[...document.querySelectorAll('#blockCards .blkrest')]
    .some(d=>d.offsetParent&&/Rest\s*2:00/i.test(d.innerText.replace(/\s+/g,' ')))),
  'the 2:00 between-part rest stands in the divider, as always');
const B=await p.evaluate(()=>{ const c=document.querySelectorAll('#blockCards .blk')[1];
  return {ladder:/LADDER/i.test(c.innerText),groups:c.querySelectorAll('.exg').length}; });
ok(!B.ladder&&B.groups>1,'different pieces never collapse (Part B stays a list)');
// live: the running window is underlined and the group wears NOW
await p.click('#tabTrainer'); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1200);
await p.click('#tabBoard'); await p.waitForTimeout(700);
{ const r=await p.evaluate(()=>{ const c=document.querySelectorAll('#blockCards .blk')[0];
    const on=c.querySelector('.ladt.ladon');
    return {pnow:!!c.querySelector('.exg.pnow'),on:on?on.textContent:null}; });
  ok(r.pnow&&r.on==='3:00','live: NOW slab + the 1st window underlined ('+r.on+')'); }
await p.evaluate(()=>window.__seek(500)); await p.waitForTimeout(800);
{ const r=await p.evaluate(()=>{ const c=document.querySelectorAll('#blockCards .blk')[0];
    const rows=[...c.querySelectorAll('.exl.exlw')].map(e=>({t:e.textContent,
      on:(e.querySelector('.ladt.ladon')||{}).textContent||''}));
    return rows; });
  const w=r.find(x=>/^Work:/.test(x.t));
  ok(w&&w.on==='2:00','t≈8:30: the 3rd window (2:00) is the one underlined'); }
// uniform intervals: "N × M minutes" + "rest between"
await p.evaluate(()=>{ const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  cfg.rotation.blocks=[{name:'Part A',rounds:1,items:Array.from({length:5},(_,i)=>i)
    .flatMap(()=>[{dur:180,scored:false,exercises:[{name:'Row',amounts:[],unit:'cal',max:true}]},
      {rest:true,dur:45,exercises:[]}])}];
  localStorage.setItem(k,JSON.stringify(cfg)); });
await p.reload(); await p.waitForTimeout(1500);
{ const t=await p.evaluate(()=>document.querySelector('#blockCards .blk').innerText.replace(/\s+/g,' '));
  ok(/5 × 3 minutes/i.test(t)&&/Rest:\s*0:45 between/i.test(t)&&!/LADDER/i.test(t),
    'uniform intervals read 5 × 3 MINUTES · Rest 0:45 between'); }
// nothing clips at 1600 or phone width
{ const sx=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  ok(sx<=0,'desktop: no sideways scroll'); }
await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(700);
{ const sx=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  ok(sx<=0,'phone 390: no sideways scroll'); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
