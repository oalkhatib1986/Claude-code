// RENAME IS A MOVE, NOT A COPY. One board carries its name, its title and its
// library entry to the new name; the old name gets a BARE tombstone (moved,
// not binned) and nothing is duplicated. Plus the one-shot that clears the
// pre-Rename leftover "Michael Test 2 2" from every device.
const {chromium}=require('playwright');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('PASS',m)):(fail++,console.log('FAIL',m));};
(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await br.newPage({viewport:{width:1280,height:900}});
p.on('pageerror',e=>{fail++;console.log('FAIL pageerror:',e.message);});
// the relay, mocked at the network layer — capture every lib.put
const puts=[];
await p.route('https://relay.test/**',async route=>{
  const body=JSON.parse(route.request().postData()||'{}');
  if(body.op==='lib.put'){ puts.push(body);
    return route.fulfill({json:{ok:1,ts:body.ts||1}}); }
  if(body.op==='lib.list') return route.fulfill({json:{presets:[]}});
  if(body.op==='s.get') return route.fulfill({json:{v:null,now:Date.now()}});
  if(body.op==='s.put') return route.fulfill({json:{ok:1,now:Date.now()}});
  return route.fulfill({json:{}});
});
await p.goto('file:///home/user/Claude-code/leaderboard.html');
await p.evaluate(()=>(localStorage.clear(),
  localStorage.setItem('af_prog_v1','1'),
  localStorage.setItem('af_ai_url','https://relay.test/')));
await p.reload(); await p.waitForTimeout(1800);   // SIS one-shot authors + saves a full cfg
// save the loaded board under a test name, then rename it
await p.evaluate(()=>{
  const ps=JSON.parse(localStorage.getItem('af_presets_v1'))||[];
  const cfg=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  cfg.wkName='Old Name'; cfg.name='Old Name';
  ps.push({name:'Old Name',cfg:JSON.parse(JSON.stringify(cfg)),ts:5});
  ps.push({name:'Taken Name',cfg:JSON.parse(JSON.stringify(cfg)),ts:5});
  localStorage.setItem('af_presets_v1',JSON.stringify(ps));
  localStorage.setItem('af_erg_cfg_v8',JSON.stringify(cfg));
});
await p.reload(); await p.waitForTimeout(1500);
await p.click('#stSetup'); await p.waitForTimeout(400);
ok(await p.evaluate(()=>!document.getElementById('wkRen').hidden),
  'Rename offers itself for a board in the library');
// NO BROWSER WINDOWS EVER (Omar): any native prompt/confirm/alert is a fail
await p.evaluate(()=>{ window.__native=0;
  window.alert=window.confirm=window.prompt=()=>{ window.__native++; }; });
// tap Rename -> the box itself becomes the input, prefilled and in the site's style
await p.click('#wkRen'); await p.waitForTimeout(300);
const ed=await p.evaluate(()=>{ const i=document.querySelector('.wkrow .renin');
  const gone=el=>!el.offsetParent&&getComputedStyle(el).display==='none';   // ACTUALLY hidden, not just [hidden]
  return i&&{val:i.value,focused:document.activeElement===i,
    pickGone:gone(document.getElementById('wkPick')),
    oldBtnsGone:gone(document.getElementById('wkSave').parentElement),
    go:!!document.getElementById('renGo'),no:!!document.getElementById('renNo')}; });
ok(ed&&ed.val==='Old Name'&&ed.focused&&ed.pickGone&&ed.oldBtnsGone&&ed.go&&ed.no,
  'Rename edits IN the box — the picker and old buttons really leave ('+JSON.stringify(ed)+')');
// Escape walks away without changing anything
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
ok(await p.evaluate(()=>!document.querySelector('.renin')&&!document.getElementById('wkPick').hidden),
  'Escape cancels and the picker returns');
// a collision is refused inline, not unique-ified
await p.click('#wkRen'); await p.waitForTimeout(200);
await p.fill('.wkrow .renin','Taken Name');
await p.click('#renGo'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>{ const m=document.querySelector('.renmsg');
  return m&&!m.hidden&&/already exists/.test(m.textContent)&&!!document.querySelector('.renin'); }),
  'a collision shows the site\'s own message and keeps editing');
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('af_presets_v1'))
  .filter(x=>x.name==='Taken Name').length===1),'nothing was duplicated by the refusal');
// the real rename — type and Enter
puts.length=0;
await p.fill('.wkrow .renin','  New Name  ');
await p.keyboard.press('Enter'); await p.waitForTimeout(600);
const st=await p.evaluate(()=>{
  const ps=JSON.parse(localStorage.getItem('af_presets_v1'));
  const cfg=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  return {names:ps.map(x=>x.name), entry:ps.find(x=>x.name==='New Name'),
    wkName:cfg.wkName, title:cfg.name,
    dead:JSON.parse(localStorage.getItem('af_lib_dead')||'{}'),
    face:(document.querySelector('#wkPick .mfield')||{}).textContent||''};
});
ok(!st.names.includes('Old Name')&&st.names.includes('New Name'),
  'the preset MOVED — old name gone, new name in');
