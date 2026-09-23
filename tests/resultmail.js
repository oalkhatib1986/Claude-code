// RESULT EMAILS (build 506 — Omar: a scored team that leaves an email gets its
// result mailed at the end to share on socials). The static page can't send mail,
// so the claim captures an optional email, stores it on the crew, and at session
// end the app POSTs the rows to the relay worker's `mail` op (SendGrid). This
// suite mocks the relay, claims a machine with a name + email, runs the class to
// the finish, and asserts the mail POST carries that email and the team's result.
// It also pins: the email field only shows on a SCORED board, and no email = no send.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
let mailPosts=[];
async function boot(br,scored){
  const ctx=await br.newContext({viewport:{width:900,height:1200}});
  await ctx.route('https://relay.test/**',route=>{
    const cors={'access-control-allow-origin':'*'};
    let b={}; try{ b=JSON.parse(route.request().postData()||'{}'); }catch(e){}
    if(b.op==='mail') mailPosts.push(b);
    const send=o=>route.fulfill({status:200,headers:{'content-type':'application/json',...cors},body:JSON.stringify(o)});
    if(b.op==='s.get') return send({v:null,now:Date.now()});
    if(b.op==='mail') return send({ok:1,sent:1,failed:0});
    return send({ok:1,now:Date.now(),presets:[]});
  });
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1'),
    localStorage.setItem('af_ai_url','https://relay.test')));
  await p.reload(); await p.waitForTimeout(1400);
  await p.evaluate(sc=>{ const k='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(k));
    Object.assign(c,{name:'Sprint',wkName:'Sprint',mode:'rotation',teamKind:'teams',teamSize:2,
      together:true,noScore:!sc,scoreSrc:'manual'});
    c.inventory=Object.assign(c.inventory||{},{Run:6});
    c.display=Object.assign(c.display||{},{ready:0,voice:false});
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:0,sameRest:true,blocks:[
      {name:'A',rounds:1,items:[{dur:6,name:'A',scored:sc,metric:'metres',
        exercises:[{who:'',name:'Run',amounts:[],unit:'m',max:true}]}]}]});
    c.crews=[{name:'Team 1'},{name:'Team 2'}];
    localStorage.setItem(k,JSON.stringify(c)); },scored);
  await p.reload(); await p.waitForTimeout(1500);
  return {ctx,p};
}
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

// ---- SCORED: email field shows, claim stores it, finish mails it ----
{ const {p}=await boot(br,true);
  await p.evaluate(()=>document.getElementById('tabTablet').click()); await p.waitForTimeout(500);
  await p.evaluate(()=>window.__tbOpen&&window.__tbOpen('Run:1')); await p.waitForTimeout(600);
  const hasField=await p.evaluate(()=>!!document.querySelector('#tbEmail'));
  ok(hasField,'scored: the claim card shows the optional email field');
  // claim with a name + email
  await p.evaluate(()=>{ const n=document.querySelector('#tbClaim'), e=document.querySelector('#tbEmail');
    if(n) n.value='Alpha'; if(e) e.value='alpha@ex.com';
    const go=document.querySelector('#tbClaimGo'); if(go) go.click(); });
  await p.waitForTimeout(500);
  const stored=await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
    return (c.crews||[]).map(x=>({name:x.name,email:x.email||''})); });
  ok(stored.some(c=>c.name==='Alpha'&&c.email==='alpha@ex.com'),
    'scored: the claim stored the email on the crew ['+JSON.stringify(stored)+']');
  // run to the finish
  mailPosts=[];
  await p.evaluate(()=>document.getElementById('tabTrainer').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>document.getElementById('startBtn').click()); await p.waitForTimeout(400);
  await p.evaluate(()=>window.__seek&&window.__seek(30)); await p.waitForTimeout(1200);
  ok(mailPosts.length>0,'finish: the app POSTed a mail op to the relay ['+mailPosts.length+']');
  const job=mailPosts.length?(mailPosts[mailPosts.length-1].results||[]).find(j=>(j.to||[]).includes('alpha@ex.com')):null;
  ok(!!job,'finish: the mail carries Alpha’s email');
  ok(job&&job.name==='Alpha'&&typeof job.rank==='number','finish: the mail carries the team name + placing ['+(job&&job.rank)+']');
  await p.close(); }

// ---- UNSCORED: no email field, and no mail on finish ----
{ const {p}=await boot(br,false);
  await p.evaluate(()=>document.getElementById('tabTablet').click()); await p.waitForTimeout(500);
  await p.evaluate(()=>window.__tbOpen&&window.__tbOpen('Run:1')); await p.waitForTimeout(600);
  ok(!(await p.evaluate(()=>!!document.querySelector('#tbEmail'))),'unscored: no email field on the claim');
  mailPosts=[];
  await p.evaluate(()=>document.getElementById('tabTrainer').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>{ const b=document.getElementById('startBtn'); if(b) b.click(); }); await p.waitForTimeout(400);
  await p.evaluate(()=>window.__seek&&window.__seek(30)); await p.waitForTimeout(1000);
  ok(mailPosts.length===0,'unscored: nothing is mailed');
  await p.close(); }

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
