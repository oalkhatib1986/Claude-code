// MANUAL SCORES (build 374, Omar's "go"): THE SCORE IS WHAT THE TEAM SAYS
// IT IS. Manual is the default; the sim invents nothing; at the end of a
// scored section the tablet asks the team on that machine — full card while
// they rest, a slim band once the next section runs; "Not Team X?" swaps the
// teams and the scores travel; the trainer overrides anything from Control;
// reset wipes the sheet everywhere; auto mode is the old engine untouched.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const APP='file:///home/user/Claude-code/leaderboard.html';
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1280,height:900}});
let perr=[]; p.on('pageerror',e=>perr.push(e.message));
await p.goto(APP);
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1500);

// one block: a scored 60s row piece, then a 30s rest — four named athletes
const seed=async(extra)=>{ await p.evaluate(x=>{
    const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
    Object.assign(cfg,{name:'Score Test',wkName:null,mode:'rotation',teamKind:'solo',
      together:true,noScore:false,scoreSrc:'manual'},x||{});
    cfg.display=Object.assign(cfg.display||{},{ready:0});  // no get-ready count-in — this suite times scored sections
    cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:0,blocks:[
      {name:'Part A',rounds:1,items:[
        {dur:60,scored:true,metric:'calories',exercises:[{name:'Row',amounts:[],unit:'cal',max:true}]},
        {dur:30,rest:true,exercises:[]}]}]});
    cfg.crews=[{name:'Alpha'},{name:'Bravo'},{name:'Charlie'},{name:'Delta'}];
    localStorage.setItem(k,JSON.stringify(cfg));
  },extra||{});
  await p.reload(); await p.waitForTimeout(1500); };

// ---------- 1. manual is the default and the sim counts NOTHING ----------
await seed();
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')).scoreSrc==='manual'),
  'a board defaults to MANUAL scoring');
await p.click('#tabTrainer'); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1200);
await p.evaluate(()=>window.__seek(30)); await p.waitForTimeout(800);
{ const r=await p.evaluate(()=>({heros:[...document.querySelectorAll('#lanes .lane .hero')]
    .map(e=>parseInt(String(e.textContent).replace(/[^\d]/g,''),10)||0)}));
  ok(r.heros.length===4&&r.heros.every(v=>v===0),
    'mid-scored-window: every score is 0 — no simulated number ('+r.heros.join(',')+')'); }

// ---------- 2. the ask: section ends, the tablet asks, the numpad answers ----------
await p.click('#tabTablet'); await p.waitForTimeout(700);
await p.evaluate(()=>window.__tbOpen('Row:1')); await p.waitForTimeout(700);
ok(await p.evaluate(()=>!document.querySelector('.tk-score')),
  'while the scored section runs there is NO ask yet');
await p.evaluate(()=>window.__seek(35)); await p.waitForTimeout(1000);   // into the rest
{ const r=await p.evaluate(()=>{ const c=document.querySelector('.tk-score');
    return {card:!!c, txt:c?c.innerText.replace(/\s+/g,' '):'',
      keys:document.querySelectorAll('.tks-k').length}; });
  ok(r.card,'the section ended — the FULL ask card is up (crew is resting)');
  ok(/how many calories\?/i.test(r.txt),'the ask names the unit (how many calories?)');
  ok(/Alpha/i.test(r.txt),'the ask names the team on this machine');
  ok(r.keys===12,'the numpad has all 12 keys'); }
await p.evaluate(()=>{[...document.querySelectorAll('.tks-k')].find(b=>b.dataset.d==='4').click();});
await p.waitForTimeout(250);
await p.evaluate(()=>{[...document.querySelectorAll('.tks-k')].find(b=>b.dataset.d==='2').click();});
await p.waitForTimeout(250);
{ const v=await p.evaluate(()=>document.querySelector('.tks-val b').textContent);
  ok(v==='42','typing on the pad builds the number (42)'); }
await p.evaluate(()=>document.getElementById('tksSave').click());
await p.waitForTimeout(600);
{ const r=await p.evaluate(()=>({card:!!document.querySelector('.tk-score'),
    man:window.__man.scores(),
    heros:[...document.querySelectorAll('#lanes .lane')].map(l=>({
      who:l.querySelector('.team').textContent,
      v:parseInt(String(l.querySelector('.hero').textContent).replace(/[^\d]/g,''),10)||0}))}));
  ok(!r.card,'Save closes the ask');
  ok((r.man['c0:0:0']||{}).v===42,'the entry is filed under team × section (c0:0:0 = 42)');
  const alpha=r.heros.find(h=>/Alpha/.test(h.who));
  ok(alpha&&alpha.v===42,'the board shows exactly what Alpha typed (42)'); }

