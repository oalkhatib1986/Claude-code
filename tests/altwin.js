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
  // ATHL3TE's real floor: six of each erg (Omar, build 390)
  cfg.inventory=Object.assign({},cfg.inventory,{Row:6,Ski:6,Bike:6,Run:6});
  localStorage.setItem(k,JSON.stringify(cfg));
},[{name:'Part A',rounds:1,items:LADDER('Ski','cal','Wall Balls','reps')},
  {name:'Part B',rounds:1,items:LADDER('Row','cal','Burpee Box Jumps','reps')},
  {name:'Part C',rounds:1,items:LADDER('Run','cal','Bike','cal')}]);
await p.reload(); await p.waitForTimeout(1800);
// the card reads like the sheet: every window, no "swap every", both stations
{ const A=await p.evaluate(()=>document.querySelectorAll('#blockCards .blk')[0]
    .innerText.replace(/\s+/g,' '));
  ok(!/swap every/i.test(A),'an alt window never says "swap every"');
  // THE SHEET, LINE FOR LINE (build 391 — Omar: "3 min Ski, rest, then you
  // move to station 2 which is 3 min Wall Balls" — NEVER both lumped into
  // one window): each window prints ONE station, alternating down the part
  ok((A.match(/Max cal Ski/gi)||[]).length===3&&(A.match(/Max Wall Balls/gi)||[]).length===3,
    'each window is ONE station — three Ski windows, three Wall Balls windows');
  ok(/3:00 Max cal Ski.*REST · 0:45.*3:00 Max Wall Balls.*REST · 0:45.*2:00 Max cal Ski.*REST · 0:30.*2:00 Max Wall Balls.*REST · 0:30.*1:00 Max cal Ski.*REST · 0:15.*1:00 Max Wall Balls.*REST · 0:15/i.test(A),
    'the card reads exactly like the sheet, in order');
  ok(/15:00 total/i.test(A),'each part totals 15:00'); }
// the halves REALLY trade stations between windows
await p.click('#tabTrainer'); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1300);
await p.click('#tabBoard'); await p.waitForTimeout(700);
// THE FULL FLOOR, EVERY SLOT (build 390 — Omar: "maximum capacity is 36
// people"): an alt part shows the machine side to the gym's own count and
// the floor side named by its exercise, occupied rows carrying the name.
// The working half sits on CONTIGUOUS machines (Ski 1+2, never 1,3,5) and
// the SAME machines change hands at the swap.
const mapOf=()=>p.evaluate(()=>{ const c=document.querySelectorAll('#blockCards .blk')[0];
  const out={}; [...c.querySelectorAll('.teams .t')].forEach(t=>{
    const tn=t.querySelector('.tn'), nm=tn&&tn.querySelector('.tnm'), no=tn&&tn.querySelector('.tno');
    const key=nm?((nm.textContent||'').trim()+' '+(no?no.textContent:'').trim())
      :((tn||{}).textContent||'').trim();
    const who=((t.querySelector('.mtag')||{}).textContent||'').trim();
    out[key]=who; });
  return out; });
const w1=await mapOf();
{ const skis=Object.keys(w1).filter(k=>/^Ski \d/i.test(k));
  const wbs=Object.keys(w1).filter(k=>/^Wall Balls \d/i.test(k));
  ok(skis.length===6&&wbs.length===6,'Part A shows ALL 12 slots — Ski 1-6 + Wall Balls 1-6 ('+skis.length+'/'+wbs.length+')');
  ok(!!w1['Ski 1']&&w1['Ski 1']!=='free'&&!!w1['Ski 2']&&w1['Ski 2']!=='free'&&w1['Ski 3']==='free',
    'the working half sits on Ski 1+2 — CONTIGUOUS, no gaps ('+w1['Ski 1']+', '+w1['Ski 2']+')');
  ok(w1['Ski 6']==='free'&&w1['Wall Balls 6']==='free','the spare slots read free to the gym cap');
  ok(!!w1['Wall Balls 1']&&w1['Wall Balls 1']!=='free','floor work is a NAMED station (Wall Balls 1: '+w1['Wall Balls 1']+')'); }
ok(await p.evaluate(()=>[...document.querySelectorAll('#blockCards .blk')].reduce((n,c)=>
    n+[...c.querySelectorAll('.teams .t')].filter(t=>!/^Rest/i.test(((t.querySelector('.tn')||{}).textContent||'').trim())).length,0))===36,
  "the gym's full capacity is on the map — 36 slots across the parts");
ok(await p.evaluate(()=>{ const hs=[...document.querySelectorAll('#blockCards .teams .t')]
    .map(t=>t.clientHeight);
  return hs.length>0&&Math.max(...hs)<32; }),
  'every slot row is ONE line — the tag never drops under the label');
// the ellipsis eats only the station NAME: the number and a "free" tag
// always print whole (build 392 — "FR…" and "WALL BALL…" lost the row)
ok(await p.evaluate(()=>[...document.querySelectorAll('#blockCards .teams .t.unnamed .mtag,#blockCards .teams .t.spare .mtag')]
    .every(m=>m.scrollWidth<=m.clientWidth+1)),
  'a "free" tag never truncates');
