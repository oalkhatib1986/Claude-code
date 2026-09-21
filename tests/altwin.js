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
await p.evaluate(()=>window.__setReady&&window.__setReady(0));  // build 490: drive the block clock, not the get-ready count-in
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
  // A TAG THAT CAN NEVER CHANGE SAYS NOTHING (build 424): this board is
  // UNSCORED, so the free tags are dropped from the picture — the station
  // map stays, and a NAMED row keeps its name
  ok(await p.evaluate(()=>getComputedStyle(document.querySelector('#blockCards .teams .t.unnamed .mtag')).display==='none'),
    '424: an unscored board hides the dead FREE tags');
  ok(await p.evaluate(()=>{ const t=[...document.querySelectorAll('#blockCards .teams .t')]
      .find(x=>!x.classList.contains('unnamed')&&x.querySelector('.mtag'));
    return !!t&&getComputedStyle(t.querySelector('.mtag')).display!=='none'; }),
    '424: a NAMED row keeps its name on the map');
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
// A LINKED FLOOR EXERCISE WEARS ITS EQUIPMENT'S NAME (build 425 — Omar:
// "why doesn't it show Boxes which is in gym equipment?! where did it
// get Burpee Bo… from?!"): link Wall Balls to the gym's Med Balls and the
// floor column renames — display only, gear count = station count so the
// allocator's numbers cannot move
await p.evaluate(()=>{ const K='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(K));
  c.gear=[{name:'Med Balls',n:6}]; c.exGear=Object.assign({},c.exGear,{'wall balls':'Med Balls'});
  localStorage.setItem(K,JSON.stringify(c)); });
await p.reload(); await p.waitForTimeout(1600);
ok(await p.evaluate(()=>{ const c=document.querySelectorAll('#blockCards .blk')[0];
  if(!c) return false;
  const labs=[...c.querySelectorAll('.teams .t .tnm')].map(x=>x.textContent.trim());
  return labs.filter(t=>/^Med Balls$/i.test(t)).length===6&&!labs.some(t=>/wall balls/i.test(t)); }),
  '425: a linked floor exercise wears its EQUIPMENT name (Med Balls 1-6)');
