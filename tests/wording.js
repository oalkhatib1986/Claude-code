// THE WALL READS LIKE THE COACH'S OWN SLIDE (Omar's USB reference): the
// heading is the timing scheme, the amount leads the exercise, EMOM minutes
// are numbered, and nothing is said twice.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1920,height:1080}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
await p.goto('file:///home/user/Claude-code/leaderboard.html');
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_mw_v1','1'),
  localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1200);   // SIS one-shot runs and SAVES a full cfg
await p.evaluate(()=>{
  const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  Object.assign(cfg,{name:'Upper Focus Test',wkName:null,mode:'rotation',teamKind:'solo',together:true,noScore:true});
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:0,blocks:[
    {name:'Part A',machine:'Row',rounds:4,items:[
      {dur:150,scored:false,exercises:[{name:'Paused Barbell Bench Press',amounts:[8],unit:'reps',max:false,rpe:'7'}]}]},
    {name:'Part B',machine:'Row',items:[
      {name:'Pendlay Row + Incline DB Bench',dur:540,group:true,scored:false,exercises:[
        {name:'Pendlay Row',amounts:[10],unit:'reps',max:false,sets:3},
        {name:'Incline DB Bench Press',amounts:[10],unit:'reps',max:false,sets:3}]},
      {name:'Arms Finisher',dur:540,group:true,scored:false,exercises:[
        {name:'Pull Ups',amounts:['2-4'],unit:'reps',max:false,sets:3}]},
      {dur:180,scored:false,exercises:[{name:'Row',amounts:[500],unit:'m',max:false}]}]},
    {name:'Part C',machine:'Row',rounds:3,items:[
      {dur:60,group:true,scored:false,exercises:[
        {name:'DB Push Press',amounts:[10],unit:'reps',max:false},
        {name:'Max DB Front Rack Hold',amounts:[],unit:'sec',max:true}]},
      {dur:60,scored:false,exercises:[{name:'Hand Release Push Ups',amounts:['10-15'],unit:'reps',max:false}]},
      {dur:60,scored:false,exercises:[{name:'Ski',amounts:[12,8],unit:'cal',max:false}]}]}]});
  localStorage.setItem(k,JSON.stringify(cfg));
});
await p.reload(); await p.waitForTimeout(1500);
const cards=await p.evaluate(()=>[...document.querySelectorAll('#blockCards .blk')]
  .map(c=>c.innerText.replace(/\s+/g,' ').trim()));
console.log(cards.map((c,i)=>' card'+i+': '+c.slice(0,150)).join('\n'));
const A=cards[0]||'', B=cards[1]||'', C=cards[2]||'';
// Part A — interval scheme heading, shorthand line, no duplicate footer
ok(/Every 2:30 for 10 minutes/i.test(A),'A: heading is the scheme (EVERY 2:30 FOR 10 MINUTES)');
ok(/8 Paused Barbell Bench Press\s*@ RPE 7/i.test(A),'A: amount leads (8 Paused Barbell Bench Press @ RPE 7)');
ok(!/4 rounds/i.test(A),'A: no duplicate rounds footer');
// Part B — redundant name gone, sets ride the heading, lines are bare shorthand
ok(!/Pendlay Row \+ Incline/i.test(B),'B: glued-names heading is GONE');
ok(/3 rounds × 3 minutes/i.test(B),'B: heading says 3 ROUNDS × 3 MINUTES');
ok(/10 Pendlay Row(?! ·)/i.test(B)&&!/10 reps/i.test(B),'B: line reads "10 Pendlay Row", no "reps"');
ok(!/3 × 10/.test(B),'B: sets are not repeated on the lines');
ok(/Arms Finisher/i.test(B),'B: a meaningful name is kept');
ok(/2-4 Pull Ups/i.test(B),'B: ranges read coach-style (2-4 Pull Ups)');
ok(/3 minutes/i.test(B),'B: a bare duration says minutes, not 3:00');
ok(/500m Row/i.test(B),'B: metre work reads 500m Row');
// Part C — EMOM block heading + numbered single-line minutes
ok(/EMOM × 9 minutes/i.test(C),'C: heading is EMOM × 9 MINUTES');
ok(/1st:\s*10 DB Push Press \+ Max DB Front Rack Hold/i.test(C),'C: 1st minute is one numbered line with +');
ok(!/Max Max/i.test(C),'C: a name that opens with Max never doubles it');
ok(await p.evaluate(()=>!!document.querySelector('#blockCards .exlw .emord')),'C: ordinals sit in their own column');
ok(/2nd:\s*10-15 Hand Release Push Ups/i.test(C),'C: 2nd minute numbered');
ok(/3rd:\s*12\/8 cal Ski/i.test(C),'C: 3rd minute reads 12/8 cal Ski');
ok(!/3 rounds × 3:00/i.test(C),'C: no duplicate rounds footer');
// live: the NOW slab still lands on the running minute
await p.click('#tabTrainer'); await p.waitForTimeout(500);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1500);
await p.click('#tabBoard'); await p.waitForTimeout(700);
ok(await p.evaluate(()=>!!document.querySelector('#blockCards .exg.pnow')),'live: the running part still gets the NOW slab');
// the ATHL3TE timer: digits only — solid slab while working, outline while
// resting; the drain bar is gone (build 372)
ok(await p.evaluate(()=>{ const c=document.querySelector('.clock');
  const bar=c.querySelector('.cbar');
  return c&&/work|score/i.test(document.getElementById('clockLab').textContent)
    &&!c.classList.contains('rest')&&(!bar||!bar.offsetParent||getComputedStyle(bar).display==='none'); }),
  'live: the timer is digits only — no visible drain bar');
