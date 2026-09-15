// EDIT-IN-PLACE ON THE OVERVIEW (build 406 — Omar's Option A): an Edit
// button on the trainer's Overview turns every real FIELD tappable — an
// exercise line opens amount/name/RPE/%1RM/note, a set heading opens
// name/time, a part title opens the name. Computed lines follow the
// numbers. The wall never shows the button, navigation drops the mode,
// and a mid-class save keeps the clock running.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
const F='file:///home/user/Claude-code/leaderboard.html';
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1440,height:1000}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
await p.goto(F);
await p.evaluate(()=>(localStorage.clear(),localStorage.setItem('af_prog_v1','1')));
await p.reload(); await p.waitForTimeout(1200);
await p.evaluate(()=>{
  const k='af_erg_cfg_v8'; const cfg=JSON.parse(localStorage.getItem(k));
  cfg.gear=[];
  Object.assign(cfg,{name:'Edit Test',wkName:null,mode:'rotation',teamKind:'solo',together:true,noScore:true});
  cfg.rotation=Object.assign(cfg.rotation||{},{laps:1,blockRest:60,blocks:[
    {name:'Part A',rounds:1,items:[
      {name:'Set 1',dur:150,scored:false,group:true,exercises:[
        {name:'Back Squat',amounts:[8],unit:'reps',max:false,rpe:'7'}]},
      {rest:true,dur:60,exercises:[]},
      {name:'Set 2',dur:150,scored:false,group:true,exercises:[
        {name:'Back Squat',amounts:[6],unit:'reps',max:false,rpe:'8'}]}]},
    {name:'Part B',rounds:1,items:[
      {dur:300,scored:false,group:true,exercises:[
        {name:'Run',amounts:[600],unit:'m',max:false}]}]},
    {name:'Part C',rounds:1,items:[
      {dur:240,fmt:'rotate',rotBy:'clock',scored:false,exercises:[
        {name:'Ski',amounts:[],unit:'cal',max:true},
        {name:'Bike',amounts:[],unit:'cal',max:true}]}]},
    {name:'Part D',rounds:1,items:[
      {name:'Set 1',dur:150,fmt:'share',shareN:2,scored:false,group:true,exercises:[
        {name:'Walking Lunge',amounts:[20],unit:'reps',max:false}]},
      {name:'Set 2',dur:150,fmt:'share',shareN:2,scored:false,group:true,exercises:[
        {name:'Walking Lunge',amounts:[20],unit:'reps',max:false}]}]}]});
  cfg.crews=[{name:'A1'},{name:'A2'}];
  localStorage.setItem(k,JSON.stringify(cfg));
});
await p.reload(); await p.waitForTimeout(1400);
const cfgNow=async()=>p.evaluate(()=>JSON.parse(localStorage.getItem('af_erg_cfg_v8')));
const cardTxt=async n=>p.evaluate(n2=>{
  const c=document.querySelectorAll('#blockCards .blk')[n2];
  return c?c.innerText.replace(/\s+/g,' ').trim():''; },n);
// 1) the button lives on the Overview, off by default
ok(await p.evaluate(()=>{ const r=document.getElementById('bEditRow');
  return !!r&&!!r.offsetParent; }),'the Edit button is on the Overview');
ok(await p.evaluate(()=>!document.body.classList.contains('bedit')),'edit mode starts OFF');
// 2) toggle on: affordances + hint
await p.click('#bEditBtn'); await p.waitForTimeout(200);
ok(await p.evaluate(()=>document.body.classList.contains('bedit')
  &&document.getElementById('bEditBtn').textContent==='Done editing'
  &&!document.getElementById('bEditHint').hidden),'Edit turns the mode on');
