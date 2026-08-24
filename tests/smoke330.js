// Old-engine hardening must not change the app on a modern engine: boot,
// picker face, save-as commit, board render — all as before.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1280,height:900}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
await p.goto('file:///home/user/Claude-code/leaderboard.html');
await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
ok(await p.evaluate(()=>!document.getElementById('bootErr')),'no boot error banner on a modern engine');
ok(await p.evaluate(()=>document.getElementById('evName').textContent.trim().length>0),'a board is loaded and named');
await p.click('#stSetup'); await p.waitForTimeout(600);
const face=await p.evaluate(()=>document.querySelector('#wkPick .mfield').textContent.trim());
ok(face.length>0,'the picker face renders ('+face+')');
await p.click('#wkPick .mfield'); await p.waitForTimeout(300);
await p.fill('#wkPick .msearch','Smoke Test Board'); await p.waitForTimeout(250);
await p.click('#wkPick .combo-item.add'); await p.waitForTimeout(700);
const saved=await p.evaluate(()=>({face:document.querySelector('#wkPick .mfield').textContent.trim(),
  has:JSON.parse(localStorage.getItem('af_presets_v1')).some(x=>x.name==='Smoke Test Board')}));
ok(saved.has&&saved.face==='Smoke Test Board','save-as commits and the face follows ('+saved.face+')');
const sc=await p.evaluate(()=>{ const c=structuredClone({a:[1,{b:2}]}); return JSON.stringify(c); });
ok(sc==='{"a":[1,{"b":2}]}','structuredClone still native/working');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
