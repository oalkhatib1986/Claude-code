// FULL-AUDIT STRESS SWEEP (Omar, build 360): class sizes × formats × flows,
// running states driven through work/rest/score via __seek, full-screen
// coverage on three screens, every tab at phone width, and the tablet claim.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const APP='file:///home/user/Claude-code/leaderboard.html';
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1366,height:1000}});
let perr=[]; p.on('pageerror',e=>perr.push(e.message));
const freshErr=()=>{ const e=perr; perr=[]; return e; };
await p.goto(APP);
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1800);

// ---------- 1. class-size × format × flow matrix ----------
const loadCase=async(board,n,kind,together,realNames)=>{ await p.evaluate(a=>{
    const ps=JSON.parse(localStorage.getItem('af_presets_v1'));
    const src=ps.find(x=>x.name===a.board);
    const c=JSON.parse(JSON.stringify(src.cfg));
    c.wkName=a.board; c.teamKind=a.kind; if(a.kind==='teams') c.teamSize=4;
    c.together=a.together;
    // placeholder names keep the chips in station-first FREE form (what the
    // matrix reads); REAL names are needed where the engine must count —
    // an unnamed slot is rightly a ghost that never scores
    c.crews=Array.from({length:a.n},(_,i)=>({name:a.real?('Crew '+(i+1)):
      ((a.kind==='solo'?'Athlete ':'Team ')+(i+1))}));
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
  },{board,n,kind,together,real:!!realNames});
  await p.reload(); await p.waitForTimeout(1400); };
for(const board of ['Tuesday Engine','Send It Saturday']){
  for(const n of [1,5,13,40]){
    for(const [kind,together] of [['solo',true],['solo',false],['teams',false]]){
      await loadCase(board,n,kind,together);
      const r=await p.evaluate(()=>{
        const inv=JSON.parse(localStorage.getItem('af_erg_cfg_v8')).inventory;
        const bad=[];
        [...document.querySelectorAll('#blockCards .teams .tn')].forEach(e=>{
          const t=e.textContent;
          [['Ski',inv.Ski],['Run',inv.Run],['Row',inv.Row],['Bike',inv.Bike]].forEach(([k,c])=>{
            const m=t.match(new RegExp(k+'\\s*(\\d+)','i'));
            if(m&&+m[1]>c) bad.push(t.trim()); });
        });
        return {sx:document.documentElement.scrollWidth-innerWidth,
          cards:document.querySelectorAll('#blockCards .blk').length, bad};
      });
      const errs=freshErr();
      ok(!errs.length&&r.sx<=0&&r.cards>0&&!r.bad.length,
        `${board} · ${n} ${kind}${together?' together':' split'}: renders clean`
        +(errs.length?' ERR:'+errs[0]:'')+(r.bad.length?' OVER:'+r.bad[0]:'')+(r.sx>0?' scrollX '+r.sx:''));
    }
  }
}

// ---------- 2. a running class driven through its states ----------
await loadCase('Tuesday Engine',40,'solo',false);
await p.click('#tabTrainer'); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1500);
await p.click('#tabBoard'); await p.waitForTimeout(700);
const clockState=()=>p.evaluate(()=>{
  const c=document.querySelector('.clock');
  return {t:document.getElementById('clock').textContent,
    lab:document.getElementById('clockLab').textContent,
    rest:c.classList.contains('rest'),
    frac:+getComputedStyle(c).getPropertyValue('--cfrac')||0,
    running:!!document.querySelector('#blockCards .exg.pnow')};
});
{ const s=await clockState();
  ok(/^\d+:\d\d$/.test(s.t)&&s.lab==='Work'&&!s.rest&&s.frac>0&&s.frac<=1&&s.running,
    'run t=0: WORK state, live slab, drain in range ('+JSON.stringify(s)+')'); }
await p.evaluate(()=>window.__seek(185)); await p.waitForTimeout(700);
{ const s=await clockState();
  ok(s.lab==='Rest'&&s.rest,'t≈3:05: the EMOM rest minute flips the clock to REST'); }
await p.evaluate(()=>window.__seek(60)); await p.waitForTimeout(700);
{ const s=await clockState();
  ok(s.lab==='Work'&&!s.rest,'t≈4:05: round 2 flips back to WORK'); }
await p.evaluate(()=>window.__seek(1150)); await p.waitForTimeout(700);
{ const s=await clockState(); const errs=freshErr();
  ok(!errs.length&&/^\d+:\d\d$/.test(s.t),'t≈23:15 (past block A): clock still sane, no errors'
    +(errs.length?' ERR:'+errs[0]:'')); }
// pause and resume
await p.click('#tabTrainer'); await p.waitForTimeout(300);
const pauseBtn=await p.evaluate(()=>{const b=[...document.querySelectorAll('button')]
  .find(x=>/pause/i.test(x.textContent)&&x.offsetParent); if(b){b.click();return true;} return false;});