ok(st.entry&&st.entry.cfg.name==='New Name'&&st.entry.cfg.wkName==='New Name',
  'the saved entry\'s own title follows the rename');
ok(st.wkName==='New Name'&&st.title==='New Name',
  'the loaded board is titled by the new name (trimmed)');
ok(!!st.dead['Old Name'],'the old name is tombstoned locally');
ok(/New Name/.test(st.face),'the picker face shows the new name');
const kill=puts.find(x=>x.del&&x.name==='Old Name');
const put=puts.find(x=>!x.del&&x.name==='New Name');
ok(kill&&!kill.cfg,'the room gets a BARE tombstone for the old name (moved, not binned)');
ok(put&&put.cfg&&put.cfg.name==='New Name','the room gets the board under the new name');
// the boot sync rightly uploads locals (ts:5) to an empty room; a rename push
// would carry a FRESH ts — none may exist for the refused name
ok(!puts.some(x=>x.name==='Taken Name'&&x.ts>10),'the refused collision never reached the room');
// Delete asks in the SITE'S OWN panel, not Chrome's window
await p.click('#wkDel'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>{ const d=document.querySelector('.dlg-back .dlg');
  return d&&/Delete “New Name”/.test(d.querySelector('.dmsg').textContent)
    &&d.querySelector('.dok')&&d.querySelector('.dno'); }),
  'Delete confirms in the app\'s own dark panel');
await p.click('.dlg .dno'); await p.waitForTimeout(200);
ok(await p.evaluate(()=>!document.querySelector('.dlg-back')
  &&JSON.parse(localStorage.getItem('af_presets_v1')).some(x=>x.name==='New Name')),
  'Cancel closes the panel and keeps the board');
// THE DISPLAY TITLE RULES THE SCREENS — live, and Save/Rename never touch it
await p.fill('#cName','Wall Title'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>document.getElementById('evName').textContent==='Wall Title'),
  'typing a display title reaches the screens immediately');
await p.click('#wkRen'); await p.waitForTimeout(200);
await p.fill('.wkrow .renin','New Name 2');
await p.keyboard.press('Enter'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  const e=JSON.parse(localStorage.getItem('af_presets_v1')).find(x=>x.name==='New Name 2');
  return c.wkName==='New Name 2'&&c.name==='Wall Title'
    &&e&&e.cfg.name==='Wall Title'&&e.cfg.titleSet===true; }),
  'a hand-set title survives the rename AND rides to the library entry');
// the picker shows the board's OWN date beside the name — never "saved"
await p.fill('#pgDate','2026-09-01'); await p.waitForTimeout(200);
await p.click('#wkSave'); await p.waitForTimeout(400);
await p.click('#wkPick .mfield'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>{ const hs=[...document.querySelectorAll('#wkPick .combo-item .chint')];
  return hs.some(h=>/1 Sep/.test(h.textContent))&&hs.every(h=>!/saved/i.test(h.textContent)); }),
  'picker rows show the board\'s own date, never "saved"');
ok(await p.evaluate(()=>{ const r=[...document.querySelectorAll('#wkPick .combo-item')]
    .find(x=>x.querySelector('.chint'));
  const n=r.children[0].getBoundingClientRect(), h=r.querySelector('.chint').getBoundingClientRect();
  return h.left-n.right<40; }),'the date sits BESIDE the name, not far right');
await p.mouse.click(5,300); await p.waitForTimeout(200);
await p.fill('#pgDate',''); await p.waitForTimeout(200);
await p.click('#wkSave'); await p.waitForTimeout(400);   // back to no date for the tests below
// A HIDDEN BUILT-IN DOES NOT OWN ITS NAME (Omar hit this: renaming to
// "Engine" was refused by a parked seed board he cannot see)
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('af_presets_v1'))
  .some(x=>x.name==='Engine'&&x.seedV)),'a hidden seed "Engine" is present to collide with');
await p.click('#wkRen'); await p.waitForTimeout(200);
await p.fill('.wkrow .renin','Engine');
await p.keyboard.press('Enter'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>{ const ps=JSON.parse(localStorage.getItem('af_presets_v1'));
  const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  const eng=ps.filter(x=>x.name==='Engine');
  return c.wkName==='Engine'&&eng.length===1&&!eng[0].seedV&&c.name==='Wall Title'; }),
  'renaming onto a HIDDEN built-in name succeeds — the parked seed makes way, one Engine remains');
// NAME + DATE IS THE IDENTITY. A taken name with NO date is refused with a
// pick-a-date hint; with a fresh date it saves as "Engine dd/MM"; the typed
// word becomes the wall title; the SAME date twice is refused.
await p.click('#wkPick .mfield'); await p.waitForTimeout(200);
await p.fill('#wkPick .msearch','Engine'); await p.waitForTimeout(250);
ok(await p.evaluate(()=>{ const h=document.querySelector('#wkPick .combo-item.hint');
  return !document.querySelector('#wkPick .combo-item.add')
    &&h&&/pick this board.s Date/i.test(h.textContent); }),
  'a taken name with NO date is refused with a pick-a-date hint');
