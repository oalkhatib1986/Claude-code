// SPOKEN COUNTDOWN (build 468 — Omar: "could it say three, two, one"). The
// last three seconds of the interval the class is inside are called out by
// voice, riding the same `remain` the big clock shows. cfg.display.voice gates
// it (default on via migrate dispV<5). This suite mocks Web Speech, runs the
// clock through a boundary, and asserts three/two/one are spoken in order —
// and that toggling voice off silences it.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
// window.speechSynthesis is a read-only accessor — a plain assignment silently
// fails and the real (voiceless, in headless) engine stays in place, so the
// mock MUST go in via defineProperty or nothing is ever captured.
const MOCK=`
  window.__spoken=[];
  window.SpeechSynthesisUtterance=function(t){ this.text=t; this.volume=1; this.rate=1; this.lang=''; };
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    speak(u){ if(u&&u.volume!==0&&u.text&&u.text.trim()) window.__spoken.push(u.text.trim()); },
    cancel(){}, resume(){}, getVoices(){return [];} }});
`;
async function boot(br,voice){
  const ctx=await br.newContext({viewport:{width:1440,height:960}});
  const p=await ctx.newPage();
  await p.addInitScript(MOCK);
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  p.on('dialog',d=>d.accept());
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate((voice)=>{
    const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    Object.assign(c,{name:'VoiceTest',wkName:'VoiceTest',mode:'rotation',teamKind:'solo',
      together:true,noScore:true,scoreSrc:'manual'});
    c.display=Object.assign(c.display||{},{voice});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:0,sameRest:true,blocks:[
      {name:'Part A',rounds:1,items:[{name:'',dur:20,scored:false,exercises:[{name:'Row',amounts:[10],unit:'reps'}]}]},
      {name:'Part B',rounds:1,items:[{name:'',dur:20,scored:false,exercises:[{name:'Ski',amounts:[10],unit:'reps'}]}]}
    ]});
    c.crews=[{name:'A1'}];
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
  },voice);
  await p.reload(); await p.waitForTimeout(1300);
  return {ctx,p};
}
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// ---- voice ON: three/two/one spoken as Part A nears its end ----
{ const {p}=await boot(br,true);
  await p.evaluate(()=>{ if(window.voicePrime) window.voicePrime(); });
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>window.__spoken.length=0);
  await p.evaluate(()=>window.__seek&&window.__seek(16.2)); // ~3.8s left in Part A (dur 20)
  await p.waitForTimeout(5000);                              // let the clock run through 3-2-1
  const said=await p.evaluate(()=>window.__spoken.slice());
  ok(said.includes('three')&&said.includes('two')&&said.includes('one'),
     'voice on: says three, two, one before the change ['+said.join(',')+']');
  const iThree=said.indexOf('three'),iTwo=said.indexOf('two'),iOne=said.indexOf('one');
  ok(iThree>=0&&iThree<iTwo&&iTwo<iOne,'voice on: in the right order ['+said.join(',')+']');
  ok(said.filter(w=>w==='three').length===1,'voice on: each number spoken once, not repeated per frame ['+said.join(',')+']');
  await p.close(); }
// ---- voice OFF: silence ----
{ const {p}=await boot(br,false);
  await p.evaluate(()=>{ if(window.voicePrime) window.voicePrime(); });
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>window.__spoken.length=0);
  await p.evaluate(()=>window.__seek&&window.__seek(16.2));
  await p.waitForTimeout(5000);
  const said=await p.evaluate(()=>window.__spoken.slice());
  ok(said.length===0,'voice off: nothing is spoken ['+said.join(',')+']');
  await p.close(); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
