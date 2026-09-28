// COUNTDOWN BUZZER (build 484 — Omar designed and rendered the sound himself
// and sent two WAVs: buzzer-beep.wav (short run-up buzz) and buzzer-final.wav
// (the longer last-second "go"). They play through <audio> media elements on
// each of the last N seconds (N from Layout > Countdown beeps): short buzz on
// seconds N..2, the final buzz on the last second (build 531 moved these off the
// Web Audio API so they follow an AirPlay/wifi output and ignore the iOS silent
// switch). This suite mocks window.Audio, tagging each element by its file, and
// asserts the right one plays each second — and that off silences it.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
// build 531: the buzzers play through <audio> MEDIA elements (so they follow an
// AirPlay/wifi output and ignore the iOS silent switch). Mock window.Audio: a
// play() records the file's tag ONLY when unmuted — the muted play in
// voicePrime that unlocks each element is not a real beep — and a pause()
// records a stop only for a sound that was actually playing (so the ring-out
// test can assert the final buzz is never cut).
const MOCK=`
  window.__spoken=[]; window.__stopped=[];
  function FakeAudio(src){ this.src=String(src||''); this.which=/final/.test(this.src)?'fin':'beep';
    this.muted=false; this.currentTime=0; this.preload=''; this.playsInline=false; this._live=false; }
  FakeAudio.prototype.play=function(){ if(!this.muted){ window.__spoken.push(this.which); this._live=true; } return Promise.resolve(); };
  FakeAudio.prototype.pause=function(){ if(this._live){ window.__stopped.push(this.which); this._live=false; } };
  window.Audio=FakeAudio;
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
    c.display=Object.assign(c.display||{},{voice,beepN,ready:0});  // no get-ready count-in — this suite times the buzzer on the block clock
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
// ---- entering the window PAST the 5-mark still fires all five (build 488 —
// Omar: "sometimes it starts at 4 not 5"): a seek that lands at ~4.4s left
// still schedules the 5 (fired a touch late) so the count stays 5 ----
{ const {p}=await boot(br,true);
  await p.evaluate(()=>{ if(window.voicePrime) window.voicePrime(); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>window.__spoken.length=0);
  await p.evaluate(()=>window.__seek&&window.__seek(15.6)); // ~4.4s left — past the 5-mark
  await p.waitForTimeout(5500);
  const said=await p.evaluate(()=>window.__spoken.slice());
  ok(said.length===5&&said[4]==='fin','late entry (~4.4s left): still all five, 5 not dropped ['+said.join(',')+']');
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
// ---- the FINAL buzz rings out across an interval boundary — it is NOT stopped
// when the next interval arms (build 489 — Omar: "the last beep is identical to
// the others"; clearVoice() was cutting the still-ringing final buzz). Uses a
// rounds:2 board so a rrest boundary lands right after the final buzz. ----
{ const ctx=await br.newContext({viewport:{width:1440,height:960}});
  const p=await ctx.newPage();
  await p.addInitScript(MOCK);
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror(ringout):',e.message);});
  p.on('dialog',d=>d.accept());
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    Object.assign(c,{name:'RingTest',wkName:'RingTest',mode:'rotation',teamKind:'solo',
      together:true,noScore:true,scoreSrc:'manual'});
    c.display=Object.assign(c.display||{},{voice:true,ready:0});  // no get-ready count-in — this suite times the buzzer on the block clock
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:0,sameRest:true,blocks:[
      {name:'Part A',rounds:2,rrest:8,items:[{name:'',dur:12,scored:false,exercises:[{name:'Row',amounts:[10],unit:'reps'}]}]}
    ]});
    c.crews=[{name:'A1'}];
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); });
  await p.reload(); await p.waitForTimeout(1300);
  await p.evaluate(()=>{ if(window.voicePrime) window.voicePrime(); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>window.__spoken.length=0);
  // round 1 (dur 12): seek to ~6s left, then wait past the final buzz and across
  // the boundary into the rrest
  await p.evaluate(()=>window.__seek&&window.__seek(6));
  await p.waitForTimeout(9000);
  const info=await p.evaluate(()=>({spoke:window.__spoken.slice(),stopped:window.__stopped.slice()}));
  ok(info.spoke.includes('fin'),'ring-out: a final buzz played at the end of round 1 ['+info.spoke.join(',')+']');
  ok(!info.stopped.includes('fin'),'ring-out: the final buzz was NEVER stopped by the next interval ['+info.stopped.join(',')+']');
  await p.close(); await ctx.close(); }
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
