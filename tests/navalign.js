// THE MAIN-TAB BOX MATCHES THE PILLS UNDER IT (build 503 — Omar: "the box
// housing workout, control etc must be the same size and aligned with the pills
// under them!"). alignTabs() widens the grey .tabs box so its right edge meets
// the visible sub-tab row's right edge (left edges already shared), the four tabs
// spread to fill. GROW ONLY — it never shrinks the box below its own tabs, and on
// a phone it resets to the full-width layout.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
const R=async(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);
  if(!e) return null; const x=e.getBoundingClientRect(); return {l:Math.round(x.left),r:Math.round(x.right),w:Math.round(x.width)};},sel);
const lastPill=p=>p.evaluate(()=>{ const sub=[...document.querySelectorAll('.subtabs')].find(s=>!s.hidden&&s.offsetParent!==null);
  if(!sub) return null; const pills=[...sub.querySelectorAll('button')].filter(b=>!b.hidden&&b.offsetParent!==null);
  if(!pills.length) return null; const l=pills[pills.length-1]; const x=l.getBoundingClientRect();
  const sl=sub.getBoundingClientRect().left; return {r:Math.round(x.right),subL:Math.round(sl),n:pills.length}; });
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

// ---- desktop: on the Workout page the box right edge meets the pill row's ----
{ const p=await br.newPage({viewport:{width:1280,height:820}});
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1300);
  await p.evaluate(()=>document.getElementById('tabBoard').click()); await p.waitForTimeout(400);
  const tabs=await R(p,'.tabs'), pill=await lastPill(p);
  ok(pill&&pill.n===5,'Workout shows the 5-pill sub-tab row ['+(pill&&pill.n)+']');
  ok(tabs&&pill&&Math.abs(tabs.r-pill.r)<=2,
    'the tab box right edge meets the last pill ['+tabs.r+' vs '+pill.r+']');
  ok(tabs&&pill&&Math.abs(tabs.l-pill.subL)<=2,
    'the tab box and the pill row share a left edge ['+tabs.l+' vs '+pill.subL+']');
  const jc=await p.evaluate(()=>getComputedStyle(document.querySelector('.tabs')).justifyContent);
  ok(jc==='space-between','the four tabs spread to fill the widened box ['+jc+']');
  await p.close(); }

// ---- the box is NEVER narrower than the pills (grow-only, no clipping) ----
{ const p=await br.newPage({viewport:{width:1280,height:820}});
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1300);
  await p.evaluate(()=>document.getElementById('tabBoard').click()); await p.waitForTimeout(400);
  // Setup row has the same 5 pills; switch subtab and re-check it stays matched
  await p.evaluate(()=>document.getElementById('stSetup').click()); await p.waitForTimeout(400);
  const tabs=await R(p,'.tabs'), pill=await lastPill(p);
  ok(tabs&&pill&&tabs.r>=pill.r-2,'box never ends left of the pills ['+tabs.r+' vs '+pill.r+']');
  await p.close(); }

// ---- phone: the alignment resets to the full-width tab layout (no inline width) ----
{ const p=await br.newPage({viewport:{width:390,height:840}});
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1300);
  await p.evaluate(()=>document.getElementById('tabBoard').click()); await p.waitForTimeout(400);
  const inlineW=await p.evaluate(()=>document.querySelector('.tabs').style.width||'');
  ok(inlineW==='','phone: no inline width forced on the tab box (full-width layout) ['+inlineW+']');
  const tabs=await R(p,'.tabs');
  ok(tabs&&tabs.r<=390,'phone: the tab box stays within the viewport ['+tabs.r+']');
  await p.close(); }

// ---- BOOT: the box aligns with the pills WITHOUT any tab click (build 504 —
//      Omar: "make the box go wider to align with Archive", still off after 503
//      because boot measured before the font loaded and never re-ran) ----
for(const w of [1280,1536,1920]){
  const p=await br.newPage({viewport:{width:w,height:860}});
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1600);   // no tab click — boot state only
  const tabsR=await p.evaluate(()=>Math.round(document.querySelector('.tabs').getBoundingClientRect().right));
  const arch=await lastPill(p);
  ok(arch&&Math.abs(tabsR-arch.r)<=2,'w='+w+' boot: box right meets the last pill ['+tabsR+' vs '+(arch&&arch.r)+']');
  await p.close();
}

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
