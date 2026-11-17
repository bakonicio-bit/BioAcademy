const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'dist');
const sandbox={window:{}};
for(const file of ['data.js','portraits.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox);
const d=sandbox.window.VARDAM_DATA,p=sandbox.window.VARDAM_PORTRAITS;
assert.equal(d.characters.length,52);
assert.equal(new Set(d.characters.map(v=>v.name)).size,52);
assert.equal(new Set(d.characters.map(v=>v.id)).size,52);
assert.equal(d.characters.filter(p=>p.gender.en==='woman').length,35);
assert.equal(d.characters.filter(p=>p.gender.en==='man').length,17);
assert.equal(Object.keys(p).length,52);
const expected={I:14,II:10,III:15,IV:8,V:5};
for(const [rank,n] of Object.entries(expected))assert.equal(d.characters.filter(p=>p.rank===rank).length,n);
for(const c of d.characters){
 assert.ok(p[c.name],c.name+' portrait missing');
 for(const asset of [p[c.name].card,p[c.name].panel])assert.ok(fs.existsSync(path.join(root,asset)),asset+' absent');
 for(const field of ['bio','appearance','role'])for(const lang of ['es','en'])assert.ok(c[field][lang]?.length>3,c.name+' translation missing');
}
for(const [name,rank] of [['Irena Holt','V'],['Marga Soot','III'],['Ors Rook','II'],['Ferris Durn','I']])assert.equal(d.characters.find(p=>p.name===name).rank,rank);
assert.equal(d.disciplines.length,6);assert.equal(d.ranks.length,6);assert.equal(d.factions.length,6);assert.equal(d.regions.length,6);
assert.equal(d.creatures.length,31);assert.equal(d.creatures.filter(p=>p.type==='singular').length,7);
assert.ok(!d.creatures.some(c=>c.name==='Little Princess'),'Princess identity should require a deliberate spoiler reveal');
for(const f of ['index.html','base.css','engine.css','experience.css','effects.js','sound.js','layout.js','assets/observatory.webp','assets/audio/industrial-music-box.mp3','assets/audio/machinations.mp3','app.js','assets/academy.webp','assets/anomaly.webp','assets/crest.svg','assets/ooc-banner.png'])assert.ok(fs.existsSync(path.join(root,f)),f+' missing');
console.log('PASS: 52 unique characters, 104 portrait assets, bilingual records, correct ranks, six systems and 31 creatures; Princess reveal remains opt-in.');

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.ok(html.includes('<html lang="en">'));
assert.ok(app.includes("getSaved('vardam.explicit-language', 'en')"));
assert.ok(!app.includes('navigator.language'));
assert.ok(html.includes('id="intro-engine"'));
assert.ok(html.includes('id="skip-intro"'));
assert.ok(app.includes('window.VARDAM_LAYOUT.home(t,icon)'));
assert.ok(!html.includes('chatgpt.site'));
console.log('PASS: English default, deliberate language preference, inline living engine, portable paths and complete soundtracks.');
