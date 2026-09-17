// FIT-ALL (rebuilt for the repo after the Aug 2026 scratchpad loss — the
// CLAUDE.md gate for ANY layout-touching change): 3 config states × 8 pages
// × 3 widths, idle AND running. Zero tolerance: no horizontal page scroll,
// and no element whose scrollWidth exceeds its clientWidth — clipped or
// spilling, both are bugs. Exemptions are ONLY the real scroll containers,
// deliberate ellipsis, form controls (their value scrolls by design) and
// the .tk-logo crop mask. Never widen the list to make a run pass.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const APP='file:///home/user/Claude-code/leaderboard.html';
const WIDTHS=[[390,844],[834,1112],[1920,1080]];
const TABS=[['#tabBoard','Overview'],['#stSetup','Setup'],['#stLayout','Layout'],
  ['#stResults','Results'],['#stArchive','Archive'],['#tabTrainer','Control'],
  ['#tabScreen','Big Screen'],['#tabTablet','Erg Tablet']];
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1366,height:900}});
let perr=[]; p.on('pageerror',e=>perr.push(e.message));
const freshErr=()=>{const e=perr; perr=[]; return e;};
const SPILL=`(()=>{
  const bad=[]; const sx=document.documentElement.scrollWidth-innerWidth;
  document.querySelectorAll('body *').forEach(el=>{
    if(!(el instanceof HTMLElement)) return;
    if(/^(SELECT|INPUT|TEXTAREA|OPTION)$/.test(el.tagName)) return;
    if(el.clientWidth<=0) return;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden') return;
    if(!el.offsetParent&&cs.position!=='fixed') return;
    if(cs.overflowX==='auto'||cs.overflowX==='scroll') return;
    if(cs.textOverflow==='ellipsis') return;
    if(el.closest('.tk-logo')) return;
    if(el.scrollWidth<=el.clientWidth+1) return;
    // scroll geometry is blind to transforms and to overlay badges, so a
    // scale stage (.twt-scr, #smStage, #tbStage) and a corner badge
    // (#aiFabX) always read as overflow. Judge THOSE by screen rects —
    // a transformed child must paint inside its own stage's box, an
    // absolutely-positioned child inside the viewport — and everything
    // else stays a hard failure. This is a MEASUREMENT of the same law,
    // never an exemption list: text or flow content past its box still
    // fails here whatever the overflow mode.
    let explained=false, excused=true;
    const er=el.getBoundingClientRect();
    for(const k of el.children){
      const ks=getComputedStyle(k), kr=k.getBoundingClientRect();
      // an SVG child has no offset geometry — fall back to screen rects
      const laidRight=(typeof k.offsetLeft==='number')
        ?k.offsetLeft+Math.max(k.scrollWidth||0,k.offsetWidth||0)
        :(kr.right-er.left);
      if(laidRight<=el.clientWidth+1) continue;
      explained=true;
      if(ks.transform&&ks.transform!=='none'){
        if(kr.right>er.right+2||kr.right>innerWidth+1||kr.left<er.left-2){excused=false;break;}
      } else if(ks.position==='absolute'||ks.position==='fixed'){
        if(kr.right>innerWidth+1){excused=false;break;}
      } else {excused=false;break;}
    }
    if(explained&&excused) return;
    const tag=(el.id?'#'+el.id:(el.className&&String(el.className).trim()?'.'+String(el.className).trim().split(/\\s+/)[0]:el.tagName));
    bad.push(tag+'+'+(el.scrollWidth-el.clientWidth)+'px');
  });
  return {sx,n:bad.length,bad:bad.slice(0,5)};
})()`;
const walkTabs=async(label)=>{
  for(const [w,h] of WIDTHS){
    await p.setViewportSize({width:w,height:h});
    for(const [sel,name] of TABS){
      const hit=await p.evaluate(s=>{const b=document.querySelector(s); if(b){b.click();return true;} return false;},sel);
      if(!hit){ ok(false,`${label} · ${w} · ${name}: tab missing`); continue; }
      await p.waitForTimeout(450);
      if(sel==='#tabTablet'&&w>=820){
        await p.evaluate(()=>window.__tbWall&&window.__tbWall()); await p.waitForTimeout(700); }
      const r=await p.evaluate(SPILL);
      const errs=freshErr();
      ok(!errs.length&&r.sx<=0&&r.n===0,
        `${label} · ${w}px · ${name}: fits`
        +(r.sx>0?` SCROLLX ${r.sx}`:'')+(r.n?` SPILLS ${r.n}: ${r.bad.join(' ')}`:'')
        +(errs.length?` ERR ${errs[0]}`:''));
      if(sel==='#tabTablet'&&w>=820){
        // one machine open too — the drilled-in screen is its own layout
        const opened=await p.evaluate(()=>{const t=document.querySelector('#tbWall .twt');
          if(t){t.click();return true;} return false;});
        if(opened){ await p.waitForTimeout(600);
          const r2=await p.evaluate(SPILL); const e2=freshErr();
          ok(!e2.length&&r2.sx<=0&&r2.n===0,
            `${label} · ${w}px · one machine: fits`
            +(r2.sx>0?` SCROLLX ${r2.sx}`:'')+(r2.n?` SPILLS ${r2.n}: ${r2.bad.join(' ')}`:'')); }
      }
    }
  }
};