// THE TABLET IS BOLTED TO THE ERG (build 426 — Omar: "it just tells the
// person on the erg where to go after his work on the erg is done"): on a
// rotating part the Ski tablet shows ITS work only, no window ladder, and
// the next box names the station the athlete walks to.
{ const p2=await br.newPage({viewport:{width:1280,height:900}});
  p2.on('pageerror',e=>{fail++;console.log('FAIL pageerror(tk):',e.message);});
  await p2.goto('file:///home/user/Claude-code/leaderboard.html');
  await p2.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p2.reload(); await p2.waitForTimeout(1400);
  await p2.evaluate(()=>window.__loadLib&&window.__loadLib('Engine 15/09'));
  await p2.waitForTimeout(1200);
  await p2.click('#tabTablet'); await p2.waitForTimeout(800);
  await p2.evaluate(()=>window.__tbOpen('Ski:1')); await p2.waitForTimeout(1000);
  const d=await p2.evaluate(()=>{
    const now=document.querySelector('.tk-now'), then=document.querySelector('.tk-then'),
      nxt=document.querySelector('.tk-nxt');
    return {now:now?now.innerText.replace(/\s+/g,' ').trim():'',
      hasThen:!!then, nxt:nxt?nxt.innerText.replace(/\s+/g,' ').trim():''}; });
  // ONE LEFT EDGE (427 — Omar: "the pills, the box, the logo all need to
  // be aligned!"): logo, part pill, tag, head band and the white card all
  // start on the same vertical line
  { const L=await p2.evaluate(()=>['.tk-logo img','.tk-part','.tk-tag','.tk-head','.tk-now']
      .map(s=>{ const x=document.querySelector(s);
        return x?+x.getBoundingClientRect().left.toFixed(1):null; }).filter(v=>v!=null));
    ok(L.length>=4&&Math.max(...L)-Math.min(...L)<=1.5,
      '427: logo · pill · tag · band · card share ONE left edge ('+L.join(', ')+')'); }
  ok(/^max cal ski$/i.test(d.now),'426: the Ski tablet shows ITS work only ('+d.now+')');
  ok(!d.hasThen,'426: the window ladder is gone from the tablet');
  ok(/wall balls/i.test(d.nxt)&&/max reps/i.test(d.nxt),
    '426: the next box names where to go — '+d.nxt);
  // SAY IT ONCE (427 — Omar: "Ski · Now: Ski · Max Cal Ski — repetitive"):
  // running, the headline and the Now: line are echoes of the work card
  // and drop; the WORKING state tag stays
  await p2.evaluate(()=>window.__setReady&&window.__setReady(0));  // build 490: drive the block clock, not the get-ready count-in
  await p2.evaluate(()=>document.getElementById('startBtn').click());
  await p2.waitForTimeout(1600);
  { const r=await p2.evaluate(()=>{
      const t=document.getElementById('tbScreen').innerText.replace(/\s+/g,' ');
      const head=document.querySelector('.tk-inst .tk-head');
      const tag=document.querySelector('.tk-inst .tk-tag');
      return {txt:t, head:head?head.textContent.trim():null,
        tag:tag?tag.textContent.trim():''}; });
    ok(!/now:\s*ski/i.test(r.txt),'427: no "Now: Ski" echo while running');
    ok(!r.head||!/^ski$/i.test(r.head),'427: no bare "Ski" headline over the Max Cal Ski card');
    ok(/working/i.test(r.tag),'427: the WORKING state tag stays'); }
  // A REST WINDOW IS STILL THE MACHINE'S SCREEN (432 — the audit): during
  // the written 0:45 the tag must not say WORKING over a "Rest — recover"
  // head, the window ladder must not creep back, NEXT names this machine's
  // own next window (never the next block), and the clock says what it
  // counts
  await p2.evaluate(()=>window.__seek(180)); await p2.waitForTimeout(1000);
  { const r=await p2.evaluate(()=>{
      const q=s=>{const x=document.querySelector(s);return x?x.innerText.replace(/\s+/g,' ').trim():'';};
      return {tag:q('.tk-inst .tk-tag'),now:q('.tk-now'),
        hasThen:!!document.querySelector('.tk-then'),nxt:q('.tk-nxt'),clk:q('.tk-clk')}; });
    ok(/rest/i.test(r.tag)&&!/working/i.test(r.tag),'432: rest window wears a REST tag, not WORKING ('+r.tag+')');
    ok(/^rest 0:45$/i.test(r.now),'432: the rest slab holds ('+r.now+')');
    ok(!r.hasThen,'432: no window ladder creeps back during the rest');
    ok(/ski/i.test(r.nxt)&&!/part b|rower/i.test(r.nxt),
      '432: NEXT names this machine\'s own next window, not the next block — '+r.nxt);
    ok(/rest ends in/i.test(r.clk),'432: the clock says what it counts ('+r.clk+')'); }
  await p2.evaluate(()=>window.__seek(48)); await p2.waitForTimeout(1000);
  { const r=await p2.evaluate(()=>({
      tag:(document.querySelector('.tk-inst .tk-tag')||{innerText:''}).innerText.trim(),
      now:(document.querySelector('.tk-now')||{innerText:''}).innerText.replace(/\s+/g,' ').trim()}));
    ok(/working/i.test(r.tag)&&/max cal ski/i.test(r.now),
      '432: window 2 back to WORKING · Max Cal Ski'); }
  // FULL SCREEN FOR THE TABLET (429 — Omar: "why can I not see the tablet
  // as full page view?"): the frame scales edge-to-edge, chrome gone, the
  // corner pill exits
  await p2.click('#tbFull'); await p2.waitForTimeout(800);
  { const d2=await p2.evaluate(()=>{
      const r2=document.querySelector('.tb-device').getBoundingClientRect();
      return {wf:r2.width/innerWidth,hf:r2.height/innerHeight,
        tabsGone:getComputedStyle(document.querySelector('.tabs')).display==='none'}; });
    ok(Math.max(d2.wf,d2.hf)>0.98&&d2.wf<=1.01&&d2.hf<=1.01&&d2.tabsGone,
      '429: full screen fills an axis edge-to-edge, chrome gone ('
      +Math.round(d2.wf*100)+'% × '+Math.round(d2.hf*100)+'%)'); }
  await p2.click('#tbFullX'); await p2.waitForTimeout(500);
  ok(await p2.evaluate(()=>!document.body.classList.contains('tbfull')
    &&getComputedStyle(document.querySelector('.tabs')).display!=='none'),
    '429: the corner pill exits and the nav returns');
  // THE TABLET SPEAKS FOR THE MACHINE (431 — Omar: "how are two rowers
  // showing different?!"): adjacent slots' crews sit on OPPOSITE halves,
  // yet both Ski tablets read identically — the machine's work, no
  // crew-centric "Now:" line on either
  { const read=async k=>{ await p2.evaluate(k2=>window.__tbOpen(k2),k);
      await p2.waitForTimeout(900);
      return p2.evaluate(()=>({now:(document.querySelector('.tk-now')||{}).innerText||'',
        txt:document.getElementById('tbScreen').innerText.replace(/\s+/g,' ')})); };
    const a=await read('Ski:1'), b2=await read('Ski:2');
    ok(/max cal ski/i.test(a.now)&&/max cal ski/i.test(b2.now),
      '431: both Ski tablets show the machine\'s work');
    ok(!/now:/i.test(a.txt)&&!/now:/i.test(b2.txt),
      '431: neither carries a crew-centric Now: line'); }
  // NEXT names the WORK, not the kit (431): linked or not, the next box
  // says the exercise
  await p2.evaluate(()=>{ const K='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(K));
    c.gear=[{name:'Med Balls',n:6}]; c.exGear={'wall balls':'Med Balls'};
    localStorage.setItem(K,JSON.stringify(c)); });
  await p2.reload(); await p2.waitForTimeout(1600);
  await p2.click('#tabTablet'); await p2.waitForTimeout(600);
  await p2.evaluate(()=>window.__tbOpen('Ski:1')); await p2.waitForTimeout(900);
  { const nx=await p2.evaluate(()=>(document.querySelector('.tk-nxt')||{}).innerText||'');
    ok(/wall balls/i.test(nx)&&!/med balls/i.test(nx),
      '431: NEXT says the exercise, not the equipment — '+nx.replace(/\s+/g,' ')); }
  // THE CARD IS ALWAYS THE ERG'S OWN WORK (433 — Omar: "each erg should
  // show the erg's exercise and just show next in the box below on the
  // right!"): during the block-change rest the Rower card stays MAX CAL ROW
  // (never the next block's pair), the big destination line is gone, and
  // the walk target lives only in the Go-now box
  await p2.evaluate(()=>window.__tbOpen('Row:1')); await p2.waitForTimeout(600);
  await p2.evaluate(()=>window.__setReady&&window.__setReady(0));  // build 490: drive the block clock, not the get-ready count-in
  await p2.evaluate(()=>document.getElementById('startBtn').click());
  await p2.waitForTimeout(1200);
  { let r={};
    for(let i=0;i<70;i++){
      await p2.evaluate(()=>window.__seek(15)); await p2.waitForTimeout(280);
      r=await p2.evaluate(()=>{
        const q=s=>{const x=document.querySelector(s);return x?x.innerText.replace(/\s+/g,' ').trim():'';};
        return {tag:q('.tk-inst .tk-tag'),head:q('.tk-inst .tk-head'),big:q('.tk-big'),
          now:q('.tk-now'),nxt:q('.tk-nxt')}; });
      if(/move to your next station/i.test(r.head)) break; }
    ok(/move to your next station/i.test(r.head),'433: reached the block-change rest ('+r.head+')');
    ok(/rest/i.test(r.tag),'433: rest tag at the block change');
    ok(/^max cal row$/i.test(r.now),'433: the Rower card keeps ITS work at the block change ('+r.now+')');
    ok(!r.big,'433: no big destination line over the card (it lives in the Go-now box)');
    ok(/go now/i.test(r.nxt)&&/part c/i.test(r.nxt),
      '433: the box says Go now → the next part — '+r.nxt); }
  // THE WALL IS THE TABLETS THEMSELVES (433 — Omar: "i see all the screens
  // at once! like tiles, and i can select any if i want")
  await p2.evaluate(()=>window.__tbWall()); await p2.waitForTimeout(1400);
  { const w=await p2.evaluate(()=>{
      const tiles=[...document.querySelectorAll('#tbWall .twt')];
      const ski=tiles.find(t=>t.dataset.k==='Ski:1');
      return {n:tiles.length,withTk:tiles.filter(t=>t.querySelector('.tk')).length,
        ids:document.querySelectorAll('#tbWall [id]').length,
        h:tiles[0]?tiles[0].getBoundingClientRect().height:0,
        ski:ski?ski.innerText.replace(/\s+/g,' '):'',
        keys:tiles.map(t=>t.dataset.k),
        overX:document.documentElement.scrollWidth>document.documentElement.clientWidth+1}; });
    ok(w.keys.indexOf('Row:1')===w.keys.indexOf('Ski:6')+1
      &&w.keys.indexOf('Bike:1')>w.keys.indexOf('Run:6'),
      '441: tiles group by erg type IN THE WORKOUT’S ORDER (Ski, Row, Run, Bike)');
    ok(w.n>=18&&w.withTk===w.n,'433: one LIVE screen tile per machine ('+w.n+')');
    ok(w.ids===0,'433: tile screens carry no duplicate ids');
    ok(w.h>100,'433: tiles have real height ('+Math.round(w.h)+')');
    ok(/max cal ski/i.test(w.ski),'433: the Ski tile shows the Ski screen');
    ok(!w.overX,'433: the wall never scrolls sideways'); }
  await p2.click('#tbWall .twt'); await p2.waitForTimeout(900);
  { const r=await p2.evaluate(()=>({one:document.body.classList.contains('tabone'),
      scr:!!document.querySelector('#tbScreen .tk'),
      left:document.querySelectorAll('#tbWall .twt').length}));
    ok(r.one&&r.scr,'433: tapping a tile opens that machine full size');
    ok(r.left===0,'433: tiles leave the DOM with the wall — hidden tiles shadow every query'); }
  // 435 (Omar: "this class isn't meant to be claim your machine
  // format!"): the unscored Engine's EMPTY machines ask for nothing —
  // no claim box, no "Nobody yet", the same screen as every other erg,
  // on the live clock
  await p2.evaluate(()=>window.__tbOpen('Bike:6')); await p2.waitForTimeout(700);
  { const r=await p2.evaluate(()=>({claim:!!document.getElementById('tbClaim'),
      txt:document.getElementById('tbScreen').innerText.replace(/\s+/g,' ')}));
    ok(!r.claim&&!/claim it|nobody yet|you start on/i.test(r.txt),
      '435: an unscored board’s empty machine asks for NOTHING');
    ok(/max cal bike/i.test(r.txt),'435: the spare shows ITS work like every other screen');
    // 436 (Omar: "everyone is on rest but some machines are not?!"): at the
    // block-change rest the spare says exactly what the crewed screens say
    ok(/move to your next station/i.test(r.txt)&&/go now/i.test(r.txt),
      '436: the spare follows the room at the block change (Move + Go now)'); }
  // ...and inside a written rest window the spare rests too — fresh
  // session, seek straight into rest 1 (the long walk above ran the
  // earlier session out)
  await p2.reload(); await p2.waitForTimeout(1500);
  await p2.click('#tabTablet'); await p2.waitForTimeout(600);
  await p2.evaluate(()=>window.__tbOpen('Bike:6')); await p2.waitForTimeout(600);
  await p2.evaluate(()=>window.__setReady&&window.__setReady(0));  // build 490: drive the block clock, not the get-ready count-in
  await p2.evaluate(()=>document.getElementById('startBtn').click());
  await p2.waitForTimeout(1100);
  await p2.evaluate(()=>window.__seek(184)); await p2.waitForTimeout(900);
  { const r=await p2.evaluate(()=>({now:(document.querySelector('.tk-now')||{innerText:''}).innerText.replace(/\s+/g,' ').trim(),
      tag:(document.querySelector('.tk-inst .tk-tag')||{innerText:''}).innerText.trim(),
      nxt:(document.querySelector('.tk-nxt')||{innerText:''}).innerText.replace(/\s+/g,' '),
      slab:!!document.querySelector('.tk-now.rest')}));
    ok(/rest 0:45/i.test(r.now)&&/rest/i.test(r.tag)&&r.slab,
      '436: the spare rests when the room rests (dashed Rest 0:45 slab) — '+r.tag+' / '+r.now);
    ok(/next here/i.test(r.nxt)&&/bike/i.test(r.nxt),
      '436: and Next here names its own station — '+r.nxt); }
  await p2.evaluate(()=>window.__seek(48)); await p2.waitForTimeout(400); // into window 2
  await p2.click('#tabTrainer'); await p2.waitForTimeout(600);
  await p2.click('#tcPick .mfield'); await p2.waitForTimeout(250);
  await p2.fill('#tcPick .msearch','24');
  await p2.press('#tcPick .msearch','Enter'); await p2.waitForTimeout(800);
  await p2.click('#tabTablet'); await p2.waitForTimeout(600);
  { const read=async k=>{ await p2.evaluate(k2=>window.__tbOpen(k2),k);
      await p2.waitForTimeout(700);
      return p2.evaluate(()=>{const q=s=>{const x=document.querySelector(s);
        return x?x.innerText.replace(/\s+/g,' ').trim():'';};
        return {head:q('.tk-inst .tk-head'),now:q('.tk-now')};}); };
    const bk=await read('Bike:1'), rn=await read('Run:1');
    ok(/max cal bike/i.test(bk.now)&&!/^run$/i.test(bk.head),
      '434: the Bike card is its own work, no RUN band ('+(bk.head||'—')+' / '+bk.now+')');
    ok(/max cal run/i.test(rn.now)&&!/^bike$/i.test(rn.head),
      '434: the Runner mirrors it ('+(rn.head||'—')+' / '+rn.now+')'); }
  await p2.close(); }
