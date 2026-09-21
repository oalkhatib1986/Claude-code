// THE PICKER IS SORTED BY DATE, NEWEST FIRST (build 469 — Omar: "shouldn't
// these be sorted by date! common sense"). buildPresetSel's getOpts sorts the
// trainer's saved boards by cfg.prog.date descending; a dateless board sinks
// below the dated ones and sorts by name. This suite seeds boards out of date
// order, opens the picker, and asserts the rendered rows come back newest-first.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
const bd=(name,date)=>({name,ts:Date.now(),cfg:{name,wkName:name,mode:'rotation',teamKind:'solo',
  together:true,noScore:true,scoreSrc:'manual',prog:date?{date}:{},
  rotation:{laps:1,blockRest:0,blocks:[{name:'A',rounds:1,items:[{name:'',dur:60,exercises:[{name:'Row',amounts:[10],unit:'reps'}]}]}]}}});
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1200,height:900}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
p.on('dialog',d=>d.accept());
await p.goto(F);
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1'),
  localStorage.setItem('af_seed14_v1','1'),localStorage.setItem('af_sis2_v1','1')));
await p.reload(); await p.waitForTimeout(1200);
// seed plain (non-seedV) presets, deliberately out of date order
await p.evaluate((rows)=>{
  localStorage.setItem('af_presets_v1',JSON.stringify(rows));
}, [bd('Engine','2026-09-15'),bd('Upper Body','2026-09-21'),bd('Send It Saturday','2026-09-12'),
    bd('Lower Body','2026-09-16'),bd('Old One','2026-09-05'),bd('No Date',null)]);
await p.reload(); await p.waitForTimeout(1300);
// open the picker and read the rendered option order (names only)
const order=await p.evaluate(()=>{
  const wp=document.getElementById('wkPick'); const btn=wp&&wp.querySelector('.mfield,button,.mbtn');
  (btn||wp.firstElementChild).click();
  return [...document.querySelectorAll('#wkPick .combo-item[data-v]')].map(el=>el.querySelector('span').textContent);
});
console.log('order:',order.join(' | '));
const dated=order.filter(n=>n!=='No Date');
const want=['Upper Body','Lower Body','Engine','Send It Saturday','Old One'];
ok(JSON.stringify(dated)===JSON.stringify(want),
   'dated boards newest-first ['+dated.join(',')+']');
ok(order[order.length-1]==='No Date','a dateless board sinks to the bottom ['+order.join(',')+']');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
