// THE PARTS ARE COLUMNS, NEVER ROWS (build 475 — Omar: "it has to be 4 columns
// not rows! you already do it in columns in the overview page!", "it should
// NEVER stack into rows, it should ALWAYS be columns whether 1, 2, 3, 4, 5 or
// whatever"). This RETIRES the 470-473 aspect-from-box-shape row count, which
// on Omar's 1280x720 (150%-scaled) screen rounded to 4 rows / 1 column — a tall
// strip in the left half with the rest black — in BOTH the Big Screen tab and
// tvfull. The wall now lays every part side by side in ONE row (bcols === parts)
// and fillTvBoard's width-fill retry keeps them edge to edge, at every measured
// box shape. This suite pins: columns == parts, one row, filling the width.
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
// ---- SCALED DESKTOP (150% scaling → small CSS width, dpr>1) gets the full
// board, NOT the phone TV-preview frame (build 471 — Omar's ~1600px laptop at
// 150% reported ~1067 CSS px and got a mini board in the left with black
// around it). ----
{ const ctx=await br.newContext({viewport:{width:1067,height:600},deviceScaleFactor:1.5});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror(scaled):',e.message);});
  await load(p);
  await p.evaluate(()=>document.getElementById('tabScreen').click()); await p.waitForTimeout(300);
  await p.evaluate(()=>document.getElementById('smWork').click()); await p.waitForTimeout(1400);
  const i=await p.evaluate(()=>{const bc=document.getElementById('blockCards');const f=document.getElementById('tvFit');const r=f.getBoundingClientRect();
    return {tvprev:document.body.classList.contains('tvprev'),bcols:+getComputedStyle(bc).getPropertyValue('--bcols').trim()||0,drawnW:Math.round(r.width),vw:innerWidth};});
  ok(!i.tvprev,'scaled desktop (1067 dpr1.5): NOT the phone preview frame [tvprev '+i.tvprev+']');
  ok(i.bcols>=2&&i.drawnW>=i.vw*0.6,'scaled desktop: full board, columns, fills width [bcols '+i.bcols+' drawn '+i.drawnW+'/'+i.vw+']');
  await p.close(); await ctx.close(); }
// ---- SHORT WIDE WINDOW fills the width (build 473 — Omar's 1280x720 @150%
// scaling gave a short board box; a 2x2 board was too tall, scaled to the
// height and went narrow in the left with black around it). The grid shape now
// tracks the box shape: a short-wide box uses more columns / fewer rows and
// fills the width. ----
for(const [W,H,tag] of [[1280,500,'short'],[1280,420,'very short']]){
  const ctx=await br.newContext({viewport:{width:W,height:H},deviceScaleFactor:1.5});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror(short '+tag+'):',e.message);});
  await load(p);
  await p.evaluate(()=>document.getElementById('startBtn')&&document.getElementById('startBtn').click()); await p.waitForTimeout(250);
  await p.evaluate(()=>window.__seek&&window.__seek(600)); await p.waitForTimeout(250);
  await p.evaluate(()=>document.getElementById('tabScreen').click()); await p.waitForTimeout(250);
  await p.evaluate(()=>document.getElementById('smWork').click()); await p.waitForTimeout(1400);
  const i=await p.evaluate(()=>{const f=document.getElementById('tvFit');const r=f.getBoundingClientRect();
    return {drawnW:Math.round(r.width),vw:innerWidth,tvprev:document.body.classList.contains('tvprev')};});
  ok(!i.tvprev&&i.drawnW>=i.vw*0.8,'short-wide '+tag+' ('+W+'x'+H+' @1.5): board fills the width, not a left strip [drawn '+i.drawnW+'/'+i.vw+']');
  await p.close(); await ctx.close();
}
// ---- tvfull, every part is a COLUMN filling the width, never stacked rows.
// 4 parts -> 4 columns in ONE row, whatever the box shape (build 475). ----
for(const [W,H,tag] of [[1600,900,'landscape TV'],[1280,600,'short-wide']]){
  const ctx=await br.newContext({viewport:{width:W,height:H},deviceScaleFactor:1});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror(tvfull '+tag+'):',e.message);});
  await load(p);
  await p.goto(F+'#workout'); await p.reload(); await p.waitForTimeout(1300);
  await p.evaluate(()=>{document.body.classList.add('tvfull');dispatchEvent(new Event('resize'));});
  await p.waitForTimeout(1300);
  const i=await read(p);
  ok(i.bcols===4,'tvfull '+tag+' ('+W+'x'+H+'): 4 parts -> 4 columns, one row, no 1-col strip [bcols '+i.bcols+']');
  ok(i.drawnW>=i.vw*0.8,'tvfull '+tag+': board fills the width [drawn '+i.drawnW+'/'+i.vw+']');
  await p.close(); await ctx.close(); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