// 3) exercise line -> editor -> change reps + RPE + note
await p.click('#blockCards .blk[data-bi="0"] .exg[data-i="0"] .exl[data-xi="0"]');
await p.waitForTimeout(200);
ok(await p.evaluate(()=>!!document.querySelector('#blockCards .bef #befA')),'tapping a line opens the inline editor');
// THE EDITOR WEARS THE SITE (Omar, 407: "not the same theme or font"): a bare
// <input> misses the shared input[type=text] rule — every field carries it
ok(await p.evaluate(()=>[...document.querySelectorAll('#blockCards .bef input')]
  .every(i=>i.getAttribute('type')==='text')),'407: every editor field is a site-styled input');
ok(await p.evaluate(()=>{ const r=document.getElementById('bEditRow').getBoundingClientRect();
  const b=document.getElementById('bEditBtn').getBoundingClientRect();
  return r.right-b.right<24; }),'407: the Edit button sits at the RIGHT of its row');
await p.fill('#befA','12'); await p.fill('#befC','9'); await p.fill('#befE','brace hard');
await p.click('[data-bev="save"]'); await p.waitForTimeout(400);
{ const c=await cfgNow(); const x=c.rotation.blocks[0].items[0].exercises[0];
  ok(String(x.amounts[0])==='12'&&x.rpe==='9'&&x.note==='brace hard',
    'save writes amount, RPE and note to the cfg');
  const A=await cardTxt(0);
  ok(/12 Back Squat/i.test(A)&&/@ RPE 9/i.test(A)&&/brace hard/i.test(A),
    'the card repaints with the new prescription'); }
// 4) set heading -> item editor -> rename + retime
await p.click('#blockCards .blk[data-bi="0"] .exg[data-i="2"] .exg-h');
await p.waitForTimeout(200);
await p.fill('#befA','Top Set'); await p.fill('#befB','3:00');
await p.click('[data-bev="save"]'); await p.waitForTimeout(400);
{ const c=await cfgNow(); const it=c.rotation.blocks[0].items[2];
  ok(it.name==='Top Set'&&it.dur===180,'a set heading edits name and time');
  // whole minutes are SAID as minutes (house grammar) — never "3:00"
  ok(/Top Set · 3 minutes/i.test(await cardTxt(0)),'the heading reads TOP SET · 3 MINUTES'); }
// 5) rest item -> duration only
await p.click('#blockCards .blk[data-bi="0"] .exg[data-i="1"]');
await p.waitForTimeout(200);
ok(await p.evaluate(()=>!document.querySelector('#blockCards .bef #befA')
  &&!!document.querySelector('#blockCards .bef #befB')),'a rest offers time only');
await p.fill('#befB','0:45'); await p.click('[data-bev="save"]'); await p.waitForTimeout(400);
ok((await cfgNow()).rotation.blocks[0].items[1].dur===45,'the rest is retimed');
// 6) part title -> rename
await p.click('#blockCards .blk[data-bi="1"] .bh b'); await p.waitForTimeout(200);
await p.fill('#befA','Part Z'); await p.click('[data-bev="save"]'); await p.waitForTimeout(400);
ok((await cfgNow()).rotation.blocks[1].name==='Part Z','the part title renames');
ok(/PART Z/i.test(await cardTxt(1)),'the card heading follows at once');
// 7) cancel leaves everything alone
await p.click('#blockCards .blk[data-bi="1"] .exg[data-i="0"] .exl[data-xi="0"]');
await p.waitForTimeout(200);
await p.fill('#befB','Sprint'); await p.click('[data-bev="cancel"]'); await p.waitForTimeout(300);
ok((await cfgNow()).rotation.blocks[1].items[0].exercises[0].name==='Run',
  'Cancel changes nothing');
ok(await p.evaluate(()=>!document.querySelector('#blockCards .bef')),'Cancel closes the editor');
// 7b) sets + unit ride the exercise editor (407)
await p.click('#blockCards .blk[data-bi="1"] .exg[data-i="0"] .exl[data-xi="0"]');
await p.waitForTimeout(200);
await p.fill('#befS','3'); await p.selectOption('#befU','cal');
await p.click('[data-bev="save"]'); await p.waitForTimeout(400);
{ const x=(await cfgNow()).rotation.blocks[1].items[0].exercises[0];
  ok(x.sets===3&&x.unit==='cal','407: Sets and Unit save to the exercise'); }
