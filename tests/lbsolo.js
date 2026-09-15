// SHARING IS A FORMAT, NOT A TEAM (build 412 — Omar: "this is not really a
// team workout, it's just pairing"). The mis-built Lower Body (teams of 2,
// every working part a share) mends itself to SOLO on every device: the
// library entry, the loaded board, and any stale copy the room pushes back
// while idle. A real partner workout or an already-solo board never matches.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
const shareBlocks=()=>[
  {name:'Part A',rounds:1,items:[
    {name:'Set 1',dur:150,fmt:'share',shareN:2,scored:false,group:true,exercises:[
      {name:'Paused Back Squat',amounts:[8],unit:'reps',max:false,who:'All 2'}]},
    {rest:true,dur:60,exercises:[]},
    {name:'Set 2',dur:150,fmt:'share',shareN:2,scored:false,group:true,exercises:[
      {name:'Paused Back Squat',amounts:[6],unit:'reps',max:false,who:'All 2'}]}]},
  {name:'Part B',rounds:1,items:[
    {name:'Set 1',dur:150,fmt:'share',shareN:2,scored:false,group:true,exercises:[
      {name:'Romanian Deadlift',amounts:[10],unit:'reps',max:false}]}]}];
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
  localStorage.removeItem('af_fixlb1609_v1');
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
    teamKind:'teams',teamSize:2,rotation:Object.assign({},real.rotation,{blocks:bl})});
  sess={ts:Date.now()+50,src:'other-device',kind:'edit',cfg:c2,run:{mode:'rotation',act:false,run:false}};
  await p.waitForTimeout(3500);
  ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')).teamKind==='teams'),
    'a Lower Body with REAL mixed work stays a team board'); }
await ctx.close();
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
