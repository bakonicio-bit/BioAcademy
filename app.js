(() => {
  'use strict';
  const D = window.VARDAM_DATA;
  const P = window.VARDAM_PORTRAITS || {};
  const $ = (s, root = document) => root.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getSaved = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, String(value)); } catch {} };
  let lang = getSaved('vardam.explicit-language', 'en');
  if (!['es','en'].includes(lang)) lang='en';
  const t = (es, en) => lang === 'es' ? es : en;
  const loc = value => typeof value === 'object' ? value[lang] : value;
  const icon = (name, cls='') => `<svg class="${cls}" aria-hidden="true"><use href="#icon-${name}"/></svg>`;
  const titleRank = rank => D.ranks.find(r => r.id === rank)?.name || '—';
  const branch = id => D.disciplines.find(d => d.id === id);
  const branchName = id => branch(id)?.[lang] || t('Sin rama declarada','No declared branch');
  const branchTag = id => `<span class="branch-tag" style="--branch-color:${branch(id)?.color || '#8d927b'}"><i class="branch-dot"></i>${esc(branchName(id))}</span>`;
  const badge = rank => `<span class="rank-badge" aria-label="${t('Rango','Rank')} ${esc(rank)}">${esc(rank)}</span>`;
  const state = { people:{q:'',branch:'all',faction:'all',rank:'all',sort:'archive',page:1}, world:'regions', field:{q:'',type:'all',rank:'all'}, clue:0, pressure:100,load:0 };
  const routes = ['home','characters','power','world','bestiary','archive'];
  const route = () => routes.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  const links = () => [['home',t('Academia','Academy')],['characters',t('Personajes','Characters')],['power',t('Poder','Power')],['world','Gavren'],['bestiary',t('Bestiario','Field guide')],['archive',t('Archivo','Archive')]];
  let activePage = route();
  let entered = false;
  let entering = false;
  let lastFocused = null;
  const dialog = $('#record-dialog');
  const relations = {
    1:[39,17,4],2:[16],3:[18,11],4:[41,1,23],5:[38],6:[9],7:[37,12],8:[14],9:[30,6,13],10:[21],11:[3],12:[35,7],13:[9],14:[8],15:[24],16:[36,2],17:[1],18:[3],19:[32,21],20:[40],21:[25,19,10],23:[4],24:[15],25:[21],27:[32,29],29:[27],30:[9],32:[19],35:[12],36:[16],37:[7],38:[5],39:[1],40:[20],41:[4,42],42:[41],43:[44],44:[43],45:[46],46:[45],47:[48],48:[47],49:[50],50:[49],51:[52],52:[51]
  };
  function portrait(person, mode='card') {
    const asset = P[person.name];
    if (asset) {
      const src = asset.card;
      return `<img src="${esc(src)}" alt="${esc(person.name)}" ${mode==='card'?'loading="lazy" decoding="async"':'decoding="async"'} width="640" height="480">`;
    }
    return `<span class="portrait-monogram" aria-hidden="true">${person.name.split(' ').map(v=>v[0]).join('')}</span>`;
  }
  function heading(kicker, title, text) {
    return `<div class="page-heading"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1></div><p class="heading-copy">${text}</p></div>`;
  }
  function header() {
    $('#site-header').innerHTML = `<div class="wrap header-inner"><a class="brand" href="#home" aria-label="Vardam — ${t('Inicio','Home')}">${icon('crest')}<span><strong>VARDAM</strong><small>STEAMPUNK BIOACADEMY</small></span></a><nav class="main-nav" aria-label="${t('Navegación principal','Main navigation')}">${links().map(([id,label])=>`<a href="#${id}" class="${activePage===id?'active':''}" ${activePage===id?'aria-current="page"':''}>${label}</a>`).join('')}</nav><div class="header-tools"><div class="language-switch" aria-label="${t('Idioma','Language')}"><button data-lang="es" class="${lang==='es'?'active':''}" aria-pressed="${lang==='es'}">ES</button><span aria-hidden="true">/</span><button data-lang="en" class="${lang==='en'?'active':''}" aria-pressed="${lang==='en'}">EN</button></div><button class="sound-toggle ${audio.playing?'playing':''}" id="sound-toggle" aria-pressed="${audio.playing}" aria-label="${audio.playing?t('Pausar música','Pause music'):t('Activar música','Play music')}" title="${esc(audio.current.title)}"><span class="equaliser" aria-hidden="true"><i></i><i></i><i></i></span><span class="sound-label">${audio.playing?t('Sonido activo','Sound on'):t('Sonido','Sound')}</span></button><button class="sound-menu" id="sound-menu" aria-label="${t('Elegir música y ver créditos','Choose music and view credits')}" title="${t('Banda sonora','Soundtrack')}">♫</button><input class="volume-control" id="volume" type="range" min="0" max="100" value="${Math.round(audio.volume*100)}" aria-label="${t('Volumen de la música','Music volume')}"></div></div>`;
  }
  function footer() {
    $('#site-footer').innerHTML = `<div class="wrap footer-inner"><div><p class="footer-brand">SteamPunk Bioacademy</p><p class="footer-note">${t('Una historia de vida, vapor y acero.','A story of life, steam and steel.')}</p></div><div class="footer-right"><a href="#home">${t('Volver a Vardam','Return to Vardam')} ↑</a><p class="mono">GAVREN · VARDAM · ERA 418</p><button class="footer-credits" data-credits>${t('Música y créditos','Music & credits')} ↗</button></div></div>`;
  }
  function home() {
    return window.VARDAM_LAYOUT.home(t,icon);
  }
  function peoplePage() {
    return `<section class="page wrap">${heading(t('02 / EXPEDIENTES PERSONALES','02 / PERSONNEL RECORDS'),t('52 vidas.<br>Historias propias.','52 lives.<br>Stories of their own.'),t('Nadie espera inmóvil a que llegues. Conoce a los estudiantes, docentes y otras figuras de Gavren.','No one stands still waiting for your arrival. Meet the students, teachers and other figures of Gavren.'))}<div class="people-toolbar"><label class="search-box">${icon('search')}<input type="search" id="person-search" placeholder="${t('Buscar nombre, función o palabra…','Search name, role or keyword…')}" value="${esc(state.people.q)}" aria-label="${t('Buscar personajes','Search characters')}"></label><label class="select-wrap"><select id="branch-filter" aria-label="${t('Filtrar por disciplina','Filter by discipline')}"><option value="all">${t('Todas las disciplinas','All disciplines')}</option>${D.disciplines.map(d=>`<option value="${d.id}" ${state.people.branch===d.id?'selected':''}>${d[lang]}</option>`).join('')}<option value="None" ${state.people.branch==='None'?'selected':''}>${t('Sin rama declarada','No declared branch')}</option></select></label><label class="select-wrap"><select id="faction-filter" aria-label="${t('Filtrar por afiliación','Filter by affiliation')}"><option value="all">${t('Todas las afiliaciones','All affiliations')}</option><option value="academy" ${state.people.faction==='academy'?'selected':''}>Vardam · ${t('Academias','Academies')}</option><option value="rusk" ${state.people.faction==='rusk'?'selected':''}>${t('Vida civil','Civil life')}</option>${D.factions.map(f=>`<option value="${f.id}" ${state.people.faction===f.id?'selected':''}>${loc(f.name)}</option>`).join('')}</select></label><label class="select-wrap"><select id="people-sort" aria-label="${t('Ordenar personajes','Sort characters')}"><option value="archive" ${state.people.sort==='archive'?'selected':''}>${t('Orden del archivo','Archive order')}</option><option value="rank" ${state.people.sort==='rank'?'selected':''}>${t('Rango: mayor a menor','Rank: highest first')}</option><option value="name" ${state.people.sort==='name'?'selected':''}>${t('Nombre: A–Z','Name: A–Z')}</option></select></label></div><div class="rank-filters" role="group" aria-label="${t('Filtrar por rango','Filter by rank')}"><span class="mono">${t('RANGO','RANK')}</span>${['all','I','II','III','IV','V'].map(r=>`<button class="chip ${state.people.rank===r?'active':''}" data-rank-filter="${r}" aria-pressed="${state.people.rank===r}">${r==='all'?t('TODOS','ALL'):r+' · '+titleRank(r)}</button>`).join('')}</div><div class="results-meta"><span id="people-count" aria-live="polite"></span><button class="clear-filters" id="clear-people">${t('Restablecer filtros','Reset filters')}</button></div><div id="character-grid" class="character-grid"></div><div id="people-pagination" class="pagination" aria-label="${t('Páginas de personajes','Character pages')}"></div></section>`;
  }
  function renderPeople() {
    const s = state.people;
    const q = s.q.toLocaleLowerCase(lang).trim();
    let result = D.characters.filter(p => (s.branch==='all'||p.branch===s.branch) && (s.rank==='all'||p.rank===s.rank) && (s.faction==='all'||p.faction===s.faction) && (!q||[p.name,loc(p.role),loc(p.bio),branchName(p.branch)].join(' ').toLocaleLowerCase(lang).includes(q)));
    if(s.sort==='name') result.sort((a,b)=>a.name.localeCompare(b.name,lang));
    if(s.sort==='rank') result.sort((a,b)=>D.ranks.findIndex(r=>r.id===b.rank)-D.ranks.findIndex(r=>r.id===a.rank)||a.id-b.id);
    const max = Math.max(1,Math.ceil(result.length/12)); s.page=Math.min(s.page,max);
    const start=(s.page-1)*12;
    $('#people-count').textContent = result.length ? t(`${start+1}–${Math.min(start+12,result.length)} de ${result.length} ${result.length===1?'expediente':'expedientes'}`,`${start+1}–${Math.min(start+12,result.length)} of ${result.length} records`) : t('0 expedientes','0 records');
    $('#character-grid').innerHTML = result.length ? result.slice(start,start+12).map(p=>`<button class="character-card" data-person="${p.id}" aria-label="${esc(t('Abrir expediente de ','Open record for ')+p.name)}"><div class="portrait">${portrait(p)}<span class="card-index">NO. ${String(p.id).padStart(2,'0')}</span>${badge(p.rank)}</div><div class="card-content"><p class="card-role">${esc(loc(p.role))}</p><h2>${esc(p.name)}</h2><div class="card-meta">${branchTag(p.branch)}<span>${p.age} ${t('años','yrs')}</span></div></div></button>`).join('') : `<div class="empty-state"><h2>${t('Ningún expediente coincide.','No matching records.')}</h2><p>${t('Prueba otro nombre o restablece los filtros.','Try another name or reset the filters.')}</p></div>`;
    $('#people-pagination').innerHTML = max>1 ? `<button data-page="${s.page-1}" ${s.page<=1?'disabled':''} aria-label="${t('Página anterior','Previous page')}">←</button>${Array.from({length:max},(_,i)=>`<button data-page="${i+1}" class="${s.page===i+1?'active':''}" ${s.page===i+1?'aria-current="page"':''}>${i+1}</button>`).join('')}<button data-page="${s.page+1}" ${s.page>=max?'disabled':''} aria-label="${t('Página siguiente','Next page')}">→</button>` : '';
    document.querySelectorAll('[data-rank-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.rankFilter===s.rank);b.setAttribute('aria-pressed',String(b.dataset.rankFilter===s.rank));});
  }
  function powerPage() {
    return `<section class="page wrap">${heading(t('03 / SISTEMAS DE VIDA Y ACERO','03 / SYSTEMS OF LIFE AND STEEL'),t('El poder tiene<br>una forma propia.','Power takes<br>its own shape.'),t('Savia, presión y una regla personal. La misma rama puede crear luchadores, fabricantes o sanadores muy distintos.','Savia, pressure and a personal rule. The same branch can produce very different fighters, makers or healers.'))}<div class="power-intro"><article><span class="mono">01 / ${t('EL NÚCLEO','THE CORE')}</span><h2>${t('Energía viva','Living energy')}</h2><p>${t('Transforma Savia y genera presión utilizable. Puede llevarse dentro o fuera del cuerpo.','Transforms Savia into usable pressure. It may be carried inside or outside the body.')}</p></article><article><span class="mono">02 / ${t('EL ARMAZÓN','THE FRAME')}</span><h2>${t('Una estructura','A structure')}</h2><p>${t('Conduce la fuerza y determina qué puede soportar el sistema. Más potencia exige un soporte adecuado.','Directs force and determines what the system can withstand. Greater output requires an appropriate frame.')}</p></article><article><span class="mono">03 / ${t('LA FIRMA','THE SIGNATURE')}</span><h2>${t('Tu propia regla','Your own rule')}</h2><p>${t('Da una aplicación concreta a esa energía: objeto, alcance, condiciones, efecto, coste y debilidades.','Gives that energy a specific application: target, range, conditions, effect, cost and weaknesses.')}</p></article></div><div class="section-heading"><h2>${t('Las seis disciplinas','The six disciplines')}</h2><span class="mono">${t('ESPECIALIZACIÓN · ELECCIÓN','SPECIALISATION · CHOICE')}</span></div><div class="discipline-grid">${D.disciplines.map((d,i)=>`<article class="discipline-card" style="--branch-color:${d.color}">${icon(d.symbol)}<span class="mono">0${i+1} / ${d.id.toUpperCase()}</span><h3>${d[lang]}</h3><p>${loc(d.desc)}</p><p class="cost">${loc(d.cost)}</p><details><summary>${t('Ver una aplicación','See an application')}</summary><p>${loc(d.example)}</p></details></article>`).join('')}</div><div class="section-heading"><h2>${t('Rangos de poder','Power ranks')}</h2><span class="mono">IGNITION → CROWN</span></div><p class="rank-explanation">${t('El rango mide capacidad, salida, control y el techo de técnicas sostenibles dentro de una rama. La licencia registra certificación y permisos. Un cargo, un curso o una victoria deportiva no cambian por sí solos la potencia de nadie.','Rank measures capacity, output, control and the ceiling of sustainable techniques within a branch. A licence records certification and permissions. A title, school year or sporting victory does not by itself change anyone’s power.')}</p><div class="rank-ladder">${D.ranks.map(r=>`<article class="rank-step"><p class="rank-number">${r.id}</p><h3>${r.name}</h3><p>${loc(r.desc)}</p></article>`).join('')}</div><p class="rank-explanation" style="margin-top:20px">${t('El ascenso reconoce crecimiento real y estable. Al completar el progreso, puede verificarse mediante entrenamiento, trabajo de campo o una prueba voluntaria. No depende de acumular bajas. Ninguno de los 52 personajes comienza en VI.','Advancement recognises real, stable growth. Completed progress can be verified through training, fieldwork or a voluntary test. It does not depend on accumulating kills. None of the 52 characters begins at VI.')}</p><section class="resource-lab"><div><p class="eyebrow" style="margin-bottom:13px">${t('MESA DE OBSERVACIÓN','OBSERVATION BENCH')}</p><h2>${t('Una reserva no<br>es una medida absoluta.','A reserve is not<br>an absolute measure.')}</h2><p>${t('Pressure es el porcentaje de reserva propia: un rango I y un rango V al 100% no almacenan la misma cantidad. Load representa esfuerzo acumulado y necesita recuperación.','Pressure is a percentage of one’s own reserve: rank I and rank V at 100% do not store the same amount. Load represents accumulated strain and requires recovery.')}</p><p class="resource-footnote">${t('Ejemplo ilustrativo · No modifica tu partida','Illustrative example · Does not change your game')}</p></div><div class="resource-controls"><div class="resource-row"><label for="pressure-lab">PRESSURE <span id="pressure-value">${state.pressure}%</span></label><input id="pressure-lab" type="range" min="0" max="100" value="${state.pressure}"><p id="pressure-status" class="resource-status"></p></div><div class="resource-row"><label for="load-lab">LOAD <span id="load-value">${state.load}%</span></label><input id="load-lab" type="range" min="0" max="100" value="${state.load}"><p id="load-status" class="resource-status"></p></div></div></section><div class="page-note" style="margin-bottom:55px">${icon('weave')}<span>${t('En Trama, una Firma de regeneración especializada puede acercarse a la inmortalidad temporal en rango V. Consume reservas y biomasa; no es una capacidad automática de todos los sanadores ni una resurrección incondicional.','In Weave, a specialised regeneration Signature can approach temporary immortality at rank V. It consumes reserves and biomass; it is not automatic for every healer or an unconditional resurrection.')}</span></div></section>`;
  }
  function resourceStatus() {
    $('#pressure-value').textContent=state.pressure+'%'; $('#load-value').textContent=state.load+'%';
    $('#pressure-status').textContent = state.pressure===0 ? t('Reserva agotada. Hace falta recuperar combustible, alimento, descanso o mantenimiento.','Reserve depleted. Fuel, food, rest or maintenance is needed.') : state.pressure<30 ? t('Reserva baja. Priorizar una retirada, una maniobra pequeña o ayuda puede ser decisivo.','Low reserve. Prioritising retreat, a small manoeuvre or assistance can be decisive.') : state.pressure<80 ? t('Reserva parcial. Las técnicas siguen consumiendo presión.','Partial reserve. Techniques still consume pressure.') : t('Reserva alta. Estar al máximo no elimina límites del armazón ni de la Firma.','High reserve. A full reserve does not remove the frame or Signature limits.');
    $('#load-status').textContent=state.load===100 ? t('Detener y atender el sistema. No equivale a una muerte automática.','Stop and attend to the system. This does not mean automatic death.') : state.load>=80 ? t('Riesgo elevado de fallo. La recuperación exige tiempo y condiciones.','High risk of failure. Recovery requires time and appropriate conditions.') : state.load>=60 ? t('Limitaciones evidentes: continuar tiene consecuencias.','Clear limitations: continuing has consequences.') : state.load>=40 ? t('Señales de advertencia. Vigilar calor, fatiga y mecanismos.','Warning signs. Watch heat, fatigue and mechanisms.') : t('Carga contenida. Mantén la continuidad de lesiones, fatiga y equipo.','Strain is contained. Injuries, fatigue and equipment still matter.');
  }
  function regionArt(id) {
    const common = 'fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"';
    const drawings = {
      rusk:`<path d="M0 135h350M0 143h350M24 135V62l35-28 35 28v73M32 62h53M55 34v101M29 88h58M35 101h16v34m12-34h16v34M118 135V45h28v90m-23-90V23h18v22M105 88h65m-12 47V70h39v65m-34-65 15-17 15 17M207 135V83c0-48 89-48 89 0v52m-78-52c0-33 67-33 67 0m-67 3h67m-33-28v77M307 135V52h22v83m-20-83V31h18v21M0 113h350M7 113l24-15m56 15 32-17m29 17 26-17m26 17 27-17m52 17 26-17"/><path d="M129 21c-12-15 11-15 0-28m188 37c-10-15 10-15 0-28" opacity=".5"/>`,
      sarga:`<path d="M0 139c65-14 99 15 159 1s115-8 191 0M61 135V73m-45 0c12-64 79-64 91 0Zm50-1 15-50m-14 51-15-49M138 137V90m-34 0c7-43 59-43 68 0Zm159 45V61m-57 0c13-74 101-74 114 0ZM220 61l28-52m44 52L276 7M177 138v-29m-21 0c5-32 39-32 45 0ZM25 151l18-15m48 14-11-15m202 14 12-15"/><path d="M17 104c10-17 21-14 28 0m268-16c12-15 22-13 32 2M106 132c-16-22-28-16-25-7m125 11c1-25 15-34 29-25"/>`,
      orrel:`<path d="M0 145h350M0 151h350M18 145 49 38h30l26 107M40 145l20-83 25 83M139 145V69c0-57 95-57 95 0v76m-77 0V69c0-34 59-34 59 0v76M129 34l13 7m89-12-14 14M255 145h62l-6-16h-50Zm14-16V60l40 59h-40m6 9 30-69v61M0 122c22 8 39 2 59 5m44-4 36 4m99-6 40 5M300 50c18 0 18-13 2-13M15 20h41m-20 8h60"/>`,
      kelm:`<path d="M0 125q22-12 44 0t44 0 44 0 44 0 44 0 44 0 44 0 44 0M0 139q22-12 44 0t44 0 44 0 44 0 44 0 44 0 44 0M0 153q22-12 44 0t44 0 44 0 44 0 44 0 44 0 44 0M65 122V62h31v60M70 61V48h21v13M80 48V20M64 50l16-19 17 19M100 124l22-15h28l15 15M196 121V77h32v44M205 77V60h14v17M253 121V89m-18 6 18-20 19 20M29 120V91l-12-15m12 22 13-18m-13 26-16-8M303 120V74l-13-23m13 48 19-23m-19 9 14-23M146 46c17-31 48-31 65 0-17 8-48 8-65 0Zm14 12h36m-32-9v9m28-9v9"/>`,
      marn:`<path d="M0 135 60 35l57 100M30 84l30-49 28 49-14-7-14 11-15-10ZM84 135l64-105 65 105m-98-54 33-51 31 51-16-8-15 12-16-13ZM183 135l70-120 80 120m-110-68 30-52 33 52-18-9-15 13-15-13ZM0 145h350M37 135V98h28v37m-14-37V79m64 56v-25h23v25m68 0v-27h24v27m63 0V93h22v42M244 135v-35h27v35m-21-35V82h15v18M248 81c-12-15 10-18 0-33"/>`,
      elda:`<path d="M24 0v103q0 22 22 22h258q22 0 22-22V0M38 0v100q0 10 12 10h250q12 0 12-10V0M70 0v55q0 50 105 50T280 55V0M88 0v53q0 32 87 32t87-32V0M121 0v43q0 20 54 20t54-20V0M146 0v36q0 8 29 8t29-8V0M0 141h350M53 151q124-19 248 0M104 161q70-12 140 0M175 105v32M154 119h42M146 126h59M137 133h77"/><circle cx="175" cy="24" r="9"/><path d="M18 145h20m273 0h20"/>`
    };
    const bg = {rusk:'#dce2cf',sarga:'#d2dcc5',orrel:'#e5d9c1',kelm:'#d3e2df',marn:'#dfd6c5',elda:'#b5c3b6'};
    return `<div class="region-art" style="--region-bg:${bg[id]}"><svg viewBox="0 0 350 170" aria-hidden="true"><g ${common}>${drawings[id]}</g></svg></div>`;
  }
  function worldPage() {
    return `<section class="page wrap">${heading(t('04 / ATLAS Y SOCIEDADES','04 / ATLAS AND SOCIETIES'),t('Un mundo<br>más allá de Vardam.','A world<br>beyond Vardam.'),t('Seis regiones, muchas comunidades. La ecología, el trabajo y las decisiones mantienen vivo a Gavren.','Six regions, many communities. Ecology, labour and choices keep Gavren alive.'))}<div class="world-tabs" role="group" aria-label="${t('Secciones de Gavren','Gavren sections')}"><button data-world="regions" class="${state.world==='regions'?'active':''}" aria-pressed="${state.world==='regions'}">${t('Las seis regiones','The six regions')}</button><button data-world="factions" class="${state.world==='factions'?'active':''}" aria-pressed="${state.world==='factions'}">${t('Las seis organizaciones','The six organisations')}</button></div><div id="world-content"></div></section>`;
  }
  function renderWorld() {
    if(state.world==='regions') $('#world-content').innerHTML = `<div class="regions-grid">${D.regions.map((r,i)=>`<button class="region-card" data-region="${r.id}" aria-label="${esc(t('Leer sobre ','Read about ')+r.name)}">${regionArt(r.id)}<div class="region-content"><h2>${r.name}</h2><h3>${loc(r.title)}</h3><p>${loc(r.desc)}</p><p class="mono" style="margin-top:17px">${loc(r.tags)}</p></div></button>`).join('')}</div>`;
    else $('#world-content').innerHTML = `<div class="page-note" style="margin-bottom:25px">${icon('crest')}<span>${t('Cada organización contiene intereses, recursos y desacuerdos. Una alianza es una decisión con consecuencias, no una garantía de obediencia.','Every organisation contains interests, resources and disagreements. An alliance is a consequential choice, not a guarantee of obedience.')}</span></div><div class="faction-grid">${D.factions.map((f,i)=>`<article class="faction-card"><div class="faction-sigil" aria-hidden="true">${['IX','✧','Fe','✣','↔','◉'][i]}</div><div><p class="eyebrow">${loc(f.title)}</p><h2>${loc(f.name)}</h2><p>${loc(f.desc)}</p><div class="faction-people">${f.people.split(' · ').map(name=>{const p=D.characters.find(p=>p.name===name);return `<button data-person="${p.id}">${name}</button>`;}).join('')}</div></div></article>`).join('')}</div>`;
    document.querySelectorAll('[data-world]').forEach(b=>{b.classList.toggle('active',b.dataset.world===state.world);b.setAttribute('aria-pressed',String(b.dataset.world===state.world));});
  }
  const creatureType = id => ({fauna:t('Fauna','Fauna'),flora:t('Flora y colonias','Flora & colonies'),construct:t('Constructos','Constructs'),sapient:t('Seres conscientes','Sapient beings'),singular:t('Entidad singular','Unique entity')})[id];
  function fieldPage() {
    return `<section class="page wrap">${heading(t('05 / CUADERNO DE CAMPO','05 / FIELD NOTEBOOK'),t('Observa antes<br>de desenfundar.','Observe before<br>you draw a weapon.'),t('24 tipos de criaturas y seres. 7 entidades singulares. El rango de amenaza es una referencia; el entorno cambia el encuentro.','24 kinds of creatures and beings. 7 unique entities. Threat rank is a baseline; surroundings change the encounter.'))}<div class="page-note" style="margin-bottom:23px">${icon('swarm')}<span>${t('El rango describe un individuo adulto o una colonia estable en condiciones habituales. Grupos, terreno y variantes tienen causas propias. Los seres conscientes conservan su derecho a decidir.','Rank describes a typical adult individual or established colony. Groups, terrain and variants have their own causes. Sapient beings retain the right to make their own choices.')}</span></div><div class="field-filters"><label class="search-box">${icon('search')}<input type="search" id="field-search" placeholder="${t('Buscar registro…','Search field records…')}" value="${esc(state.field.q)}" aria-label="${t('Buscar en el bestiario','Search field guide')}"></label><select id="field-type" aria-label="${t('Tipo de ser','Kind of being')}"><option value="all">${t('Todos los tipos','All types')}</option>${['fauna','flora','construct','sapient','singular'].map(id=>`<option value="${id}" ${state.field.type===id?'selected':''}>${creatureType(id)}</option>`).join('')}</select><select id="field-rank" aria-label="${t('Rango de amenaza','Threat rank')}"><option value="all">${t('Todos los rangos','All ranks')}</option>${['I','II','III','IV','V','VI','?'].map(r=>`<option value="${r}" ${state.field.rank===r?'selected':''}>${r==='?'?t('Sin identificar','Unidentified'):t('Rango ','Rank ')+r}</option>`).join('')}</select></div><p id="field-count" class="results-meta" aria-live="polite"></p><div class="bestiary-grid" id="bestiary-grid"></div></section>`;
  }
  function renderField() {
    const s=state.field, q=s.q.trim().toLowerCase();
    const items=D.creatures.filter(c=>(s.type==='all'||s.type===c.type)&&(s.rank==='all'||s.rank===c.rank)&&(!q||[c.name,loc(c.label),loc(c.desc)].join(' ').toLowerCase().includes(q)));
    $('#field-count').textContent=t(`${items.length} registros de campo`,`${items.length} field records`);
    $('#bestiary-grid').innerHTML=items.length?items.map(c=>`<article class="creature-card ${c.type==='singular'?'singular':''}"><div class="creature-top"><span class="creature-kind">${icon(c.type==='flora'?'weave':c.type==='fauna'?'swarm':c.type==='construct'?'boiler':c.type==='singular'?'crest':'bastion')}${creatureType(c.type)}</span>${badge(c.rank)}</div><h2>${esc(loc(c.label))}</h2>${lang==='es'?`<p class="latin">${esc(c.name)}</p>`:''}<p>${loc(c.desc)}</p>${c.rank==='?'?`<a href="#archive" class="record-link">${t('Continuar en el Archivo Reservado','Continue in the Reserved Archive')} →</a>`:''}</article>`).join(''):`<div class="empty-state"><h2>${t('Sin registros coincidentes.','No matching records.')}</h2><p>${t('Prueba una búsqueda o un rango diferente.','Try a different search or rank.')}</p></div>`;
  }
  const clues = [
    {title:{es:'Sin una sola soldadura.',en:'Not a single seam.'},text:{es:'La placa contiene tejido y metal. No hay unión visible entre ambos: las fibras continúan a través del acero. La nota al margen dice solamente: «No fue ensamblado».',en:'The plate contains tissue and metal. No join is visible between them: the fibres continue through the steel. A margin note says only: “It was not assembled.”'}},
    {title:{es:'Falta el último compás.',en:'The last measure is missing.'},text:{es:'Una partitura incompleta conserva el fragmento de una canción de cuna. Su ritmo coincide con los intervalos de presión de una estructura que ninguna ficha termina de describir.',en:'An incomplete score preserves a fragment of a lullaby. Its rhythm matches the pressure intervals of a structure that no record fully describes.'}},
    {title:{es:'Los engranajes respiran.',en:'The gears are breathing.'},text:{es:'El registro de una expedición describe ruedas de un tamaño imposible moviéndose al mismo tiempo, como una respiración. La siguiente página fue retirada. El barco cambió de rumbo.',en:'An expedition record describes impossibly large wheels moving together, like a breath. The next page was removed. The ship changed course.'}}
  ];
  function archivePage() {
    return `<section class="page archive-page"><div class="wrap">${heading(t('06 / ARCHIVO RESERVADO','06 / RESERVED ARCHIVE'),t('Escucha<br>entre los dientes.','Listen<br>between the teeth.'),t('Algunos registros llegaron incompletos. Estos fragmentos conservan el misterio; el expediente completo se abre solo si lo eliges.','Some records arrived incomplete. These fragments preserve the mystery; the complete file opens only if you choose.'))}<div class="archive-status mono"><span><i class="status-dot"></i>${t('IDENTIFICACIÓN PENDIENTE','IDENTIFICATION PENDING')}</span><span>RECORD 00 / ${t('ORIGEN SIN CONFIRMAR','ORIGIN UNCONFIRMED')}</span></div><div class="anomaly-stage"><div class="anomaly-dial" aria-hidden="true"><div class="dial-ring"></div><div class="dial-inner"><span class="unknown">00</span><svg class="archive-trace" viewBox="0 0 200 70" aria-hidden="true"><path d="M0 38H50L61 32L70 43L82 10L95 61L105 30L115 38H200" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></div><p class="dial-caption">${t('NO TODO SILENCIO ESTÁ VACÍO','NOT EVERY SILENCE IS EMPTY')}</p></div><article class="clue-file"><p class="mono" id="clue-number"></p><h2 id="clue-title"></h2><p id="clue-copy"></p><div class="clue-nav"><div class="clue-dots" role="group" aria-label="${t('Fragmentos del archivo','Archive fragments')}">${clues.map((_,i)=>`<button data-clue="${i}" aria-label="${t('Leer fragmento ','Read fragment ')}${i+1}" aria-pressed="${state.clue===i}" class="${state.clue===i?'active':''}"></button>`).join('')}</div><button class="next-clue" id="next-clue">${t('Siguiente fragmento','Next fragment')}${icon('arrow')}</button></div></article></div><div class="archive-warning"><p>${t('El expediente completo revela el nombre, el diseño y el rango de una entidad importante, además de su relación con el Coro. Puedes seguir explorando los fragmentos sin abrirlo.','The complete file reveals the name, design and rank of an important entity, along with its relationship to the Choir. You can keep exploring the fragments without opening it.')}</p><button id="spoiler-warning">${t('Consultar expediente completo','Consult the complete file')} ↗</button></div><p class="archive-quote">${t('«La vida no termina donde comienza el acero».','“Life does not end where steel begins.”')}</p></div></section>`;
  }
  function updateClue() {
    const c=clues[state.clue];
    $('#clue-number').textContent=t('FRAGMENTO ','FRAGMENT ')+String(state.clue+1).padStart(2,'0')+' / 03';
    $('#clue-title').textContent=loc(c.title); $('#clue-copy').textContent=loc(c.text);
    document.querySelectorAll('[data-clue]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.clue)===state.clue);b.setAttribute('aria-pressed',String(Number(b.dataset.clue)===state.clue));});
  }
  function showDialog(content, label) {
    if(!dialog.open) lastFocused=document.activeElement;
    dialog.innerHTML=`<div class="dialog-topbar"><span class="mono">${label}</span><button class="close-dialog" aria-label="${t('Cerrar expediente','Close record')}">×</button></div>${content}`;
    if(!dialog.open) dialog.showModal();
    dialog.scrollTop=0;
  }
  function openPerson(id) {
    const p=D.characters.find(p=>p.id===id); if(!p)return;
    const related=(relations[id]||[]).map(i=>D.characters.find(p=>p.id===i)).filter(Boolean);
    showDialog(`<div class="person-detail"><div class="person-detail-art">${portrait(p,'panel')}</div><div class="detail-info"><p class="detail-role">${esc(loc(p.role))}</p><h2 id="dialog-title">${p.name}</h2><div class="detail-meta">${badge(p.rank)}<span>${titleRank(p.rank)}</span>${branchTag(p.branch)}<span>${p.age} ${t('años','years old')}</span></div><p>${loc(p.bio)}</p><details><summary>${t('Rasgos del diseño','Design notes')}</summary><p>${loc(p.appearance)}</p></details>${P[p.name]?.panel?`<button class="text-link full-art-button" data-art="${p.id}" style="border:0;border-bottom:1px solid var(--gold);background:none;padding:0 0 5px;margin-top:18px;font-size:10px;color:var(--green)">${t('Ver ilustración completa','View complete illustration')} ↗</button>`:''}${p.name==='Garran Flint'?`<p style="margin-top:15px;font-size:10px">${t('Boiler equivalente mediante armazón puramente mecánico.','Boiler equivalent through a purely mechanical frame.')}</p>`:''}${p.name==='Runa Bell'||p.name==='Oren Pike'?`<p style="margin-top:15px;font-size:10px">${t('El compromiso entre Runa y Oren es parte de sus vidas previas.','Runa and Oren’s engagement is part of their existing lives.')}</p>`:''}</div></div>${related.length?`<div class="related-records"><p class="mono">${t('EXPEDIENTES RELACIONADOS','RELATED RECORDS')}</p><div class="related-buttons">${related.map(r=>`<button data-person="${r.id}">${r.name} ↗</button>`).join('')}</div></div>`:''}`,t('EXPEDIENTE PERSONAL','PERSONNEL RECORD')+' / '+String(p.id).padStart(2,'0'));
    dialog.setAttribute('aria-labelledby','dialog-title');
  }
  function openRegion(id) {
    const r=D.regions.find(r=>r.id===id);if(!r)return;
    showDialog(`<div class="plain-dialog">${regionArt(r.id)}<p class="eyebrow">${loc(r.tags)}</p><h2 id="dialog-title">${r.name}</h2><p>${loc(r.desc)}</p>${id==='rusk'?`<p>${t('Vardam es una academia superior para adultos, normalmente de tres años. Sus cuatro departamentos son Forja Viva, Ingeniería de Presión, Resonancia Neural y Ecología y Rescate. El Taller Cero reúne proyectos interdisciplinarios con un presupuesto limitado.','Vardam is a higher academy for adults, normally lasting three years. Its four departments are Living Forge, Pressure Engineering, Neural Resonance, and Ecology & Rescue. Zero Workshop brings interdisciplinary projects together on a limited budget.')}</p>`:''}</div>`,t('ATLAS DE GAVREN','GAVREN ATLAS'));
    dialog.setAttribute('aria-labelledby','dialog-title');
  }
  function spoilerWarning() {
    showDialog(`<div class="plain-dialog"><div class="spoiler-intro">${icon('crest')}<p class="eyebrow">${t('LECTURA CON SPOILERS','SPOILER READING')}</p><h2 id="dialog-title">${t('Este archivo tiene nombre.','This file has a name.')}</h2><p>${t('Abrirlo mostrará la ilustración completa, la identidad y el poder de la entidad, además de su relación con el Coro de la Carne Nueva.','Opening it will show the complete illustration, identity and power of the entity, along with its relationship to the Choir of New Flesh.')}</p><button class="button primary" id="reveal-princess">${t('Abrir con spoilers','Open with spoilers')}${icon('arrow')}</button><button class="spoiler-cancel close-dialog">${t('Conservar el misterio','Keep the mystery')}</button></div></div>`,t('EXPEDIENTE RESERVADO','RESERVED RECORD'));
    dialog.setAttribute('aria-labelledby','dialog-title');
  }
  function revealPrincess() {
    showDialog(`<article class="princess-reveal"><img src="assets/anomaly.webp" alt="${t('Little Princess: figura colosal de cabello rosa pálido, rostro negro, ojos rojos, brazos óseos blancos y cuerpo serpentino de membranas y engranajes.','Little Princess: a colossal figure with pale pink hair, a black face, red eyes, white skeletal arms and a serpentine body of membranes and gears.')}"><div class="reveal-copy"><p class="eyebrow">${t('ENTIDAD SINGULAR / UNIÓN SIN COSTURAS','UNIQUE ENTITY / SEAMLESS UNION')}</p><h2 id="dialog-title">Little Princess</h2><p>${t('La singularidad más fuerte en combate individual. En ella, la vida y el acero crecen como un mismo cuerpo: una figura femenina colosal, un halo dentado y una forma serpentina cuyo final se pierde en la oscuridad.','The strongest singularity in individual combat. Within her, life and steel grow as one body: a colossal feminine figure, a toothed halo and a serpentine form whose end disappears into darkness.')}</p><p>${t('Protege un antiguo criadero simbiótico y vidas que aún no han sido convertidas en propiedad. Tiene voluntad propia. No es una extensión de Matrix Zero ni una criatura que obedezca contratos, linajes o plegarias.','She protects an ancient symbiotic nursery and lives not yet claimed as property. She has a will of her own. She is neither an extension of Matrix Zero nor a creature that obeys contracts, bloodlines or prayers.')}</p><p>${t('El núcleo radical del Coro la interpreta como la Unión perfecta y una deidad absoluta. Pretende imitar su fisiología para eliminar la enfermedad y la soledad mediante una red de regeneración compartida. El horror comienza cuando la conexión deja de ser voluntaria. Esa doctrina pertenece al Coro: no demuestra que ella la comparta.','The Choir’s radical core interprets her as the perfect Union and an absolute deity. It seeks to imitate her physiology to eliminate illness and loneliness through a shared regenerative network. The horror begins when connection stops being voluntary. This doctrine belongs to the Choir: it does not establish that she shares it.')}</p><p>${t('Matrix Zero sostiene una infraestructura más extensa. Little Princess es la combatiente individual superior. Incluso ella necesita recursos y condiciones para reparar su cuerpo; su poder no equivale a omnipotencia.','Matrix Zero sustains a wider infrastructure. Little Princess is the superior individual combatant. Even she requires resources and conditions to repair her body; power is not omnipotence.')}</p>${badge('VI')} <span class="mono" style="color:#ad7a6b;margin-left:10px">CROWN / ${t('EXTREMO SUPERIOR','UPPER EXTREME')}</span></div></article>`,t('EXPEDIENTE COMPLETO / CONTIENE SPOILERS','COMPLETE RECORD / CONTAINS SPOILERS'));
    dialog.setAttribute('aria-labelledby','dialog-title');
  }
  function closeDialog() {
    dialog.close();
    if(lastFocused?.isConnected) lastFocused.focus({preventScroll:true});
  }
  function render(scroll=false) {
    activePage=route();document.documentElement.lang=lang;
    document.title='SteamPunk Bioacademy — '+t('Archivo de Vardam','Vardam Archive');
    header();footer();
    const pages={home,characters:peoplePage,power:powerPage,world:worldPage,bestiary:fieldPage,archive:archivePage};
    $('#main').innerHTML=pages[activePage]();
    if(activePage==='characters')renderPeople();
    if(activePage==='power')resourceStatus();
    if(activePage==='world')renderWorld();
    if(activePage==='bestiary')renderField();
    if(activePage==='archive')updateClue();
    updateGate();
    document.body.dataset.environment=activePage;
    window.VARDAM_FX.setPage(activePage);
    if(scroll&&entered)window.scrollTo({top:0,behavior:'instant'});
  }
  function updateGate() {
    $('#gate-eyebrow').textContent=t('VIDA Y ACERO / LA UNIÓN','LIFE & STEEL / THE UNION');
    $('#gate-title').innerHTML=t('Dale un latido<br>al motor.','Give the engine<br>a heartbeat.');
    $('#gate-copy').textContent=t('Gira la llave. Algo vivo está esperando.','Turn the key. Something living is waiting.');
    $('#enter-label').textContent=t('Girar la llave de encendido','Turn the ignition key');
    $('#gate-sound-label').textContent=t('Música y ambiente mecánico','Music & mechanical ambience');
    $('#skip-intro').textContent=t('Saltar apertura','Skip opening');
    $('#intro-pressure').setAttribute('aria-label',t('Progreso del encendido','Ignition progress'));
    document.querySelectorAll('.gate-language [data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));
  }
  function soundtrackDialog() {
    showDialog(`<div class="plain-dialog soundtrack-dialog"><p class="eyebrow">${t('SONIDOS DE VIDA Y ACERO','SOUNDS OF LIFE & STEEL')}</p><h2 id="dialog-title">${t('La música del taller.','The sound of the workshop.')}</h2><p>${t('Relojería para explorar. Orquesta para avanzar. Elige el ambiente de tu visita.','Clockwork for discovery. Orchestra for momentum. Choose the atmosphere for your visit.')}</p><div class="music-tracks">${audio.tracks.map(track=>`<button class="music-track ${audio.current.id===track.id?'active':''}" data-track="${track.id}" aria-pressed="${audio.current.id===track.id}"><small>${audio.current.id===track.id?'● '+t('SELECCIONADA','SELECTED'):t('PISTA','TRACK')} / KEVIN MACLEOD</small><strong>${track.title}</strong><span>${track.id==='clockwork'?t('Relojería y misterio','Clockwork & mystery'):t('Impulso orquestal','Orchestral momentum')}</span></button>`).join('')}</div><div class="music-options"><button class="button secondary" data-toggle-music>${audio.playing?t('Pausar la música','Pause music'):t('Reproducir música','Play music')}</button><label>${t('Volumen','Volume')} <input id="dialog-volume" type="range" min="0" max="100" value="${Math.round(audio.volume*100)}" aria-label="${t('Volumen de la música','Music volume')}"></label></div><p class="music-credit">“Industrial Music Box” & “Machinations” ${t('de','by')} Kevin MacLeod (<a href="https://incompetech.com" target="_blank" rel="noopener">incompetech.com</a>). <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.<br>${audio.tracks.map(track=>`<a href="${track.source}" target="_blank" rel="noopener">${track.title} ↗</a>`).join(' · ')}<br>${t('Ilustraciones de los personajes y universo de SteamPunk Bioacademy. Paisaje y motor creados para esta experiencia.','Character illustrations and world of SteamPunk Bioacademy. Landscape and engine created for this experience.')}</p></div>`,t('BANDA SONORA Y CRÉDITOS','SOUNDTRACK & CREDITS'));
    dialog.setAttribute('aria-labelledby','dialog-title');
  }
  function toast(message) { $('#toast').textContent=message;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),3500); }
  const audio = window.VARDAM_AUDIO;
  window.addEventListener('vardam-audiochange',header);
  window.addEventListener('vardam-message',event=>toast(event.detail));
  function finishEntry() {
    if(entered)return;
    entered=true;entering=false;
    $('#gate').classList.add('hidden');$('#gate').hidden=true;$('#gate').inert=true;
    $('#site').inert=false;document.body.classList.remove('gated');
    try{sessionStorage.setItem('vardam.opening-v2','yes');}catch{}
    $('#main').focus({preventScroll:true});
  }
  function enter(skip=false) {
    if(entered||entering)return;
    entering=true;
    if(!skip&&$('#gate-sound').checked&&!audio.playing)audio.toggle();
    if(skip){finishEntry();return;}
    window.VARDAM_FX.ignite(finishEntry,{language:lang,sound:name=>audio.cue(name)});
  }
  function replay() {
    entered=false;entering=false;
    $('#gate').hidden=false;$('#gate').inert=false;
    $('#gate').classList.remove('hidden','engine-complete','engine-pressurizing','engine-growing','engine-awake','shutters-open');
    $('#skip-intro').disabled=false;$('#site').inert=true;document.body.classList.add('gated');
    enter();$('#skip-intro').focus({preventScroll:true});
  }
  document.addEventListener('click',async event=>{
    if(event.target.closest('[href="#home-below"]')){event.preventDefault();$('#home-below').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;}
    if(event.target.closest('[href="#main"]')){event.preventDefault();$('#main').focus();return;}
    if(event.target.closest('#replay-intro')){replay();return;}
    if(event.target.closest('#skip-intro')){if(entering)window.VARDAM_FX.skip();else enter(true);return;}
    if(event.target.closest('#sound-menu,[data-credits]')){soundtrackDialog();return;}
    const track=event.target.closest('[data-track]');if(track){await audio.select(track.dataset.track);soundtrackDialog();return;}
    if(event.target.closest('[data-toggle-music]')){await audio.toggle();soundtrackDialog();return;}

    const langButton=event.target.closest('[data-lang]');
    if(langButton){lang=langButton.dataset.lang;save('vardam.explicit-language',lang);render();return;}
    const art=event.target.closest('[data-art]');if(art){const p=D.characters.find(p=>p.id===Number(art.dataset.art));showDialog(`<div class="plain-dialog"><h2 id="dialog-title">${p.name}</h2><img src="${P[p.name].panel}" alt="${esc(p.name)}" style="width:100%;height:auto;margin:20px 0"><button class="button secondary" data-person="${p.id}">${t('Volver al expediente','Back to record')}</button></div>`,t('ILUSTRACIÓN DEL PERSONAJE','CHARACTER ILLUSTRATION'));dialog.setAttribute('aria-labelledby','dialog-title');return;}
    const person=event.target.closest('[data-person]');if(person){openPerson(Number(person.dataset.person));return;}
    const region=event.target.closest('[data-region]');if(region){openRegion(region.dataset.region);return;}
    const rankFilter=event.target.closest('[data-rank-filter]');if(rankFilter){state.people.rank=rankFilter.dataset.rankFilter;state.people.page=1;renderPeople();return;}
    const pageButton=event.target.closest('button[data-page]');if(pageButton&&!pageButton.disabled){state.people.page=Number(pageButton.dataset.page);renderPeople();$('.people-toolbar').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});return;}
    const worldTab=event.target.closest('[data-world]');if(worldTab){state.world=worldTab.dataset.world;renderWorld();return;}
    const clue=event.target.closest('[data-clue]');if(clue){state.clue=Number(clue.dataset.clue);updateClue();return;}
    if(event.target.closest('.close-dialog')){closeDialog();return;}
    if(event.target.closest('#enter-button')){enter();return;}
    if(event.target.closest('#sound-toggle')){audio.toggle();return;}
    if(event.target.closest('#clear-people')){Object.assign(state.people,{q:'',branch:'all',faction:'all',rank:'all',sort:'archive',page:1});render();return;}
    if(event.target.closest('#next-clue')){state.clue=(state.clue+1)%clues.length;updateClue();return;}
    if(event.target.closest('#spoiler-warning')){spoilerWarning();return;}
    if(event.target.closest('#reveal-princess')){revealPrincess();return;}
  });
  document.addEventListener('input',event=>{
    const e=event.target;
    if(e.id==='person-search'){state.people.q=e.value;state.people.page=1;renderPeople();}
    if(e.id==='field-search'){state.field.q=e.value;renderField();}
    if(e.id==='pressure-lab'){state.pressure=Number(e.value);resourceStatus();}
    if(e.id==='load-lab'){state.load=Number(e.value);resourceStatus();}
    if(e.id==='volume'||e.id==='dialog-volume')audio.setVolume(Number(e.value)/100);
  });
  document.addEventListener('change',event=>{
    const e=event.target;
    if(e.id==='branch-filter'){state.people.branch=e.value;state.people.page=1;renderPeople();}
    if(e.id==='faction-filter'){state.people.faction=e.value;state.people.page=1;renderPeople();}
    if(e.id==='people-sort'){state.people.sort=e.value;state.people.page=1;renderPeople();}
    if(e.id==='field-type'){state.field.type=e.value;renderField();}
    if(e.id==='field-rank'){state.field.rank=e.value;renderField();}
  });
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
  dialog.addEventListener('close',()=>{if(lastFocused?.isConnected)lastFocused.focus({preventScroll:true});});
  document.addEventListener('keydown',event=>{if(!entered&&event.key==='Tab'){const nodes=[...$('#gate').querySelectorAll('button,input')].filter(node=>!node.disabled&&node.getClientRects().length&&getComputedStyle(node.closest('.gate-controls')||node).opacity!=='0');const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  window.addEventListener('hashchange',()=>{if(dialog.open)dialog.close();render(true);});
  window.addEventListener('pagehide',()=>{if(audio.playing)audio.stop();});
  render();
  let seen=false;try{seen=sessionStorage.getItem('vardam.opening-v2')==='yes';}catch{}
  if(seen)enter(true);else setTimeout(()=>$('#enter-button').focus({preventScroll:true}),100);
})();
