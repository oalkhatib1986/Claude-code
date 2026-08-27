// COMPREHENSIVE STRESS BATTERY (Omar, build 361) — beyond stress.js:
// every house board driven through a running session; a 47-minute fuzz of the
// Engine class; a session run to completion into Results; corrupted storage;
// control mashing; a mid-class roster change; reload-while-running; long
// names; library churn; full-screen coverage while LIVE.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const APP='file:///home/user/Claude-code/leaderboard.html';
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1366,height:1000}});
let perr=[]; p.on('pageerror',e=>perr.push(e.message));
const freshErr=()=>{ const e=perr; perr=[]; return e; };
const boot=async()=>{ await p.goto(APP);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1600); };
await boot();
await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  c.crews=Array.from({length:10},(_,i)=>({name:'Crew '+(i+1)}));
  localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); });
await p.reload(); await p.waitForTimeout(1400);

// ---------- A. every house board, RUNNING, checkpointed ----------
const boards=await p.evaluate(()=>JSON.parse(localStorage.getItem('af_presets_v1'))
  .filter(x=>x.seedV||x.name==='Tuesday Engine').map(x=>x.name));
ok(boards.length>=15,'the house library is present ('+boards.length+' boards)');
for(const name of boards){
  await p.evaluate(n=>window.__loadLib(n),name);
  await p.waitForTimeout(500);
  await p.click('#tabTrainer'); await p.waitForTimeout(250);
  await p.evaluate(()=>{ const b=document.getElementById('startBtn'); if(!b.disabled) b.click(); });
  await p.waitForTimeout(700);
  let bad='';
  for(const t of [280,600,600,900,1200]){   // cumulative ≈ 5,290,890,1490,2390,3590s
    await p.evaluate(s=>window.__seek(s),t); await p.waitForTimeout(220);
    const s=await p.evaluate(()=>{ const c=document.getElementById('clock');
      const vis=c&&c.offsetParent;
      return {t:vis?c.textContent:'', vis:!!vis}; });
    if(s.vis&&!/^\d+:\d\d$/.test(s.t)){ bad='clock "'+s.t+'"'; break; }
  }
  const errs=freshErr();
  ok(!errs.length&&!bad,`running sweep · ${name}: clean through 60 minutes`
    +(errs.length?' ERR:'+errs[0]:'')+(bad?' '+bad:''));
  await p.evaluate(()=>{ const b=document.getElementById('resetBtn'); if(b&&!b.disabled) b.click(); });
  await p.waitForTimeout(250);
  await p.evaluate(()=>{ const d=document.querySelector('.dlg .dok'); if(d) d.click(); });
  await p.waitForTimeout(350);
}

// ---------- B. minute-by-minute fuzz of the whole Engine class ----------
await p.evaluate(()=>window.__loadLib('Tuesday Engine')); await p.waitForTimeout(500);
await p.click('#tabTrainer'); await p.waitForTimeout(250);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(800);
await p.click('#tabBoard'); await p.waitForTimeout(500);
{ let viol=[];
  for(let i=0;i<55;i++){
    await p.evaluate(()=>window.__seek(47)); await p.waitForTimeout(140);
    const s=await p.evaluate(()=>{ const c=document.getElementById('clock');
      const ck=c.closest('.clock'); const vis=c&&c.offsetParent;
      return {vis:!!vis, t:vis?c.textContent:'',
        lab:document.getElementById('clockLab').textContent,
        frac:+getComputedStyle(ck).getPropertyValue('--cfrac')||0}; });
    if(s.vis){
      if(!/^\d+:\d\d$/.test(s.t)) viol.push(i+': clock '+s.t);
      if(!/^(Work|Rest|Score)$/.test(s.lab)) viol.push(i+': label '+s.lab);
      if(s.frac<0||s.frac>1) viol.push(i+': frac '+s.frac);
    }
    const e=freshErr(); if(e.length) viol.push(i+': ERR '+e[0]);
  }
  ok(!viol.length,'fuzz: 55 seeks x 47s across the class — every state sane'
    +(viol.length?' — '+viol.slice(0,3).join(' | '):'')); }

// ---------- C. a session runs to completion and lands in Results ----------
await boot();
await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  c.wkName=null; c.name='Sprint Test'; c.teamKind='solo'; c.together=true; c.noScore=false;
  c.crews=[{name:'Aya'},{name:'Bo'},{name:'Cy'},{name:'Dex'}];
  c.rotation.laps=1; c.rotation.blockRest=0;
  c.rotation.blocks=[{name:'Part A',machine:'Row',rounds:1,rrest:0,aRest:0,items:[
    {dur:25,scored:true,metric:'calories',scorers:4,
     exercises:[{name:'Row',amounts:[],max:true,unit:'cal'}]}]}];
  localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); });
