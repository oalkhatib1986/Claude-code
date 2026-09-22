// A PER-REPEAT WHO-LABEL SWAP (build 501). On a piece with repeats>1 carrying
// item-level `alternateWho:true` (or an exercise-level `swapWho:true`), the
// exercises' who labels take turns each successive repeat window: window 1 as
// written, window 2 the two who-groups swap (Pair 1 <-> Pair 2), window 3 back,
// and so on. It is DISPLAY ONLY — the piece stays ONE window on the wall
// ("4 x 4:00", one .exg.pnow, .bwhere "Round n of 4") and scores once, exactly
// as repeats works today. It updates live on the wall AND the erg tablet the
// moment the clock turns over to the next window.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1440,height:1000}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
await p.goto(F);
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(()=>{
  const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  Object.assign(cfg,{name:'Swap Test',wkName:'Swap Test',mode:'rotation',teamKind:'teams',
    teamSize:2,together:true,noScore:false,scoreSrc:'manual'});
  cfg.inventory=Object.assign(cfg.inventory||{},{Row:6,Ski:6,Bike:6,Run:6});
  // no get-ready count-in — this suite times the repeat windows directly
  cfg.display=Object.assign(cfg.display||{},{ready:0});
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:0,sameRest:true,blocks:[
    {name:'Part A',rounds:1,items:[
      {dur:240,name:'Partner Swap',group:true,scored:true,metric:'metres',scorers:2,
       repeats:4,rpt:4,alternateWho:true,exercises:[
        {who:'Pair 1',name:'Run',amounts:[],unit:'m',max:true},
        {who:'Pair 2',name:'AMRAP (Shared)',amounts:[],unit:'reps',max:true,
         lines:['30 Air Squats','20 HR Press Ups']}]}]}]});
  cfg.crews=[{name:'A'},{name:'B'}];
  localStorage.setItem(k,JSON.stringify(cfg));
});
await p.reload(); await p.waitForTimeout(1600);

const openWall=async()=>{ await p.evaluate(()=>document.getElementById('tabScreen').click());
  await p.waitForTimeout(250);
  await p.evaluate(()=>{const b=document.getElementById('smWork'); if(b) b.click();});
  await p.waitForTimeout(700); };
// the who label + name on the running piece's line at exercise slot xi
const line=xi=>p.evaluate(x=>{ const e=document.querySelector('#blockCards .exg.pnow .exl[data-xi="'+x+'"]');
  return e?e.innerText.replace(/\s+/g,' ').trim():''; },xi);
const wallHead=()=>p.evaluate(()=>{ const e=document.querySelector('#blockCards .exg.pnow .exg-h');
  return e?e.innerText.replace(/\s+/g,' ').trim():''; });
const nPnow=()=>p.evaluate(()=>document.querySelectorAll('#blockCards .exg.pnow').length);
const bwhere=()=>p.evaluate(()=>{ const e=document.querySelector('#blockCards .blk.live .bwhere');
  return e?e.innerText.replace(/\s+/g,' ').trim():''; });

// idle read: nothing runs, so read the item card itself (no .pnow yet)
const idleLine=xi=>p.evaluate(x=>{ const e=document.querySelector('#blockCards .exg[data-i="0"] .exl[data-xi="'+x+'"]');
  return e?e.innerText.replace(/\s+/g,' ').trim():''; },xi);
// ---- idle wall: as written (window 1), one piece with the repeat count ----
await openWall();
{ const r0=await idleLine(0), r1=await idleLine(1);
  ok(/pair 1/i.test(r0)&&/run/i.test(r0),'idle: line 1 is Pair 1 — Run ['+r0+']');
  ok(/pair 2/i.test(r1)&&/amrap/i.test(r1),'idle: line 2 is Pair 2 — AMRAP ['+r1+']');
  const h=await p.evaluate(()=>{ const e=document.querySelector('#blockCards .exg[data-i="0"] .exg-h');
    return e?e.innerText.replace(/\s+/g,' ').trim():''; });
  ok(/×|x/i.test(h)&&/4/.test(h),'idle: the piece reads as ONE with a repeat count ['+h+']'); }

// ---- start the clock ----
await p.evaluate(()=>document.getElementById('tabTrainer').click()); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(1000);

// ---- window 1 (as written) ----
await openWall();
{ const r0=await line(0), r1=await line(1);
  ok(/pair 1/i.test(r0)&&/run/i.test(r0),'window 1: Pair 1 — Run ['+r0+']');
  ok(/pair 2/i.test(r1)&&/amrap/i.test(r1),'window 1: Pair 2 — AMRAP ['+r1+']');
  ok(await nPnow()===1,'window 1: exactly ONE running piece on the wall (not split)'); }

// ---- window 2 (swapped) ----
await p.evaluate(()=>window.__seek(245)); await p.waitForTimeout(900);
await openWall();
{ const r0=await line(0), r1=await line(1), bw=await bwhere();
  ok(/pair 2/i.test(r0)&&/run/i.test(r0),'window 2: labels swap — Pair 2 — Run ['+r0+']');
  ok(/pair 1/i.test(r1)&&/amrap/i.test(r1),'window 2: Pair 1 — AMRAP ['+r1+']');
  ok(await nPnow()===1&&/of 4/i.test(bw),'window 2: still ONE piece, Round n of 4 ['+bw+']'); }

// ---- window 3 (back to as written) ----
await p.evaluate(()=>window.__seek(240)); await p.waitForTimeout(900);
await openWall();
{ const r0=await line(0);
  ok(/pair 1/i.test(r0)&&/run/i.test(r0),'window 3: back to as written — Pair 1 — Run ['+r0+']'); }

// ---- the erg tablet swaps too (only its own exercise, the who label alternates) ----
await p.evaluate(()=>document.getElementById('tabTablet').click()); await p.waitForTimeout(500);
await p.evaluate(()=>window.__tbOpen&&window.__tbOpen('Run:1')); await p.waitForTimeout(800);
const tkNow=()=>p.evaluate(()=>{ const e=document.querySelector('.tk-now'); return e?e.innerText.replace(/\s+/g,' ').trim():''; });
{ const t3=await tkNow();
  ok(/pair 1/i.test(t3)&&/run/i.test(t3)&&!/amrap/i.test(t3),
    'tablet window 3: Pair 1 — Run only (this machine\'s exercise) ['+t3+']'); }
await p.evaluate(()=>window.__seek(240)); await p.waitForTimeout(1000);   // -> window 4 (swapped)
{ const t4=await tkNow();
  ok(/pair 2/i.test(t4)&&/run/i.test(t4),'tablet window 4: swaps live to Pair 2 — Run ['+t4+']'); }

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
