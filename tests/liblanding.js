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
    // mixed date formats + casing in the title must ALSO collapse to one card
    pr.push(mk('Gamma 2-10','Gamma 2-10','2026-10-02'));
    pr.push(mk('Gamma 2026-10-09','gamma 2026-10-09','2026-10-09'));
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
const gammaCards=cs.filter(c=>/^gamma$/i.test(c.name));
ok(gammaCards.length===1&&/2 versions/.test(gammaCards[0].meta),
  'grid: mixed date formats + casing collapse to ONE card ['+gammaCards.length+' Gamma card(s), '+(gammaCards[0]||{}).meta+']');
ok(cs.some(c=>c.cur),'grid: the loaded workout is accented ['+(cs.find(c=>c.cur)||{}).name+']');

// ---- no Workout chips (redundant with the cards) ----
ok(await p.evaluate(()=>document.getElementById('libNameChips')===null),'chips: the redundant Workout chip row is gone');

// ---- search behaves like the picker: typing shows the flat saved-workout list ----
await p.evaluate(()=>{ const s=document.getElementById('libSearch'); s.value='zephyr';
  s.dispatchEvent(new Event('focus')); s.dispatchEvent(new Event('input')); });
await p.waitForTimeout(200);
{ const st=await p.evaluate(()=>({listShown:!document.getElementById('libSearchList').hidden,
    gridHidden:document.getElementById('libGrid').hidden,
    rows:[...document.querySelectorAll('#libSearchList .librow .lrdate')].map(x=>x.textContent)}));
  ok(st.listShown&&st.gridHidden,'search: typing shows the flat list, hides the cards');
  ok(st.rows.length===3&&st.rows.every(r=>/Zephyr/i.test(r)),'search: "zephyr" lists its 3 saved versions ['+st.rows.length+']'); }
// load directly from a search-list row
await p.evaluate(()=>{ const r=[...document.querySelectorAll('#libSearchList .librow')].find(x=>/08\/09/.test(x.textContent));
  r.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); });
await p.waitForTimeout(400);
ok(!(await p.evaluate(()=>document.body.classList.contains('libland'))),'search: tapping a result loads it straight away');
ok(await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8')); return c.wkName==='Zephyr 08/09'; }),'search: loaded the tapped board');

// ---- back to the grid; focusing the empty bar reveals ALL saved workouts ----
await p.evaluate(()=>document.getElementById('stSetup').click()); await p.waitForTimeout(300);
await p.evaluate(()=>{ const s=document.getElementById('libSearch'); s.dispatchEvent(new Event('focus')); }); await p.waitForTimeout(200);
{ const n=await p.evaluate(()=>document.querySelectorAll('#libSearchList .librow').length);
  ok(n>=6,'search: focusing the empty bar lists every saved workout ['+n+']'); }
await p.evaluate(()=>{ const s=document.getElementById('libSearch'); s.dispatchEvent(new Event('blur')); }); await p.waitForTimeout(300);

// ---- MONTH chips are month-only; YEAR chips exist ----
{ const mchips=await p.evaluate(()=>[...document.querySelectorAll('#libMonthChips .libchip')].map(c=>c.textContent));
  ok(mchips[0]==='All'&&mchips.includes('Oct')&&mchips.includes('Sep'),'chips: month chips are month-only (All + MMM) ['+mchips.join(',')+']'); }
{ const ychips=await p.evaluate(()=>[...document.querySelectorAll('#libYearChips .libchip')].map(c=>c.textContent));
  ok(ychips[0]==='All'&&ychips.includes('2026'),'chips: a Year filter exists ['+ychips.join(',')+']'); }
// Month = Oct -> only workouts with an October version
await p.evaluate(()=>{ const c=[...document.querySelectorAll('#libMonthChips .libchip')].find(x=>x.textContent==='Oct'); c.click(); });
await p.waitForTimeout(200);
{ const oc=await cards(p); ok(oc.length>=1&&oc.every(c=>c.name==='Delta'||c.name==='Gamma'),'chips: Month "Oct" narrows to the October workouts ['+oc.map(c=>c.name)+']'); }
await p.evaluate(()=>{ const c=[...document.querySelectorAll('#libMonthChips .libchip')].find(x=>x.textContent==='All'); c.click(); });
await p.waitForTimeout(150);

// ---- tap a card -> dated list, newest first, LOAD DIRECTLY (no preview) ----
await p.evaluate(()=>{ const c=[...document.querySelectorAll('#libGrid .libcard')].find(x=>x.querySelector('.lcname').textContent==='Zephyr'); c.click(); });
await p.waitForTimeout(250);
ok(await p.evaluate(()=>!document.getElementById('libListWrap').hidden),'list: tapping a card opens the dated list');
let rs=await rows(p);
ok(rs.join(',')==='08/09/2026,07/09/2026,01/09/2026','list: newest first by default ['+rs.join(',')+']');
await p.evaluate(()=>document.getElementById('libSort').click()); await p.waitForTimeout(200);
rs=await rows(p);
ok(rs[0]==='01/09/2026','sort: toggling gives oldest first ['+rs.join(',')+']');
await p.evaluate(()=>document.getElementById('libSort').click()); await p.waitForTimeout(150);
ok(await p.evaluate(()=>document.getElementById('libPrevWrap')===null),'flow: there is no preview step');
await p.evaluate(()=>[...document.querySelectorAll('#libList .librow')].find(r=>/08\/09/.test(r.textContent)).click());
await p.waitForTimeout(400);
ok(!(await p.evaluate(()=>document.body.classList.contains('libland'))),'load: tapping a row loads straight away and leaves the grid');
ok(await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8')); return c.wkName==='Zephyr 08/09'; }),'load: loaded the chosen board');

// ---- back to library from the fields ----
ok(await p.evaluate(()=>getComputedStyle(document.getElementById('libBack')).display!=='none'),'fields: the ← Library button is shown');
await p.evaluate(()=>document.getElementById('libBack').click()); await p.waitForTimeout(250);
ok(await p.evaluate(()=>document.body.classList.contains('libland')&&!document.getElementById('libGridWrap').hidden),'back: ← Library returns to the grid');

// ---- the LOADED workout is always the first card ----
ok(await p.evaluate(()=>{ const c=document.querySelector('#libGrid .libcard'); return c&&c.classList.contains('cur'); }),
  'order: the loaded workout is the first card');

// ---- load while a class runs asks first, straight from the row ----
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
await p.evaluate(()=>document.querySelector('#libList .librow').click()); await p.waitForTimeout(250);
const dmsg=await p.evaluate(()=>{ const ds=document.querySelectorAll('.dlg-back .dmsg'); return ds.length?ds[ds.length-1].textContent:''; });
ok(running1&&/reset the clock/i.test(dmsg),'running: loading another board straight from the row raises the reset confirm ['+dmsg.slice(0,40)+']');
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