// ---------- 3. the strip: next section runs, the ask waits as a band ----------
await p.evaluate(()=>{ const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  cfg.rotation.blocks=[{name:'Part A',rounds:1,items:[
    {dur:60,scored:true,metric:'calories',exercises:[{name:'Row',amounts:[],unit:'cal',max:true}]},
    {dur:120,scored:false,exercises:[{name:'Ski',amounts:[],unit:'cal',max:false}]}]}];
  localStorage.setItem(k,JSON.stringify(cfg)); });
await p.reload(); await p.waitForTimeout(1500);
await p.click('#tabTrainer'); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(900);
await p.click('#tabTablet'); await p.waitForTimeout(500);
await p.evaluate(()=>window.__tbOpen('Row:1')); await p.waitForTimeout(700);
await p.evaluate(()=>window.__seek(70)); await p.waitForTimeout(1000);   // next WORK section running
{ const r=await p.evaluate(()=>({strip:!!document.querySelector('.tks-strip'),
    full:!!document.querySelector('.tk-score'),
    work:!!document.querySelector('.tk-work')}));
  ok(r.strip&&!r.full,'next section running: the ask is a slim band, not a card');
  ok(r.work,'the incoming work stays on screen under the band'); }
await p.evaluate(()=>document.querySelector('.tks-strip').click());
await p.waitForTimeout(500);
ok(await p.evaluate(()=>!!document.querySelector('.tk-score')),
  'tapping the band opens the full pad');

// ---------- 4. Not Team X? — the swap ----------
await p.evaluate(()=>document.querySelector('.tks-who').click());
await p.waitForTimeout(500);
{ const r=await p.evaluate(()=>({n:document.querySelectorAll('.tks-team').length,
    names:[...document.querySelectorAll('.tks-team')].map(b=>b.textContent)}));
  ok(r.n===3,'the who-list offers every OTHER team ('+r.names.join(', ')+')'); }
await p.evaluate(()=>{[...document.querySelectorAll('.tks-team')]
  .find(b=>/Charlie/.test(b.textContent)).click();});
await p.waitForTimeout(600);
{ const r=await p.evaluate(()=>({head:(document.querySelector('.tk-score .tk-head')||{}).textContent||'',
    who:(document.querySelector('.tk-who')||{}).textContent||'',
    crews:JSON.parse(localStorage.getItem('af_erg_cfg_v8')).crews.map(c=>c.name)}));
  ok(/Charlie/.test(r.head)&&/Charlie/.test(r.who),'the machine now belongs to Charlie — ask and screen follow');
  ok(r.crews[0]==='Charlie'&&r.crews[2]==='Alpha','the roster swapped the two teams in place'); }
await p.evaluate(()=>{[...document.querySelectorAll('.tks-k')].find(b=>b.dataset.d==='9').click();
  document.getElementById('tksSave').click();});
await p.waitForTimeout(600);
{ const man=await p.evaluate(()=>window.__man.scores());
  ok((man['c0:0:0']||{}).v===9,'the typed score files under the SWAPPED team (Charlie, slot 0)'); }

// ---------- 5. the trainer's override sheet ----------
await p.click('#tabTrainer'); await p.waitForTimeout(600);
{ const r=await p.evaluate(()=>({hid:document.getElementById('scoreCard').hidden,
    rows:document.querySelectorAll('#scoreGrid .scrow').length,
    inputs:document.querySelectorAll('#scoreGrid .scin').length}));
  ok(!r.hid&&r.rows===4&&r.inputs===4,'Control shows the sheet: 4 teams × 1 scored section'); }
await p.evaluate(()=>{ const i=[...document.querySelectorAll('#scoreGrid .scin')]
  .find(x=>+x.dataset.ci===1); i.value='77';
  i.dispatchEvent(new Event('change',{bubbles:true})); });
await p.waitForTimeout(600);
{ const r=await p.evaluate(()=>({man:window.__man.scores(),
    hero:(()=>{ const l=[...document.querySelectorAll('#lanes .lane')]
      .find(x=>/Bravo/.test(x.querySelector('.team').textContent));
      return l?parseInt(String(l.querySelector('.hero').textContent).replace(/[^\d]/g,''),10):-1; })()}));
  ok((r.man['c1:0:0']||{}).v===77,'a trainer override lands in the sheet (Bravo = 77)');
  ok(r.hero===77,'…and on the board at once'); }

