// SHARING IS A FORMAT, NOT A TEAM (build 412 — Omar: "this is not really a
// team workout, it's just pairing"). The mis-built Lower Body (teams of 2,
// every working part a share) mends itself to SOLO on every device: the
// library entry, the loaded board, and any stale copy the room pushes back
// while idle. A real partner workout or an already-solo board never matches.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
// HIS REAL SHAPE (the 412 lesson): share sets PLUS a strength finisher part
// that carries NO share format — the all-share print refused exactly this
const shareBlocks=()=>[
  {name:'Part A',rounds:1,items:[
    {name:'Set 1',dur:150,fmt:'share',shareN:2,scored:false,group:true,exercises:[
      {name:'Paused Back Squat',amounts:[8],unit:'reps',max:false,who:'All 2'}]},
    {rest:true,dur:60,exercises:[]},
    {name:'Set 2',dur:150,fmt:'share',shareN:2,scored:false,group:true,exercises:[
      {name:'Paused Back Squat',amounts:[6],unit:'reps',max:false,who:'All 2'}]}]},
  {name:'Part B',rounds:1,items:[
    {name:'Set 1',dur:150,fmt:'share',shareN:2,scored:false,group:true,exercises:[
      {name:'Romanian Deadlift',amounts:[10],unit:'reps',max:false}]}]},
  {name:'Finisher',rounds:1,items:[
    {dur:540,scored:false,group:true,exercises:[
      {name:'Goblet Squat',amounts:[12],unit:'reps',max:false,sets:3,who:'All 2'},
      {name:'Walking Lunge',amounts:[20],unit:'reps',max:false,sets:3}]}]}];
let libPuts=[], sessPuts=[], sess=null;
async function wire(ctx){
  await ctx.route('https://relay.test/**',async route=>{
    const req=route.request();
    const cors={'access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS',
      'access-control-allow-headers':'content-type'};
    if(req.method()==='OPTIONS') return route.fulfill({status:204,headers:cors});
    let b={}; try{ b=JSON.parse(req.postData()||'{}'); }catch(e){}
    const json=o=>route.fulfill({status:200,headers:{'content-type':'application/json',...cors},body:JSON.stringify(o)});
    if(b.op==='lib.put'){ libPuts.push(b); return json({ok:1}); }
    if(b.op==='lib.list') return json({presets:[]});
    if(b.op==='s.put'){ sessPuts.push(b.v); sess=b.v; return json({ok:1}); }
    if(b.op==='s.get') return json({v:sess});
    return route.fulfill({status:500,headers:cors,body:'not mocked'});
  });
}
async function boot(br,prep){
  const ctx=await br.newContext({viewport:{width:1440,height:1000}});
  await wire(ctx);
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1'),
    localStorage.setItem('af_ai_url','https://relay.test/ai')));
  await p.reload(); await p.waitForTimeout(1200);
  if(prep) await p.evaluate(prep,shareBlocks());
  await p.reload(); await p.waitForTimeout(1600);
  return {ctx,p};
}
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// 1) a device holding the mis-built board — preset AND loaded — mends both
libPuts=[]; sessPuts=[]; sess=null;
let {ctx,p}=await boot(br,blocks=>{
  localStorage.removeItem('af_fixlb1609_v2');
  const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  Object.assign(cfg,{name:'Lower Body',wkName:'Lower Body 16/09',titleSet:true,
    mode:'rotation',teamKind:'teams',teamSize:2,together:true,noScore:true,
    prog:{date:'2026-09-16',day:'Wednesday',stype:'Strength',block:'',week:''}});
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:120,sameRest:true,blocks});
  cfg.gear=[];
  localStorage.setItem(k,JSON.stringify(cfg));
  const ps=(JSON.parse(localStorage.getItem('af_presets_v1'))||[])
    .filter(x=>x.name!=='Lower Body 16/09');
  ps.push({name:'Lower Body 16/09',ts:1,cfg:JSON.parse(JSON.stringify(cfg))});
  localStorage.setItem('af_presets_v1',JSON.stringify(ps));
});
{ const got=await p.evaluate(()=>({
    preset:(JSON.parse(localStorage.getItem('af_presets_v1'))||[]).find(x=>x.name==='Lower Body 16/09'),
    cfg:JSON.parse(localStorage.getItem('af_erg_cfg_v8'))}));
  ok(got.preset&&got.preset.cfg.teamKind==='solo','the library entry goes SOLO');
  ok(got.preset&&got.preset.ts>1,'the mended entry takes a FRESH ts so the room adopts it');
  ok(got.cfg.teamKind==='solo','the LOADED board goes SOLO');
  ok(got.cfg.rotation.blocks[0].items[0].fmt==='share','the sharing itself stays');
  ok(!got.cfg.rotation.blocks[0].items[0].exercises[0].who,'the "All 2" echo label leaves the data');
  ok(!got.cfg.rotation.blocks[2].items[0].fmt,'the finisher part keeps its own (non-share) format');
  ok(!got.cfg.rotation.blocks[2].items[0].exercises[0].who,'the finisher\'s "All 2" is stripped too');
  ok(libPuts.some(b2=>b2.name==='Lower Body 16/09'&&b2.cfg&&b2.cfg.teamKind==='solo'),
    'the fixed board is PUSHED to the room library');
  ok(await p.evaluate(()=>document.getElementById('tcLabel')&&true),'the page survives the mend');
  await p.waitForTimeout(5500);
  ok(sessPuts.some(v=>v&&v.cfg&&v.cfg.teamKind==='solo'),'the fix is offered to the room session');
  await ctx.close(); }
