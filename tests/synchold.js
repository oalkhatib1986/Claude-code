// A HOLD IS RE-DERIVED, NEVER BLINDLY TRUSTED (build 466 — Omar's Upper Body
// kept showing "Next part — press start" on a build that rests). A stale
// device / stale relay state can publish hold:true at a boundary THIS build no
// longer holds at (a blockRest transition). A follower must NOT freeze on it:
// it honours a synced hold only when its own holdBounds agrees.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
let sess=null;
async function wire(ctx){
  await ctx.route('https://relay.test/**',async route=>{
    const req=route.request();
    const cors={'access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'};
    if(req.method()==='OPTIONS') return route.fulfill({status:204,headers:cors});
    let b={}; try{ b=JSON.parse(req.postData()||'{}'); }catch(e){}
    const json=o=>route.fulfill({status:200,headers:{'content-type':'application/json',...cors},body:JSON.stringify(o)});
    if(b.op==='s.put'){ sess=b.v; return json({ok:1}); }
    if(b.op==='s.get') return json({v:sess});
    if(b.op==='lib.list') return json({presets:[]});
    if(b.op==='lib.put') return json({ok:1});
    return route.fulfill({status:500,headers:cors,body:'not mocked'});
  });
}
async function boot(br,label){
  const ctx=await br.newContext({viewport:{width:1440,height:1000}});
  await wire(ctx);
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror('+label+'):',e.message);});
  p.on('dialog',d=>d.accept());
  await p.goto(F);
  // let the SIS one-shot load a full board (it carries cfg.scoring etc.) so
  // af_erg_cfg_v8 exists; we overwrite its rotation with Omar's Upper Body.
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_mw_v1','1'),
    localStorage.setItem('af_prog_v1','1'),
    localStorage.setItem('af_ai_url','https://relay.test/ai')));
  await p.reload(); await p.waitForTimeout(1800);
  return p;
}
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// Actor A: build Omar's Upper Body board and start it.
const A=await boot(br,'actor');
await A.waitForFunction(()=>{try{return !!localStorage.getItem('af_erg_cfg_v8');}catch(e){return false;}});
await A.evaluate(()=>{
  const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  Object.assign(c,{name:'Upper Body',wkName:'Upper Body',mode:'rotation',teamKind:'solo',together:true,noScore:true,scoreSrc:'manual'});
  c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:60,sameRest:true,blocks:[
    {name:'Part A',rounds:1,items:[{name:'',dur:600,scored:false,hold:false,exercises:[{name:'Barbell Bench Press',amounts:[8],unit:'reps',max:true,sets:4,rpe:'7'}]}]},
    {name:'Part B',rounds:1,items:[{name:'',dur:540,exercises:[{name:'Row',amounts:[10],unit:'reps',sets:3}]}]},
    {name:'Part C',rounds:1,items:[{name:'',dur:480,exercises:[{name:'Press',amounts:[9],unit:'reps'}]}]} ]});
  c.crews=[{name:'A1'}];
  localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
});
await A.reload(); await A.waitForTimeout(1600);
await A.evaluate(()=>document.getElementById('startBtn').click()); await A.waitForTimeout(500);
await A.evaluate(()=>window.__seek&&window.__seek(560)); await A.waitForTimeout(700);
ok(!!(sess&&sess.run&&sess.run.act),'actor published a running session');
// A itself does NOT hold this board (blockRest transition rests)
ok(!(await A.evaluate(()=>window.__sessState().hold)),'actor never holds this board (rest, not hold)');
// Now a STALE publisher forces a spurious hold at the block end.
sess=JSON.parse(JSON.stringify(sess));
sess.src='stalexx'; sess.ts=Date.now()+999999; sess.kind='clock';
sess.run.hold=true; sess.run.run=true; sess.run.act=true; sess.run.phase='run';
// (elapsed/t0e left as A published them, mid-Part-A — the hold flag is the point)
// Follower B adopts it.
const B=await boot(br,'follower');
await B.waitForTimeout(3400);   // one pull cycle
const st=await B.evaluate(()=>window.__sessState());
const cs=await B.evaluate(()=>(document.getElementById('clockState')||{}).textContent);
ok(st.hold===false,'follower re-derives holding=false for a board with no hold boundary ['+st.hold+']');
ok(!/press start/i.test(cs||''),'follower does not freeze on "Next part — press start" ['+cs+']');
ok(st.run===true,'follower keeps the class running / transitioning, not frozen');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
