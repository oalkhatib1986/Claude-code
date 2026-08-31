// A MACHINE NUMBER THE GYM DOES NOT OWN NEVER PRINTS. A block whose floorwork
// needs a spot per athlete still numbers each ERG type only up to the gym's
// inventory, wrapping into sharing — 40 athletes in a five-ski gym read
// Ski 1..5 four times, never SKI 20 (Omar caught SKI 20, build 359).
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1400,height:1000}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
await p.goto('file:///home/user/Claude-code/leaderboard.html');
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1800);
const setup=async n=>{ await p.evaluate(count=>{
    const ps=JSON.parse(localStorage.getItem('af_presets_v1'));
    const tue=ps.find(x=>x.name==='Tuesday Engine');
    const c=JSON.parse(JSON.stringify(tue.cfg));
    c.wkName='Tuesday Engine'; c.together=false;
    c.crews=Array.from({length:count},(_,i)=>({name:'Athlete '+(i+1)}));
    localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c));
  },n);
  await p.reload(); await p.waitForTimeout(1800);
  return p.evaluate(()=>{
    const inv=JSON.parse(localStorage.getItem('af_erg_cfg_v8')).inventory;
    const txt=[...document.querySelectorAll('#blockCards .teams .tn')].map(e=>e.textContent.trim());
    const num=re=>txt.map(t=>+((t.match(re)||[])[1]||0)).filter(Boolean);
    return {inv,chips:txt.length,ski:num(/Ski\s*(\d+)/i),run:num(/Run\s*(\d+)/i)};
  }); };
// forty athletes, five skis: numbers wrap, they never grow
const big=await setup(40);
ok(big.chips>0&&big.chips<=40,'40 athletes draw a readable chip list ('+big.chips+' rows — shared stations collapse)');
ok(big.ski.length&&Math.max(...big.ski)<=big.inv.Ski,
  '40 athletes: max Ski number '+Math.max(...big.ski)+' <= gym\'s '+big.inv.Ski);
ok(big.run.length&&Math.max(...big.run)<=big.inv.Run,
  '40 athletes: max Run number caps at the gym\'s '+big.inv.Run);
ok(new Set(big.ski).size===Math.min(big.inv.Ski,big.ski.length),
  'every owned ski is used before anyone shares');
// a class the gym CAN seat one-each stays distinct inside the block
const small=await setup(8);
ok(small.ski.length&&Math.max(...small.ski)<=small.inv.Ski,
  '8 athletes: numbers still inside the inventory');
{ const perBlock=small.ski.slice(0,4);
  ok(new Set(perBlock).size===perBlock.length,
    '8 athletes: one block\'s skis are distinct machines ('+perBlock.join(',')+')'); }
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