// THE RULE IS FORMAT-INDEPENDENT (437 — Omar, on Send It Saturday: "the
// erg screen shows only the exercise related to that erg... why do the
// rules change from one workout to the other?!"): on a PLAIN group item
// the bolted screen filters to its machine's piece and NEXT follows the
// sequence — run, then what the list says comes after
{ const p3=await br.newPage({viewport:{width:1280,height:900}});
  p3.on('pageerror',e=>{fail++;console.log('FAIL pageerror(sis):',e.message);});
  await p3.goto('file:///home/user/Claude-code/leaderboard.html');
  await p3.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p3.reload(); await p3.waitForTimeout(1400);
  await p3.click('#tabTablet'); await p3.waitForTimeout(700);
  await p3.evaluate(()=>window.__tbOpen('Run:1')); await p3.waitForTimeout(800);
  { const r=await p3.evaluate(()=>({now:(document.querySelector('.tk-now')||{innerText:''}).innerText.replace(/\s+/g,' ').trim(),
      nxt:(document.querySelector('.tk-nxt')||{innerText:''}).innerText.replace(/\s+/g,' ')}));
    ok(/run/i.test(r.now)&&!/squat|step over|d-?ball/i.test(r.now),
      '437: a plain group item filters to THIS erg’s piece — '+r.now);
    ok(/next/i.test(r.nxt)&&/air squats/i.test(r.nxt),
      '437: NEXT follows the sequence after the erg’s piece — '+r.nxt); }
  await p3.evaluate(()=>window.__setReady&&window.__setReady(0));  // build 490: drive the block clock, not the get-ready count-in
  await p3.evaluate(()=>document.getElementById('startBtn').click());
  await p3.waitForTimeout(1400);
  { const r=await p3.evaluate(()=>({now:(document.querySelector('.tk-now')||{innerText:''}).innerText.replace(/\s+/g,' ').trim()}));
    ok(/run/i.test(r.now)&&!/squat/i.test(r.now),'437: still the erg’s piece while running'); }
  // NEXT RESOLVES NEAREST-FIRST (438 — Omar: "that's not what's next! how
  // can next be two different machines?!"): on his SIS shape — piece →
  // rest → piece at ONE station — the last exercise's NEXT is the next
  // PIECE here ("Block 2 · after 3:00 rest"), never the next station; the
  // rest between says "Next here · <own piece>"
  await p3.evaluate(()=>{const K='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(K));
    const t=c.rotation.blocks.flatMap(b=>b.items||[]).find(i=>!i.rest);
    const mk=(nm,exs)=>Object.assign(JSON.parse(JSON.stringify(t)),{name:nm,dur:600,fmt:'',rest:false,alt:false,exercises:exs});
    const ex=(name,max)=>({name,unit:max?'cal':'reps',max:!!max,amounts:[]});
    c.rotation.blocks=[{name:'Run / Bike',rounds:1,items:[
      mk('Block 1',[ex('Run'),ex('Burpees'),ex('Bike',true)]),
      {rest:true,dur:180,name:''},
      mk('Block 2',[ex('Run'),ex('Down Ups'),ex('Bike',true)])]}];
    c.together=false; localStorage.setItem(K,JSON.stringify(c)); });
  await p3.reload(); await p3.waitForTimeout(1500);
  // A STATION-PAIR IS TWO MACHINES, BOTH ON THE MAP (440 — Omar: "why is
  // it not showing the bike and ski?!")
  { const labs=await p3.evaluate(()=>{
      const c0=document.querySelectorAll('#blockCards .blk')[0];
      return [...c0.querySelectorAll('.teams .t')].map(x=>{
        const nm=x.querySelector('.tnm'),no=x.querySelector('.tno'),tn=x.querySelector('.tn');
        return (nm?nm.textContent+' '+(no?no.textContent:''):tn.textContent).trim(); }); });
    const runs=labs.filter(l=>/^run \d/i.test(l)).length,
      bikes=labs.filter(l=>/^bike \d/i.test(l)).length;
    ok(runs>=4&&bikes>=4&&runs===bikes,
      '440: the map shows BOTH machines of the pair ('+runs+' runs, '+bikes+' bikes)'); }
  await p3.click('#tabTablet'); await p3.waitForTimeout(700);
  const rd3=async k=>{ await p3.evaluate(k2=>window.__tbOpen(k2),k); await p3.waitForTimeout(700);
    return p3.evaluate(()=>{const q=s=>{const x=document.querySelector(s);return x?x.innerText.replace(/\s+/g,' ').trim():'';};
      return {now:q('.tk-now'),nxt:q('.tk-nxt')};}); };
  { const b=await rd3('Bike:1');
    ok(/max cal bike/i.test(b.now),'438: the Bike card is its piece alone');
    ok(/rest 3:00/i.test(b.nxt)&&!/block 2|row|ski/i.test(b.nxt),
      '439: the LAST piece’s NEXT is the rest itself, nothing else — '+b.nxt); }
  { const r=await rd3('Run:1');
    ok(/burpees/i.test(r.nxt),'438: mid-sequence NEXT is the next exercise — '+r.nxt); }
  await p3.evaluate(()=>window.__setReady&&window.__setReady(0));  // build 490: drive the block clock, not the get-ready count-in
  await p3.evaluate(()=>document.getElementById('startBtn').click());
  await p3.waitForTimeout(1200);
  await p3.evaluate(()=>window.__seek(605)); await p3.waitForTimeout(900);
  { const b=await rd3('Bike:1');
    ok(/rest 3:00/i.test(b.now)&&/next here/i.test(b.nxt)&&/bike/i.test(b.nxt),
      '438: the rest between pieces says Next here · own piece — '+b.nxt); }
  await p3.evaluate(()=>window.__seek(180)); await p3.waitForTimeout(900);
  { const b=await rd3('Bike:1');
    ok(/max cal bike/i.test(b.now),'438: Block 2’s card follows the segment'); }
  await p3.close(); }
