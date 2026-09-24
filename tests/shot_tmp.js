const {chromium}=require('playwright');
const F='file:///home/user/Claude-code/leaderboard.html';
(async()=>{
try{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await br.newContext({viewport:{width:1300,height:660},deviceScaleFactor:2});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
await p.goto(F);
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(()=>{ const PKEY='af_presets_v1'; let pr=JSON.parse(localStorage.getItem(PKEY)||'[]');
  pr.push({name:'Hyrox 05/09',ts:Date.now(),cfg:{name:'Hyrox',wkName:'Hyrox 05/09',titleSet:true,mode:'rotation',prog:{date:'2026-09-05'},inventory:{Run:6},rotation:{laps:1,blocks:[{name:'A',items:[{name:'Row',dur:120,exercises:[{name:'Run'}]}]}]}}});
  localStorage.setItem(PKEY,JSON.stringify(pr)); });
await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(()=>window.__loadLib&&window.__loadLib('Hyrox 05/09')); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('tabBoard').click()); await p.waitForTimeout(200);
await p.evaluate(()=>document.getElementById('stSetup').click()); await p.waitForTimeout(300);
await p.evaluate(()=>{ if(window.__lib&&window.__lib.fields) window.__lib.fields(); }); await p.waitForTimeout(400);
await p.screenshot({path:'/tmp/claude-0/fields_copy.png'});
await br.close();
console.log('done');
}catch(e){ console.log('ERR',e.message); }
})();