// nothing clips or scrolls — wall and phone
const fit=async(w,h,hash)=>{ await p.setViewportSize({width:w,height:h});
  if(hash){ await p.goto('file:///home/user/Claude-code/leaderboard.html'+hash); await p.waitForTimeout(1500); }
  else await p.waitForTimeout(700);
  return p.evaluate(()=>({sx:document.documentElement.scrollWidth-innerWidth,
    bad:[...document.querySelectorAll('#blockCards .exl,#blockCards .exg-h')]
      .filter(e=>e.scrollWidth>e.clientWidth+1).length})); };
const wall=await fit(1920,1080,'#workout');
ok(wall.sx<=0&&wall.bad===0,'wall 1920: nothing scrolls or clips ('+wall.sx+'/'+wall.bad+')');
const ph=await fit(390,844,null);
ok(ph.sx<=0&&ph.bad===0,'phone 390: nothing scrolls or clips ('+ph.sx+'/'+ph.bad+')');
// the Part B repair one-shot: alternate-rounds shape becomes sequential sets
await p.evaluate(()=>{
  localStorage.removeItem('af_fixmt2_v1');
  const ps=JSON.parse(localStorage.getItem('af_presets_v1'))||[];
  const bad={name:'Michael Test 2',ts:1,cfg:JSON.parse(localStorage.getItem('af_erg_cfg_v8'))};
  bad.cfg=JSON.parse(JSON.stringify(bad.cfg));
  bad.cfg.rotation.blocks=[{name:'Part A',items:[{dur:60,exercises:[{name:'Row',amounts:[500],unit:'m'}]}]},
    {name:'Part B',rounds:3,items:[
      {dur:180,group:true,exercises:[{name:'Pendlay Row',amounts:[10],unit:'reps'},{name:'Incline DB Bench Press',amounts:[10],unit:'reps'}]},
      {dur:180,group:true,exercises:[{name:'Pull Ups',amounts:['2-4'],unit:'reps'}]}]}];
  ps.push(bad); localStorage.setItem('af_presets_v1',JSON.stringify(ps));
});
await p.reload(); await p.waitForTimeout(1600);
const mended=await p.evaluate(()=>{
  const p2=JSON.parse(localStorage.getItem('af_presets_v1')).find(x=>x.name==='Michael Test 2');
  const b=p2.cfg.rotation.blocks.find(b2=>/^part b$/i.test(b2.name));
  return {rounds:b.rounds,durs:b.items.map(it=>it.dur),sets:b.items.map(it=>it.exercises.map(x=>x.sets))};
});
ok(mended.rounds===1&&mended.durs.every(d=>d===540)
  &&mended.sets.every(a=>a.every(v=>v===3)),
  'a bad-shaped Michael Test 2 Part B is repaired at boot ('+JSON.stringify(mended)+')');
// Tuesday Engine (seed one-shot): an EMOM whose 4th minute is a REST
await p.evaluate(()=>{
  const tue=JSON.parse(localStorage.getItem('af_presets_v1')).find(x=>x.name==='Tuesday Engine');
  if(tue) localStorage.setItem('af_erg_cfg_v8',JSON.stringify(tue.cfg));
});
await p.setViewportSize({width:1920,height:1080});
await p.goto('file:///home/user/Claude-code/leaderboard.html#workout');
await p.reload(); await p.waitForTimeout(1600);   // hash-only goto does not re-boot the app
const tueCards=await p.evaluate(()=>[...document.querySelectorAll('#blockCards .blk')]
  .map(c=>c.innerText.replace(/\s+/g,' ').trim()));
const TA=tueCards[0]||'', TB=tueCards[1]||'';
ok(/EMOM × 20 minutes/i.test(TA),'Tue A: heading is EMOM × 20 MINUTES');
ok(/1st:\s*50 sec Ski/i.test(TA),'Tue A: 1st minute reads 50 sec Ski');
ok(/4th:\s*Rest/i.test(TA),'Tue A: the rest minute is numbered (4th: Rest)');
// THE REST STANDS BETWEEN THE PARTS (Omar): the overview's divider, shown on
// the wall too — one divider for two blocks, never a line inside a card
ok(await p.evaluate(()=>{ const ds=[...document.querySelectorAll('#blockCards .blkrest')]
    .filter(d=>d.offsetParent);
  return ds.length===1&&/Rest\s*2:00/i.test(ds[0].innerText.replace(/\s+/g,' ')); }),
  'Tue: ONE Rest 2:00 divider stands between the parts');
ok(!/then .* rest/i.test(TA)&&!/then .* rest/i.test(TB),
  'Tue: no rest-after line rides inside a card');
ok(/EMOM × 20 minutes/i.test(TB)&&/50 sec Box Jump Overs/i.test(TB)&&/4th:\s*Rest/i.test(TB),
  'Tue B: Row EMOM reads the same way');
await p.screenshot({path:'wording_wall.png'});
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
