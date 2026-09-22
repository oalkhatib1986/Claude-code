// THE AI ACTS ON MANY BOARDS IN ONE MESSAGE (build 499 — Omar: "rename ALL the
// lowercase Engine boards to ENGINE… did I say all?!" and "this AI needs to be as
// capable as you, it shouldn't be limited like this"). The app AI used to apply
// one workout per message; now the response may carry renames:[] (bulk rename +
// retitle) and workouts:[] (bulk create/edit), and the app applies them all.
// This suite mocks the relay and asserts a batch rename and a batch build both
// land in one turn.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
const bd=(name,date)=>({name,ts:Date.now(),cfg:{name,wkName:name,mode:'rotation',teamKind:'solo',
  together:true,noScore:true,scoreSrc:'manual',inventory:{Row:6},library:[],prog:{date},
  rotation:{laps:1,blockRest:0,sameRest:true,blocks:[{name:'A',rounds:1,items:[{dur:600,exercises:[{name:'X',amounts:[10],unit:'reps'}]}]}]}}});
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await br.newContext({viewport:{width:1200,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
let payload={reply:'ok'};
await p.route('https://relay.test/**',async route=>{
  const b=JSON.parse(route.request().postData()||'{}');
  if(b.op) return route.fulfill({json:{ok:1,v:null,now:Date.now(),presets:[]}});
  return route.fulfill({json:{content:[{type:'text',text:JSON.stringify(payload)}]}});
});
await p.goto(F);
await p.evaluate(()=>{localStorage.clear();localStorage.setItem('af_prog_v1','1');localStorage.setItem('af_ai_url','https://relay.test');});
await p.reload(); await p.waitForTimeout(1000);
await p.evaluate(rows=>{ localStorage.setItem('af_presets_v1',JSON.stringify(rows));
  const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8')); Object.assign(c,rows[0].cfg);
  localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); },
  [bd('Engine 22/09','2026-09-22'),bd('Engine 15/09','2026-09-15'),bd('Engine 29/09','2026-09-29')]);
await p.reload(); await p.waitForTimeout(1200);
const openAI=()=>p.evaluate(()=>{const f=document.getElementById('aiFab');
  f.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:5,clientY:5,bubbles:true}));
  f.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,clientX:5,clientY:5,bubbles:true}));});
const send=async()=>{ await p.evaluate(()=>{document.getElementById('aiText').value='do it';});
  await p.evaluate(()=>document.getElementById('aiSend').click()); await p.waitForTimeout(1500); };
await openAI(); await p.waitForTimeout(300);

// ---- BATCH RENAME: all three lowercase Engine -> ENGINE, name AND title ----
payload={reply:'Renaming all Engine to ENGINE.',renames:[
  {name:'Engine 22/09',to:'ENGINE 22/09',title:'ENGINE'},
  {name:'Engine 15/09',to:'ENGINE 15/09',title:'ENGINE'},
  {name:'Engine 29/09',to:'ENGINE 29/09',title:'ENGINE'}]};
await send();
const after=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_presets_v1'))
  .map(x=>({name:x.name,title:x.cfg.name})));
ok(after.length===3 && after.every(b=>/^ENGINE /.test(b.name)&&b.title==='ENGINE') && !after.some(b=>/^Engine /.test(b.name)),
  'renames[]: all three boards renamed + retitled to ENGINE in ONE message ['+after.map(b=>b.name).join(', ')+']');

// ---- BATCH BUILD: two new boards in one message ----
payload={reply:'Built two.',workouts:[
  {name:'Grinder',teamKind:'solo',together:true,noScore:true,blocks:[{name:'A',rounds:1,items:[{dur:300,exercises:[{name:'Row',amounts:[10],unit:'reps'}]}]}]},
  {name:'Sprint',teamKind:'solo',together:true,noScore:true,blocks:[{name:'A',rounds:1,items:[{dur:120,exercises:[{name:'Bike',amounts:[10],unit:'reps'}]}]}]}]};
await send();
const names=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_presets_v1')).map(x=>x.name));
ok(names.includes('Grinder')&&names.includes('Sprint'),
  'workouts[]: two new boards saved in ONE message ['+names.join(', ')+']');

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
