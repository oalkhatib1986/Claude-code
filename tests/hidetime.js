// HIDE THE INTERVAL TIME IN A PART TITLE (build 477 — Omar: "4:00 ON / 1:00
// OFF … then it says 4 minutes, repetitive; the 4 minutes is the time set and
// 4:00 ON / 1:00 OFF is the title — a hide or show option?"). Layout > Board
// display > Part titles > "Hide the interval time when the title already says
// it" (cfg.display.hideTime, default OFF). When ON, the bare "· 4 minutes"
// duration is dropped from a TITLED part heading — but never a scheme like
// "3 rounds × 4:00" (it says something the title does not), and never when
// there is no title to carry the heading. This suite seeds both shapes and
// pins the drop, the default-show, and the scheme staying put.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
// a titled group item whose title carries the interval, plus a titled scheme item
const blocks=[
  {name:'Part A',rounds:2,rrest:60,aRest:0,items:[{dur:240,scored:false,group:true,
    name:'4:00 on / 1:00 off',
    exercises:[{who:'P1',name:'Ski',amounts:[],unit:'cal',max:true},
               {who:'P2',name:'Wall Balls',amounts:[20],unit:'reps'}]}]},
  {name:'Part B',rounds:1,items:[{dur:720,scored:false,group:true,name:'Strength',
    exercises:[{name:'Back Squat',amounts:[8],unit:'reps',sets:3},
               {name:'Bench Press',amounts:[8],unit:'reps',sets:3}]}]}
];
async function boot(br,hideTime){
  const ctx=await br.newContext({viewport:{width:1440,height:960}});
  const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  p.on('dialog',d=>d.accept());
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate(({blocks,hideTime})=>{
    const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    Object.assign(c,{name:'TitleTest',wkName:'TitleTest',mode:'rotation',teamKind:'teams',
      teamSize:2,together:true,noScore:true,scoreSrc:'manual'});
    c.display=Object.assign(c.display||{},{hideTime});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:0,sameRest:true,blocks});
    c.crews=[{name:'A'},{name:'B'}];
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
  },{blocks,hideTime});
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate(()=>document.getElementById('tabScreen').click()); await p.waitForTimeout(300);
  await p.evaluate(()=>document.getElementById('smWork').click()); await p.waitForTimeout(1200);
  return {ctx,p};
}
const cards=p=>p.evaluate(()=>[...document.querySelectorAll('#blockCards .blk')]
  .map(b=>{const h=b.querySelector('.bd .exg-h');return h?h.textContent.replace(/\s+/g,' ').trim():'';}));
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// ---- hideTime ON: the bare "4 minutes" is gone, the title stays; the scheme stays ----
{ const {p}=await boot(br,true);
  const h=await cards(p);
  ok(/4:00 on \/ 1:00 off/i.test(h[0])&&!/minute/i.test(h[0]),
     'hideTime on: titled interval keeps the title, drops "· 4 minutes" ['+h[0]+']');
  ok(/3 rounds ×/i.test(h[1]),
     'hideTime on: a real scheme ("3 rounds × …") is NEVER stripped ['+h[1]+']');
  await p.close(); }
// ---- default OFF: the duration still shows (every other board unchanged) ----
{ const {p}=await boot(br,false);
  const h=await cards(p);
  ok(/4:00 on \/ 1:00 off/i.test(h[0])&&/4 minutes/i.test(h[0]),
     'default (off): the interval time still shows ['+h[0]+']');
  await p.close(); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
