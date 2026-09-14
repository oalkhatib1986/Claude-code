// OMAR'S ENGINE 15/09 FIXES ITSELF (build 390 — "you do it! you fix it!").
// Every device mends its own copies of the wrongly-built board: the library
// entry (fresh ts, pushed to the room), the loaded board (roster, gear and
// display ride through; inventory goes to the gym's real six-a-side), and any
// stale copy the room session pushes back while idle. A board that already
// has the alt shape — or one Omar edits later — is never stomped.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
// the WRONG build: three "swap every" windows, no alt, no rests between swaps
const oldBlocks=()=>{
  const W=(d,a,b2)=>({dur:d,fmt:'rotate',scored:false,exercises:[
    {name:a,amounts:[],unit:'cal',max:true},{name:b2,amounts:[],unit:'reps',max:true}]});
  const RS=d=>({rest:true,dur:d,exercises:[]});
  const L=(a,b2)=>[W(360,a,b2),RS(45),W(240,a,b2),RS(30),W(120,a,b2),RS(15)];
  return [{name:'Part A',rounds:1,items:L('Ski','Wall Balls')},
    {name:'Part B',rounds:1,items:L('Row','Burpee Box Jumps')},
    {name:'Part C',rounds:1,items:L('Run','Bike')}];
};
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
  await p.reload(); await p.waitForTimeout(1200);   // SIS saves a full cfg
  if(prep) await p.evaluate(prep,oldBlocks());
  await p.reload(); await p.waitForTimeout(1600);
  return {ctx,p};
}
const alt12=c=>{ const bs=(((c||{}).rotation)||{}).blocks||[];
  return bs.length===3&&bs.every(b=>(b.items||[]).length===12
    &&(b.items||[]).some(it=>it&&it.alt)); };
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// 1) a device holding the WRONG board — preset AND loaded — mends both
libPuts=[]; sessPuts=[]; sess=null;
let {ctx,p}=await boot(br,blocks=>{
  // the first boot already ran (and armed) the one-shot — put THIS device
  // back to "never fixed, holds the wrong board"
  localStorage.removeItem('af_fixeng1509_v1');
  const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  Object.assign(cfg,{name:'Engine',wkName:'Engine 15/09',titleSet:true,
    mode:'rotation',teamKind:'solo',together:false,noScore:true,
    prog:{date:'2026-09-15',day:'Tuesday',stype:'Engine',block:'',week:''}});
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:120,sameRest:true,blocks});
  cfg.crews=[{name:'Omar'},{name:'Sara'},{name:'Ali'},{name:'Maya'}];
  cfg.gear=[{name:'Squat Rack',n:9}];
  cfg.inventory={Row:5,Ski:5,Bike:5,Run:5,Echo:0};
  localStorage.setItem(k,JSON.stringify(cfg));
  const ps=(JSON.parse(localStorage.getItem('af_presets_v1'))||[])
    .filter(x=>x.name!=='Engine 15/09');
  ps.push({name:'Engine 15/09',ts:1,cfg:JSON.parse(JSON.stringify(cfg))});
  localStorage.setItem('af_presets_v1',JSON.stringify(ps));
});
{ const got=await p.evaluate(()=>({
    preset:(JSON.parse(localStorage.getItem('af_presets_v1'))||[]).find(x=>x.name==='Engine 15/09'),
    cfg:JSON.parse(localStorage.getItem('af_erg_cfg_v8'))}));
  ok(alt12(got.preset&&got.preset.cfg),'the library entry is rebuilt to the real ladder (12 windows, alt)');
  ok(got.preset&&got.preset.ts>1,'the mended entry takes a FRESH ts so the room adopts it');
  ok(alt12(got.cfg),'the LOADED board is rebuilt too');
  ok(got.cfg.name==='Engine'&&got.cfg.titleSet===true,'the wall still just says ENGINE');
  ok((got.cfg.crews||[])[0]&&got.cfg.crews[0].name==='Omar','the roster rides through the fix');
  ok((got.cfg.gear||[])[0]&&got.cfg.gear[0].name==='Squat Rack','the gym gear rides through');
  ok(got.cfg.inventory&&got.cfg.inventory.Ski===6&&got.cfg.inventory.Run===6,
    "the inventory goes to the gym's real six-a-side");
  ok(libPuts.some(b2=>b2.name==='Engine 15/09'&&alt12(b2.cfg)),'the fixed board is PUSHED to the room library');
  const card=await p.evaluate(()=>document.querySelectorAll('#blockCards .blk')[0].innerText.replace(/\s+/g,' '));
  ok(!/swap every/i.test(card)&&/15:00 total/i.test(card),'the screen shows the real ladder at once');
  await p.waitForTimeout(5500);
  ok(sessPuts.some(v=>v&&v.cfg&&alt12(v.cfg)),'the fix is offered to the room session once it has answered');
  await ctx.close(); }