await p.mouse.click(5,300); await p.waitForTimeout(200);
await p.fill('#pgDate','2026-09-01'); await p.waitForTimeout(300);
await p.click('#wkPick .mfield'); await p.waitForTimeout(200);
await p.fill('#wkPick .msearch','Engine'); await p.waitForTimeout(250);
const addRow=await p.evaluate(()=>{ const a=document.querySelector('#wkPick .combo-item.add');
  return a&&{v:a.dataset.add,typed:a.dataset.typed}; });
ok(addRow&&addRow.v==='Engine 01/09'&&addRow.typed==='Engine',
  'a taken name with a date offers the DATED save-as ('+(addRow&&addRow.v)+')');
await p.click('#wkPick .combo-item.add'); await p.waitForTimeout(600);
const wk=await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  const ps=JSON.parse(localStorage.getItem('af_presets_v1'));
  return {wk:c.wkName,title:c.name,tset:c.titleSet,
    both:ps.some(x=>x.name==='Engine')&&ps.some(x=>x.name==='Engine 01/09'),
    ev:document.getElementById('evName').textContent}; });
ok(wk.wk==='Engine 01/09'&&wk.title==='Engine'&&wk.tset===true
  &&wk.both&&wk.ev==='Engine',
  'the dated board saves beside last week\'s and the wall reads ENGINE ('+JSON.stringify(wk)+')');
await p.click('#wkPick .mfield'); await p.waitForTimeout(200);
await p.fill('#wkPick .msearch','Engine'); await p.waitForTimeout(250);
ok(await p.evaluate(()=>{ const h=document.querySelector('#wkPick .combo-item.hint');
  return !document.querySelector('#wkPick .combo-item.add')
    &&h&&/already saved.*different date/i.test(h.textContent); }),
  'the SAME name and date twice is refused');
await p.mouse.click(5,300); await p.waitForTimeout(200);
// the Save button's naming path follows the same rule: never overwrite
await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  c.wkName=null; c.titleSet=false; localStorage.setItem('af_erg_cfg_v8',JSON.stringify(c)); });
await p.reload(); await p.waitForTimeout(1500);
await p.click('#stSetup'); await p.waitForTimeout(400);
await p.evaluate(()=>{ window.__native=0;
  window.alert=window.confirm=window.prompt=()=>{ window.__native++; }; });
await p.click('#wkSave'); await p.waitForTimeout(300);
await p.fill('.dlg input','Engine'); await p.click('.dlg .dok'); await p.waitForTimeout(400);
ok(await p.evaluate(()=>{ const d=document.querySelector('.dlg .dmsg');
  return d&&/already saved/i.test(d.textContent)
    &&JSON.parse(localStorage.getItem('af_presets_v1'))
      .filter(x=>x.name==='Engine 01/09').length===1; }),
  'Save on a NEW board with a taken name+date refuses instead of overwriting');
await p.click('.dlg .dok'); await p.waitForTimeout(200);
ok(await p.evaluate(()=>window.__native===0),
  'NO native browser window fired anywhere');
// Rename hides for an unsaved board
await p.evaluate(()=>{
  const cfg=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  cfg.wkName=null; localStorage.setItem('af_erg_cfg_v8',JSON.stringify(cfg));
});
await p.reload(); await p.waitForTimeout(1200);
await p.click('#stSetup'); await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.getElementById('wkRen').hidden),
  'Rename hides for an unsaved board');
// the one-shot: a device still holding "Michael Test 2 2" clears it WITH the body
puts.length=0;
await p.evaluate(()=>{
  localStorage.removeItem('af_delmt22_v1');
  const ps=JSON.parse(localStorage.getItem('af_presets_v1'));
  const cfg=JSON.parse(localStorage.getItem('af_erg_cfg_v8'));
  ps.push({name:'Michael Test 2 2',cfg:JSON.parse(JSON.stringify(cfg)),ts:5});
  localStorage.setItem('af_presets_v1',JSON.stringify(ps));
});
await p.reload(); await p.waitForTimeout(1500);
const os=await p.evaluate(()=>({
  names:JSON.parse(localStorage.getItem('af_presets_v1')).map(x=>x.name),
  dead:JSON.parse(localStorage.getItem('af_lib_dead')||'{}')}));
ok(!os.names.includes('Michael Test 2 2'),'the leftover copy is gone from the device');
const mkill=puts.find(x=>x.del&&x.name==='Michael Test 2 2');
ok(mkill&&mkill.cfg,'its tombstone CARRIES the body — 30 days in the bin');
// a device that never held it stays silent (a bare tombstone would strip the bin)
puts.length=0;
await p.evaluate(()=>localStorage.removeItem('af_delmt22_v1'));
await p.reload(); await p.waitForTimeout(1500);
ok(!puts.some(x=>x.name==='Michael Test 2 2'),
  'a device without the board pushes NO tombstone of its own');
await br.close();
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
})();
