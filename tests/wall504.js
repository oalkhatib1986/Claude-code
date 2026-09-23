// WALL HEADER + LONE CARD (build 504).
//  - the clock's BOTTOM sits on the summary line (equal gap to the phase bar),
//    not dipping past it toward the cards (Omar: "the timer should have space
//    below it equal to the space below the 3 blocks / round / solo line").
//  - a SINGLE card runs its work in ONE column, centred in the card, never split
//    into two (Omar: "it's only 1 column, everything must fit in one column and
//    be centred horizontally!").
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
const R=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);
  return e?(x=>({t:Math.round(x.top),b:Math.round(x.bottom),l:Math.round(x.left),r:Math.round(x.right),w:Math.round(x.width)}))(e.getBoundingClientRect()):null;},sel);
async function wall(br,blocks){
  const p=await br.newPage({viewport:{width:1600,height:900}});
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1400);
  await p.evaluate(bl=>{ const k='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(k));
    Object.assign(c,{name:'WallTest',wkName:'WallTest',mode:'rotation',teamKind:'solo',
      together:true,noScore:true,scoreSrc:'manual'});
    c.display=Object.assign(c.display||{},{ready:0});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:0,sameRest:true,blocks:bl});
    c.crews=[{name:'A'}]; localStorage.setItem(k,JSON.stringify(c)); },blocks);
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ location.hash='#workout'; }); await p.waitForTimeout(500);
  await p.evaluate(()=>{ document.body.classList.add('tvfull'); if(window.fitScreen) window.fitScreen(); }); await p.waitForTimeout(400);
  await p.evaluate(()=>{ const b=document.getElementById('startBtn'); if(b) b.click(); }); await p.waitForTimeout(400);
  await p.evaluate(()=>window.__seek&&window.__seek(30)); await p.waitForTimeout(700);
  return p;
}
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

// ---- clock bottom on the summary line; lone card one centred column ----
{ const p=await wall(br,[{name:'AMRAP in Pairs',rounds:1,items:[{dur:2700,name:'AMRAP in Pairs',scored:false,group:true,
    exercises:[{who:'All 2',name:'Each round',amounts:[],unit:'reps',
      lines:['1km Ski','50m Sled Drag','1km Run','50 HR Press Ups','2km Bike','50 Wall Balls','1km Row'],
      note:'Split the work between partners as you like'}]}]}]);
  const summary=await R(p,'.subhead .ttl span:last-child');
  const clock=await R(p,'.subhead .clock');
  const bar=await R(p,'.phase,#phaseBanner,.bstat');
  const gS=bar.t-summary.b, gC=bar.t-clock.b;
  ok(Math.abs(gS-gC)<=4,'clock bottom sits on the summary line — equal gap to the bar ['+gS+' vs '+gC+']');
  ok(clock.b<=summary.b+2,'the clock never dips below the summary toward the cards');
  const blk=await R(p,'.blk'), bd=await R(p,'.blk .bd');
  const cc=await p.evaluate(()=>getComputedStyle(document.querySelector('.blk .bd')).columnCount);
  ok(cc==='1','a lone card runs its work in ONE column ['+cc+']');
  const blkC=(blk.l+blk.r)/2, bdC=(bd.l+bd.r)/2;
  ok(Math.abs(blkC-bdC)<=20&&bd.w<blk.w-100,'the lone column is centred in the card [card '+blkC+' / bd '+bdC+']');
  await p.close(); }

// ---- multi-card boards are unchanged (no forced single-column centring) ----
{ const p=await wall(br,[
    {name:'A',rounds:1,items:[{dur:300,name:'A',exercises:[{name:'Row',amounts:[10],unit:'reps'}]}]},
    {name:'B',rounds:1,items:[{dur:300,name:'B',exercises:[{name:'Ski',amounts:[10],unit:'reps'}]}]}]);
  const n=await p.evaluate(()=>document.querySelectorAll('.blocks .blk').length);
  ok(n===2,'a two-part board still draws two cards ['+n+']');
  await p.close(); }

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
