// SETUP'S EXERCISE ROW SAYS EVERYTHING IT KNOWS (builds 419-420).
// 419: on a solo board the absent Who field let auto-placement drop the
// Exercise picker into Who's 118px track ("Paused …" beside a page of
// void). 420 retires that fix by removing its cause: THE WHO LABEL IS
// EDITABLE EVERYWHERE (Omar found P1/P2 on the card with no field
// anywhere) — the Who dropdown renders in BOTH modes ("— everyone"
// clears), the Overview tap-editor carries a Who field, the Sets picker
// says "1 ×" for the single-set state (Omar: "I want to see 1x") and
// Sets/RPE lose their fixed 84px so no field truncates its own text.
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
        {name:'Paused Back Squat (1s pause)',amounts:[8],unit:'reps',max:false,who:'P1'},
        {name:'Wall Sit',amounts:[45],unit:'sec',max:false,who:'P2'}]}]}]});
  localStorage.setItem(K,JSON.stringify(cfg));
},kind);
const rowRead=async()=>p.evaluate(()=>{
  const r=document.querySelector('.exr1.slim'); if(!r) return null;
  const flds=[...r.querySelectorAll('.lfld')];
  const who=flds.find(f=>/^who/i.test(f.textContent.trim()));
  const ex=flds.find(f=>/exercise/i.test(f.textContent.split('\n')[0]||f.textContent));
  const mf=ex&&ex.querySelector('.mfield');
  return {flds:flds.length,who:!!who,
    whoTxt:who?who.querySelector('.mfield').textContent.trim():'',
    rowW:r.getBoundingClientRect().width,
    exW:mf?mf.getBoundingClientRect().width:0};
});
// no field may truncate its own text — the CLAUDE.md law, machine-checked
const noClip=async()=>p.evaluate(()=>{
  const bad=[];
  document.querySelectorAll('.exr2 .mfield,.exr3 .mfield,.exr2 select,.exr3 input').forEach(el=>{
    if(el.offsetParent&&el.scrollWidth>el.clientWidth) bad.push(el.textContent.trim().slice(0,20)||el.value);
  });
  return bad;
});
// 1) SOLO: the Who field is THERE now, and the exercise stays wide
await seed('solo'); await p.reload(); await p.waitForTimeout(1400);
await p.click('#stSetup'); await p.waitForTimeout(700);
await p.evaluate(()=>window.__lib&&window.__lib.fields&&window.__lib.fields()); await p.waitForTimeout(200);
{ const r=await rowRead();
  ok(!!r&&r.who&&r.flds===2,'solo: the Who field renders (P1/P2 finally has a home)');
  ok(r&&r.whoTxt==='P1','solo: it shows the line\'s label: '+(r&&r.whoTxt));
  ok(r&&r.exW>r.rowW*0.55,'solo: the exercise picker keeps its width ('
    +Math.round(r.exW)+' of '+Math.round(r.rowW)+'px)'); }
// 2) picking "— everyone" CLEARS the label
{ await p.evaluate(()=>{ const r=document.querySelector('.exr1.slim');
    [...r.querySelectorAll('.lfld')].find(f=>/^who/i.test(f.textContent.trim()))
      .querySelector('.mfield').click(); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>{ const it=[...document.querySelectorAll('.mpanel:not([hidden]) .combo-item')]
    .find(x=>/everyone/i.test(x.textContent)); if(it) it.click(); });
  await p.waitForTimeout(500);
  const c=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  ok(!c.rotation.blocks[0].items[0].exercises[0].who,'"— everyone" removes the who from the data'); }
// 3) the Sets picker says 1 × — and nothing in the row clips its text
{ const setsTxt=await p.evaluate(()=>{ const f=document.querySelector('.mwrap.isets .mfield');
    return f?f.textContent.trim():''; });
  ok(setsTxt==='1 ×','the single-set state reads "1 ×", not "— none": '+setsTxt);
  const bad=await noClip();
  ok(!bad.length,'no Setup field truncates its own text'+(bad.length?' — clipped: '+bad.join(', '):'')); }
// 4) TEAMS: unchanged shape, Who present, exercise wide
await seed('teams'); await p.reload(); await p.waitForTimeout(1400);
await p.click('#stSetup'); await p.waitForTimeout(700);
await p.evaluate(()=>window.__lib&&window.__lib.fields&&window.__lib.fields()); await p.waitForTimeout(200);
{ const r=await rowRead();
  ok(r&&r.who&&r.flds===2,'teams: Who is there as always');
  ok(r&&r.exW>r.rowW*0.55,'teams: the exercise takes the slack ('
    +Math.round(r.exW)+' of '+Math.round(r.rowW)+'px)'); }
// 5) THE TAP-EDITOR CARRIES WHO: edit P2 onto a line from the Overview
await p.click('#stWorkout'); await p.waitForTimeout(600);
await p.click('#bEditBtn'); await p.waitForTimeout(400);
await p.evaluate(()=>{ const l=document.querySelector('#blockCards .exl[data-xi="0"]'); l.click(); });
await p.waitForTimeout(400);
ok(await p.evaluate(()=>!!document.getElementById('befWho')),'the exercise editor has a Who field');
await p.evaluate(()=>{ const w=document.getElementById('befWho'); w.value='P2'; });
await p.evaluate(()=>{ document.querySelector('.bef [data-bev="save"]').click(); });
await p.waitForTimeout(700);
{ const c=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
  ok(c.rotation.blocks[0].items[0].exercises[0].who==='P2','saving writes the label to the data');
  ok(await p.evaluate(()=>/P2 —/.test(document.querySelector('#blockCards .blk').innerText)),
    'and the card prints "P2 —" on the line'); }
// 6) phone width: nothing scrolls sideways, nothing clips
await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(600);
await p.click('#stSetup'); await p.waitForTimeout(700);
await p.evaluate(()=>window.__lib&&window.__lib.fields&&window.__lib.fields()); await p.waitForTimeout(200);
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
  'phone 390: Setup does not scroll sideways');
{ const bad=await noClip();
  ok(!bad.length,'phone 390: no field truncates'+(bad.length?' — clipped: '+bad.join(', '):'')); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
