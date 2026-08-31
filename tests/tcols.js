// THE COLUMNS STAND SIDE BY SIDE, ALWAYS (Omar, build 373): the overview
// card's machine map is a GRID of equal tracks — Ski | Bike | Rest across,
// never a Rest column wrapped underneath at a random width. Spare machines
// ride inside their own type's column; the shareline sits UNDER the grid
// (a full-span item inside it keeps a ghost auto-fit track alive).
// Verify build 373 columns: laptop, phone, spares folded into their column,
// shareline under the card, wall still chip-free.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1920,height:1080}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror',e.message);});
await p.goto('file:///home/user/Claude-code/leaderboard.html');
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1500);
const load=async n=>{ await p.evaluate(count=>{
  const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  Object.assign(cfg,{name:'Engine',wkName:null,mode:'rotation',teamKind:'solo',together:false,noScore:true});
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:120,blocks:[
    {name:'Part A',rounds:5,items:[{dur:90,fmt:'rotate',scored:false,exercises:[
      {name:'Ski',amounts:[],unit:'cal',max:true},{name:'Bike',amounts:[],unit:'cal',max:true},
      {name:'Rest',amounts:[],unit:'reps',max:false}]}]},
    {name:'Part B',rounds:5,items:[{dur:90,fmt:'rotate',scored:false,exercises:[
      {name:'Row',amounts:[],unit:'cal',max:true},{name:'Run',amounts:[],unit:'m',max:true},
      {name:'Rest',amounts:[],unit:'reps',max:false}]}]}]});
  cfg.crews=Array.from({length:count},(_,i)=>({name:'Athlete '+(i+1)}));
  localStorage.setItem(k,JSON.stringify(cfg));},n);
  await p.reload(); await p.waitForTimeout(1800); };
const read=()=>p.evaluate(()=>[...document.querySelectorAll('#blockCards .blk')].map(card=>{
  const cols=[...card.querySelectorAll('.teams .tcol')];
  const tops=cols.map(c=>Math.round(c.getBoundingClientRect().top));
  const ws=cols.map(c=>Math.round(c.getBoundingClientRect().width));
  return {n:cols.length,sameTop:new Set(tops).size===1,ws,
    heads:cols.map(c=>(c.querySelector('.tn')||{}).textContent),
    rows:cols.map(c=>[...c.querySelectorAll('.tn')].map(e=>e.textContent.trim())),
    spares:[...card.querySelectorAll('.teams .t.spare .tn')].map(e=>e.textContent.trim()),
    flatSpares:[...card.querySelectorAll('.teams>.t.spare')].length,
    share:(card.querySelector('.shareline')||{}).textContent||null,
    shareInTeams:!!card.querySelector('.teams .shareline'),
    clip:[...card.querySelectorAll('.teams .t')].filter(e=>e.scrollWidth>e.clientWidth+1).length};}));
// 30 athletes: full house, 3 columns each card
await load(30);
let r=await read();
ok(r.length===2,'two cards render');
ok(r.every(c=>c.n===3&&c.sameTop),'every card: 3 columns side by side, same top ('+JSON.stringify(r.map(c=>c.heads))+')');
ok(r.every(c=>new Set(c.ws).size===1),'columns share one width ('+r.map(c=>c.ws.join(','))+')');
ok(r.every(c=>!c.shareInTeams&&/per station/i.test(c.share||'')),'shareline sits under the grid, still says the split');
ok(r.every(c=>c.clip===0),'no chip clips');
await p.screenshot({path:'/tmp/claude-0/-home-user-Claude-code/e668d4f5-e76a-58cd-ba63-f06c2f7d0255/scratchpad/cols_30.png',fullPage:true});
// 12 athletes: 2 per block per station? 12 split over 2 blocks = 6 each → 2 per station... spares appear
await load(9);
r=await read();
ok(r.every(c=>c.n===3&&c.sameTop),'small class: still 3 columns side by side');
ok(r.every(c=>c.flatSpares===0),'no spare prints as a stray full-width row');
const inCol=r.every(c=>c.rows.every(list=>{
  const nums=list.map(t=>+(t.match(/(\d+)$/)||[])[1]).filter(n=>!isNaN(n));
  return nums.every((n,i)=>i===0||nums[i-1]<=n);}));
ok(inCol,'spares ride inside their type column in number order ('+JSON.stringify(r[0].rows)+' spares:'+JSON.stringify(r[0].spares)+')');
await p.screenshot({path:'/tmp/claude-0/-home-user-Claude-code/e668d4f5-e76a-58cd-ba63-f06c2f7d0255/scratchpad/cols_9.png',fullPage:true});
// phone 390
await p.setViewportSize({width:390,height:844});
await p.waitForTimeout(900);
const ph=await p.evaluate(()=>({sx:document.documentElement.scrollWidth-innerWidth,
  clip:[...document.querySelectorAll('#blockCards .teams .t')].filter(e=>e.scrollWidth>e.clientWidth+1).length}));
ok(ph.sx<=0&&ph.clip===0,'phone 390: no sideways scroll, no clipped chip ('+ph.sx+'/'+ph.clip+')');
await p.screenshot({path:'/tmp/claude-0/-home-user-Claude-code/e668d4f5-e76a-58cd-ba63-f06c2f7d0255/scratchpad/cols_phone.png',fullPage:true});
// wall: chips AND shareline both gone
await p.setViewportSize({width:1920,height:1080});
await p.goto('file:///home/user/Claude-code/leaderboard.html#workout'); await p.reload();
await p.waitForTimeout(1600);
const wall=await p.evaluate(()=>({teams:[...document.querySelectorAll('#blockCards .teams')].filter(e=>e.offsetParent).length,
  share:[...document.querySelectorAll('#blockCards .shareline,.blk .shareline')].filter(e=>e.offsetParent).length}));
ok(wall.teams===0&&wall.share===0,'wall: no chips, no stray shareline ('+JSON.stringify(wall)+')');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