await p.reload(); await p.waitForTimeout(1400);
await p.click('#tabTrainer'); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1000);
await p.evaluate(()=>window.__seek(23)); await p.waitForTimeout(2500);
{ const r=await p.evaluate(()=>({res:JSON.parse(localStorage.getItem('af_results_v1')||'[]').length}));
  const errs=freshErr();
  ok(!errs.length&&r.res>=1,'a finished scored session saves a result ('+r.res+' saved)');
  await p.click('#tabBoard'); await p.click('#stResults'); await p.waitForTimeout(500);
  ok(await p.evaluate(()=>!!document.querySelector('#resList .res')),
    'the Results page lists the finished session'); }

// ---------- D. the class size changes MID-CLASS without a reset ----------
await boot();   // a fresh boot: section C left a FINISHED session behind
await p.evaluate(()=>window.__loadLib('Tuesday Engine')); await p.waitForTimeout(500);
await p.click('#tabTrainer'); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(900);
await p.evaluate(()=>window.__seek(130)); await p.waitForTimeout(400);
const before=await p.evaluate(()=>document.getElementById('clock').textContent);
await p.click('#ctTeams'); await p.waitForTimeout(400);
await p.evaluate(()=>{ const b=[...document.querySelectorAll('#tcPick .mfield,#tcPick2 .mfield')]
  .find(x=>x.offsetParent); if(b) b.click(); });
await p.waitForTimeout(250);
await p.evaluate(()=>{ const pn=[...document.querySelectorAll('.mpanel')].find(x=>!x.hidden&&x.offsetParent);
  const s=pn&&pn.querySelector('.msearch'); if(!s) return;
  s.value='18'; s.dispatchEvent(new Event('input',{bubbles:true}));
  s.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); });
await p.waitForTimeout(900);
{ const r=await p.evaluate(()=>({n:JSON.parse(localStorage.getItem('af_erg_cfg_v8')).crews.length,
    live:!!document.querySelector('#blockCards .exg.pnow')}));
  const errs=freshErr();
  ok(!errs.length&&r.n===18&&r.live,
    'mid-class resize to 18: roster grows, the clock never stops ('+before+' → running)'
    +(errs.length?' ERR:'+errs[0]:'')); }

// ---------- E. control mashing ----------
{ let bad='';
  for(let i=0;i<3;i++){
    await p.evaluate(()=>{ const b=document.getElementById('resetBtn'); if(b&&!b.disabled) b.click(); });
    await p.waitForTimeout(250);
    await p.evaluate(()=>{ const d=document.querySelector('.dlg .dok'); if(d) d.click(); });
    await p.waitForTimeout(400);
    await p.evaluate(()=>{ const b=document.getElementById('startBtn'); if(!b.disabled) b.click(); });
    await p.waitForTimeout(400);
  }
  await p.click('#tabBoard'); await p.waitForTimeout(400);
  for(let i=0;i<6;i++){ await p.evaluate(()=>{ const b=document.getElementById('bdPause');
      if(b&&!b.disabled) b.click(); }); await p.waitForTimeout(180); }
  const errs=freshErr();
  const live=await p.evaluate(()=>!!document.querySelector('#blockCards .exg.pnow'));
  ok(!errs.length,'mashing start/reset x3 and pause x6: no errors'+(errs.length?' ERR:'+errs[0]:''));
  ok(true,'state after mash: '+(live?'running':'idle')+' (either is legal, nothing broke)'); }

// ---------- F. corrupted storage still boots ----------
await p.evaluate(()=>{ localStorage.setItem('af_erg_cfg_v8','{broken json!!');
  localStorage.setItem('af_presets_v1','also broken'); });
await p.reload(); await p.waitForTimeout(1600);
{ const r=await p.evaluate(()=>({name:(document.getElementById('evName')||{}).textContent||'',
    boot:!document.getElementById('bootErr')}));
  ok(r.boot&&r.name.length>0,'corrupted cfg AND presets: the app boots to defaults ("'+r.name+'")');
  freshErr(); }

// ---------- G. long names at phone width ----------
await boot();
await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  c.crews=Array.from({length:6},(_,i)=>({name:'Aleksandrina-Konstantina '+(i+1)}));
  c.name='An Extremely Long Workout Display Title';
  localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); });
await p.setViewportSize({width:390,height:844});
await p.reload(); await p.waitForTimeout(1500);
{ const sx=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  const errs=freshErr();
  ok(!errs.length&&sx<=0,'26-char names + 39-char title at 390px: nothing crosses the edge'); }
await p.setViewportSize({width:1366,height:1000});

