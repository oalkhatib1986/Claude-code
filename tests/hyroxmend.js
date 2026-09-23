// HYROX'S ERGS ARE EACH THEIR OWN STATION (build 505 — Omar: "rebuild HYROX with
// each erg as its own station… why are there no erg screens!"). The board was
// authored as ONE shared AMRAP exercise with its movements in lines[], so the
// ergs were buried in strings and the Erg Tablet tab said "no ergs". hyroxMend()
// (in migrateLoaded, name-pinned to HYROX) unpacks that one exercise into one
// exercise PER movement and makes the piece a self-paced rotate circuit, so each
// erg becomes a claimable station with its own tablet. This suite seeds the
// mis-built shape, reloads (migrate runs), and pins the conversion + the tablets;
// it also pins that a non-HYROX lines AMRAP (Send It Saturday) is left alone.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
async function boot(br,name){
  const p=await br.newPage({viewport:{width:900,height:1200}});   // portrait -> tablet wall
  p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
  await p.goto(F);
  await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
  await p.reload(); await p.waitForTimeout(1400);
  await p.evaluate(nm=>{
    const k='af_erg_cfg_v8'; const c=JSON.parse(localStorage.getItem(k));
    Object.assign(c,{name:nm,wkName:nm,mode:'rotation',teamKind:'teams',teamSize:2,
      together:true,noScore:true,scoreSrc:'manual'});
    c.inventory=Object.assign(c.inventory||{},{Ski:6,Bike:6,Row:6,Run:6});
    c.display=Object.assign(c.display||{},{ready:0});
    // the MIS-BUILT shape: ONE exercise carrying all movements in lines[]
    c.rotation=Object.assign(c.rotation||{},{laps:1,blockRest:0,sameRest:true,blocks:[
      {name:'AMRAP in Pairs',rounds:1,items:[{dur:2700,name:'AMRAP in Pairs',scored:false,group:true,
        exercises:[{who:'All 2',name:'Each round',amounts:[],unit:'reps',
          lines:['1km Ski','50m Sled Drag','1km Run','50 HR Press Ups','2km Bike','50 Wall Balls','1km Row'],
          note:'Split the work between partners as you like'}]}]}]});
    c.crews=[{name:'A'},{name:'B'},{name:'C'},{name:'D'},{name:'E'},{name:'F'}];
    localStorage.setItem(k,JSON.stringify(c));
  },name);
  await p.reload(); await p.waitForTimeout(1600);   // migrateLoaded runs hyroxMend on load
  return p;
}
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

// ---- HYROX: the lines-AMRAP is unpacked into a rotate circuit of stations ----
// hyroxMend mends the LIVE cfg on every load (durable, like sisRotToPlain), so we
// verify the rendered result, not localStorage (which keeps the pre-heal shape).
{ const p=await boot(br,'HYROX');
  const ov=await p.evaluate(()=>{
    const bd=document.querySelector('#blockCards .blk .bd');
    const lines=bd?[...bd.querySelectorAll('.exl:not(.exsub):not(.exnote)')].map(e=>e.textContent.replace(/\s+/g,' ').trim()):[];
    return {lines, nLines:lines.length};
  });
  ok(ov.nLines>=6,'each movement renders as its own station line (not one lines block) ['+ov.nLines+']');
  ok(ov.lines.some(l=>/ski/i.test(l))&&ov.lines.some(l=>/bike/i.test(l))&&ov.lines.some(l=>/row/i.test(l))&&ov.lines.some(l=>/run/i.test(l)),
    'the ergs each appear as their own station ['+ov.lines.slice(0,3).join(' | ')+'…]');
  ok(!await p.evaluate(()=>document.body.classList.contains('noergs')),'the board is no longer "no ergs"');
  await p.evaluate(()=>document.getElementById('tabTablet').click()); await p.waitForTimeout(1000);
  const wall=await p.evaluate(()=>{ const w=document.getElementById('tbWall');
    const tiles=w?[...w.querySelectorAll('.twt')]:[];
    return {n:tiles.length, labels:[...new Set(tiles.map(t=>{const b=t.querySelector('.tk-blk');return b?b.textContent.trim().replace(/\d+$/,'').trim():'';}))]}; });
  ok(wall.n>0,'the erg tablet wall now shows station tiles ['+wall.n+']');
  ok(['SkiErg','Bike','Rower','Assault Runner'].every(l=>wall.labels.includes(l)),
    'each erg is its own tablet ['+wall.labels.join(', ')+']');
  await p.close(); }

// ---- a non-HYROX lines AMRAP is NOT touched (name-pinned heal) ----
{ const p=await boot(br,'Send It Saturday');
  const it=await p.evaluate(()=>{
    const b=JSON.parse(localStorage.getItem('af_erg_cfg_v8')).rotation.blocks[0].items[0];
    return {nEx:(b.exercises||[]).length,anyLines:(b.exercises||[]).some(x=>Array.isArray(x.lines)&&x.lines.length)};
  });
  ok(it.nEx===1&&it.anyLines,'a non-HYROX lines AMRAP keeps its single lines station ['+it.nEx+']');
  await p.close(); }

await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
