// The relay rides the URL, in as few characters as a TV remote can manage:
// ?relay=https://... (long form), ?r=bare-host (short form, https assumed),
// and tv.html?r=... is the shortest entrance — it lands on the big screen.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const D='file:///home/user/Claude-code/';
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const t=async(url,want,label)=>{
  const ctx=await br.newContext(); const p=await ctx.newPage();
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  await p.goto(url); await p.waitForTimeout(900);
  const got=await p.evaluate(()=>localStorage.getItem('af_ai_url'));
  ok(got===want,label+' ('+got+')');
  const r={href:await p.evaluate(()=>location.href),cls:await p.evaluate(()=>document.body.className)};
  await ctx.close(); return r;
};
await t(D+'leaderboard.html?relay=https%3A%2F%2Fathl3te-ai.x.workers.dev%2Fai','https://athl3te-ai.x.workers.dev/ai',
  'long form ?relay= stored as pasted');
await t(D+'leaderboard.html?r=athl3te-ai.x.workers.dev','https://athl3te-ai.x.workers.dev',
  'short form ?r= bare host gets https://');
await t(D+'leaderboard.html?r=javascript:alert(1)',null,
  'a non-host value is refused');
const tv=await t(D+'tv.html?r=athl3te-ai.x.workers.dev','https://athl3te-ai.x.workers.dev',
  'tv.html hands the relay through');
ok(/app\.html\?r=.*tv=1#screen$/.test(tv.href),'tv.html lands on the big screen route ('+tv.href+')');
ok(/tvroute/.test(tv.cls),'and the page is the chrome-free board');
// Samsung's browser drops #fragments across redirects — ?tv=1 alone must land
// on the screen route with no hash arriving at all
const bare=await t(D+'leaderboard.html?tv=1&r=athl3te-ai.x.workers.dev','https://athl3te-ai.x.workers.dev',
  '?tv=1 with no hash still stores the relay');
ok(/tvroute/.test(bare.cls),'?tv=1 alone lands on the chrome-free board ('+/tvroute/.test(bare.cls)+')');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