ok(await p.evaluate(()=>{ const ns=[...document.querySelectorAll('#blockCards .teams .t .tno')];
  return ns.length>0&&ns.every(n=>n.offsetWidth>0&&n.getBoundingClientRect().right
    <=n.closest('.t').getBoundingClientRect().right+1); }),
  'the station NUMBER always survives the ellipsis');
// SIX EQUAL STATIONS, ONE WEIGHT (build 395 — Omar: "it's fading as you
// go down"): no alt row fades, dashes, or wears the dimmed spare style
ok(await p.evaluate(()=>[...document.querySelectorAll('#blockCards .teams .t')]
    .every(t=>!t.classList.contains('spare')&&getComputedStyle(t).opacity==='1'
      &&getComputedStyle(t.querySelector('.mtag')).borderStyle!=='dashed')),
  'every slot row has the SAME weight — no fade down the column');
{ const clock=await p.evaluate(()=>document.getElementById('clock').textContent);
  const m=clock.match(/^(\d+):/); ok(m&&+m[1]<3,'window 1: the big clock counts the 3:00 window ('+clock+')'); }
// BOTH ACTIVE STATIONS LIGHT UP, EACH IN ITS OWN PLACE (build 394 —
// Omar: "Max Cal Ski and Max Wall Balls are SEPARATE stations! both need
// to be highlighted!"): TWO slabs, one per station, exactly where the
// sheet wrote them — never one merged box
{ const slabs=await p.evaluate(()=>[...document.querySelectorAll('#blockCards .blk')][0]
    ?[...document.querySelectorAll('#blockCards .blk')[0].querySelectorAll('.exg.pnow')]
      .map(e=>e.innerText.replace(/\s+/g,' ')):[]);
  ok(slabs.length===2,'window 1: TWO separate NOW slabs — one per active station ('+slabs.length+')');
  ok(/Max cal Ski/i.test(slabs[0]||'')&&!/Wall Balls/i.test(slabs[0]||''),
    'the first slab is the Ski window alone ('+String(slabs[0]).slice(0,40)+')');
  ok(/Max Wall Balls/i.test(slabs[1]||'')&&!/Ski/i.test(slabs[1]||''),
    'the second slab is the Wall Balls window alone ('+String(slabs[1]).slice(0,40)+')');
  ok(/3:00/.test(slabs[0]||'')&&/3:00/.test(slabs[1]||''),
    'the lit pair is the CURRENT pair — both 3:00 windows'); }
{ const A=await p.evaluate(()=>document.querySelectorAll('#blockCards .blk')[0]
    .innerText.replace(/\s+/g,' '));
  ok((A.match(/Max Wall Balls/gi)||[]).length===3&&(A.match(/Max cal Ski/gi)||[]).length===3,
    'live, every window still reads like the sheet — one station each'); }
await p.evaluate(()=>window.__seek(184)); await p.waitForTimeout(800);
{ const lab=await p.evaluate(()=>document.getElementById('clockLab').textContent);
  ok(/rest/i.test(lab),'t≈3:05: the 0:45 rest flips the clock to REST'); }
await p.evaluate(()=>window.__seek(50)); await p.waitForTimeout(900);   // into window 2
const w2=await mapOf();
ok(!!w2['Ski 1']&&w2['Ski 1']!=='free'&&w2['Ski 1']===w1['Wall Balls 1']&&w2['Ski 2']===w1['Wall Balls 2'],
  'window 2: the SAME skis changed hands — floor half on Ski 1+2 ('+w2['Ski 1']+', '+w2['Ski 2']+')');
ok(!!w2['Wall Balls 1']&&w2['Wall Balls 1']===w1['Ski 1'],'and the ski half is at the wall balls now');
await p.evaluate(()=>window.__seek(180)); await p.waitForTimeout(900);  // rest 2 (t≈418)
await p.evaluate(()=>window.__seek(40)); await p.waitForTimeout(900);   // window 3 (t≈459)
const w3=await mapOf();
ok(!!w3['Ski 1']&&w3['Ski 1']!=='free'&&w3['Ski 1']===w1['Ski 1']&&w3['Ski 2']===w1['Ski 2'],
  'window 3: the original half is BACK on Ski 1+2 ('+w3['Ski 1']+', '+w3['Ski 2']+')');
{ const slabs=await p.evaluate(()=>[...document.querySelectorAll('#blockCards .blk')[0]
      .querySelectorAll('.exg.pnow')].map(e=>e.innerText.replace(/\s+/g,' ')));
  ok(slabs.length===2&&slabs.every(t=>/2:00/.test(t)),
    'window 3: the highlight moved to the 2:00 pair ('+slabs.map(t=>t.slice(0,24)).join(' | ')+')'); }
// no errors across a full part boundary
await p.evaluate(()=>window.__seek(700)); await p.waitForTimeout(1000);
ok(await p.evaluate(()=>/^\d+:\d\d$/.test(document.getElementById('clock').textContent)),
  'past the part boundary the clock is still sane');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