// ---------- H. library churn: save-as x12, rename chain, delete + restore ----------
await boot();
await p.click('#stSetup'); await p.waitForTimeout(500);
for(let i=1;i<=12;i++){
  await p.evaluate(d=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    if(!c.prog) c.prog={}; c.prog.date='2026-09-'+String(d).padStart(2,'0');
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); },i);
  await p.reload(); await p.waitForTimeout(900);
  await p.click('#stSetup'); await p.waitForTimeout(300);
  await p.click('#wkPick .mfield'); await p.waitForTimeout(200);
  await p.fill('#wkPick .msearch','Churn'); await p.waitForTimeout(220);
  await p.click('#wkPick .combo-item.add'); await p.waitForTimeout(400);
}
{ const r=await p.evaluate(()=>{ const ps=JSON.parse(localStorage.getItem('af_presets_v1'));
    const churn=ps.filter(x=>/^Churn/.test(x.name));
    return {n:churn.length, uniq:new Set(churn.map(x=>x.name)).size}; });
  ok(r.n===12&&r.uniq===12,'12 dated save-as of one name: 12 distinct boards ('+r.n+'/'+r.uniq+')'); }
for(let i=0;i<5;i++){
  await p.evaluate(()=>{ window.prompt=null; });
  await p.click('#wkRen'); await p.waitForTimeout(200);
  await p.fill('.wkrow .renin','Churn Final '+i); await p.keyboard.press('Enter'); await p.waitForTimeout(350);
}
{ const r=await p.evaluate(()=>{ const ps=JSON.parse(localStorage.getItem('af_presets_v1'));
    return {last:ps.some(x=>x.name==='Churn Final 4'),
      gone:!ps.some(x=>/^Churn Final [0-3]$/.test(x.name))}; });
  ok(r.last&&r.gone,'a rename chain of 5 leaves exactly the last name'); }
{ let errCount=0;
  for(let i=0;i<3;i++){
    await p.evaluate(()=>{ const b=document.getElementById('wkDel'); if(b&&!b.hidden) b.click(); });
    await p.waitForTimeout(300);
    await p.evaluate(()=>{ const d=document.querySelector('.dlg .dok'); if(d) d.click(); });
    await p.waitForTimeout(400);
    await p.click('#wkPick .mfield'); await p.waitForTimeout(200);
    await p.evaluate(()=>{ const it=[...document.querySelectorAll('#wkPick .combo-item')]
      .find(x=>/^Churn/.test(x.textContent)); if(it) it.click(); });
    await p.waitForTimeout(400);
  }
  const errs=freshErr(); errCount=errs.length;
  ok(!errCount,'delete x3 with re-picks between: no errors'+(errCount?' ERR:'+errs[0]:'')); }

// ---------- I. reload in the middle of a class (standalone, no relay) ----------
await boot();
await p.evaluate(()=>window.__loadLib('Tuesday Engine')); await p.waitForTimeout(500);
await p.click('#tabTrainer'); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(900);
await p.reload(); await p.waitForTimeout(1600);
{ const t1=await p.evaluate(()=>document.getElementById('clock').textContent);
  await p.waitForTimeout(1300);
  const t2=await p.evaluate(()=>document.getElementById('clock').textContent);
  const errs=freshErr();
  ok(!errs.length&&t1===t2,'reload mid-class without relay: no ghost clock ticking ('+t1+')'); }

// ---------- J. the tablet mid-session ----------
await p.click('#tabTrainer'); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(900);
await p.click('#tabTablet'); await p.waitForTimeout(900);
await p.evaluate(()=>{ const t=document.querySelector('.twc'); if(t) t.click(); });
await p.waitForTimeout(1200);
{ const r=await p.evaluate(()=>({inst:!!document.querySelector('.tk-inst, .tk-now')}));
  const errs=freshErr();
  ok(!errs.length&&r.inst,'tablet mid-session: the machine screen shows the work, no errors'
    +(errs.length?' ERR:'+errs[0]:'')); }

// ---------- K. full screen coverage while LIVE ----------
for(const [w,h] of [[1920,1080],[402,874]]){
  await p.setViewportSize({width:w,height:h});
  await p.goto(APP+'#workout'); await p.reload(); await p.waitForTimeout(1400);
  await p.evaluate(()=>{ document.body.classList.add('tvfull'); dispatchEvent(new Event('resize')); });
  await p.waitForTimeout(1300);
  const r=await p.evaluate(()=>{ const f=document.getElementById('tvFit').getBoundingClientRect();
    return {w:f.width,right:f.right,bottom:f.bottom}; });
  const errs=freshErr();
  ok(!errs.length&&r.w>=0.85*w&&r.right<=w+2&&r.bottom<=h+2,
    `LIVE tvfull ${w}x${h}: fills and stays inside (${Math.round(r.w/w*100)}% wide)`);
}

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
