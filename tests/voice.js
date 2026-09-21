// COUNTDOWN BEEPS (build 469 — Omar: "instead of someone saying 3 2 1 why
// don't we do it as beeps?"). The last three seconds of the interval the class
// is inside are beeped (rising 660/830/1046 Hz), riding the same `remain` the
// big clock shows. cfg.display.voice gates it (default on via migrate dispV<5).
// This suite mocks Web Audio, runs the clock through a boundary, and asserts
// three beeps fire in rising pitch — and that toggling it off silences them.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
// Mock AudioContext: every oscillator records its frequency the instant it is
// started, so __spoken holds the pitch of each beep in order.
const MOCK=`
  window.__spoken=[];
  function FakeCtx(){ this.currentTime=0; this.state='running'; this.destination={}; }
  FakeCtx.prototype.resume=function(){ this.state='running'; };
  FakeCtx.prototype.createGain=function(){ return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}; };
  FakeCtx.prototype.createOscillator=function(){ const o={frequency:{value:0},type:'',connect(){},stop(){},
    start(){ window.__spoken.push(Math.round(o.frequency.value)); }}; return o; };
  window.AudioContext=FakeCtx; window.webkitAudioContext=FakeCtx;
`;
async function boot(br,voice,beepN){
  const ctx=await br.newContext({viewport:{width:1440,height:960}});
  const p=await ctx.newPage();
  await p.addInitScript(MOCK);
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  p.on('dialog',d=>d.accept());
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate(({voice,beepN})=>{
    const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    Object.assign(c,{name:'VoiceTest',wkName:'VoiceTest',mode:'rotation',teamKind:'solo',
      together:true,noScore:true,scoreSrc:'manual'});
    c.display=Object.assign(c.display||{},{voice,beepN});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:0,sameRest:true,blocks:[
      {name:'Part A',rounds:1,items:[{name:'',dur:20,scored:false,exercises:[{name:'Row',amounts:[10],unit:'reps'}]}]},
      {name:'Part B',rounds:1,items:[{name:'',dur:20,scored:false,exercises:[{name:'Ski',amounts:[10],unit:'reps'}]}]}
    ]});
    c.crews=[{name:'A1'}];
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
  },{voice,beepN});
  await p.reload(); await p.waitForTimeout(1300);
  return {ctx,p};
}
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// ---- beeps ON: three rising beeps as Part A nears its end ----
{ const {p}=await boot(br,true);
  await p.evaluate(()=>{ if(window.voicePrime) window.voicePrime(); });
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>window.__spoken.length=0);
  await p.evaluate(()=>window.__seek&&window.__seek(16.2)); // ~3.8s left in Part A (dur 20)
  await p.waitForTimeout(5000);                              // let the clock run through 3-2-1
  const said=await p.evaluate(()=>window.__spoken.slice());
  ok(said.length===3,'beeps on: exactly three beeps, one per second, none repeated per frame ['+said.join(',')+']');
  ok(said[0]===660&&said[1]===830&&said[2]===1046,'beeps on: rising 660/830/1046 in order ['+said.join(',')+']');
  await p.close(); }
// ---- beepN=5: five beeps — two low ticks then the rising go ----
{ const {p}=await boot(br,true,5);
  await p.evaluate(()=>{ if(window.voicePrime) window.voicePrime(); });
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>window.__spoken.length=0);
  await p.evaluate(()=>window.__seek&&window.__seek(14.2)); // ~5.8s left in Part A (dur 20)
  await p.waitForTimeout(6500);
  const said=await p.evaluate(()=>window.__spoken.slice());
  ok(said.length===5,'beepN 5: exactly five beeps ['+said.join(',')+']');
  ok(said[0]===520&&said[1]===520&&said[2]===660&&said[3]===830&&said[4]===1046,
     'beepN 5: two low 520 ticks then rising 660/830/1046 ['+said.join(',')+']');
  await p.close(); }
// ---- beeps OFF: silence ----
{ const {p}=await boot(br,false);
  await p.evaluate(()=>{ if(window.voicePrime) window.voicePrime(); });
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>window.__spoken.length=0);
  await p.evaluate(()=>window.__seek&&window.__seek(16.2));
  await p.waitForTimeout(5000);
  const said=await p.evaluate(()=>window.__spoken.slice());
  ok(said.length===0,'beeps off: nothing sounds ['+said.join(',')+']');
  await p.close(); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