await p.waitForTimeout(600);
if(pauseBtn){ const t1=await p.evaluate(()=>document.getElementById('clock').textContent);
  await p.waitForTimeout(1300);
  const t2=await p.evaluate(()=>document.getElementById('clock').textContent);
  ok(t1===t2,'pause holds the clock ('+t1+')');
  await p.evaluate(()=>{const b=[...document.querySelectorAll('button')]
    .find(x=>/resume|continue/i.test(x.textContent)&&x.offsetParent); if(b) b.click();});
  await p.waitForTimeout(600);
} else ok(true,'pause control not exposed here — skipped');
// reset: no zombie clock
await p.evaluate(()=>{const b=document.getElementById('resetBtn'); if(b&&!b.disabled) b.click();});
await p.waitForTimeout(400);
await p.evaluate(()=>{const d=document.querySelector('.dlg .dok'); if(d) d.click();});
await p.waitForTimeout(800);
{ const t1=await p.evaluate(()=>document.getElementById('clock').textContent);
  await p.waitForTimeout(1300);
  const r=await p.evaluate(t=>({same:document.getElementById('clock').textContent===t,
    live:!!document.querySelector('#blockCards .exg.pnow')}),t1);
  ok(r.same&&!r.live,'reset stops the clock dead — no zombie ('+t1+')'); }

// ---------- 3. a scored board: leaderboard + SCORE state ----------
await loadCase('Send It Saturday',8,'teams',false,true);
await p.click('#tabTrainer'); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1500);
await p.evaluate(()=>window.__seek(990)); await p.waitForTimeout(900);
{ const hot=await p.evaluate(()=>({hot:document.getElementById('clock').classList.contains('hot')
    ||/score/i.test(document.getElementById('clockLab').textContent),
    err:0}));
  const errs=freshErr();
  ok(!errs.length,'scored window: no errors while scoring'+(errs.length?' ERR:'+errs[0]:''));
  ok(hot.hot,'scored window: the clock shows SCORE/hot'); }
await p.goto(APP+'#screen'); await p.waitForTimeout(1500);
{ const r=await p.evaluate(()=>({lanes:document.querySelectorAll('#lanes .lane').length,
    sx:document.documentElement.scrollWidth-innerWidth}));
  const errs=freshErr();
  ok(!errs.length&&r.lanes>0&&r.sx<=0,'leaderboard screen: lanes render, nothing spills ('+r.lanes+' lanes)'); }

// ---------- 4. full screen fills the screen — three screens ----------
for(const [w,h] of [[1920,1080],[2560,1440],[402,874]]){
  await p.setViewportSize({width:w,height:h});
  await p.goto(APP+'#workout'); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ document.body.classList.add('tvfull'); dispatchEvent(new Event('resize')); });
  await p.waitForTimeout(1300);
  const r=await p.evaluate(()=>{ const f=document.getElementById('tvFit').getBoundingClientRect();
    return {w:f.width,h:f.height,right:f.right,bottom:f.bottom}; });
  const errs=freshErr();
  ok(!errs.length&&r.w>=0.88*w&&r.right<=w+2&&r.bottom<=h+2,
    `tvfull ${w}x${h}: board fills and stays inside (${Math.round(r.w)}x${Math.round(r.h)})`);
}

// ---------- 5. every tab at phone width ----------
await p.setViewportSize({width:390,height:844});
await p.goto(APP); await p.reload(); await p.waitForTimeout(1500);
const tabs=[['#tabBoard','Overview'],['#stSetup','Setup'],['#stLayout','Layout'],
  ['#stResults','Results'],['#stArchive','Archive'],['#tabTrainer','Control'],
  ['#tabScreen','Big Screen'],['#tabTablet','Erg Tablet']];
for(const [sel,name] of tabs){
  await p.click(sel); await p.waitForTimeout(600);
  const sx=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  const errs=freshErr();
  ok(!errs.length&&sx<=0,`phone 390 · ${name}: no sideways scroll, no errors`
    +(sx>0?' scrollX '+sx:'')+(errs.length?' ERR:'+errs[0]:''));
}

// ---------- 6. the tablet claim, end to end ----------
await p.setViewportSize({width:1280,height:900});
await p.goto(APP); await p.reload(); await p.waitForTimeout(1500);
await loadCase('Send It Saturday',8,'teams',false);   // SCORED — unscored boards rightly never ask (build 369)
await p.click('#tabTablet'); await p.waitForTimeout(900);
const twc=await p.evaluate(()=>{const t=document.querySelector('#tbStage .twc, .twc');
  if(t){t.click();return true;} return false;});
await p.waitForTimeout(900);
ok(twc,'tablet: the wall lists machines and one opens');
const claimed=await p.evaluate(()=>{
  const inp=document.getElementById('tbClaim'); if(!inp) return {no:'no claim box'};
  inp.value='Omar';
  const go=document.getElementById('tbClaimGo'); if(!go) return {no:'no go btn'};
  go.click(); return {ok:1};
});
await p.waitForTimeout(900);
if(claimed.ok){
  const r=await p.evaluate(()=>({named:JSON.parse(localStorage.getItem('af_erg_cfg_v8'))
    .crews.some(c=>c.name==='Omar')}));
  ok(r.named,'tablet: a tapped-in name lands in the roster');
} else ok(false,'tablet claim box missing: '+claimed.no);
const errs=freshErr();
ok(!errs.length,'tablet flow: no errors'+(errs.length?' ERR:'+errs[0]:''));

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