// THE PAGE RIDES WALL TIME (442 — Omar: "why are not all the teams
// showing?!"): a LIVE board repaints every second and each repaint used
// to reset the 7s page timer — the pager froze on 1–3 and half the class
// never printed. Now the page turns while running.
{ const p4=await br.newPage({viewport:{width:1600,height:900}});
  p4.on('pageerror',e=>{fail++;console.log('FAIL pageerror(pager):',e.message);});
  await p4.goto('file:///home/user/Claude-code/leaderboard.html');
  await p4.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p4.reload(); await p4.waitForTimeout(1400);
  await p4.evaluate(()=>{const K='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(K));
    const t=c.rotation.blocks.flatMap(b=>b.items||[]).find(i=>!i.rest);
    const mk=(nm,exs)=>Object.assign(JSON.parse(JSON.stringify(t)),{name:nm,dur:300,fmt:'',rest:false,alt:false,scored:true,metric:'calories',exercises:exs});
    const ex=(name,max)=>({name,unit:max?'cal':'reps',max:!!max,amounts:[]});
    c.rotation.blocks=[
      {name:'Run / Bike',rounds:1,items:[mk('Block 1',[ex('Run',true),ex('Burpees'),ex('Bike',true)]),{rest:true,dur:120,name:''},mk('Block 2',[ex('Run',true),ex('Bike',true)])]},
      {name:'Row / Ski',rounds:1,items:[mk('Block 1',[ex('Row',true),ex('Ski',true)])]}];
    c.together=false; c.noScore=false; c.scoreSrc='manual';
    localStorage.setItem(K,JSON.stringify(c)); });
  await p4.reload(); await p4.waitForTimeout(1500);
  await p4.click('#tabTablet'); await p4.waitForTimeout(500);
  for(let i=1;i<=6;i++){ await p4.evaluate(k=>window.__tbOpen(k),'Bike:'+i);
    await p4.waitForTimeout(320);
    await p4.evaluate(nm=>{const b=document.getElementById('tbClaim');
      if(b){b.value=nm; document.getElementById('tbClaimGo').click();}},'Team'+i);
    await p4.waitForTimeout(320); }
  await p4.click('#tabScreen'); await p4.waitForTimeout(1000);
  // THE BOARD SHOWS WHAT IS COUNTED (442 — Omar: "the leaderboard should
  // know how the workout is scored and adjust automatically!"): a
  // manual-scored board heads its columns with the SCORED sections, not
  // idle machine counters
  { const r=await p4.evaluate(()=>({
      head:document.getElementById('boardHead').innerText.replace(/\s+/g,' '),
      secs:document.querySelectorAll('#board .lane .msec').length}));
    ok(/run \/ bike/i.test(r.head)&&/row \/ ski/i.test(r.head),
      '442: the head names the scored sections — '+r.head);
    ok(!/metres|\/500m|\/km|\/1000m/i.test(r.head),
      '442: no idle machine counters on a manual board');
    ok(r.secs>=2,'442: every lane carries the section cells'); }
  // 445 (Omar: "the columns are still not the same width!"): every figure
  // column — sections AND Score — is one equal track
  { const r=await p4.evaluate(()=>{
      const l=[...document.querySelectorAll('#board .lane')].find(x=>x.offsetHeight>0);
      const cs=[...l.querySelectorAll('.msec')].map(x=>Math.round(x.getBoundingClientRect().width));
      cs.push(Math.round(l.querySelector('.data').getBoundingClientRect().width));
      return cs; });
    ok(r.every(v=>Math.abs(v-r[0])<=2),
      '445: sections and Score share ONE column width ('+r.join(', ')+')'); }
  await p4.evaluate(()=>window.__setReady&&window.__setReady(0));  // build 490: drive the block clock, not the get-ready count-in
  await p4.evaluate(()=>document.getElementById('startBtn').click());
  await p4.waitForTimeout(1400);
  { await p4.evaluate(()=>window.__man.set(0,0,0,57)); await p4.waitForTimeout(900);
    const lane=await p4.evaluate(()=>[...document.querySelectorAll('#board .lane')]
      .find(l=>/team1/i.test(l.innerText)).innerText.replace(/\s+/g,' '));
    ok(/57/.test(lane),'442: an entered section score lands in its column — '+lane); }
  // EVERY TEAM ON ONE PAGE, NEVER PAGED (build 454 — Omar: "whatever the
  // team numbers they should ALL show on one page!"): the pager is retired;
  // every lane is visible at once and the pager label stays empty
  { const r=await p4.evaluate(()=>{
      const lanes=[...document.querySelectorAll('#lanes .lane')];
      return {vis:lanes.filter(l=>l.offsetHeight>0&&getComputedStyle(l).display!=='none').length,
        total:lanes.length,pager:(document.querySelector('#boardPage')||{textContent:''}).textContent}; });
    ok(r.total>0&&r.vis===r.total&&!r.pager,
      '454: every team on one page, no pager ('+r.vis+'/'+r.total+', pager "'+r.pager+'")'); }
  // 443 (Omar's page-2 screenshot: rows hanging out of the card with
  // gaps): rowH() must measure a VISIBLE lane — on page 2+ the first
  // child is display:none and the 92px fallback stepped 40px rows apart
  { const r=await p4.evaluate(()=>{
      const bd=document.getElementById('board');
      const vis=[...document.getElementById('lanes').children]
        .filter(l=>getComputedStyle(l).display!=='none');
      const hs=vis.map(l=>Math.round(l.getBoundingClientRect().height));
      const tops=vis.map(l=>Math.round(l.getBoundingClientRect().top)).sort((a,b)=>a-b);
      const step=tops.length>1?tops[1]-tops[0]:hs[0];
      return {inside:vis.every(l=>l.getBoundingClientRect().bottom
          <=bd.getBoundingClientRect().bottom+2),
        tight:Math.abs(step-hs[0])<=3, step, h:hs[0]}; });
    ok(r.inside,'443: every page’s rows sit INSIDE the card');
    ok(r.tight,'443: rows step at their own height ('+r.step+' vs '+r.h+') — no gaps'); }
  // 448 (Omar: "it should only ask once Max Cal Bike is over!"): the ask
  // fires at the END of the scored piece; seeking BACK into the piece
  // voids the pending ask, and running it out again asks fresh
  await p4.click('#tabTablet'); await p4.waitForTimeout(600);
  await p4.evaluate(()=>window.__tbOpen('Bike:1')); await p4.waitForTimeout(700);
  { const pre=await p4.evaluate(()=>!!document.querySelector('.tk-score,.tks-strip'));
    ok(!pre,'448: no ask while the scored piece runs');
    await p4.evaluate(()=>window.__seek(305)); await p4.waitForTimeout(1100);
    const atRest=await p4.evaluate(()=>!!document.querySelector('.tk-score'));
    ok(atRest,'448: the ask arrives when the piece ENDS (at the rest)');
    await p4.evaluate(()=>window.__seek(-160)); await p4.waitForTimeout(1100);
    const back=await p4.evaluate(()=>!!document.querySelector('.tk-score,.tks-strip'));
    ok(!back,'448: seeking back into the piece voids the pending ask');
    await p4.evaluate(()=>window.__seek(170)); await p4.waitForTimeout(1200);
    const again=await p4.evaluate(()=>!!document.querySelector('.tk-score'));
    ok(again,'448: and it asks fresh when the piece ends again'); }
  await p4.close(); }