// 2) the room pushing the stale TEAMS copy back gets mended on arrival
libPuts=[]; sessPuts=[]; sess=null;
({ctx,p}=await boot(br,null));
{ const base=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  const stale=Object.assign({},base,{name:'Lower Body',wkName:'Lower Body 16/09',titleSet:true,
    mode:'rotation',teamKind:'teams',teamSize:2,together:true,noScore:true,gear:[],
    prog:{date:'2026-09-16',day:'Wednesday',stype:'Strength',block:'',week:''},
    rotation:Object.assign({},base.rotation,{laps:1,blockRest:120,blocks:shareBlocks()})});
  sess={ts:Date.now(),src:'other-device',kind:'edit',cfg:stale,
    run:{mode:'rotation',act:false,run:false}};
  sessPuts=[];
  await p.waitForTimeout(4500);
  const now=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  ok(now.teamKind==='solo','a stale TEAMS copy arriving from the room is mended on arrival');
  ok(sessPuts.some(v=>v&&v.cfg&&v.cfg.teamKind==='solo'),'and the truth is re-published'); }
// 3) a REAL partner workout is never touched — one non-share item breaks the print
{ const real=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  const bl=shareBlocks(); bl[1].items.push({dur:240,fmt:'rotate',rotBy:'clock',scored:false,
    exercises:[{name:'Ski',amounts:[],unit:'cal',max:true},{name:'Bike',amounts:[],unit:'cal',max:true}]});
  const c2=Object.assign({},real,{name:'Lower Body',wkName:'Lower Body 23/09',
    teamKind:'teams',teamSize:2,
    prog:{date:'2026-09-23',day:'Wednesday',stype:'Strength',block:'',week:''},
    rotation:Object.assign({},real.rotation,{blocks:bl})});
  sess={ts:Date.now()+50,src:'other-device',kind:'edit',cfg:c2,run:{mode:'rotation',act:false,run:false}};
  await p.waitForTimeout(3500);
  ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')).teamKind==='teams'),
    'a DIFFERENT-week Lower Body with mixed work stays a team board'); }
// 4) an ALL-share pairs board mends on the general rule, no date needed
{ const real=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  const bl=shareBlocks().slice(0,2);   // share sets only, no finisher
  const c3=Object.assign({},real,{name:'Lower Body',wkName:'Lower Body 30/09',
    teamKind:'teams',teamSize:2,
    prog:{date:'2026-09-30',day:'Wednesday',stype:'Strength',block:'',week:''},
    rotation:Object.assign({},real.rotation,{blocks:bl})});
  sess={ts:Date.now()+90,src:'other-device',kind:'edit',cfg:c3,run:{mode:'rotation',act:false,run:false}};
  await p.waitForTimeout(3500);
  ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')).teamKind==='solo'),
    'an ALL-share pairs board mends regardless of its date'); }
