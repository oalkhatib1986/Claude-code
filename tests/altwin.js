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
      &&w.keys.indexOf('Run:1')>w.keys.indexOf('Bike:6'),
      '434: tiles group by erg type, never interleaved by number');
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
  await p3.click('#tabTablet'); await p3.waitForTimeout(700);
  const rd3=async k=>{ await p3.evaluate(k2=>window.__tbOpen(k2),k); await p3.waitForTimeout(700);
    return p3.evaluate(()=>{const q=s=>{const x=document.querySelector(s);return x?x.innerText.replace(/\s+/g,' ').trim():'';};
      return {now:q('.tk-now'),nxt:q('.tk-nxt')};}); };
  { const b=await rd3('Bike:1');
    ok(/max cal bike/i.test(b.now),'438: the Bike card is its piece alone');
    ok(/block 2/i.test(b.nxt)&&/after 3:00 rest/i.test(b.nxt)&&!/row|ski/i.test(b.nxt),
      '438: the LAST piece’s NEXT is the next piece HERE — '+b.nxt); }
  { const r=await rd3('Run:1');
    ok(/burpees/i.test(r.nxt),'438: mid-sequence NEXT is the next exercise — '+r.nxt); }
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
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