// 7c) "swap every" IS the rotating part's number (Omar: "why is Swap every
// 2:00 not clickable?") — tap the heading, change the beat, the total follows
await p.click('#blockCards .blk[data-bi="2"] .exg[data-i="0"] .exg-h');
await p.waitForTimeout(200);
ok(await p.evaluate(()=>{ const f=document.querySelector('#blockCards .bef');
  return !!f&&/Swap every/i.test(f.innerText)&&document.getElementById('befB').value==='2:00'; }),
  '407: a rotating part offers Swap every, prefilled with its beat');
await p.fill('#befB','1:30'); await p.click('[data-bev="save"]'); await p.waitForTimeout(400);
ok((await cfgNow()).rotation.blocks[2].items[0].dur===180,
  '407: swap 1:30 × 2 stations = a 3:00 part');
// 7d) the REST DIVIDER between parts is a field too
await p.click('#blockCards .blkrest[data-bi="0"]'); await p.waitForTimeout(200);
await p.fill('#befB','1:30'); await p.click('[data-bev="save"]'); await p.waitForTimeout(400);
ok((await cfgNow()).rotation.blockRest===90,'407: the between-parts rest saves');
ok(await p.evaluate(()=>/Rest\s*1:30/i.test((document.querySelector('#blockCards .blkrest')||{innerText:''}).innerText.replace(/\s+/g,' '))),
  '407: the divider reads Rest 1:30 at once');
// 7e) THE SHARE LINE IS A FIELD when the number is authored (408 — Omar:
// "why can I not edit the share in 2s alternate")
await p.click('#blockCards .blk[data-bi="3"] .exg[data-shr]'); await p.waitForTimeout(200);
ok(await p.evaluate(()=>{ const f=document.querySelector('#blockCards .bef');
  return !!f&&/Athletes per station/i.test(f.innerText)&&document.getElementById('befW').value==='2'; }),
  '408: tapping the share line offers Athletes per station, prefilled');
await p.fill('#befW','3'); await p.click('[data-bev="save"]'); await p.waitForTimeout(400);
{ const its=(await cfgNow()).rotation.blocks[3].items;
  ok(its.every(it=>it.shareN===3),'408: every set of the part takes the new split');
  ok(/share in 3s, alternate/i.test(await cardTxt(3)),'408: the line reads SHARE IN 3S at once'); }
// 7f) a share set's own heading also carries the field
await p.click('#blockCards .blk[data-bi="3"] .exg[data-i="0"] .exg-h'); await p.waitForTimeout(200);
ok(await p.evaluate(()=>{ const w=document.getElementById('befW');
  return !!w&&w.value==='3'; }),'408: the set editor carries Athletes per station too');
await p.click('[data-bev="cancel"]');
// 7g) THE FORMAT ITSELF SWITCHES from the same editor (409 — Omar: "what if
// I want to change share in 2s to something else completely"): pick Waves
// on the share line and every set of the part changes together
await p.click('#blockCards .blk[data-bi="3"] .exg[data-shr]'); await p.waitForTimeout(200);
ok(await p.evaluate(()=>!!document.getElementById('befFmt')),'409: the share line offers a Format choice');
await p.selectOption('#befFmt','waves'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>{ const f=document.querySelector('#blockCards .bef');
  return !!f&&/Waves \(2/i.test(f.innerText); }),'409: picking Waves re-labels the number field');
await p.fill('#befW','3'); await p.click('[data-bev="save"]'); await p.waitForTimeout(400);
{ const its=(await cfgNow()).rotation.blocks[3].items;
  ok(its.every(it=>it.fmt==='waves'&&it.wavesN===3&&it.shareN==null),
    '409: every set of the part becomes 3 waves, share gone');
  ok(/3 waves/i.test(await cardTxt(3))&&!/share in/i.test(await cardTxt(3)),
    '409: the card re-words itself (× 3 waves, no share line)'); }
