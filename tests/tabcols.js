// THE BIG SCREEN TAB KEEPS ITS COLUMNS (build 470 — Omar's Engine showed as a
// tall one-column strip in the left half of the wall, rest black). The
// aspect-collapse-to-1-column rule is for a genuinely upright FULL-SCREEN
// device (a phone / portrait TV) so its tall board fills a tall screen. The
// Big Screen TAB is always inside a landscape desktop (its fill path only runs
// at >=1100px), so a portrait-SHAPED board box there must NOT collapse — it
// keeps 2+ columns and fills the width. tvfull on a real portrait phone still
// stacks to 1. This suite drives both and pins the split.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
// a 4-part Engine-style board: together=false, teams, one plain group item per block
const part=(name,e1,e2)=>({name,machine:'Row',rounds:2,rrest:60,aRest:0,items:[{dur:240,scored:false,group:true,
  name:'4:00 on / 1:00 off',note:'Swap roles for round 2',
  exercises:[{who:'P1',name:e1,amounts:[],unit:'cal',max:true},{who:'P2',name:'EMOM 4: '+e2,amounts:[8,12],unit:'reps'}]}]});
async function load(p){
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1200);   // SIS one-shot seeds a base cfg
  await p.evaluate((parts)=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    Object.assign(c,{name:'Engine',wkName:'Engine',titleSet:true,mode:'rotation',teamKind:'teams',teamSize:2,together:false,noScore:true,scoreSrc:'manual'});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:120,sameRest:true,blocks:parts});
    c.crews=Array.from({length:12},(_,i)=>({name:'Team '+(i+1)}));
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); },
    [part('Ski','Burpee to Plate'),part('Row','Box Jump Overs'),part('Bike','Prisoner Reverse Lunges'),part('Run','Alt DB Snatches')]);
  await p.reload(); await p.waitForTimeout(1300);
}
const read=p=>p.evaluate(()=>{const bc=document.getElementById('blockCards');const f=document.getElementById('tvFit');const r=f.getBoundingClientRect();
  return {bcols:+getComputedStyle(bc).getPropertyValue('--bcols').trim()||0,drawnW:Math.round(r.width),vw:innerWidth};});
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// ---- Big Screen TAB, portrait-shaped board box on a wide desktop: keep columns ----
for(const [W,H,tag] of [[1280,1400,'portrait box'],[1900,960,'landscape'],[1440,1100,'squarish']]){
  const p=await br.newPage({viewport:{width:W,height:H}});
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror(tab '+tag+'):',e.message);});
  await load(p);
  await p.evaluate(()=>document.getElementById('tabScreen').click()); await p.waitForTimeout(300);
  await p.evaluate(()=>document.getElementById('smWork').click()); await p.waitForTimeout(1300);
  const i=await read(p);
  ok(i.bcols>=2,'tab '+tag+' ('+W+'x'+H+'): keeps 2+ columns, no 1-col collapse [bcols '+i.bcols+']');
  ok(i.drawnW>=i.vw*0.6,'tab '+tag+': board fills the width, not a left strip [drawn '+i.drawnW+'/'+i.vw+']');
  await p.close();
}
// ---- tvfull on a real portrait phone: still stacks to 1 (coverage) ----
{ const p=await br.newPage({viewport:{width:500,height:900}});
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror(full phone):',e.message);});
  await load(p);
  await p.goto(F+'#workout'); await p.reload(); await p.waitForTimeout(1300);
  await p.evaluate(()=>{document.body.classList.add('tvfull');dispatchEvent(new Event('resize'));});
  await p.waitForTimeout(1200);
  const i=await read(p);
  ok(i.bcols===1,'tvfull portrait phone: still stacks to 1 column [bcols '+i.bcols+']');
  await p.close(); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