// ===== part 5: A COACH'S CUE RIDES THE WORK, AND EVERY NAME PILL IS ONE
// WIDTH (build 449 — Omar: "why do these comments like split as a team
// not show on the erg tablets?" + "the team name pills must be the same
// size so always take the widest one") =====
{ const p5=await br.newPage({viewport:{width:1280,height:900}});
  p5.on('pageerror',e=>{fail++;console.log('FAIL pageerror(p5):',e.message);});
  await p5.goto('file:///home/user/Claude-code/leaderboard.html');
  await p5.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p5.reload(); await p5.waitForTimeout(1500);
  await p5.evaluate(()=>{
    const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    const it=(name,dur,xs,sc)=>({name,dur,rest:false,fmt:'',scored:!!sc,
      metric:sc?'calories':undefined,scorers:sc?4:undefined,
      exercises:xs.map(([n,note])=>({name:n,unit:'cal',max:true,amounts:[],note:note||''}))});
    // Omar's REAL Send It Saturday (build 453): each side is [Block 1, rest,
    // Block 2]; the max-cal erg piece ends EVERY sub-block, and ALL of them
    // score — authored here UNSCORED so migrateLoaded's durable enforcer
    // must mark every one (450-452's one-shot never stuck; this is the fix)
    Object.assign(c,{name:'Send It Saturday',wkName:'Send It Saturday',mode:'rotation',teamKind:'teams',
      teamSize:2,together:false,noScore:false,scoreSrc:'manual',titleSet:false});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:120,sameRest:true,blocks:[
      {name:'Run / Bike',rounds:1,items:[
        it('Block 1',600,[['110/135/160m Run','Split as a team'],
          ['60 Burpees','2 people working in sync'],
          ['Max Cal Bike','Remaining time — remember your number for Block 2']],false),
        {rest:true,dur:180,exercises:[]},
        it('Block 2',300,[['Max Cal Run','']],false) ]},
      {name:'Row / Ski',rounds:1,items:[
        it('Block 1',600,[['Max Cal Row',''],['60 Burpees',''],['Max Cal Ski','']],false),
        {rest:true,dur:180,exercises:[]},
        it('Block 2',300,[['Max Cal Ski','']],false) ]} ]});
    c.crews=[{name:'LEVANT'},{name:'YOMNA'},{name:'LUNA'},{name:'SIMBA'},{name:'AUS'},{name:'DIS'}];
    c.inventory=Object.assign({},c.inventory,{Row:6,Ski:6,Bike:6,Run:6});
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
  });
  await p5.reload(); await p5.waitForTimeout(1600);
  // 453: EVERY max-cal erg item is scored after the durable enforce — read
  // the RENDERED truth (the in-memory cfg drives the card and the sync push;
  // localStorage lags until the next save). Four scored sub-blocks = four
  // "scored" tags on the cards.
  { const r=await p5.evaluate(()=>({
      tags:[...document.querySelectorAll('#blockCards .exg-h i')].filter(i=>/scored/i.test(i.textContent)).length}));
    ok(r.tags===4,'453: every max-cal erg item is scored — four tags on the cards '+JSON.stringify(r)); }
  // 453b: the enforce is DURABLE, not a spent one-shot — strip every scored
  // flag from the STORED cfg (what a stale device would push) and reload;
  // migrateLoaded re-scores all four on the way back in, forever
  { await p5.evaluate(()=>{
      const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
      c.rotation.blocks.forEach(b=>(b.items||[]).forEach(it=>{ delete it.scored; delete it.metric; }));
      localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); });
    await p5.reload(); await p5.waitForTimeout(1500);
    const r=await p5.evaluate(()=>({
      tags:[...document.querySelectorAll('#blockCards .exg-h i')].filter(i=>/scored/i.test(i.textContent)).length}));
    ok(r.tags===4,'453: a stripped/re-pushed copy is re-scored on reload — durable ('+r.tags+'/4 tags)'); }
  // one width for every named pill, on the widest name
  { const r=await p5.evaluate(()=>{
      const tags=[...document.querySelectorAll('#blockCards .teams .t:not(.unnamed):not(.spare) .mtag')];
      const ws=tags.map(t=>t.getBoundingClientRect().width);
      const spill=[...document.querySelectorAll('#blockCards .teams .t')].filter(e=>e.scrollWidth>e.clientWidth+1).length;
      return {n:tags.length,spread:ws.length?Math.max(...ws)-Math.min(...ws):99,spill};
    });
    ok(r.n>=6&&r.spread<1.5,'449: named pills share ONE width, the widest ('+r.n+' pills, spread '+r.spread.toFixed(1)+'px)');
    ok(r.spill===0,'449: no chip spills for it'); }
  // the note rides the tablet card — wall tile, idle screen, and the
  // FILTERED running card carries only ITS OWN exercise's note
  await p5.click('#tabTablet'); await p5.waitForTimeout(800);
  await p5.evaluate(()=>window.__tbWall&&window.__tbWall()); await p5.waitForTimeout(1100);
  { const tile=await p5.evaluate(()=>{
      const t=document.querySelector('#tbWall .twt[data-k="Run:1"]');
      return t?/split as a team/i.test(t.querySelector('.tk-now')?.textContent||''):null; });
    ok(tile===true,'449: the wall tile carries the note'); }
  await p5.evaluate(()=>window.__tbOpen&&window.__tbOpen('Run:1')); await p5.waitForTimeout(900);
  { const r=await p5.evaluate(()=>{
      const nw=document.querySelector('#tbScreen .tk-now');
      return {note:/split as a team/i.test(nw?nw.textContent:''),
        fits:nw?nw.scrollHeight<=nw.clientHeight+1&&nw.scrollWidth<=nw.clientWidth+1:false}; });
    ok(r.note,'449: idle screen prints the note under its line');
    ok(r.fits,'449: and the slab still contains its lines'); }
  await p5.click('#tabTrainer'); await p5.waitForTimeout(400);
  await p5.evaluate(()=>window.__setReady&&window.__setReady(0));  // build 490: drive the block clock, not the get-ready count-in
  await p5.evaluate(()=>document.getElementById('startBtn').click()); await p5.waitForTimeout(1300);
  // 450: with both Block 1s scored, BOTH live slabs run hot (red) together
  await p5.click('#tabBoard'); await p5.waitForTimeout(700);
  { const r=await p5.evaluate(()=>({blks:document.querySelectorAll('#blockCards .blk[data-bi]').length,
      hot:document.querySelectorAll('#blockCards .blk.scoring').length}));
    ok(r.hot===2,'450: both blocks scoring red together ('+r.hot+' of '+r.blks+')'); }
  await p5.click('#tabTablet'); await p5.waitForTimeout(600);
  await p5.evaluate(()=>window.__tbOpen&&window.__tbOpen('Bike:1')); await p5.waitForTimeout(900);
  { const r=await p5.evaluate(()=>{
      const txt=document.querySelector('#tbScreen .tk-now')?.textContent||'';
      return {own:/remember your number/i.test(txt),other:/split as a team|working in sync/i.test(txt)}; });
    ok(r.own&&!r.other,'449: the filtered running card carries its OWN note only '+JSON.stringify(r)); }
  await p5.close(); }