// 7h) a single set switches format from its own heading (floor exercise —
// an ERG exercise's split is machine-driven and rightly offers no number)
await p.click('#blockCards .blk[data-bi="0"] .exg[data-i="0"] .exg-h'); await p.waitForTimeout(200);
await p.selectOption('#befFmt','share'); await p.waitForTimeout(300);
await p.fill('#befW','2'); await p.click('[data-bev="save"]'); await p.waitForTimeout(400);
{ const it=(await cfgNow()).rotation.blocks[0].items[0];
  ok(it.fmt==='share'&&it.shareN===2,'409: a set switches Everyone-at-once -> Share in 2s'); }
// 7i) an ERG set offers the format but no phantom number field
await p.click('#blockCards .blk[data-bi="1"] .exg[data-i="0"] .exg-h'); await p.waitForTimeout(200);
await p.selectOption('#befFmt','share'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>!document.getElementById('befW')&&!!document.getElementById('befFmt')),
  '409: an erg set (machine-driven split) shows no per-station field');
await p.click('[data-bev="cancel"]');
// 8) phone width: the open editor never makes the page scroll sideways
await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(400);
await p.click('#blockCards .blk[data-bi="0"] .exg[data-i="0"] .exl[data-xi="0"]');
await p.waitForTimeout(300);
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth
  &&!!document.querySelector('#blockCards .bef')),'phone 390: editor open, no sideways scroll');
await p.click('[data-bev="cancel"]');
await p.setViewportSize({width:1440,height:1000}); await p.waitForTimeout(300);
// 9) Done drops the mode and repaints
await p.click('#bEditBtn'); await p.waitForTimeout(200);
ok(await p.evaluate(()=>!document.body.classList.contains('bedit')
  &&document.getElementById('bEditBtn').textContent==='Edit workout'),'Done turns edit mode off');
// 10) the wall never offers it: route + Big Screen tab
await p.goto(F+'#workout'); await p.reload(); await p.waitForTimeout(1400);
ok(await p.evaluate(()=>{ const r=document.getElementById('bEditRow');
  return !r.offsetParent; }),'the projection route hides the Edit button');
await p.goto(F); await p.reload(); await p.waitForTimeout(1400);
// 11) mid-class: an edit keeps the clock running
await p.click('#tabTrainer'); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('startBtn').click());
await p.waitForTimeout(1200);
await p.click('#tabBoard'); await p.waitForTimeout(500);
await p.click('#bEditBtn'); await p.waitForTimeout(300);
await p.click('#blockCards .blk[data-bi="0"] .exg[data-i="0"] .exl[data-xi="0"]');
await p.waitForTimeout(250);
ok(await p.evaluate(()=>!!document.querySelector('#blockCards .bef')),'mid-class: a line still opens its editor');
await p.fill('#befA','10'); await p.click('[data-bev="save"]'); await p.waitForTimeout(600);
{ const c=await cfgNow();
  ok(String(c.rotation.blocks[0].items[0].exercises[0].amounts[0])==='10',
    'mid-class save lands in the cfg');
  const t1=await p.evaluate(()=>document.getElementById('clock').textContent);
  await p.waitForTimeout(1500);
  const t2=await p.evaluate(()=>document.getElementById('clock').textContent);
  ok(t1!==t2,'the clock keeps counting after the save ('+t1+' -> '+t2+')');
  ok(await p.evaluate(()=>!!document.querySelector('#blockCards .blk.live')),
    'the live card is back on screen after the save'); }
// 12) while frozen for editing, a tap still lands (no repaint stole it)
await p.click('#blockCards .blk[data-bi="0"] .exg[data-i="2"] .exg-h');
await p.waitForTimeout(250);
ok(await p.evaluate(()=>!!document.querySelector('#blockCards .bef')),'the running repaint never eats the tap');
await p.click('[data-bev="cancel"]'); await p.click('#bEditBtn');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
