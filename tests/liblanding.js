// LIBRARY LANDING (build 508 — Omar: Setup should open on a grid of workout
// NAMES; tap one for its dated versions with sort + date range + weekday, then
// preview and load. Only the trainer's own saved boards show (the hidden
// programme/built-ins stay hidden); the loaded workout is accented. This suite
// seeds a few dated boards under unique family names (so the app's own seeded
// boards can't skew the counts), opens Setup, and pins the grid, grouping,
// current accent, search, the dated list + filters, the preview, and load
// (idle and while a class runs — the confirm is the app's own dialog).
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
async function boot(br){
  const ctx=await br.newContext({viewport:{width:1100,height:900}});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1400);
  // seed the trainer's own saved boards under UNIQUE families (Zephyr ×3, Vortex ×1)
  // 01/09=Tue, 07/09=Mon, 08/09=Tue, 05/09=Sat
  await p.evaluate(()=>{ const PKEY='af_presets_v1';
    let pr=JSON.parse(localStorage.getItem(PKEY)||'[]');
    const mk=(name,title,date)=>({name,ts:Date.now(),cfg:{name:title,wkName:name,mode:'rotation',
      teamKind:'teams',teamSize:2,together:true,noScore:true,
      prog:{date,type:title},inventory:{Run:6},display:{ready:0,voice:false},
      rotation:{laps:1,blockRest:0,sameRest:true,blocks:[{name:'A',rounds:1,items:[
        {name:'Row',dur:120,exercises:[{who:'',name:'Run',amounts:[],unit:'m',max:true}]}]}]}}});
    pr.push(mk('Zephyr 01/09','Zephyr','2026-09-01'));
    pr.push(mk('Zephyr 08/09','Zephyr','2026-09-08'));
    pr.push(mk('Zephyr 07/09','Zephyr','2026-09-07'));
    pr.push(mk('Vortex 05/09','Vortex','2026-09-05'));
    // date-in-title boards (no separate wall title) must still group under one card
    pr.push(mk('Delta 01/10','Delta 01/10','2026-10-01'));
    pr.push(mk('Delta 08/10','Delta 08/10','2026-10-08'));
    localStorage.setItem(PKEY,JSON.stringify(pr)); });
  await p.reload(); await p.waitForTimeout(1400);
  await p.evaluate(()=>document.getElementById('tabBoard').click()); await p.waitForTimeout(150);
  await p.evaluate(()=>document.getElementById('stSetup').click()); await p.waitForTimeout(350);
  return {ctx,p};
}
const cards=p=>p.evaluate(()=>[...document.querySelectorAll('#libGrid .libcard')].map(c=>({
  name:c.querySelector('.lcname').textContent, cur:c.classList.contains('cur'),
  meta:c.querySelector('.lcmeta').textContent})));
const rows=p=>p.evaluate(()=>[...document.querySelectorAll('#libList .librow')].map(r=>r.querySelector('.lrdate').textContent));
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const {p}=await boot(br);

// ---- Setup opens on the grid ----
ok(await p.evaluate(()=>document.body.classList.contains('libland')),'Setup opens on the library grid (body.libland)');
const cs=await cards(p);
const zeph=cs.find(c=>/^ZEPHYR$/i.test(c.name)||c.name==='Zephyr');
ok(zeph&&/3 versions/.test(zeph.meta),'grid: Zephyr groups its 3 dated versions ['+(zeph&&zeph.meta)+']');
ok(cs.some(c=>c.name==='Vortex'),'grid: Vortex is its own card');
const deltaCards=cs.filter(c=>c.name==='Delta');
ok(deltaCards.length===1&&/2 versions/.test(deltaCards[0].meta),
  'grid: date-in-title boards group under ONE card ['+deltaCards.length+' Delta card(s), '+(deltaCards[0]||{}).meta+']');
ok(cs.some(c=>c.cur),'grid: the loaded workout is accented ['+(cs.find(c=>c.cur)||{}).name+']');

// ---- search filters the grid ----
await p.evaluate(()=>{ const s=document.getElementById('libSearch'); s.value='zephyr'; s.dispatchEvent(new Event('input')); });
await p.waitForTimeout(200);
const filtered=await cards(p);
ok(filtered.length===1&&filtered[0].name==='Zephyr','search: "zephyr" narrows to the one card ['+filtered.map(c=>c.name)+']');
await p.evaluate(()=>{ const s=document.getElementById('libSearch'); s.value=''; s.dispatchEvent(new Event('input')); });
await p.waitForTimeout(150);

// ---- tap Zephyr -> dated list, newest first ----
await p.evaluate(()=>{ const c=[...document.querySelectorAll('#libGrid .libcard')].find(x=>x.querySelector('.lcname').textContent==='Zephyr'); c.click(); });
await p.waitForTimeout(250);
ok(await p.evaluate(()=>!document.getElementById('libListWrap').hidden),'list: tapping a card opens the dated list');
let rs=await rows(p);
ok(rs.join(',')==='08/09/2026,07/09/2026,01/09/2026','list: newest first by default ['+rs.join(',')+']');

