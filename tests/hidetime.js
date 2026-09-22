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
               {name:'Bench Press',amounts:[8],unit:'reps',sets:3}]}]},
  // a one-item block whose BLOCK scheme ("Every 2:30 for 10 minutes") and the
  // item's own timing heading ("4 sets") say the same thing — the 497 drop
  {name:'Part C',rounds:4,items:[{dur:150,scored:false,
    exercises:[{name:'Sumo Deadlift',amounts:[4],unit:'reps',sets:4}]}]},
  // a TITLED part whose title already states a clock time ("Every 2:30 × 4"):
  // the app's "4 rounds × 2:30" beside it is that time twice — the 498 drop
  {name:'Part D',rounds:1,items:[{dur:600,name:'Every 2:30 × 4',scored:false,
    exercises:[{name:'Sumo Deadlift',amounts:[4],unit:'reps',sets:4}]}]}
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
// ALL headings of block index i, joined — to catch a duplicate item timing line
const allHeads=(p,i)=>p.evaluate(ix=>{const b=[...document.querySelectorAll('#blockCards .blk')][ix];
  return b?[...b.querySelectorAll('.bd .exg-h')].map(e=>e.textContent.replace(/\s+/g,' ').trim()).join(' | '):'';},i);
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
// ---- hideTime ON: the bare "4 minutes" is gone, the title stays; the scheme stays ----
{ const {p}=await boot(br,true);
  const h=await cards(p);
  ok(/4:00 on \/ 1:00 off/i.test(h[0])&&!/minute/i.test(h[0]),
     'hideTime on: titled interval keeps the title, drops "· 4 minutes" ['+h[0]+']');
  ok(/3 rounds ×/i.test(h[1]),
     'hideTime on: a real scheme ("3 rounds × …") is NEVER stripped ['+h[1]+']');
  { const c=await allHeads(p,2);
    ok(/every 2:30 for 10/i.test(c)&&!/\bsets?\b/i.test(c)&&!/rounds ×/i.test(c),
      'hideTime on: block scheme stays, the duplicate item timing heading is dropped ['+c+']'); }
  { const d=await allHeads(p,3);
    ok(/every 2:30 × 4/i.test(d)&&!/rounds ×/i.test(d),
      'hideTime on: a titled part that states a time keeps the title, drops the app timing ['+d+']'); }
  await p.close(); }
// ---- default OFF: the duration still shows (every other board unchanged) ----
{ const {p}=await boot(br,false);
  const h=await cards(p);
  ok(/4:00 on \/ 1:00 off/i.test(h[0])&&/4 minutes/i.test(h[0]),
     'default (off): the interval time still shows ['+h[0]+']');
  { const c=await allHeads(p,2);
    ok(/every 2:30 for 10/i.test(c)&&/\bsets?\b/i.test(c),
      'default (off): block scheme AND the item timing heading both show ['+c+']'); }
  { const d=await allHeads(p,3);
    ok(/every 2:30 × 4/i.test(d)&&/rounds ×/i.test(d),
      'default (off): titled part shows the app timing too ['+d+']'); }
  await p.close(); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
