// COUNTDOWN BUZZER (build 484 — Omar designed and rendered the sound himself
// and sent two WAVs: buzzer-beep.wav (short run-up buzz) and buzzer-final.wav
// (the longer last-second "go"). They are fetched + decoded once and played as
// Web Audio buffers on each of the last N seconds (N from Layout > Countdown
// beeps): short buzz on seconds N..2, the final buzz on the last second.
// This suite mocks fetch + decodeAudioData + AudioBufferSourceNode, tagging each
// decoded buffer by its file, and asserts the right buffer plays each second —
// and that toggling the countdown off silences it.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
// fetch returns a 1-byte buffer marking which file; decodeAudioData reads it
// back into a tagged buffer; a buffer source records its buffer's tag on start.
const MOCK=`
  window.__spoken=[];
  window.fetch=(url)=>{ const which=/final/.test(String(url))?1:0;
    return Promise.resolve({ arrayBuffer(){ return Promise.resolve(new Uint8Array([which]).buffer); } }); };
  function FakeCtx(){ this.currentTime=0; this.state='running'; this.destination={}; }
  FakeCtx.prototype.resume=function(){ this.state='running'; return Promise.resolve(); };
  FakeCtx.prototype.decodeAudioData=function(arr,okCb){ const w=new Uint8Array(arr)[0]===1?'fin':'beep';
    if(okCb){ okCb({which:w}); return; } return Promise.resolve({which:w}); };
  FakeCtx.prototype.createBufferSource=function(){ return { buffer:null, connect(){},
    start(){ if(this.buffer&&this.buffer.which) window.__spoken.push(this.buffer.which); } }; };
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
// ---- DEFAULT is 5 (build 486 — Omar: "the default is 5 seconds always"):
// four short buzzes then the final, with NO beepN set ----
{ const {p}=await boot(br,true);   // no beepN -> default
  await p.evaluate(()=>{ if(window.voicePrime) window.voicePrime(); });
  await p.waitForTimeout(300);   // let the two WAVs "decode"
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>window.__spoken.length=0);
  await p.evaluate(()=>window.__seek&&window.__seek(14.2)); // ~5.8s left in Part A (dur 20)
  await p.waitForTimeout(6500);
  const said=await p.evaluate(()=>window.__spoken.slice());
  ok(said.length===5,'default: sounds five times (default is 5s) ['+said.join(',')+']');
  ok(said.slice(0,4).every(x=>x==='beep')&&said[4]==='fin',
     'default: four short buzzes then the final ['+said.join(',')+']');
  await p.close(); }
// ---- a smaller N (3): two short buzzes then the final; also no two within a
// second (the min-gap guard against a rest boundary firing 5 and 4 at once) ----
{ const {p}=await boot(br,true,3);
  await p.evaluate(()=>{ if(window.voicePrime) window.voicePrime(); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>window.__spoken.length=0);
  await p.evaluate(()=>window.__seek&&window.__seek(16.2)); // ~3.8s left
  await p.waitForTimeout(5000);
  const said=await p.evaluate(()=>window.__spoken.slice());
  ok(said.length===3,'beepN 3: three sounds, none doubled ['+said.join(',')+']');
  ok(said[0]==='beep'&&said[1]==='beep'&&said[2]==='fin',
     'beepN 3: short, short, final ['+said.join(',')+']');
  await p.close(); }
// ---- off: silence ----
{ const {p}=await boot(br,false);
  await p.evaluate(()=>{ if(window.voicePrime) window.voicePrime(); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>window.__spoken.length=0);
  await p.evaluate(()=>window.__seek&&window.__seek(16.2));
  await p.waitForTimeout(5000);
  const said=await p.evaluate(()=>window.__spoken.slice());
  ok(said.length===0,'buzzer off: nothing sounds ['+said.join(',')+']');
  await p.close(); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
