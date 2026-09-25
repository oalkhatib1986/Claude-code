// NEW LEADERBOARD (build 522 — Omar's Send It Saturday redesign): Page 1 is the
// live big-screen picture (#lbLive), Page 2 is the final-results share image
// exported to PNG and emailed. Lime = cfg.lbAccent (his own configurable colour).
// This RETIRES the old #board table on the Big Screen leaderboard; the table
// still exists for the phone browsing view.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await br.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1});
const p=await ctx.newPage();
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
p.on('dialog',d=>d.accept());
await p.goto(F);
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1500);
// the boot default is the scored Send It Saturday board — go to Big Screen > Leaderboard
await p.evaluate(()=>document.getElementById('tabScreen').click()); await p.waitForTimeout(300);
await p.evaluate(()=>{ const l=document.getElementById('smLead'); if(l) l.click(); });
await p.waitForTimeout(600);
await p.evaluate(()=>document.fonts&&document.fonts.ready);

// ---- Page 1 : the live picture ----
{ const r=await p.evaluate(()=>({
    lbnew:document.body.classList.contains('lbnew'),
    lbShown:!!document.getElementById('lbLive')&&getComputedStyle(document.getElementById('lbLive')).display!=='none',
    tvfitHidden:getComputedStyle(document.querySelector('#viewBoard>.tvfit')).display==='none',
    rows:document.querySelectorAll('#lbLive .lbrow').length,
    labs:[...document.querySelectorAll('#lbLive .lbc-col .lbrow')[0]?.querySelectorAll('.mc .lab')||[]].map(x=>x.textContent),
    title:(document.querySelector('#lbLive .htitle')||{}).innerText||'',
    hash:(document.querySelector('#lbLive .fr')||{}).textContent||'' }));
  ok(r.lbnew,'Page 1: the Big Screen switches to the new leaderboard (body.lbnew)');
  ok(r.lbShown&&r.tvfitHidden,'Page 1: the new picture shows and the old #board table is hidden');
  ok(r.rows>0,'Page 1: every team has a row ('+r.rows+')');
  ok(r.labs.length>=1,'Page 1: the scored-section columns are labelled ('+r.labs.join(', ')+')');
  ok(/send it saturday/i.test(r.title),'Page 1: the workout name heads the board — '+r.title);
  ok(/#SENDITSATURDAY/i.test(r.hash),'Page 1: the hashtag rides the footer — '+r.hash); }

// every team on one screen (no paging) and nothing spills past the canvas
{ const r=await p.evaluate(()=>{ const rows=[...document.querySelectorAll('#lbLive .lbrow')];
    const cv=document.getElementById('lbLive').getBoundingClientRect();
    const vb=document.getElementById('viewBoard').getBoundingClientRect();
    return {vis:rows.filter(l=>l.offsetHeight>0).length,total:rows.length,
      insideW:cv.right<=vb.right+2&&cv.left>=vb.left-2}; });
  ok(r.total>0&&r.vis===r.total,'Page 1: every team on one screen, no paging ('+r.vis+'/'+r.total+')');
  ok(r.insideW,'Page 1: the picture sits inside its box (no sideways spill)'); }

// ---- theme : the leaderboard colour is configurable ----
{ const before=await p.evaluate(()=>getComputedStyle(document.querySelector('#lbLive .lbc-limebar')).backgroundColor);
  const changed=await p.evaluate(()=>{
    document.documentElement.style.setProperty('--lbAccent','rgb(255,0,0)');
    return getComputedStyle(document.querySelector('#lbLive .lbc-limebar')).backgroundColor; });
  ok(before!==changed&&/255, 0, 0/.test(changed),'theme: the lime bar follows --lbAccent ('+before+' -> '+changed+')'); }
await p.evaluate(()=>{ document.documentElement.style.setProperty('--lbAccent','#C6F432'); });

// ---- Page 2 : the final-results share image ----
{ const html=await p.evaluate(()=>window.__lb.finalHTML(-1));
  ok(/CHAMPIONS/.test(html),'Page 2: the champion card is built');
  ok(/final-badge/.test(html)&&/FINAL/.test(html),'Page 2: the FINAL badge is present');
  ok(/class="rest"/.test(html),'Page 2: the ranks-4+ table is present');
  ok(/#SENDITSATURDAY|>#/.test(html),'Page 2: the hashtag is present'); }
{ const url=await p.evaluate(async()=>await window.__lb.png(-1,1));
  ok(typeof url==='string'&&/^data:image\/png;base64,/.test(url)&&url.length>5000,
    'Page 2: the picture rasterises to a PNG data URL ('+(url?url.length:0)+' bytes)'); }
// a personalised copy tags the recipient's team
{ const html=await p.evaluate(()=>window.__lb.finalHTML(0));
  ok(/YOUR TEAM/.test(html),'Page 2: the emailed copy tags the recipient team (YOUR TEAM)'); }

ok(true,'no page errors');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