// 2) a tombstoned board stays deleted — nothing is resurrected
libPuts=[]; sess=null;
({ctx,p}=await boot(br,()=>{ localStorage.removeItem('af_fixeng1509_v1');
  localStorage.setItem('af_presets_v1',JSON.stringify(
    (JSON.parse(localStorage.getItem('af_presets_v1'))||[]).filter(x=>x.name!=='Engine 15/09')));
  localStorage.setItem('af_lib_dead',JSON.stringify({'Engine 15/09':{ts:9}})); }));
ok(await p.evaluate(()=>!(JSON.parse(localStorage.getItem('af_presets_v1'))||[]).some(x=>x.name==='Engine 15/09')),
  'a device that deleted the board does not get it re-seeded');
await ctx.close();
// 3) a device that never had it gets the real board seeded
libPuts=[]; sess=null;
({ctx,p}=await boot(br,()=>{ localStorage.removeItem('af_fixeng1509_v1');
  localStorage.setItem('af_presets_v1',JSON.stringify(
    (JSON.parse(localStorage.getItem('af_presets_v1'))||[]).filter(x=>x.name!=='Engine 15/09'))); }));
ok(await p.evaluate(()=>{ const e=(JSON.parse(localStorage.getItem('af_presets_v1'))||[]).find(x=>x.name==='Engine 15/09');
    return !!e&&e.cfg.rotation.blocks.length===3&&e.cfg.rotation.blocks[0].items.length===12; }),
  'a device without the board is seeded the REAL one');
// 4) the room session pushing the OLD board back gets mended on arrival
{ const stale={name:'Engine',wkName:'Engine 15/09',titleSet:true,mode:'rotation',
    teamKind:'solo',together:false,noScore:true,crews:[{name:'Omar'}],
    prog:{date:'2026-09-15',day:'Tuesday',stype:'Engine'},
    inventory:{Row:5,Ski:5,Bike:5,Run:5,Echo:0},
    rotation:{laps:1,blockRest:120,sameRest:true,blocks:oldBlocks()}};
  const base=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  sess={ts:Date.now(),src:'other-device',kind:'edit',
    cfg:Object.assign({},base,stale),run:{mode:'rotation',act:false,run:false}};
  sessPuts=[];
  await p.waitForTimeout(4000);
  const now=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  ok(alt12(now),'an OLD copy arriving from the room is mended on arrival');
  ok(sessPuts.some(v=>v&&v.cfg&&alt12(v.cfg)),'and the truth is re-published to the room'); }
// 5) a board that already has the alt shape is NEVER stomped
{ const fine=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  fine.rotation.blocks[0].items.push({rest:true,dur:99,exercises:[]});   // Omar's own edit
  sess={ts:Date.now()+50,src:'other-device',kind:'edit',cfg:fine,run:{mode:'rotation',act:false,run:false}};
  await p.waitForTimeout(3500);
  ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')).rotation.blocks[0].items.length===13),
    "an EDITED Engine 15/09 (alt already there) rides through untouched"); }
// 6) the 5-a-side import copy (alt shape fine, counts stale) gets its counts
({ctx,p}=await boot(br,()=>{ localStorage.removeItem('af_fixeng1509b_v1');
  const ps=JSON.parse(localStorage.getItem('af_presets_v1'))||[];
  const e=ps.find(x=>x.name==='Engine 15/09');
  e.cfg.inventory={Row:5,Ski:5,Bike:5,Run:5,Echo:0};
  localStorage.setItem('af_presets_v1',JSON.stringify(ps));
  const c2=JSON.parse(JSON.stringify(e.cfg));
  localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c2));
}));
{ const got=await p.evaluate(()=>({
    cfg:JSON.parse(localStorage.getItem('af_erg_cfg_v8')),
    e:(JSON.parse(localStorage.getItem('af_presets_v1'))||[]).find(x=>x.name==='Engine 15/09')}));
  ok(got.cfg.inventory.Ski===6&&got.cfg.inventory.Run===6,
    'a bounced 5-a-side copy gets the real counts at boot');
  ok(got.e.cfg.inventory.Ski===6,'and so does the library entry'); }
// 7) the room pushing the 5-a-side copy back gets its counts mended on arrival
{ const base=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  const c2=JSON.parse(JSON.stringify(base)); c2.inventory={Row:5,Ski:5,Bike:5,Run:5,Echo:0};
  sess={ts:Date.now()+90,src:'other-device',kind:'edit',cfg:c2,run:{mode:'rotation',act:false,run:false}};
  sessPuts=[];
  await p.waitForTimeout(6500);
  const now=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  ok(now.inventory.Ski===6,'a 5-a-side copy arriving from the room is re-stamped to six');
  ok(sessPuts.some(v=>v&&v.cfg&&v.cfg.inventory&&v.cfg.inventory.Ski===6),
    'and the six-count truth is re-published'); }
await ctx.close();
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
