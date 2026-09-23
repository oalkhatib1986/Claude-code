// LOADING A BOARD MID-CLASS ASKS FIRST (build 504 — Omar: "if I choose another
// workout while one is running, why does the clock keep going? I should get a pop
// up: changing the workout will reset the session"). The Setup picker's load path
// confirms when a session is live; Keep running changes nothing, Load & reset ends
// the session and loads the new board. Idle, it loads straight away (no dialog).
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
const bd=(name)=>({name,ts:Date.now(),cfg:{name,wkName:name,mode:'rotation',teamKind:'solo',
  together:true,noScore:true,scoreSrc:'manual',prog:{},display:{ready:0},
  rotation:{laps:1,blockRest:0,sameRest:true,blocks:[{name:'A',rounds:1,
    items:[{dur:600,name:name,exercises:[{name:'Squat',amounts:[10],unit:'reps'}]}]}]}}});
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1280,height:960}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
await p.goto(F);
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1200);
await p.evaluate(rows=>{ localStorage.setItem('af_presets_v1',JSON.stringify(rows));
  const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8')); Object.assign(c,rows[0].cfg);
  localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); },[bd('Alpha'),bd('Bravo')]);
await p.reload(); await p.waitForTimeout(1400);

await p.evaluate(()=>document.getElementById('tabTrainer').click()); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(600);
ok(await p.evaluate(()=>window.__sessState().run===true),'session is running on Alpha');

const pick=async name=>{
  await p.evaluate(()=>document.getElementById('tabBoard').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>document.getElementById('stSetup').click()); await p.waitForTimeout(400);
  await p.evaluate(()=>{ const f=document.querySelector('#wkPick .mfield'); if(f) f.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(n=>{ const opt=[...document.querySelectorAll('#wkPick .combo-item[data-v]')]
    .find(e=>e.dataset.v===n); if(opt) opt.click(); },name);
  await p.waitForTimeout(400);
};
await pick('Bravo');
{ const dlg=await p.evaluate(()=>{ const d=document.querySelector('.dlg-back .dmsg'); return d?d.textContent:''; });
  ok(/running/i.test(dlg)&&/reset/i.test(dlg),'a confirm dialog warns the running session will reset ['+dlg.slice(0,50)+']');
  ok(await p.evaluate(()=>window.__sessState().run)===true,'while the dialog is up the session keeps running'); }
await p.evaluate(()=>{ const b=[...document.querySelectorAll('.dlg-back .dno,.dlg-back button')]
  .find(e=>/keep running/i.test(e.textContent)); if(b) b.click(); });
await p.waitForTimeout(500);
{ const nm=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')).wkName);
  ok(nm==='Alpha'&&await p.evaluate(()=>window.__sessState().run)===true,'Keep running: still Alpha, still running ['+nm+']'); }

await pick('Bravo');
await p.evaluate(()=>{ const b=[...document.querySelectorAll('.dlg-back .dok,.dlg-back button')]
  .find(e=>/load & reset|load and reset|load/i.test(e.textContent)); if(b) b.click(); });
await p.waitForTimeout(700);
{ const nm=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')).wkName);
  ok(nm==='Bravo','Load & reset: Bravo is now loaded ['+nm+']');
  ok(await p.evaluate(()=>window.__sessState().run)!==true,'Load & reset: the running session was ended'); }

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