// ---------- 6. reset wipes the sheet ----------
await p.evaluate(()=>{const b=document.getElementById('resetBtn'); if(b&&!b.disabled) b.click();});
await p.waitForTimeout(400);
await p.evaluate(()=>{const d=document.querySelector('.dlg .dok'); if(d) d.click();});
await p.waitForTimeout(800);
{ const man=await p.evaluate(()=>window.__man.scores());
  ok(Object.keys(man).length===0,'reset clears every entered score'); }

// ---------- 7. merge semantics: newer ts wins, an epoch wipes ----------
{ const r=await p.evaluate(()=>{ const M=window.__man;
    M.merge({epoch:0,v:{'c0:0:0':{v:5,ts:100}}});
    M.merge({epoch:0,v:{'c0:0:0':{v:8,ts:50}}});     // older — must lose
    const a=M.scores()['c0:0:0'].v;
    M.merge({epoch:Date.now()+9e9,v:{'c1:0:0':{v:3,ts:1}}});   // a reset from the room
    const s=M.scores();
    return {a,gone:!s['c0:0:0'],b:(s['c1:0:0']||{}).v}; });
  ok(r.a===5,'per-entry merge: the older timestamp loses (5 stands, 8 refused)');
  ok(r.gone&&r.b===3,'a newer epoch wipes the sheet before merging (room reset)'); }

// ---------- 8. auto mode is the old engine, and it never asks ----------
await seed({scoreSrc:'auto'});
await p.click('#tabTrainer'); await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.getElementById('scoreCard').hidden),
  'AUTO mode: the trainer sheet is gone');
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1200);
await p.evaluate(()=>window.__seek(30)); await p.waitForTimeout(900);
{ const r=await p.evaluate(()=>({heros:[...document.querySelectorAll('#lanes .lane .hero')]
    .map(e=>parseInt(String(e.textContent).replace(/[^\d]/g,''),10)||0)}));
  ok(r.heros.some(v=>v>0),'AUTO mode: the engine scores by itself again ('+r.heros.join(',')+')'); }
await p.click('#tabTablet'); await p.waitForTimeout(500);
await p.evaluate(()=>window.__tbOpen('Row:1')); await p.waitForTimeout(500);
await p.evaluate(()=>window.__seek(35)); await p.waitForTimeout(900);
ok(await p.evaluate(()=>!document.querySelector('.tk-score,.tks-strip')),
  'AUTO mode: the tablet never asks');

// ---------- 9. an unscored class STILL asks for nothing ----------
await seed({noScore:true});
await p.click('#tabTrainer'); await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.getElementById('scoreCard').hidden),
  'unscored: no trainer sheet');
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(900);
await p.click('#tabTablet'); await p.waitForTimeout(500);
await p.evaluate(()=>window.__tbOpen('Row:1')); await p.waitForTimeout(500);
await p.evaluate(()=>window.__seek(35)); await p.waitForTimeout(900);
ok(await p.evaluate(()=>!document.querySelector('.tk-score,.tks-strip')),
  'unscored: the tablet never asks (build 369 holds)');

// ---------- 10. formatting: the ask fits the kiosk frame; Control fits a phone ----------
await seed();
await p.click('#tabTrainer'); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(900);
await p.click('#tabTablet'); await p.waitForTimeout(500);
await p.evaluate(()=>window.__tbOpen('Row:1')); await p.waitForTimeout(600);
await p.evaluate(()=>window.__seek(65)); await p.waitForTimeout(1000);
{ const r=await p.evaluate(()=>{
    const bad=[...document.querySelectorAll('#tbStage .tk *')]
      .filter(e=>e.scrollWidth>e.clientWidth+1
        &&getComputedStyle(e).textOverflow!=='ellipsis'
        &&!/auto|scroll/.test(getComputedStyle(e).overflowX)).length;
    const tk=document.querySelector('#tbStage .tk');
    return {ask:!!document.querySelector('.tk-score'),bad,
      over:tk?Math.max(0,tk.scrollHeight-tk.clientHeight):0}; });
  ok(r.ask,'kiosk: the ask card is up for the check');
  ok(r.bad===0,'kiosk: nothing clips sideways ('+r.bad+')');
  ok(r.over<=2,'kiosk: the ask card fits the frame top to bottom (overflow '+r.over+'px)'); }
await p.screenshot({path:'manscore_ask.png'});
await p.setViewportSize({width:390,height:844});
await p.click('#tabTrainer'); await p.waitForTimeout(700);
{ const sx=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  ok(sx<=0,'phone 390 · Control with the score sheet: no sideways scroll ('+sx+')'); }
await p.screenshot({path:'manscore_panel.png',fullPage:true});

const errs=perr; perr=[];
ok(!errs.length,'no page errors anywhere'+(errs.length?' — '+errs[0]:''));
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