// ===== part 6: A ROTATE STATION CARRIES ITS OWN MOVEMENT LIST (build 456 —
// Omar's Send It Saturday AMRAP: "Pair 2 — AMRAP (Shared) / 30 Air Squats /
// 20 HR Press Ups / 10 Burpees"). x.lines stacks the movements under ONE
// station — still one station, never split into extra rotation stops, never
// truncated on the wall. =====
{ const p6=await br.newPage({viewport:{width:1440,height:960}});
  p6.on('pageerror',e=>{fail++;console.log('FAIL pageerror(p6):',e.message);});
  await p6.goto('file:///home/user/Claude-code/leaderboard.html');
  await p6.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p6.reload(); await p6.waitForTimeout(1400);
  await p6.evaluate(()=>{
    const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    const part=(name,ergName,lines)=>({name,rounds:1,items:[
      {name:'',dur:480,rpt:2,fmt:'rotate',rotBy:'clock',scored:true,metric:'metres',scorers:4,
        exercises:[{who:'Pair 1',name:ergName,unit:'m',max:true,amounts:[]},
          {who:'Pair 2',name:'AMRAP (Shared)',unit:'reps',max:false,amounts:[],lines}]},
      {name:'Final',dur:240,fmt:'',scored:true,metric:'metres',scorers:4,
        exercises:[{who:'All 4',name:ergName,unit:'m',max:true,amounts:[]}]} ]});
    // NOT named "Send It Saturday": that name triggers the build-458
    // rotate->plain heal (see part 7), which would strip the swap wording.
    // The lines-station feature is format-independent, so a plain rotate
    // tester keeps this a pure 456 check.
    Object.assign(c,{name:'AMRAP Rotate Tester',wkName:'AMRAP Rotate Tester',mode:'rotation',teamKind:'teams',
      teamSize:4,together:false,noScore:false,scoreSrc:'manual',titleSet:false});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:180,sameRest:true,blocks:[
      part('Part A — Run','Max Distance Run',['30 Air Squats','20 HR Press Ups','10 Burpees']),
      part('Part B — Row','Max Distance Row',['30 DBall Box Step Overs','20 DBall Reverse Lunge','10 DBall Over Shoulder']) ]});
    c.crews=Array.from({length:8},(_,i)=>({name:'Team '+(i+1)}));
    c.inventory=Object.assign({},c.inventory,{Row:6,Ski:6,Bike:6,Run:6});
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
  });
  await p6.reload(); await p6.waitForTimeout(1500);
  // the card: AMRAP header + its 3 movements as their OWN stacked rows
  { const r=await p6.evaluate(()=>{
      const blk=document.querySelectorAll('#blockCards .blk')[0];
      return {subs:[...blk.querySelectorAll('.exl.exsub')].map(e=>e.textContent.trim()),
        header:/AMRAP \(Shared\)/i.test(blk.innerText),
        swap:/swap every 4:00/i.test(blk.innerText.replace(/\s+/g,' '))}; });
    ok(r.header&&r.subs.length===3&&r.subs[0]==='30 Air Squats'&&r.subs[2]==='10 Burpees',
      '456: the AMRAP station stacks its 3 movements under one header '+JSON.stringify(r.subs));
    ok(r.swap,'456: it is still ONE rotate piece — swap every 4:00'); }
  // it is TWO stations, never five
  { const r=await p6.evaluate(()=>{
      const rot=JSON.parse(localStorage.getItem('af_erg_cfg_v8')).rotation.blocks[0].items.find(i=>i.fmt==='rotate');
      return {stations:(rot.exercises||[]).length}; });
    ok(r.stations===2,'456: the movements did NOT become extra stations ('+r.stations+' stations)'); }
  // the wall stacks them and never clips a movement row
  await p6.goto('file:///home/user/Claude-code/leaderboard.html#workout'); await p6.waitForTimeout(1500);
  { const r=await p6.evaluate(()=>{
      const subs=[...document.querySelectorAll('#blockCards .exl.exsub')];
      return {n:subs.length,clipped:subs.filter(e=>e.scrollWidth>e.clientWidth+1).length}; });
    ok(r.n>=6&&r.clipped===0,'456: the wall stacks every movement, none clipped ('+r.n+' rows, '+r.clipped+' clipped)'); }
  await p6.close(); }