// ---- state 1: boot default (Send It Saturday, scored teams) ----
await p.goto(APP);
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1600); freshErr();
await walkTabs('SIS default');

// ---- state 2: Tuesday Engine · solo · split · 13 · unscored · LONG names ----
await p.setViewportSize({width:1366,height:900});
await p.goto(APP); await p.waitForTimeout(900);
await p.evaluate(()=>{
  const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  const ps=JSON.parse(localStorage.getItem('af_presets_v1'))||[];
  const src=ps.find(x=>x.name==='Tuesday Engine');
  if(src){ const c2=JSON.parse(JSON.stringify(src.cfg));
    c2.teamKind='solo'; c2.together=false; c2.noScore=true; c2.scoreSrc='manual';
    c2.crews=Array.from({length:13},(_,i)=>({name:i%3===0?
      'Konstantinos Papadopoulos-Alexandrescu '+(i+1):'Athlete '+(i+1)}));
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c2)); }
});
await p.reload(); await p.waitForTimeout(1500); freshErr();
await walkTabs('Engine solo long-names');

// ---- state 3: manual-scored SIS twin shape · 12 teams · notes ----
await p.setViewportSize({width:1366,height:900});
await p.goto(APP); await p.waitForTimeout(900);
await p.evaluate(()=>{
  const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  const it=(name,dur,xs,sc)=>({name,dur,rest:false,fmt:'',scored:!!sc,
    metric:sc?'calories':undefined,scorers:sc?4:undefined,
    exercises:xs.map(([n,note])=>({name:n,unit:'cal',max:true,amounts:[],note:note||''}))});
  Object.assign(c,{name:'Fitall Manual',wkName:'Fitall Manual',mode:'rotation',teamKind:'teams',
    teamSize:2,together:false,noScore:false,scoreSrc:'manual',titleSet:false});
  c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:120,sameRest:true,blocks:[
    {name:'Run / Bike',rounds:1,items:[
      it('Block 1',600,[['110/135/160m Run','Split as a team'],['60 Burpees','2 people working in sync'],
        ['Max Cal Bike','Remaining time — remember your number for Block 2']],true),
      {rest:true,dur:180,exercises:[]},
      it('Block 2',300,[['Max Cal Bike','']],true) ]},
    {name:'Row / Ski',rounds:1,items:[
      it('Block 1',600,[['Max Cal Row',''],['60 Burpees',''],['Max Cal Ski','']],true),
      {rest:true,dur:180,exercises:[]},
      it('Block 2',300,[['Max Cal Ski','']],true) ]} ]});
  c.crews=Array.from({length:12},(_,i)=>({name:['LEVANT','YOMNA','LUNA','SIMBA','AUS','DIS',
    'THE UNSTOPPABLE THUNDERBOLTS','KIT','ZEALOUS ZEBRAS UNITED','MO','FALCON SQUADRON','JAX'][i]}));
  c.inventory=Object.assign({},c.inventory,{Row:6,Ski:6,Bike:6,Run:6});
  localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
});
await p.reload(); await p.waitForTimeout(1500); freshErr();
await walkTabs('Manual twin long-names');

// ---- the same state RUNNING, mid-block and at a rest ----
await p.setViewportSize({width:1366,height:900});
await p.click('#tabTrainer'); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(1300);
await p.evaluate(()=>window.__seek(300)); await p.waitForTimeout(700); freshErr();
await walkTabs('Manual twin RUNNING');
// at the between-piece rest (asks are up on the tablets)
await p.setViewportSize({width:1366,height:900});
await p.click('#tabBoard'); await p.waitForTimeout(400);
await p.evaluate(()=>window.__seek(320)); await p.waitForTimeout(900); freshErr();
for(const [w,h] of WIDTHS){
  await p.setViewportSize({width:w,height:h});
  for(const [sel,name] of [['#tabBoard','Overview'],['#tabTrainer','Control'],['#tabTablet','Erg Tablet']]){
    await p.click(sel); await p.waitForTimeout(450);
    if(sel==='#tabTablet'&&w>=820){ await p.evaluate(()=>window.__tbWall&&window.__tbWall()); await p.waitForTimeout(700); }
    const r=await p.evaluate(SPILL); const errs=freshErr();
    ok(!errs.length&&r.sx<=0&&r.n===0,`Manual twin AT REST · ${w}px · ${name}: fits`
      +(r.sx>0?` SCROLLX ${r.sx}`:'')+(r.n?` SPILLS ${r.n}: ${r.bad.join(' ')}`:'')
      +(errs.length?` ERR ${errs[0]}`:''));
  }
}

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
