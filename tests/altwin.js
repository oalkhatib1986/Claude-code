// ALTERNATING WINDOWS (Omar's Engine, build 389): it.alt on a rotate item
// makes the WHOLE item one window — half the group on each station, held
// for the full window, swapping on the NEXT alt window — so a ladder can
// put real rests BETWEEN the swaps. The card lists every window like his
// sheet; the big clock beats window/rest/window; the halves really trade.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const W=(d,a,ua,b2,ub)=>({dur:d,fmt:'rotate',alt:true,scored:false,exercises:[
  {name:a,amounts:[],unit:ua,max:true},{name:b2,amounts:[],unit:ub,max:true}]});
const REST=d=>({rest:true,dur:d,exercises:[]});
const LADDER=(a,ua,b2,ub)=>[W(180,a,ua,b2,ub),REST(45),W(180,a,ua,b2,ub),REST(45),
  W(120,a,ua,b2,ub),REST(30),W(120,a,ua,b2,ub),REST(30),
  W(60,a,ua,b2,ub),REST(15),W(60,a,ua,b2,ub),REST(15)];
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1920,height:1080}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
await p.goto('file:///home/user/Claude-code/leaderboard.html');
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(blocks=>{
  const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  Object.assign(cfg,{name:'Engine',wkName:null,mode:'rotation',teamKind:'solo',
    together:false,noScore:true,scoreSrc:'manual',titleSet:false,
    prog:{date:'2026-09-15',day:'Tuesday',stype:'Engine',block:'',week:''}});
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:120,sameRest:true,blocks});
  // REAL names — a placeholder crew reads "free" on the live map and hides the swap
  cfg.crews=['Omar','Sara','Ali','Maya','Zed','Lina','Tom','Nour','Kai','Rita','Sam','Dana']
    .map(n=>({name:n}));
  localStorage.setItem(k,JSON.stringify(cfg));
},[{name:'Part A',rounds:1,items:LADDER('Ski','cal','Wall Balls','reps')},
  {name:'Part B',rounds:1,items:LADDER('Row','cal','Burpee Box Jumps','reps')},
  {name:'Part C',rounds:1,items:LADDER('Run','cal','Bike','cal')}]);
await p.reload(); await p.waitForTimeout(1800);
// the card reads like the sheet: every window, no "swap every", both stations
{ const A=await p.evaluate(()=>document.querySelectorAll('#blockCards .blk')[0]
    .innerText.replace(/\s+/g,' '));
  ok(!/swap every/i.test(A),'an alt window never says "swap every"');
  ok((A.match(/Max cal Ski/gi)||[]).length===6&&(A.match(/Max Wall Balls/gi)||[]).length===6,
    'all six windows list both stations, like the sheet');
  ok(/REST · 0:45.*REST · 0:45.*REST · 0:30.*REST · 0:30.*REST · 0:15.*REST · 0:15/i.test(A),
    'every rest is written where it happens');
  ok(/15:00 total/i.test(A),'each part totals 15:00'); }
// the halves REALLY trade stations between windows
await p.click('#tabTrainer'); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1300);
await p.click('#tabBoard'); await p.waitForTimeout(700);
// who is on the skis vs the floor RIGHT NOW (Part A card). Each athlete keeps
// their own ski number (the gym owns enough), so the swap shows as the GROUP
// on skis trading with the group on the floor — not one ski changing hands.
const mapOf=()=>p.evaluate(()=>{ const c=document.querySelectorAll('#blockCards .blk')[0];
  const out={ski:[],floor:[]}; [...c.querySelectorAll('.teams .t')].forEach(t=>{
    const tn=((t.querySelector('.tn')||{}).textContent||'').trim();
    const who=((t.querySelector('.mtag')||{}).textContent||'').trim();
    if(!who||who==='free') return;
    if(/^Ski/i.test(tn)) out.ski.push(who);
    else if(/^Floor/i.test(tn)) out.floor.push(who); });
  out.ski.sort(); out.floor.sort(); return out; });
const same=(a,b)=>a.length&&a.length===b.length&&a.every((v,i)=>v===b[i]);
const w1=await mapOf();
{ const clock=await p.evaluate(()=>document.getElementById('clock').textContent);
  ok(w1.ski.length===2&&w1.floor.length===2,
    'window 1: half on skis, half on the floor ('+w1.ski+' / '+w1.floor+')');
  const m=clock.match(/^(\d+):/); ok(m&&+m[1]<3,'window 1: the big clock counts the 3:00 window ('+clock+')'); }
await p.evaluate(()=>window.__seek(184)); await p.waitForTimeout(800);
{ const lab=await p.evaluate(()=>document.getElementById('clockLab').textContent);
  ok(/rest/i.test(lab),'t≈3:05: the 0:45 rest flips the clock to REST'); }
await p.evaluate(()=>window.__seek(50)); await p.waitForTimeout(900);   // into window 2
const w2=await mapOf();
ok(same(w2.ski,w1.floor)&&same(w2.floor,w1.ski),
  'window 2: the halves SWAPPED — floor crew on skis, ski crew on the floor ('+w2.ski+' / '+w2.floor+')');
await p.evaluate(()=>window.__seek(180)); await p.waitForTimeout(900);  // rest 2 (t≈418)
await p.evaluate(()=>window.__seek(40)); await p.waitForTimeout(900);   // window 3 (t≈459)
const w3=await mapOf();
ok(same(w3.ski,w1.ski),'window 3: the original half is BACK on the skis ('+w3.ski+')');
// no errors across a full part boundary
await p.evaluate(()=>window.__seek(700)); await p.waitForTimeout(1000);
ok(await p.evaluate(()=>/^\d+:\d\d$/.test(document.getElementById('clock').textContent)),
  'past the part boundary the clock is still sane');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