await ctx.close();
// 5) PART B BECOMES OMAR'S REAL FLOOR (build 415, superseding 414's
// superset): three 4:00 self-paced two-station rounds — partners start on
// different exercises and swap when they finish, the clock caps the round —
// then the 9-minute core piece runs ONCE as the finisher
libPuts=[]; sessPuts=[]; sess=null;
({ctx,p}=await boot(br,()=>{
  localStorage.removeItem('af_fixlbpb_v2');
  const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  Object.assign(cfg,{name:'Lower Body',wkName:'Lower Body 16/09',titleSet:true,
    mode:'rotation',teamKind:'solo',together:true,noScore:true,gear:[],
    prog:{date:'2026-09-16',day:'Wednesday',stype:'Strength',block:'',week:''}});
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:120,sameRest:true,blocks:[
    {name:'Part A',rounds:1,items:[
      {name:'Set 1',dur:150,fmt:'share',shareN:2,scored:false,group:true,exercises:[
        {name:'Paused Back Squat',amounts:[8],unit:'reps',max:false}]}]},
    {name:'Part B',rounds:3,items:[
      {name:'For Quality',dur:720,fmt:'rotate',rotBy:'done',scored:false,exercises:[
        {name:'Barbell FFE Reverse Lunge',amounts:[8],unit:'reps',each:true,max:false},
        {name:'B-Stance Dumbbell Hip Thrust',amounts:[6],unit:'reps',each:true,max:false}]},
      {name:'9 mins to complete',dur:540,fmt:'rotate',rotBy:'clock',scored:false,exercises:[
        {name:'Front Rack March',amounts:[45],unit:'sec',max:false},
        {name:'Front Plank',amounts:[45],unit:'sec',max:false},
        {name:'Dead Bugs',amounts:[12],unit:'reps',each:true,max:false}]}]}]});
  localStorage.setItem(k,JSON.stringify(cfg));
}));
{ const c=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  const b=c.rotation.blocks[1];
  ok(b.rounds===3,'415: Part B runs 3 rounds');
  ok(b.items[0].fmt==='rotate'&&b.items[0].rotBy==='done'&&b.items[0].dur===240,
    '415: each round is a 4:00 self-paced two-station window');
  ok(b.items[0].exercises.every(x=>!x.sets),'415: no sets on the lines — the rounds ARE the sets');
  ok(b.items[1].fin===true&&b.items[1].dur===540,'415: the 9-minute core piece runs ONCE (finisher)');
  const card=await p.evaluate(()=>document.querySelectorAll('#blockCards .blk')[1].innerText.replace(/\s+/g,' '));
  ok(/self-paced/i.test(card),'415: the card says self-paced');
  ok(/3 rounds × 4:00/i.test(card)&&/then 9:00 finish/i.test(card),
    '415: the footer reads 3 rounds × 4:00 · then 9:00 finish');
  ok(!/63:00/.test(card)&&/21:00 total/i.test(card),'415: the part totals 21:00, not 63:00');
  // 5b) BOTH stale shapes arriving from the room get mended: the original
  // 12:00 rotate, and 414's superset in-between
  const stale=JSON.parse(JSON.stringify(c));
  stale.rotation.blocks[1].rounds=3; delete stale.rotation.blocks[1].items[1].fin;
  stale.rotation.blocks[1].items[0]={name:'For Quality',dur:720,fmt:'rotate',rotBy:'done',scored:false,
    exercises:[{name:'Barbell FFE Reverse Lunge',amounts:[8],unit:'reps',each:true,max:false},
      {name:'B-Stance Dumbbell Hip Thrust',amounts:[6],unit:'reps',each:true,max:false}]};
  sess={ts:Date.now()+70,src:'other-device',kind:'edit',cfg:stale,run:{mode:'rotation',act:false,run:false}};
  sessPuts=[];
  await p.waitForTimeout(4500);
  let now=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  ok(now.rotation.blocks[1].items[0].dur===240&&now.rotation.blocks[1].items[1].fin===true,
    '415: the ORIGINAL shape arriving from the room is mended on arrival');
  ok(sessPuts.some(v=>v&&v.cfg&&v.cfg.rotation.blocks[1].items[0].dur===240),
    '415: and the truth is re-published');
  const mid=JSON.parse(JSON.stringify(c));
  mid.rotation.blocks[1].rounds=1; delete mid.rotation.blocks[1].items[1].fin;
  mid.rotation.blocks[1].items[0]={name:'For Quality',dur:720,scored:false,group:true,
    exercises:[{name:'Barbell FFE Reverse Lunge',amounts:[8],unit:'reps',each:true,max:false,sets:3},
      {name:'B-Stance Dumbbell Hip Thrust',amounts:[6],unit:'reps',each:true,max:false,sets:3}]};
  sess={ts:Date.now()+140,src:'other-device',kind:'edit',cfg:mid,run:{mode:'rotation',act:false,run:false}};
  await p.waitForTimeout(4000);
  now=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  ok(now.rotation.blocks[1].rounds===3&&now.rotation.blocks[1].items[0].rotBy==='done'
    &&now.rotation.blocks[1].items[0].exercises.every(x=>!x.sets),
    "415: 414's superset in-between shape converts too"); }
await ctx.close();
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