// ===== part 7: SEND IT SATURDAY erg+floor split HEALS ROTATE -> PLAIN
// (build 458 — Omar: "where is run 2 row 2 ski 2 and 4! its 12 teams 48
// athletes! why arent all the ergs showing!"). The app AI builds his
// team-split-across-erg-and-floor board as fmt:"rotate", which spins whole
// teams through the two stations and gaps the map (Run 1,3,5,6). On load
// sisRotToPlain flips a single-erg-plus-floor SIS rotate to a plain item,
// so each team owns its own erg and the map numbers 1-6 contiguous — while
// the AMRAP lines still render and every max-erg item stays scored. =====
{ const p7=await br.newPage({viewport:{width:1440,height:960}});
  p7.on('pageerror',e=>{fail++;console.log('FAIL pageerror(p7):',e.message);});
  await p7.goto('file:///home/user/Claude-code/leaderboard.html');
  await p7.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p7.reload(); await p7.waitForTimeout(1400);
  await p7.evaluate(()=>{
    const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    const erg=(nm)=>({who:'Pair 1',name:nm,unit:'m',max:true,amounts:[]});
    const amrap=(lines)=>({who:'Pair 2',name:'AMRAP (Shared)',unit:'reps',max:false,amounts:[],lines});
    const part=(name,ergName,lines)=>({name,rounds:1,items:[
      {name:'',dur:480,rpt:2,fmt:'rotate',rotBy:'clock',scored:true,metric:'metres',scorers:4,
        exercises:[erg(ergName),amrap(lines)]} ]});
    Object.assign(c,{name:'Send It Saturday',wkName:'Send It Saturday',mode:'rotation',teamKind:'teams',
      teamSize:4,together:false,noScore:false,scoreSrc:'manual',titleSet:false});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:180,sameRest:true,blocks:[
      part('Part A — Run','Max Distance Run',['30 Air Squats','20 HR Press Ups','10 Burpees']),
      part('Part B — Row','Max Distance Row',['30 DBall Box Step Overs','20 DBall Reverse Lunge','10 DBall Over Shoulder']),
      part('Part C — Ski','Max Distance Ski',['30 Goblet Squats','20 DB Snatches','10 SA Devil Press']) ]});
    c.crews=Array.from({length:12},(_,i)=>({name:'Team '+(i+1)}));
    c.inventory=Object.assign({},c.inventory,{Row:6,Ski:6,Bike:6,Run:6});
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
  });
  await p7.reload(); await p7.waitForTimeout(1700);
  // the map: every erg numbered 1-6 contiguous, no gap (was Run 1,3,5,6)
  { const r=await p7.evaluate(()=>{
      return [...document.querySelectorAll('#blockCards .blk')].map(blk=>
        [...blk.querySelectorAll('.teams .t .tn')].map(e=>e.textContent.replace(/\s+/g,' ').trim())); });
    const run=r[0].filter(x=>/^Run/.test(x)).join(',');
    const row=r[1].filter(x=>/^Row/.test(x)).join(',');
    const ski=r[2].filter(x=>/^Ski/.test(x)).join(',');
    ok(run==='Run1,Run2,Run3,Run4,Run5,Run6','458: Part A ergs number 1-6 contiguous ('+run+')');
    ok(row==='Row1,Row2,Row3,Row4,Row5,Row6','458: Part B ergs number 1-6 contiguous ('+row+')');
    ok(ski==='Ski1,Ski2,Ski3,Ski4,Ski5,Ski6','458: Part C ergs number 1-6 contiguous ('+ski+')'); }
  // the AMRAP movements still render as stacked rows after the heal
  { const r=await p7.evaluate(()=>{
      const blk=document.querySelectorAll('#blockCards .blk')[0];
      return {subs:[...blk.querySelectorAll('.exl.exsub')].map(e=>e.textContent.trim()),
        header:/AMRAP \(Shared\)/i.test(blk.innerText)}; });
    ok(r.header&&r.subs.length===3&&r.subs[0]==='30 Air Squats',
      '458: the AMRAP floor lines still stack after the heal '+JSON.stringify(r.subs)); }
  // start the clock: the healed board runs as a plain item, no page error,
  // map stays contiguous while live
  await p7.evaluate(()=>window.__setReady&&window.__setReady(0));  // build 490: drive the block clock, not the get-ready count-in
  await p7.evaluate(()=>document.getElementById('startBtn')&&document.getElementById('startBtn').click());
  await p7.waitForTimeout(500);
  await p7.evaluate(()=>window.__seek&&window.__seek(200)); await p7.waitForTimeout(500);
  { const r=await p7.evaluate(()=>{
      return {run:[...document.querySelectorAll('#blockCards .blk')[0].querySelectorAll('.teams .t .tn')].map(e=>e.textContent.replace(/\s+/g,' ').trim()),
        live:!!document.querySelector('#blockCards .blk.live')}; });
    ok(r.run.filter(x=>/^Run/.test(x)).join(',')==='Run1,Run2,Run3,Run4,Run5,Run6'&&r.live,
      '458: the healed board runs as plain, map still 1-6 while live'); }
  // a two-ERG station-pair rotate (Run+Bike, build 440) is NOT converted
  { const r=await p7.evaluate(()=>{
      const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
      c.rotation.blocks=[{name:'Part A',rounds:1,items:[
        {name:'',dur:480,fmt:'rotate',rotBy:'clock',scored:true,metric:'metres',scorers:4,
          exercises:[{who:'Pair 1',name:'Max Distance Run',unit:'m',max:true,amounts:[]},
            {who:'Pair 2',name:'Max Distance Bike',unit:'m',max:true,amounts:[]}]} ]}];
      localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
      return true; });
    await p7.reload(); await p7.waitForTimeout(1500);
    const kept=await p7.evaluate(()=>{
      // migrateLoaded healed the in-memory cfg; read it back via a render-side
      // probe: a two-erg rotate still SUBDIVIDES (two stations swap), so the
      // Part A card shows BOTH erg types as station chips.
      const tns=[...document.querySelectorAll('#blockCards .blk')[0].querySelectorAll('.teams .t .tn')].map(e=>e.textContent.replace(/\s+/g,' ').trim());
      return {hasRun:tns.some(x=>/^Run/.test(x)),hasBike:tns.some(x=>/^Bike/.test(x))}; });
    ok(kept.hasRun&&kept.hasBike,'458: a two-erg station-pair rotate is left as rotate (both ergs mapped)'); }
  await p7.close(); }
