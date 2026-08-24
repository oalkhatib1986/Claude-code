// EVERY REAL BOARD, NOT THREE INVENTED ONES. Renders the 14 house boards and a
// spread of the whole programme on a TV-size wall and machine-checks each card
// against the house wording/layout rules. A wall change ships only when every
// board the gym actually owns passes.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1920,height:1080}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
await p.goto('file:///home/user/Claude-code/leaderboard.html');
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_mw_v1','1'),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1400);
await p.goto('file:///home/user/Claude-code/leaderboard.html#workout'); await p.waitForTimeout(1400);
const names=await p.evaluate(()=>{
  const seeds=JSON.parse(localStorage.getItem('af_presets_v1')||'[]').map(x=>x.name);
  const prog=(window.__prog||[]).map((r,i)=>i);
  return {seeds,progN:prog.length};
});
// all 14 house boards + every 9th programme session (~37 more)
const progPick=[]; for(let i=0;i<names.progN;i+=9) progPick.push(i);
console.log('boards: '+names.seeds.length+' house + '+progPick.length+' programme of '+names.progN);
let checked=0;
const audit=async label=>{
  const r=await p.evaluate(()=>{
    const txt=document.getElementById('blockCards').innerText.replace(/\s+/g,' ');
    const clipped=[...document.querySelectorAll('#blockCards .exl:not(.exlw),#blockCards .exg-h')]
      .filter(e=>e.scrollWidth>e.clientWidth+1).length;
    return {txt,clipped,sx:document.documentElement.scrollWidth-innerWidth};
  });
  const bad=[];
  if(r.clipped) bad.push(r.clipped+' clipped lines');
  if(r.sx>0) bad.push('page scrolls '+r.sx+'px');
  if(/Max Max/i.test(r.txt)) bad.push('doubled Max');
  if(/\bGroup\b/.test(r.txt)) bad.push('"Group" printed');
  if(/(\w[\w\s]{0,30}) \+ \1/i.test(r.txt)) bad.push('glued-name heading survived');
  if(/cal cal/i.test(r.txt)) bad.push('doubled cal');
  if(bad.length){ fail++; console.log('FAIL',label,'—',bad.join(' · ')); }
  else pass++;
  checked++;
};
for(const nm of names.seeds){
  await p.evaluate(n=>window.__loadLib(n),nm); await p.waitForTimeout(450);
  await audit('house: '+nm);
}
for(const ix of progPick){
  const lbl=await p.evaluate(i=>{ const r=window.__prog[i];
    const blk=/^\d+$/.test(r[0])?"B"+r[0]:r[0];
    return `${blk} · W${r[1]} · ${r[2].slice(0,3)} — ${r[3]||r[2]}`; },ix);
  const hit=await p.evaluate(l=>window.__loadLib(l),lbl);
  if(!hit){ fail++; console.log('FAIL could not load',lbl); continue; }
  await p.waitForTimeout(350);
  await audit('prog: '+lbl);
}
console.log(checked+' boards audited');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
