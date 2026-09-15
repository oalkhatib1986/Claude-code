// THE TRAINER COUNTS ATHLETES, NOT TEAMS (build 410 — Omar: "the trainer
// can input the number of athletes because that's what he sees on the
// Glofox app"). In teams mode the Control picker takes ATTENDANCE and
// derives the teams (ceil — an odd headcount leaves one short team, said
// outright); two people are a PAIR, not a "team of 2"; solo is unchanged.
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
await p.evaluate(()=>{
  const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  cfg.gear=[];
  // SCORED on purpose: an unscored floor workout hides the headcount
  // (noroster) — the picker under test needs the roster on screen
  Object.assign(cfg,{name:'Lower Body',wkName:null,mode:'rotation',
    teamKind:'teams',teamSize:2,together:true,noScore:false,scoreSrc:'manual'});
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:60,blocks:[
    {name:'Part A',rounds:1,items:[
      {name:'Set 1',dur:150,fmt:'share',shareN:2,scored:true,metric:'calories',group:true,exercises:[
        {name:'Back Squat',amounts:[8],unit:'reps',max:false}]}]}]});
  localStorage.setItem(k,JSON.stringify(cfg));
});
await p.reload(); await p.waitForTimeout(1400);
await p.click('#tabTrainer'); await p.waitForTimeout(500);
const cfgNow=async()=>p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
// 1) the label asks for ATHLETES, in teams mode too
ok(await p.evaluate(()=>document.getElementById('tcLabel').textContent==='Athletes today'),
  'teams mode: the label reads Athletes today');
// 2) type Glofox's number — 23 — and the app makes the pairs
await p.click('#tcPick .mfield'); await p.waitForTimeout(200);
await p.fill('#tcPick .msearch','23');
await p.press('#tcPick .msearch','Enter'); await p.waitForTimeout(500);
{ const c=await cfgNow();
  ok(c.crews.length===12,'23 athletes -> 12 crews (ceil over pairs)');
  ok(c.attend===23,'the typed attendance is remembered');
  const lab=await p.evaluate(()=>document.querySelector('#tcPick .mfield').textContent);
  ok(/23 athletes · 12 pairs \(last has 1\)/.test(lab),
    'the field reads "23 athletes · 12 pairs (last has 1)" — got: '+lab); }
// 3) an even count says no such thing
await p.click('#tcPick .mfield'); await p.waitForTimeout(200);
await p.fill('#tcPick .msearch','24');
await p.press('#tcPick .msearch','Enter'); await p.waitForTimeout(500);
{ const lab=await p.evaluate(()=>document.querySelector('#tcPick .mfield').textContent);
  ok(/24 athletes · 12 pairs$/.test(lab.trim()),'24 athletes reads clean: '+lab); }
// 4) the trainer's pages say PAIRS, never "team of 2"
ok(await p.evaluate(()=>document.getElementById('ctTeams').textContent==='Pairs'),
  'the sub-tab says Pairs');
ok(await p.evaluate(()=>/pairs/.test(document.getElementById('tcWkSub').textContent)),
  'the workout line says pairs, not 2 per team');
// 5) the roster changing elsewhere invalidates a stale attendance
await p.evaluate(()=>window.__att=null);
await p.evaluate(()=>{ // a claim-like growth: crews change without the picker
  const k='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(k));
  c.crews.push({name:'Extra'}); localStorage.setItem(k,JSON.stringify(c)); });
await p.reload(); await p.waitForTimeout(1400);
await p.click('#tabTrainer'); await p.waitForTimeout(500);
{ const lab=await p.evaluate(()=>document.querySelector('#tcPick .mfield').textContent);
  ok(/26 athletes · 13 pairs/.test(lab),
    'a roster grown elsewhere shows full pairs, not the stale 24: '+lab); }
// 6) solo boards are untouched
await p.evaluate(()=>{ const k='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(k));
  c.teamKind='solo'; localStorage.setItem(k,JSON.stringify(c)); });
await p.reload(); await p.waitForTimeout(1400);
await p.click('#tabTrainer'); await p.waitForTimeout(500);
{ const lab=await p.evaluate(()=>document.querySelector('#tcPick .mfield').textContent);
  ok(/13 athletes/.test(lab)&&!/pair/i.test(lab),'solo: plain athlete count: '+lab); }
// 7) teams of 3 keep the word "teams" and the short-team note
await p.evaluate(()=>{ const k='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(k));
  c.teamKind='teams'; c.teamSize=3; delete c.attend; localStorage.setItem(k,JSON.stringify(c)); });
await p.reload(); await p.waitForTimeout(1400);
await p.click('#tabTrainer'); await p.waitForTimeout(500);
await p.click('#tcPick .mfield'); await p.waitForTimeout(200);
await p.fill('#tcPick .msearch','23');
await p.press('#tcPick .msearch','Enter'); await p.waitForTimeout(500);
{ const c=await cfgNow();
  ok(c.crews.length===8,'23 athletes over 3s -> 8 teams');
  const lab=await p.evaluate(()=>document.querySelector('#tcPick .mfield').textContent);
  ok(/23 athletes · 8 teams \(last has 2\)/.test(lab),'teams of 3: '+lab); }
// 8) an "All N" who label FOLLOWS the team size — never a stale count
// (teamSize is 3 at this point; the label was typed as "All 2")
await p.evaluate(()=>{ const k='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(k));
  c.rotation.blocks[0].items.push({name:'Finisher',dur:120,scored:false,group:true,
    exercises:[{name:'Plank Hold',amounts:[60],unit:'sec',max:false,who:'All 2'}]});
  localStorage.setItem(k,JSON.stringify(c)); });
await p.reload(); await p.waitForTimeout(1400);
ok(await p.evaluate(()=>{ const c=document.querySelector('#blockCards .blk');
  return !!c&&/All 3 —/.test(c.innerText); }),
  'a stale "All 2" reads "All 3 —" under teams of 3');
// 9) no clipping in the teams bar at phone width
await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(500);
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
  'phone 390: the athletes picker does not scroll the page sideways');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