// ---- sort toggle -> oldest first ----
await p.evaluate(()=>document.getElementById('libSort').click()); await p.waitForTimeout(200);
rs=await rows(p);
ok(rs[0]==='01/09/2026','sort: toggling gives oldest first ['+rs.join(',')+']');
await p.evaluate(()=>document.getElementById('libSort').click()); await p.waitForTimeout(150);

// ---- date range filter ----
await p.evaluate(()=>{ const f=document.getElementById('libFrom'); f.value='2026-09-06'; f.dispatchEvent(new Event('change')); });
await p.waitForTimeout(200);
rs=await rows(p);
ok(rs.length===2&&!rs.includes('01/09/2026'),'range: From 06/09 drops 01/09 ['+rs.join(',')+']');
await p.evaluate(()=>{ const f=document.getElementById('libFrom'); f.value=''; f.dispatchEvent(new Event('change')); });
await p.waitForTimeout(150);

// ---- weekday filter (07/09 is a Monday) ----
await p.evaluate(()=>{ const d=document.getElementById('libDow'); d.value='Monday'; d.dispatchEvent(new Event('change')); });
await p.waitForTimeout(200);
rs=await rows(p);
ok(rs.length===1&&rs[0]==='07/09/2026','weekday: Monday keeps only 07/09 ['+rs.join(',')+']');
await p.evaluate(()=>{ const d=document.getElementById('libDow'); d.value=''; d.dispatchEvent(new Event('change')); });
await p.waitForTimeout(150);

// ---- preview then load ----
await p.evaluate(()=>[...document.querySelectorAll('#libList .librow')].find(r=>/08\/09/.test(r.textContent)).click());
await p.waitForTimeout(250);
ok(await p.evaluate(()=>!document.getElementById('libPrevWrap').hidden),'preview: a row opens the preview');
ok(await p.evaluate(()=>/Zephyr/i.test((document.querySelector('#libPrev .lpttl')||{}).textContent||'')),'preview: shows the title');
ok(await p.evaluate(()=>document.querySelectorAll('#libPrev .lpit').length>0),'preview: lists the parts');
ok(await p.evaluate(()=>document.getElementById('libLoad').dataset.name==='Zephyr 08/09'),'preview: Load carries the dated board name');
await p.evaluate(()=>document.getElementById('libLoad').click()); await p.waitForTimeout(400);
ok(!(await p.evaluate(()=>document.body.classList.contains('libland'))),'load: leaves the grid to the setup fields');
ok(await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8')); return c.wkName==='Zephyr 08/09'; }),'load: loaded the chosen board');

// ---- back to library from the fields ----
ok(await p.evaluate(()=>getComputedStyle(document.getElementById('libBack')).display!=='none'),'fields: the ← Library button is shown');
await p.evaluate(()=>document.getElementById('libBack').click()); await p.waitForTimeout(250);
ok(await p.evaluate(()=>document.body.classList.contains('libland')&&!document.getElementById('libGridWrap').hidden),'back: ← Library returns to the grid');

// ---- load while a class runs asks first (the app's own dialog) ----
await p.evaluate(()=>window.__loadLib&&window.__loadLib('Zephyr 01/09')); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('tabTrainer').click()); await p.waitForTimeout(200);
await p.evaluate(()=>{ const b=document.getElementById('startBtn'); if(b) b.click(); }); await p.waitForTimeout(400);
const running1=await p.evaluate(()=>!document.getElementById('resetBtn').disabled);
await p.evaluate(()=>document.getElementById('tabBoard').click()); await p.waitForTimeout(120);
await p.evaluate(()=>document.getElementById('stSetup').click()); await p.waitForTimeout(300);
// clear any pre-existing setup-keep prompt (loadLib auto-fit can change crews)
await p.evaluate(()=>document.querySelectorAll('.dlg-back').forEach(bk=>{ const b=bk.querySelector('.dok'); if(b) b.click(); })); await p.waitForTimeout(150);
await p.evaluate(()=>{ const c=[...document.querySelectorAll('#libGrid .libcard')].find(x=>x.querySelector('.lcname').textContent==='Vortex'); c.click(); });
await p.waitForTimeout(200);
await p.evaluate(()=>document.querySelector('#libList .librow').click()); await p.waitForTimeout(200);
await p.evaluate(()=>document.getElementById('libLoad').click()); await p.waitForTimeout(250);
const dmsg=await p.evaluate(()=>{ const ds=document.querySelectorAll('.dlg-back .dmsg'); return ds.length?ds[ds.length-1].textContent:''; });
ok(running1&&/reset the clock/i.test(dmsg),'running: loading another board raises the reset confirm ['+dmsg.slice(0,40)+']');
// Keep running
await p.evaluate(()=>{ const b=document.querySelector('.dlg-back .dno'); if(b) b.click(); }); await p.waitForTimeout(250);
ok(await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8')); return c.wkName==='Zephyr 01/09'; }),'running: "Keep running" leaves the running board loaded');

// ---- leaving Setup drops the grid ----
await p.evaluate(()=>document.getElementById('tabBoard').click()); await p.waitForTimeout(100);
await p.evaluate(()=>document.getElementById('stSetup').click()); await p.waitForTimeout(200);
await p.evaluate(()=>document.getElementById('stLayout').click()); await p.waitForTimeout(200);
ok(!(await p.evaluate(()=>document.body.classList.contains('libland'))),'nav: leaving Setup for Layout drops the grid');

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
