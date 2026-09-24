// A CHANGE IN SETUP IS KEPT ON PURPOSE (build 411 — Omar: "if I change tabs
// and I haven't saved it must ask me save changes or not? and if I click no
// then it doesn't show the changes in overview"). Leaving Setup with a
// changed cfg asks Keep/Undo in the site's own dialog — mid-class included,
// where Undo rides the keep/restore rebuild and the clock never stops. No
// change = no ask; picking a board refreshes the snapshot; only the two
// buttons answer (a stray tap outside keeps).
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
await p.reload(); await p.waitForTimeout(1600);   // SIS loads a full board
const cfgName=async()=>p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')).name);
const dlgUp=async()=>p.evaluate(()=>{ const d=document.querySelector('.dlg-back .dmsg');
  return d?d.textContent:null; });
const orig=await cfgName();
// 1) change the display title in Setup, leave -> the ask appears
await p.click('#stSetup'); await p.waitForTimeout(600);
await p.evaluate(()=>window.__lib&&window.__lib.fields&&window.__lib.fields()); await p.waitForTimeout(150);
await p.fill('#cName','Changed Title'); await p.waitForTimeout(300);
await p.click('#stWorkout'); await p.waitForTimeout(400);
ok(/Keep the changes/i.test(await dlgUp()||''),'leaving Setup with a change ASKS');
// 2) Undo puts everything back
await p.click('.dlg-back .dno'); await p.waitForTimeout(600);
ok(await cfgName()===orig,'Undo restores the cfg ('+orig+')');
ok(await p.evaluate(o=>document.getElementById('evName').textContent.trim().toLowerCase()===o.toLowerCase(),orig),
  'the Overview title shows the OLD name again');
// 3) Keep keeps
await p.click('#stSetup'); await p.waitForTimeout(600);
await p.evaluate(()=>window.__lib&&window.__lib.fields&&window.__lib.fields()); await p.waitForTimeout(150);
await p.fill('#cName','Changed Title'); await p.waitForTimeout(300);
await p.click('#stWorkout'); await p.waitForTimeout(400);
await p.click('.dlg-back .dok'); await p.waitForTimeout(500);
ok(await cfgName()==='Changed Title','Keep keeps the change');
// 4) no change = no ask
await p.click('#stSetup'); await p.waitForTimeout(600);
await p.evaluate(()=>window.__lib&&window.__lib.fields&&window.__lib.fields()); await p.waitForTimeout(150);
await p.click('#stWorkout'); await p.waitForTimeout(400);
ok((await dlgUp())===null,'leaving Setup untouched asks NOTHING');
// 5) a stray tap outside the dialog never undoes — only the buttons answer
await p.click('#stSetup'); await p.waitForTimeout(600);
await p.evaluate(()=>window.__lib&&window.__lib.fields&&window.__lib.fields()); await p.waitForTimeout(150);
await p.fill('#cName','Third Title'); await p.waitForTimeout(300);
await p.click('#stWorkout'); await p.waitForTimeout(400);
await p.mouse.click(10,300); await p.waitForTimeout(300);
ok(/Keep the changes/i.test(await dlgUp()||''),'a tap outside leaves the question standing');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
ok(/Keep the changes/i.test(await dlgUp()||''),'Escape does not answer it either');
await p.click('.dlg-back .dok'); await p.waitForTimeout(400);
// 6) MID-CLASS: the ask still comes, and Undo keeps the clock running
await p.click('#tabTrainer'); await p.waitForTimeout(500);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1200);
await p.click('#tabBoard'); await p.waitForTimeout(300);
await p.click('#stSetup'); await p.waitForTimeout(600);
await p.evaluate(()=>window.__lib&&window.__lib.fields&&window.__lib.fields()); await p.waitForTimeout(150);
await p.fill('#cName','Mid Class Edit'); await p.waitForTimeout(300);
await p.click('#stWorkout'); await p.waitForTimeout(400);
ok(/Keep the changes/i.test(await dlgUp()||''),'mid-class: leaving Setup still asks');
await p.click('.dlg-back .dno'); await p.waitForTimeout(800);
ok(await cfgName()==='Third Title','mid-class Undo restores the cfg');
{ const t1=await p.evaluate(()=>document.getElementById('clock').textContent);
  await p.waitForTimeout(1500);
  const t2=await p.evaluate(()=>document.getElementById('clock').textContent);
  ok(t1!==t2,'the clock keeps counting through the undo ('+t1+' -> '+t2+')'); }
ok(await p.evaluate(()=>!!document.querySelector('#blockCards .blk.live')),
  'the live card is still on screen');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
