// SOLO HAS NO WHO COLUMN (build 419 — Omar: "why is the exercise box so
// small although you have a lot of space to fit the text!"). .exr1.slim is
// a fixed grid whose FIRST track (118px) belongs to the Who field; on a
// solo board Who is not rendered, so auto-placement dropped the Exercise
// picker into the 118px track — "Paused ..." truncated beside a page of
// void (the CLAUDE.md column-shift family, again). No Who = no 118px
// track: .nowho rides the row and the exercise takes the width.
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
await p.reload(); await p.waitForTimeout(1200);
const seed=kind=>p.evaluate(k2=>{
  const K='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(K));
  Object.assign(cfg,{name:'Width Test',wkName:null,mode:'rotation',
    teamKind:k2,teamSize:2,together:true,noScore:true});
  cfg.gear=[];
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:0,blocks:[
    {name:'Part A',rounds:1,items:[
      {name:'Set 1',dur:150,scored:false,group:true,exercises:[
        {name:'Paused Back Squat (1s pause)',amounts:[8],unit:'reps',max:false}]}]}]});
  localStorage.setItem(K,JSON.stringify(cfg));
},kind);
const rowRead=async()=>p.evaluate(()=>{
  const r=document.querySelector('.exr1.slim'); if(!r) return null;
  const flds=[...r.querySelectorAll('.lfld')];
  const ex=flds.find(f=>/exercise/i.test(f.textContent.split('\n')[0]||f.textContent));
  const mf=ex&&ex.querySelector('.mfield');
  return {nowho:r.classList.contains('nowho'),flds:flds.length,
    rowW:r.getBoundingClientRect().width,
    exW:mf?mf.getBoundingClientRect().width:0};
});
// 1) SOLO: the exercise takes the row
await seed('solo'); await p.reload(); await p.waitForTimeout(1400);
await p.click('#stSetup'); await p.waitForTimeout(700);
{ const r=await rowRead();
  ok(!!r,'the exercise row renders');
  ok(r&&r.nowho&&r.flds===1,'solo: no Who field, .nowho on the row');
  ok(r&&r.exW>r.rowW*0.7,'solo: the exercise picker takes the width ('
    +Math.round(r.exW)+' of '+Math.round(r.rowW)+'px)'); }
// 2) TEAMS: Who keeps its narrow track, the exercise still gets the rest
await seed('teams'); await p.reload(); await p.waitForTimeout(1400);
await p.click('#stSetup'); await p.waitForTimeout(700);
{ const r=await rowRead();
  ok(r&&!r.nowho&&r.flds===2,'teams: Who is back and .nowho is gone');
  ok(r&&r.exW>r.rowW*0.55,'teams: the exercise still takes the slack ('
    +Math.round(r.exW)+' of '+Math.round(r.rowW)+'px)'); }
// 3) phone width: nothing scrolls sideways either way
await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(600);
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
  'phone 390 teams: Setup does not scroll sideways');
await seed('solo'); await p.reload(); await p.waitForTimeout(1400);
await p.click('#stSetup'); await p.waitForTimeout(700);
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
  'phone 390 solo: Setup does not scroll sideways');
{ const r=await rowRead();
  ok(r&&r.exW>r.rowW*0.6,'phone solo: the picker is still wide ('
    +Math.round(r.exW)+' of '+Math.round(r.rowW)+'px)'); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