// ===== part 8: THE ROTATE ROUND COUNTER COUNTS SWAPS (build 460 — consistent
// with the "swap every 4:00 × 4" header, 459). dur 480, 2 stations, repeats 2:
// currentSwap = pass×stations + station + 1, of repeats×stations. Windows
// pass1[0-480] pass2[480-960], swap at 240 within each. =====
{ const p8=await br.newPage({viewport:{width:1440,height:960}});
  p8.on('pageerror',e=>{fail++;console.log('FAIL pageerror(p8):',e.message);});
  await p8.goto('file:///home/user/Claude-code/leaderboard.html');
  await p8.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p8.reload(); await p8.waitForTimeout(1200);
  await p8.evaluate(()=>{
    const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    Object.assign(c,{name:'Round Test',wkName:'Round Test',mode:'rotation',teamKind:'solo',together:true,noScore:true,scoreSrc:'manual',titleSet:false});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:0,sameRest:true,blocks:[
      {name:'Part A',rounds:1,items:[{name:'',dur:480,rpt:2,fmt:'rotate',rotBy:'clock',scored:false,
        exercises:[{name:'Ski',unit:'m',amounts:[],max:true},{name:'Row',unit:'m',amounts:[],max:true}]}]} ]});
    c.crews=Array.from({length:6},(_,i)=>({name:'A'+(i+1)}));
    c.inventory=Object.assign({},c.inventory,{Row:6,Ski:6,Bike:6,Run:6});
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
  });
  await p8.reload(); await p8.waitForTimeout(1300);
  await p8.evaluate(()=>window.__setReady&&window.__setReady(0));  // build 490: drive the block clock, not the get-ready count-in
  await p8.evaluate(()=>document.getElementById('startBtn')&&document.getElementById('startBtn').click());
  await p8.waitForTimeout(350);
  const bwhere=async(d)=>{ await p8.evaluate(t=>window.__seek&&window.__seek(t),d); await p8.waitForTimeout(300);
    return p8.evaluate(()=>{const w=document.querySelector('#blockCards .blk.live .bwhere');return w?w.textContent.replace(/\s+/g,' ').trim():'';}); };
  // __seek is RELATIVE — advance in deltas to land at ~100/300/500/800
  ok((await bwhere(100)).includes('Round 1 of 4'),'460: pass 1 station 1 → Round 1 of 4');
  ok((await bwhere(200)).includes('Round 2 of 4'),'460: pass 1 station 2 → Round 2 of 4');
  ok((await bwhere(200)).includes('Round 3 of 4'),'460: pass 2 station 1 → Round 3 of 4 (the unit test)');
  ok((await bwhere(300)).includes('Round 4 of 4'),'460: pass 2 station 2 → Round 4 of 4');
  await p8.close(); }
// ===== part 9: THE ERG-TABLET CONTROL SITS ABOVE THE TILES (build 463 —
// Omar: "why is the control still at the bottom?!"). On the wall the back bar
// and stage are hidden, so #tbWall (tiles) preceded #tbCtl (Start/transport)
// and the strip fell under every tile. It must be at the TOP in both views. =====
{ const p9=await br.newPage({viewport:{width:390,height:840}});
  p9.on('pageerror',e=>{fail++;console.log('FAIL pageerror(p9):',e.message);});
  await p9.goto('file:///home/user/Claude-code/leaderboard.html');
  await p9.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p9.reload(); await p9.waitForTimeout(1200);
  await p9.evaluate(()=>{
    const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    const erg=(nm)=>({who:'Pair 1',name:nm,unit:'m',max:true,amounts:[]});
    Object.assign(c,{name:'Ctl Pos Test',wkName:'Ctl Pos Test',mode:'rotation',teamKind:'teams',
      teamSize:4,together:false,noScore:false,scoreSrc:'manual',titleSet:false});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:0,sameRest:true,blocks:[
      {name:'Part C',rounds:1,items:[{name:'',dur:480,fmt:'',scored:true,metric:'metres',scorers:4,exercises:[erg('Max Metres Ski')]}]} ]});
    c.crews=Array.from({length:4},(_,i)=>({name:'Team '+(i+1)}));
    c.inventory=Object.assign({},c.inventory,{Row:6,Ski:6,Bike:6,Run:6});
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
  });
  await p9.reload(); await p9.waitForTimeout(1000);
  await p9.evaluate(()=>{ const t=[...document.querySelectorAll('.tabs button,button')].find(b=>/erg tablet/i.test(b.textContent||'')); if(t) t.click(); });
  await p9.waitForTimeout(500);
  const topOf=id=>p9.evaluate(i=>{const e=document.getElementById(i);return e&&getComputedStyle(e).display!=='none'?Math.round(e.getBoundingClientRect().top):null;},id);
  { const ctl=await topOf('tbCtl'), wall=await topOf('tbWall');
    ok(ctl!=null&&wall!=null&&ctl<wall,'463: on the wall the control sits ABOVE the tiles ('+ctl+' < '+wall+')'); }
  await p9.evaluate(()=>{ const tile=document.querySelector('#tbWall .twt'); if(tile) tile.click(); });
  await p9.waitForTimeout(500);
  { const ctl=await topOf('tbCtl'), stage=await topOf('tbStage');
    ok(ctl!=null&&stage!=null&&ctl<stage,'463: one machine — control still above the card ('+ctl+' < '+stage+')'); }
  await p9.close(); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
