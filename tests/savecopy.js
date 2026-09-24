// SAVE AS A NEW DATED COPY (build 512 — Omar: load a workout, edit it, then save
// it as a fresh copy under a new date; the original stays). The "Save as new
// date" button in Setup files "<title> dd/MM" from Setup > Date, keeps the wall
// title, switches editing to the copy, and refuses a missing or duplicate date.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
const names=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('af_presets_v1')||'[]').map(x=>x.name));
async function boot(br){
  const ctx=await br.newContext({viewport:{width:1200,height:900}});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1400);
  await p.evaluate(()=>{ const PKEY='af_presets_v1'; let pr=JSON.parse(localStorage.getItem(PKEY)||'[]');
    pr.push({name:'Hyrox 05/09',ts:Date.now(),cfg:{name:'Hyrox',wkName:'Hyrox 05/09',titleSet:true,
      mode:'rotation',teamKind:'teams',teamSize:2,together:true,noScore:true,prog:{date:'2026-09-05'},
      inventory:{Run:6},display:{ready:0,voice:false},
      rotation:{laps:1,blockRest:0,sameRest:true,blocks:[{name:'A',rounds:1,items:[
        {name:'Row',dur:120,exercises:[{who:'',name:'Run',amounts:[],unit:'m',max:true}]}]}]}}});
    localStorage.setItem(PKEY,JSON.stringify(pr)); });
  await p.reload(); await p.waitForTimeout(1400);
  // load it, go to Setup, drop to the fields
  await p.evaluate(()=>window.__loadLib&&window.__loadLib('Hyrox 05/09')); await p.waitForTimeout(300);
  await p.evaluate(()=>document.getElementById('tabBoard').click()); await p.waitForTimeout(150);
  await p.evaluate(()=>document.getElementById('stSetup').click()); await p.waitForTimeout(300);
  await p.evaluate(()=>window.__lib&&window.__lib.fields&&window.__lib.fields()); await p.waitForTimeout(250);
  return {ctx,p};
}
const setDate=(p,iso)=>p.evaluate(d=>{ const f=document.getElementById('pgDate'); f.value=d;
  f.dispatchEvent(new Event('input',{bubbles:true}));
  f.dispatchEvent(new Event('change',{bubbles:true})); },iso);
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

// ---- happy path: new date -> new copy, original kept ----
{ const {p}=await boot(br);
  ok(await p.evaluate(()=>!!document.getElementById('wkCopy')),'the "Save as new date" button exists in Setup');
  await setDate(p,'2026-09-12'); await p.waitForTimeout(200);
  await p.evaluate(()=>document.getElementById('wkCopy').click()); await p.waitForTimeout(400);
  const ns=await names(p);
  ok(ns.includes('Hyrox 12/09'),'a new dated copy "Hyrox 12/09" is filed ['+ns.join(', ')+']');
  ok(ns.includes('Hyrox 05/09'),'the original "Hyrox 05/09" is kept');
  const c=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  ok(c.wkName==='Hyrox 12/09','editing switches to the new copy (wkName)');
  ok(c.name==='Hyrox','the wall title stays "Hyrox" ['+c.name+']');
  await p.close(); }

// ---- no date set -> refused with a hint, nothing filed ----
{ const {p}=await boot(br);
  await setDate(p,''); await p.waitForTimeout(150);
  // also clear cfg.prog.date to be sure
  await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8')); if(c.prog) c.prog.date=''; localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); });
  await p.reload(); await p.waitForTimeout(1400);
  await p.evaluate(()=>window.__loadLib&&window.__loadLib('Hyrox 05/09')); await p.waitForTimeout(200);
  await p.evaluate(()=>document.getElementById('tabBoard').click()); await p.waitForTimeout(120);
  await p.evaluate(()=>document.getElementById('stSetup').click()); await p.waitForTimeout(250);
  await p.evaluate(()=>window.__lib&&window.__lib.fields&&window.__lib.fields()); await p.waitForTimeout(200);
  await setDate(p,''); await p.waitForTimeout(150);
  const before=(await names(p)).length;
  await p.evaluate(()=>document.getElementById('wkCopy').click()); await p.waitForTimeout(300);
  const msg=await p.evaluate(()=>{ const d=document.querySelector('.dlg-back .dmsg'); return d?d.textContent:''; });
  ok(/Date/i.test(msg),'no date: refused with a set-the-Date hint ['+msg.slice(0,40)+']');
  await p.evaluate(()=>{ const b=document.querySelector('.dlg-back .dok'); if(b) b.click(); }); await p.waitForTimeout(150);
  ok((await names(p)).length===before,'no date: nothing was filed');
  await p.close(); }

// ---- same date as an existing copy -> refused ----
{ const {p}=await boot(br);
  await setDate(p,'2026-09-05'); await p.waitForTimeout(150);   // same as the loaded board's own date
  const before=(await names(p)).length;
  await p.evaluate(()=>document.getElementById('wkCopy').click()); await p.waitForTimeout(300);
  const msg=await p.evaluate(()=>{ const d=document.querySelector('.dlg-back .dmsg'); return d?d.textContent:''; });
  ok(/already saved|different date/i.test(msg),'same date: refused (already saved) ['+msg.slice(0,40)+']');
  await p.evaluate(()=>{ const b=document.querySelector('.dlg-back .dok'); if(b) b.click(); }); await p.waitForTimeout(150);
  ok((await names(p)).length===before,'same date: nothing new filed');
  await p.close(); }

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
