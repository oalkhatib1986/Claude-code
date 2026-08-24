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
        {name:'DB Front Rack Hold',amounts:[],unit:'sec',max:true}]},
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
ok(/Every 3:00 × 3 sets/i.test(B),'B: heading says EVERY 3:00 × 3 SETS');
ok(/10 Pendlay Row(?! ·)/i.test(B)&&!/10 reps/i.test(B),'B: line reads "10 Pendlay Row", no "reps"');
ok(!/3 × 10/.test(B),'B: sets are not repeated on the lines');
ok(/Arms Finisher/i.test(B),'B: a meaningful name is kept');
ok(/2-4 Pull Ups/i.test(B),'B: ranges read coach-style (2-4 Pull Ups)');
ok(/3 minutes/i.test(B),'B: a bare duration says minutes, not 3:00');
ok(/500m Row/i.test(B),'B: metre work reads 500m Row');
// Part C — EMOM block heading + numbered single-line minutes
ok(/EMOM × 9 minutes/i.test(C),'C: heading is EMOM × 9 MINUTES');
ok(/1st:\s*10 DB Push Press \+ Max DB Front Rack Hold/i.test(C),'C: 1st minute is one numbered line with +');
ok(/2nd:\s*10-15 Hand Release Push Ups/i.test(C),'C: 2nd minute numbered');
ok(/3rd:\s*12\/8 cal Ski/i.test(C),'C: 3rd minute reads 12/8 cal Ski');
ok(!/3 rounds × 3:00/i.test(C),'C: no duplicate rounds footer');
// live: the NOW slab still lands on the running minute
await p.click('#tabTrainer'); await p.waitForTimeout(500);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1500);
await p.click('#tabBoard'); await p.waitForTimeout(700);
ok(await p.evaluate(()=>!!document.querySelector('#blockCards .exg.pnow')),'live: the running part still gets the NOW slab');
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
await p.setViewportSize({width:1920,height:1080});
await p.goto('file:///home/user/Claude-code/leaderboard.html#workout'); await p.waitForTimeout(1600);
await p.screenshot({path:'wording_wall.png'});
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
