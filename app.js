/* LUSTSINO — live Supabase-backed arcade shell and Studio. */
(()=>{
'use strict';
const $=(q,root=document)=>root.querySelector(q), $$=(q,root=document)=>[...root.querySelectorAll(q)];
const escapeHTML=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=(u)=>{try{const x=new URL(u,location.href);if(x.protocol==='https:' || (x.origin===location.origin && x.protocol==='http:'))return x.href;return ''}catch{return ''}};
const rnd=(n)=>Math.floor(Math.random()*n);
const id=()=>typeof crypto!=='undefined' && crypto.randomUUID?crypto.randomUUID():`local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const read=(k,fallback)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):fallback}catch{return fallback}};
const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const getSession=(k)=>{try{return sessionStorage.getItem(k)}catch{return null}};
const setSession=(k,v)=>{try{sessionStorage.setItem(k,v)}catch{}};
// Authoring templates: no sample accounts, impersonated creators, or unlicensed media.
const modelMedia=[];
const modelExperiences=[
 {type:'wheel',config:{rounds:10,slices:[{label:'First reveal',mediaId:'',seconds:15},{label:'Second reveal',mediaId:'',seconds:15},{label:'Third reveal',mediaId:'',seconds:15}]}},
 {type:'hotspots',config:{startNode:'start',nodes:{start:{title:'Choose a spot',subtitle:'Select a numbered circle to continue',mediaId:'',preview_seconds:5,spots:[{label:'01',shape:'oval',x:34,y:45,w:24,h:17,next:'end'},{label:'02',shape:'oval',x:68,y:55,w:20,h:23,next:'end'}]},end:{title:'Your reveal',subtitle:'A new experience',mediaId:'',seconds:15,spots:[]}}}},
 {type:'cards',config:{choices:[{label:'First card',mediaId:'',seconds:15},{label:'Second card',mediaId:'',seconds:15},{label:'Third card',mediaId:'',seconds:15}]}},
 {type:'duel',config:{rounds:5,choices:[{label:'This',mediaId:'',seconds:15},{label:'That',mediaId:'',seconds:15}]}},
 {type:'prompts',config:{rounds:5,choices:[{label:'First prompt',prompt:'Choose your next reveal.',mediaId:'',seconds:15},{label:'Second prompt',prompt:'Choose again.',mediaId:'',seconds:15}]}},
 {type:'doors',config:{choices:[{label:'Door A',mediaId:'',seconds:15},{label:'Door B',mediaId:'',seconds:15},{label:'Door C',mediaId:'',seconds:15}]}},
 {type:'tiles',config:{choices:[{label:'Tile 1',mediaId:'',seconds:15},{label:'Tile 2',mediaId:'',seconds:15},{label:'Tile 3',mediaId:'',seconds:15}]}},
 {type:'special',config:{tagCards:[{label:'Roulette',tag:'roulette'},{label:'Shuffle',tag:'shuffle'},{label:'Choices',tag:'choices'},{label:'Mystery',tag:'mystery'},{label:'Arcade',tag:'arcade'},{label:'Highlights',tag:'test'}],reelSpeedMs:210,voice:{welcome:'',shuffle:'',reel:'',gallery:'',finish:''},lockMediaAssignments:true}}
];
const modePreviews=[
 {id:'mode-wheel',type:'wheel',title:'Orbit Roulette',description:'A real spinning wheel and randomized reveals.',symbol:'◉',modePreview:true},
 {id:'mode-hotspots',type:'hotspots',title:'Circle Paths',description:'Pick a marked spot to follow a branching story.',symbol:'◎',modePreview:true},
 {id:'mode-cards',type:'cards',title:'Velvet Shuffle',description:'Animated cards conceal the next decision.',symbol:'✦',modePreview:true},
 {id:'mode-duel',type:'duel',title:'This or That',description:'Two directions. One decision.',symbol:'⇄',modePreview:true},
 {id:'mode-prompts',type:'prompts',title:'Timed Challenges',description:'A countdown, a choice, a new outcome.',symbol:'⌛',modePreview:true},
 {id:'mode-doors',type:'doors',title:'Mystery Doors',description:'Choose a door and discover what appears.',symbol:'♢',modePreview:true},
 {id:'mode-tiles',type:'tiles',title:'Lucky Tiles',description:'Nine tiles; each reveal follows a different choice.',symbol:'✧',modePreview:true},
 {id:'mode-special',type:'special',title:'The LUSTSINO Special',description:'Choose two cards, track the shuffle, and stop the reel.',symbol:'✦',modePreview:true}
];
const clone=x=>JSON.parse(JSON.stringify(x));
const config=window.VYRA_CONFIG||{};
let supabase=null, isAdmin=false, adminUser=null, remote=false;
let state={route:'home',studioTab:'overview',filter:'all',current:null,playing:false,wheelTurns:0,hotNode:'start',cardIndices:[],duelStage:0,duelOptions:[],stats:read('lustsino_stats',{rounds:0,discoveries:0,completed:0}),experiences:[],creators:[],media:[],demoCreators:[],timer:null,timerLeft:0,sound:false};
let pendingDesignerId=null;
let mediaBag=[],mediaBagKey='';
function drawMedia(count=1){
 const pool=state.media.filter(m=>m.type==='image' && m.published===true).map(m=>m.id);
 if(!pool.length)return Array(count).fill('');
 const key=pool.length+'|'+pool[0]+'|'+pool[pool.length-1];
 if(mediaBagKey!==key){mediaBag=[];mediaBagKey=key}
 const out=[];
 for(let j=0;j<count;j++){
   if(!mediaBag.length){mediaBag=pool.slice();for(let i=mediaBag.length-1;i>0;i--){const n=rnd(i+1);[mediaBag[n],mediaBag[i]]=[mediaBag[i],mediaBag[n]]}}
   out.push(mediaBag.pop());
 }
 return out;
}
function rotateAllowed(g){return !String(g.id).startsWith('preview-') && !g.config?.lockMediaAssignments && (g.config?.rotateMedia===true||['wheel','paths','cards','duel','prompts'].includes(g.id))}
function sessionGame(original){
 const g=clone(original);
 if(!rotateAllowed(g))return g; // Preserve precisely assigned content for authored previews and live projects.
 const choices=g.config?.slices||g.config?.choices;
 if(Array.isArray(choices)){
   const items=drawMedia(choices.length);
   choices.forEach((ch,i)=>{if(items[i]){ch.mediaId=items[i];ch.creatorId=media(items[i])?.creator_id||ch.creatorId}});
 }
 if(g.type==='hotspots' && g.config?.nodes){
   const nodes=Object.values(g.config.nodes),ids=drawMedia(nodes.length);
   nodes.forEach((n,i)=>{if(ids[i]){n.mediaId=ids[i];n.creatorId=media(ids[i])?.creator_id||n.creatorId}});
 }
 return g;
}
function clipSpotPolygon(s){
 const x=clamp(s.x??50,0,100),y=clamp(s.y??50,0,100);
 const rx=clamp(s.w??18,5,85)/2,ry=clamp(s.h??13,5,70)/2;
 const rad=clamp(s.rotate||0,-180,180)*Math.PI/180;
 return 'polygon('+Array.from({length:64},(_,i)=>{const a=i*Math.PI*2/64,dx=rx*Math.cos(a),dy=ry*Math.sin(a);return `${(x+dx*Math.cos(rad)-dy*Math.sin(rad)).toFixed(3)}% ${(y+dx*Math.sin(rad)+dy*Math.cos(rad)).toFixed(3)}%`}).join(',')+')';
}

const creator=(v)=>state.creators.find(x=>x.id===v);
const media=(v)=>state.media.find(x=>x.id===v);
const labelOf=(type)=>({wheel:'ROULETTE',hotspots:'PICK A SPOT',cards:'MYSTERY CARDS',duel:'THIS OR THAT',prompts:'TIMED CHALLENGE',doors:'MYSTERY DOORS',tiles:'LUCKY TILES',special:'THE SPECIAL'}[type]||'INTERACTIVE');
// No offline demo data: all publish and edit operations require an authenticated live session.
function notify(s){const t=$('#toast');t.textContent=s;t.classList.remove('hidden');clearTimeout(notify.timeout);notify.timeout=setTimeout(()=>t.classList.add('hidden'),2600)}
function beep(){if(!state.sound)return;try{const Context=window.AudioContext||window.webkitAudioContext;const ctx=new Context(),o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=490;g.gain.setValueAtTime(.04,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.13);o.start();o.stop(ctx.currentTime+.14);setTimeout(()=>ctx.close(),250)}catch{}}
function urlLink(url,label='Visit creator ↗'){const u=safeURL(url);return u?`<a class="button secondary smallish" href="${escapeHTML(u)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`:''}
function fallbackGraphic(symbol='◇'){return `<div class="stage-placeholder" aria-label="Abstract media placeholder">${escapeHTML(symbol)}<small>MEDIA PREVIEW</small></div>`}
function stage(mediaId,symbol='◇',opts={}){const m=media(mediaId),url=m&&safeURL(m.url);let content=fallbackGraphic(symbol);if(url){if(m.type==='video'){content=`<video class="stage-video" src="${escapeHTML(url)}" controls playsinline preload="metadata" aria-label="${escapeHTML(m.alt_text||m.name||'Creator video')}"></video>`}else{content=`<img class="stage-img" loading="lazy" src="${escapeHTML(url)}" alt="${escapeHTML(m.alt_text||m.name||'Creator media')}">`}}return `<div class="media-stage" id="${opts.id||'activeStage'}" style="--stage:${opts.gradient||'radial-gradient(circle at 40% 25%,#5c3d75,#201529 70%)'}">${content}${opts.hotspots||''}${opts.link&&safeURL(opts.link)?`<a class="stage-creator-link" href="${escapeHTML(safeURL(opts.link))}" target="_blank" rel="noopener noreferrer">Official creator ↗</a>`:''}</div>`}
const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number(v)||0));
function spotStyle(s){const shape=['circle','oval','rectangle','pill'].includes(s.shape)?s.shape:'circle';const w=clamp(s.w??(shape==='circle'?13:22),5,85);const h=clamp(s.h??(shape==='circle'?13:12),5,70);const rot=clamp(s.rotate??0,-180,180);return `left:${clamp(s.x??50,0,100)}%;top:${clamp(s.y??50,0,100)}%;width:${w}%;height:${h}%;transform:translate(-50%,-50%) rotate(${rot}deg);border-radius:${shape==='rectangle'?'17%':shape==='pill'?'45%':'50%'};`}
function soundEffect(kind='click'){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();const cfg=({tick:[740,.035,'triangle',.025],shuffle:[340,.15,'sawtooth',.025],reveal:[650,.42,'sine',.055],click:[470,.10,'sine',.03]})[kind]||[470,.1,'sine',.03];o.type=cfg[2];o.frequency.setValueAtTime(cfg[0],c.currentTime);if(kind==='reveal')o.frequency.exponentialRampToValueAtTime(940,c.currentTime+.38);g.gain.setValueAtTime(cfg[3],c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+cfg[1]);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+cfg[1]);o.onended=()=>c.close()}catch{}}
function spotlightStrip(){const picked=chooseMany(state.media.filter(m=>m.published),12);if(!picked.length)return '<p class="empty-state">The media feed is live-connected. No approved creator assets have been published yet.</p>';return picked.map((m,i)=>`<button class="showcase-item" data-start="paths" title="Open Circle Paths"><img loading="lazy" src="${escapeHTML(m.url)}" alt="Local library preview ${i+1}"><span>DISCOVER · ${String(i+1).padStart(2,'0')}</span></button>`).join('')}
function addStat(type='rounds'){state.stats[type]=(state.stats[type]||0)+1;store('lustsino_stats',state.stats);updateStats();if(type==='rounds'&&[1,5,10].includes(state.stats.rounds))notify(({1:'✦ First Move unlocked',5:'◇ Explorer unlocked',10:'✳ Pathfinder unlocked'})[state.stats.rounds])}
function updateStats(){const s=state.stats;$('#sessionCounter').textContent=`◇ ${s.rounds} round${s.rounds===1?'':'s'} played`;$('#roundsCount').textContent=s.rounds;$('#discoveriesCount').textContent=s.discoveries;const badges=[{n:1,text:'✦ First Move'},{n:5,text:'◇ Explorer'},{n:10,text:'✳ Pathfinder'}];$('#achievementRow').innerHTML=badges.map(b=>`<span class="${s.rounds>=b.n?'unlocked':''}" title="${b.n} completed rounds">${b.text}</span>`).join('')}
function tiles(items){return items.map((g,i)=>`<button class="game-card ${g.modePreview?'mode-preview':''}" ${g.modePreview?'data-route="games"':`data-start="${escapeHTML(g.id)}"`} aria-label="${escapeHTML(g.title)}${g.modePreview?' — mode preview':''}"><div class="game-cover" style="--cover:${escapeHTML(g.theme||'linear-gradient(135deg,#513577,#15121d)')}"><span class="cover-number">${String(i+1).padStart(2,'0')} / ${labelOf(g.type)}</span><img class="game-cover-image" src="assets/covers/${(['wheel','hotspots','cards','duel','prompts','doors','tiles'].includes(g.type)?g.type:'special'===g.type?'special':'wheel')}.${g.type==='special'?'svg':'webp'}" alt="Illustrated ${escapeHTML(g.title)} game cover" loading="lazy"><span class="play-arrow">↗</span></div><div class="game-card-text"><h3>${escapeHTML(g.title)}</h3><p>${escapeHTML(g.description||'Interactive discovery game.')}</p><div class="game-tags"><span>${labelOf(g.type)}</span><span>${g.modePreview?'MODE PREVIEW':'PUBLISHED GAME'}</span></div></div></button>`).join('')}
function renderPublic(){if($('#liveMarquee')){$('#liveMarquee').innerHTML=Array.from({length:2},()=>['WHEEL IN MOTION','CIRCLE PATHS','MYSTERY SHUFFLE','THIS OR THAT','TIMED CHALLENGE','MYSTERY DOORS','LUCKY TILES','THE SPECIAL'].map(t=>`<span>✦ ${t}</span>`).join('')).join('');}if($('#mediaShowcase'))$('#mediaShowcase').innerHTML=spotlightStrip();const games=state.experiences.filter(x=>x.published!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));$('#featuredGames').innerHTML=tiles(games.length?games.filter(x=>x.featured!==false).slice(0,8):modePreviews);const picked=state.filter==='all'?games:games.filter(x=>x.type===state.filter);$('#allGames').innerHTML=tiles(picked)||'<div class="empty-state"><h3>Games are being prepared</h3><p>The live database has no published games in this category. The Master Studio can publish one after linking approved media and a verified creator.</p></div>';const publishedCreators=state.creators.filter(c=>c.published!==false);
const previews=(state.demoCreators||[]).filter(p=>/^DEMO /i.test(p.creator_credit||'')).slice(0,5);
const realMinis=publishedCreators.slice(0,3).map(c=>'<button class="creator-mini" data-creator="'+escapeHTML(c.id)+'"><span class="creator-avatar">'+escapeHTML(c.initials||c.name.slice(0,2).toUpperCase())+'</span><span><strong>'+escapeHTML(c.name)+'</strong><small>Explore profile</small></span><span class="open-arrow">↗</span></button>').join('');
const sampleMinis=previews.slice(0,3).map(p=>'<button class="creator-mini" data-route="feed"><span class="creator-avatar">◇</span><span><strong>'+escapeHTML(p.creator_credit)+'</strong><small>Fictional test profile · View feed</small></span><span class="open-arrow">↗</span></button>').join('');
$('#homeCreatorStrip').innerHTML=publishedCreators.length?realMinis:sampleMinis;
const realProfiles=publishedCreators.map(c=>'<article class="creator-profile"><div class="profile-banner"></div><div class="profile-body"><div class="profile-avatar">'+escapeHTML(c.initials||c.name.slice(0,2).toUpperCase())+'</div><h3>'+escapeHTML(c.name)+'</h3><p>'+escapeHTML(c.bio||'Independent creator')+'</p><div class="profile-foot"><small>Independent creator</small>'+urlLink(c.url,'Official page ↗')+'</div></div></article>').join('');
const demoProfiles=previews.map(p=>'<article class="creator-profile"><div class="profile-banner" style="background-image:linear-gradient(30deg,#1d1018aa,#55203544),url(&quot;'+escapeHTML(safeURL(p.media_url))+'&quot;);background-size:cover;background-position:center"></div><div class="profile-body"><div class="profile-avatar">◇</div><h3>'+escapeHTML(p.creator_credit)+'</h3><p>Fictional test profile using original LUSTSINO game-cover artwork. No real performer or verified identity is represented.</p><div class="profile-foot"><small>DEMO · NOT A REAL CREATOR</small><button class="button secondary smallish" data-route="feed">View test feed ↗</button></div></div></article>').join('');
$('#creatorGrid').innerHTML=publishedCreators.length?realProfiles:demoProfiles;
}
function route(name){if(name!=='play'){window.LUSTSINO_SPECIAL?.cleanup();clearTimer();if(state.wheelFrame){cancelAnimationFrame(state.wheelFrame);state.wheelFrame=0}}if(name==='studio'&&!isAdmin)name='account';if(!['home','games','play','creators','studio','about','feed','search','account','leaderboard','terms','privacy','safety','community'].includes(name))name='home';state.route=name;$$('.view').forEach(e=>e.classList.toggle('show',e.id==='view-'+name));$$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===name));if(name==='studio'&&isAdmin)renderStudio();if(name==='games'||name==='home'||name==='creators')renderPublic();window.scrollTo({top:0,behavior:'instant'});const hash=(name==='play')?'#play':`#${name}`;if(location.hash!==hash)history.replaceState(null,'',hash)}
function startGame(gameId){window.LUSTSINO_SPECIAL?.cleanup();if(state.wheelFrame){cancelAnimationFrame(state.wheelFrame);state.wheelFrame=0}const origin=typeof gameId==='object'?gameId:state.experiences.find(x=>x.id===gameId||x.slug===gameId);const g=origin?sessionGame(origin):null;if(!g){notify('Game not found.');return}clearTimer();state.current=g;state.playing=false;state.wheelTurns=0;state.hotNode=g.config?.startNode||'start';state.pathPhase='choose';state.pathChoice=null;state.duelStage=0;state.cardIndices=[];$('#playType').textContent=labelOf(g.type);$('#playTitle').textContent=g.title;$('#playDescription').textContent=g.description||'';route('play');updateStats();renderGame();window.dispatchEvent(new CustomEvent('lustsino:game-start',{detail:{id:g.id,type:g.type,title:g.title}}));}
function renderGame(){const g=state.current;if(!g)return;const root=$('#gameMount');if(g.type==='wheel')renderWheel(root,g);else if(g.type==='hotspots')renderHotspots(root,g);else if(g.type==='cards')renderCards(root,g);else if(g.type==='duel')renderDuel(root,g);else if(g.type==='prompts')renderPrompts(root,g);else if(g.type==='doors')renderDoors(root,g);else if(g.type==='tiles')renderTiles(root,g);else if(g.type==='special')window.LUSTSINO_SPECIAL?.mount(root,g);else root.innerHTML='<p>Unsupported experience type</p>'}
function drawResult(choice,buttonHTML=''){
 const c=creator(choice.creatorId||media(choice.mediaId)?.creator_id),m=media(choice.mediaId);
 return `<div class="choice-result reveal-in"><div class="game-kicker">YOUR REVEAL</div><h3>${escapeHTML(choice.label||'Something unexpected')}</h3>${stage(choice.mediaId,choice.symbol||'✦',{link:c?.url})}<p class="credit">${c?'Featuring '+escapeHTML(c.name):'Creator discovery'} · ${escapeHTML(m?.name||'Sample media')}</p>${c?urlLink(c.url,'Explore official creator page ↗'):''}${Number(choice.seconds)>0?`<div class="timer-box"><span class="round-meta">REVEAL WINDOW</span><span class="timer-time" id="timerClock">${clamp(choice.seconds,1,3600)}s</span><div class="auto-timer-track"><span id="timerProgress"></span></div></div>`:''}<div class="report-link"><button type="button" data-report data-media-id="${escapeHTML(choice.mediaId||'')}" data-experience-id="${escapeHTML(state.current?.id||'')}">Report this content</button></div>${buttonHTML}</div>`;
}
function clearTimer(){if(state.timer){clearInterval(state.timer);state.timer=null}if(state.previewTimeout){clearTimeout(state.previewTimeout);state.previewTimeout=null}}
function beginTimer(seconds,onDone=null){
 clearTimer();const total=clamp(seconds,1,3600);state.timerLeft=total;
 const begun=performance.now();
 const tick=()=>{const rest=Math.max(0,total-(performance.now()-begun)/1000);state.timerLeft=rest;const e=$('#timerClock'),p=$('#timerProgress');if(e)e.textContent=Math.ceil(rest)+'s';if(p)p.style.width=(100*rest/total).toFixed(1)+'%';if(rest<=0){clearTimer();if(e)e.textContent='Complete ✓';soundEffect('reveal');if(typeof onDone==='function')onDone()}};
 tick();state.timer=setInterval(tick,100);
}
function wireTimer(seconds){if(Number(seconds)>0)beginTimer(seconds)}

function renderWheel(root,g){
 const slices=g.config?.slices||[];
 if(!slices.length){root.innerHTML='<p>Add wheel slices in Studio.</p>';return}
 root.innerHTML=`<div class="game-shell"><div class="game-kicker">THE GOLDEN WHEEL</div><h2>Spin. Watch the ball. Reveal.</h2><p class="game-help">A full roulette animation with moving brass pockets and a bouncing ball.</p><div class="wheel-wrap physical-wheel-wrap"><canvas id="physicalWheel" aria-label="Animated roulette wheel" role="img"></canvas><span class="canvas-pointer" aria-hidden="true">▼</span></div><p class="roulette-status" id="rouletteStatus" aria-live="polite">Ready to spin</p><div class="game-footer-actions"><button id="spinButton" class="button primary">Spin the wheel ↗</button></div><div id="wheelResult" aria-live="polite"></div></div>`;
 const cv=$('#physicalWheel'),ctx=cv.getContext('2d'), TAU=2*Math.PI,n=slices.length,seg=TAU/n;
 const palette=['#962239','#1a1216','#b45d31','#3b121e','#a57a3d','#200e14'];
 let S=400,dpr=1,theta=0,ballAngle=-Math.PI/2,ballRadius=.83,ballOn=false,spinning=null,last=performance.now(),target=-1;
 const spinButton=$('#spinButton');
 function fit(){S=Math.min(470,cv.parentElement.clientWidth-22);dpr=Math.min(2,window.devicePixelRatio||1);cv.width=cv.height=Math.floor(S*dpr);cv.style.width=cv.style.height=S+'px'}
 function ring(cx,r,fill,stroke,width=1){ctx.beginPath();ctx.arc(cx,cx,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke()}}
 function draw(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,S,S);const c=S/2,R=c-5;
  const brass=ctx.createRadialGradient(c,c,R*.65,c,c,R);brass.addColorStop(0,'#5c2c13');brass.addColorStop(.75,'#c69a55');brass.addColorStop(1,'#492118');ring(c,R,brass,'#f4cf84',3);
  ring(c,R*.91,'#140d10','#f1c77b',3);
  for(let i=0;i<n;i++){
   const a0=theta+i*seg-Math.PI/2,a1=a0+seg;
   ctx.beginPath();ctx.arc(c,c,R*.83,a0,a1);ctx.arc(c,c,R*.50,a1,a0,true);ctx.closePath();ctx.fillStyle=palette[i%palette.length];ctx.fill();ctx.lineWidth=1.4;ctx.strokeStyle='#eab76d';ctx.stroke();
   ctx.save();ctx.translate(c,c);ctx.rotate((a0+a1)/2);ctx.translate(R*.655,0);ctx.rotate(Math.PI/2);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+Math.max(11,R*(n>18?.06:.095))+'px Georgia';ctx.fillStyle='#fff0c9';ctx.fillText((i+1).toString(),0,0);ctx.restore();
  }
  ring(c,R*.49,'#47251c','#efca83',3);ring(c,R*.34,'#8f5225','#f2d690',3);
  ctx.save();ctx.translate(c,c);ctx.rotate(theta);ctx.strokeStyle='#e6bb69';ctx.lineWidth=R*.037;ctx.lineCap='round';for(let i=0;i<4;i++){ctx.rotate(TAU/4);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(R*.27,0);ctx.stroke()}ctx.restore();ring(c,R*.075,'#e9bc6e','#63321b',2);
  if(ballOn){const r=R*ballRadius,bx=c+Math.cos(ballAngle)*r,by=c+Math.sin(ballAngle)*r,br=Math.max(5,R*.028);const grad=ctx.createRadialGradient(bx-br*.3,by-br*.3,0,bx,by,br);grad.addColorStop(0,'#ffffff');grad.addColorStop(1,'#bdc3cf');ctx.shadowColor='#030204';ctx.shadowBlur=7;ctx.beginPath();ctx.arc(bx,by,br,0,TAU);ctx.fillStyle=grad;ctx.fill();ctx.shadowBlur=0}
 }
 function frame(now){if(state.route!=='play'||state.current!==g)return;const dt=Math.min(.04,(now-last)/1000);last=now;
  if(spinning){const t=Math.min(1,(now-spinning.start)/spinning.duration),ease=1-(1-t)**3;
   theta=spinning.from+spinning.delta*ease;ballAngle=-Math.PI/2+Math.PI*2*9*(1-ease);ballRadius=.84-.16*(t>.60?Math.min(1,(t-.60)/.40):0);
   if(t>=1){theta=spinning.from+spinning.delta;spinning=null;ballAngle=-Math.PI/2;ballRadius=.68;result()}
  }else theta+=dt*.10;
  draw();state.wheelFrame=requestAnimationFrame(frame);
 }
 function result(){spinButton.disabled=false;addStat();addStat('discoveries');const item=slices[target];$('#rouletteStatus').textContent='WINNING POCKET · '+(target+1)+' · '+(item.label||'Reveal');$('#wheelResult').innerHTML=drawResult(item,`<div class="game-footer-actions"><button class="button primary" id="repeatWheel">Spin again ↻</button><button class="button subtle" data-route="games">Other games</button></div>`);wireTimer(item.seconds);$('#repeatWheel').onclick=()=>startGame(g.id);soundEffect('reveal')}
 function spin(){if(spinning)return;clearTimer();$('#wheelResult').innerHTML='';target=rnd(n);spinButton.disabled=true;$('#rouletteStatus').textContent='Ball in motion…';ballOn=true;const targetTheta=-(target+.5)*seg,normalized=((targetTheta-theta)%TAU+TAU)%TAU;spinning={start:performance.now(),duration:6000,from:theta,delta:TAU*(5+rnd(2))+normalized};soundEffect('shuffle')}
 spinButton.onclick=spin;fit();if('ResizeObserver'in window){const observer=new ResizeObserver(fit);observer.observe(cv.parentElement)}state.wheelFrame=requestAnimationFrame(frame);
}

function renderDoors(root,g){
 const options=g.config?.choices||[];if(!options.length){root.innerHTML='<p>Add door outcomes in Studio.</p>';return}
 root.innerHTML=`<div class="game-shell"><div class="game-kicker">THE VELVET DOORS</div><h2>One door. One discovery.</h2><p class="game-help">Choose a curtain. The others will remain hidden.</p><div class="door-grid">${Array.from({length:3},(_,i)=>`<button class="velvet-door" data-door="${i}"><span class="door-crown">✦</span><strong>${['I','II','III'][i]}</strong><small>OPEN</small></button>`).join('')}</div><div id="doorReveal"></div></div>`;
 $$('[data-door]',root).forEach(b=>b.onclick=()=>{if(root.querySelector('.door-open'))return;const pos=Number(b.dataset.door),opt=options[pos%options.length];b.classList.add('door-open');$$('[data-door]',root).forEach(o=>o.disabled=true);soundEffect('reveal');addStat();addStat('discoveries');setTimeout(()=>{const mount=$('#doorReveal');if(!mount)return;mount.innerHTML=drawResult(opt,`<button class="button secondary" id="doorAgain">Choose again ↻</button>`);wireTimer(opt.seconds);$('#doorAgain').onclick=()=>startGame(g.id);},750)})
}
function renderTiles(root,g){const picks=g.config?.choices||[];if(!picks.length){root.innerHTML='<p>Add tile outcomes in Studio.</p>';return}
 root.innerHTML=`<div class="game-shell"><div class="game-kicker">THE LUCKY GRID</div><h2>Nine tiles. One pick.</h2><p class="game-help">Each tile has its own hidden symbol. Choose carefully.</p><div class="lucky-grid">${Array.from({length:9},(_,i)=>`<button class="lucky-tile" data-tile="${i}">✧<small>${String(i+1).padStart(2,'0')}</small></button>`).join('')}</div><div id="tileReveal"></div></div>`;
 $$('[data-tile]',root).forEach(b=>b.onclick=()=>{if(root.querySelector('.tile-revealed'))return;const i=Number(b.dataset.tile),opt=picks[i%picks.length];b.classList.add('tile-revealed');$$('[data-tile]',root).forEach(x=>x.disabled=true);soundEffect('reveal');addStat();addStat('discoveries');setTimeout(()=>{const mount=$('#tileReveal');if(!mount)return;mount.innerHTML=drawResult(opt,`<button class="button secondary" id="tileAgain">New grid ↻</button>`);wireTimer(opt.seconds);$('#tileAgain').onclick=()=>startGame(g.id)},550)})
}
function renderHotspots(root,g){
 const nodes=g.config?.nodes||{},node=nodes[state.hotNode];
 if(!node){root.innerHTML='<p>Configure a valid path in Studio.</p>';return}
 const spots=node.spots||[],finished=spots.length===0;
 const sequence=Object.keys(nodes),currentRound=clamp(node.round??(sequence.indexOf(state.hotNode)+1),1,30),maxRound=clamp(g.config?.totalRounds||sequence.length,1,30);
 const m=media(node.mediaId),url=m&&safeURL(m.url),aspect=m?.width&&m?.height?`${m.width}/${m.height}`:'2/3';
 const c=creator(node.creatorId||m?.creator_id);
 const header=`<div class="game-kicker">${finished?'FINAL DISCOVERY':`ROUND ${currentRound} OF ${maxRound}`}</div><h2>${escapeHTML(node.title||'Choose your next move')}</h2><p class="game-help">${escapeHTML(node.subtitle||'Choose a highlighted area.')}</p><div class="path-progress"><span style="width:${finished?100:Math.min(100,currentRound/maxRound*100)}%"></span></div>`;
 if(finished){root.innerHTML=`<div class="game-shell path-game">${header}${stage(node.mediaId,node.symbol||'♥',{link:c?.url})}${c?.url?urlLink(c.url,'Visit official creator ↗'):''}<div class="timer-box">${Number(node.seconds)>0?`<span class="round-meta">FINAL WINDOW</span><span class="timer-time" id="timerClock">${node.seconds}s</span><div class="auto-timer-track"><span id="timerProgress"></span></div>`:''}</div><div class="game-footer-actions"><button class="button primary" id="retryPath">Play another path ↻</button><button class="button subtle" data-report data-media-id="${escapeHTML(node.mediaId||'')}" data-experience-id="${escapeHTML(g.id)}">Report</button></div></div>`;$('#retryPath').onclick=()=>{clearTimer();state.hotNode=g.config.startNode;state.pathPhase='choose';renderHotspots(root,g)};if(Number(node.seconds)>0)beginTimer(node.seconds);else clearTimer();addStat('completed');return}
 if(state.pathPhase==='reveal'&&state.pathChoice){
  const spot=state.pathChoice,clip=clipSpotPolygon(spot),secs=clamp(node.preview_seconds??5,2,45);
  root.innerHTML=`<div class="game-shell path-game reveal-in">${header}<div class="path-stage path-revealed" style="aspect-ratio:${aspect}">${url&&m.type==='image'?`<img class="path-blurred" src="${escapeHTML(url)}" alt=""><img class="path-in-focus" src="${escapeHTML(url)}" style="clip-path:${clip}" alt="Selected image region">`:`<div class="path-empty">Media preview not configured for this round.</div>`}<span class="path-region-border" style="${spotStyle(spot)}"></span></div><div class="timer-box"><span class="round-meta">REVEALED REGION · NEXT ROUND AUTOMATIC</span><span class="timer-time" id="timerClock">${secs}s</span><div class="auto-timer-track"><span id="timerProgress"></span></div></div><div class="game-footer-actions"><button class="button subtle" id="restartPath">↻ Restart journey</button></div></div>`;
  $('#restartPath').onclick=()=>{clearTimer();state.hotNode=g.config.startNode;state.pathPhase='choose';state.pathChoice=null;renderHotspots(root,g)};
  beginTimer(secs,()=>{if(state.route!=='play'||state.current!==g)return;const n=spot.next;if(!nodes[n]){notify('The next round is not configured.');return}state.hotNode=n;state.pathPhase='choose';state.pathChoice=null;renderHotspots(root,g)});
  return;
 }
 const spotHTML=spots.map((s,i)=>`<button class="hotspot ${escapeHTML(s.shape||'circle')}" style="${spotStyle(s)}" data-choose-spot="${i}" aria-label="Choose hidden region ${escapeHTML(s.label||String(i+1))}"><span>${escapeHTML(s.label||i+1)}</span></button>`).join('');
 root.innerHTML=`<div class="game-shell path-game">${header}<div class="path-stage path-concealed" style="aspect-ratio:${aspect}"><div class="hidden-surface"><span>CHOOSE YOUR REGION</span><small>The image is concealed until you make a choice.</small></div>${spotHTML}</div><p class="spot-guide">Choose a circle or oval. Only the selected region will be shown when the image reveals.</p><div class="game-footer-actions"><button class="button subtle" id="resetPath">↻ Start over</button></div></div>`;
 $$('[data-choose-spot]',root).forEach(b=>b.onclick=()=>{clearTimer();const s=spots[Number(b.dataset.chooseSpot)];if(!s)return;state.pathChoice=clone(s);state.pathPhase='reveal';addStat();addStat('discoveries');soundEffect('reveal');renderHotspots(root,g)});
 $('#resetPath').onclick=()=>{clearTimer();state.hotNode=g.config.startNode;state.pathPhase='choose';renderHotspots(root,g)};
}

function chooseMany(items,count){const all=items.slice();for(let i=all.length-1;i>0;i--){const j=rnd(i+1);[all[i],all[j]]=[all[j],all[i]]}return all.slice(0,count)}
function renderCards(root,g){
 const choices=g.config?.choices||[];if(!choices.length){root.innerHTML='<p>Add shuffle results in Studio.</p>';return}
 let version=0;
 async function shuffle(){const token=++version,choicesForHand=chooseMany(choices,3).map(c=>({...c}));if(rotateAllowed(g)){const mids=drawMedia(choicesForHand.length);choicesForHand.forEach((c,i)=>{c.mediaId=mids[i]||c.mediaId;c.creatorId=media(c.mediaId)?.creator_id||c.creatorId})}
  root.innerHTML=`<div class="game-shell shuffle-game"><div class="game-kicker">THE VELVET SHUFFLE</div><h2>Watch the cards move.</h2><p class="game-help">The full deck splits, riffles and gathers before your three mystery cards appear.</p><div class="riffle-stage" id="riffleDeck">${Array.from({length:24},()=>'<div class="riffle-card"><div class="riffle-back">✦</div></div>').join('')}</div><p class="round-meta" id="shuffleHint">Riffle · bridge · gather…</p><div class="game-footer-actions"><button id="reshuffle" class="button subtle" disabled>Shuffling…</button></div></div>`;
  const cards=$$('.riffle-card',root);let deck=cards.slice();const stage=$('#riffleDeck');const shift=(c,x,y,deg,z)=>{c.style.zIndex=z;c.style.transform=`translate(${x}px,${y}px) rotate(${deg}deg)`};const stack=()=>deck.forEach((c,i)=>shift(c,0,-i*1.3,0,i));
  const pause=ms=>new Promise(r=>setTimeout(r,ms));stack();
  for(let round=0;round<2;round++){
   if(token!==version||state.route!=='play'||state.current!==g)return;
   const mid=Math.floor(deck.length/2),L=deck.slice(0,mid),R=deck.slice(mid);
   L.forEach((c,i)=>shift(c,-78,-i*1.3,-9,i));R.forEach((c,i)=>shift(c,78,-i*1.3,9,i));soundEffect('shuffle');await pause(390);
   const l=L.slice(),r=R.slice(),out=[];while(l.length||r.length){const pickLeft=l.length&&(!r.length||Math.random()<.5);out.push((pickLeft?l:r).shift())}
   for(let i=0;i<out.length;i++){if(token!==version||state.route!=='play'||state.current!==g)return;shift(out[i],(Math.random()-.5)*9,-i*1.5,(Math.random()-.5)*6,i);await pause(39)}
   deck=out;await pause(190);stack();await pause(220);
  }
  if(token!==version||state.route!=='play'||state.current!==g)return;
  root.innerHTML=`<div class="game-shell shuffle-game reveal-in"><div class="game-kicker">THE DECK IS DEALT</div><h2>Choose your card.</h2><p class="game-help">The three face-down cards hide three different media reveals.</p><div class="reveal-mosaic dealt-mosaic">${choicesForHand.map((x,i)=>`<button class="mystery-card dealt-card" data-card="${i}" aria-label="Reveal card ${i+1}"><span class="card-index">CARD 0${i+1}</span><span class="symbol">✦</span></button>`).join('')}</div><p class="round-meta">Choose any card to reveal.</p><div class="game-footer-actions"><button class="button subtle" id="reshuffle">↻ Shuffle again</button></div></div>`;
  $$('[data-card]',root).forEach(b=>b.onclick=()=>{const picked=choicesForHand[Number(b.dataset.card)];if(!picked)return;version++;addStat();addStat('discoveries');root.innerHTML=`<div class="game-shell">${drawResult(picked,`<div class="game-footer-actions"><button class="button primary" id="moreCards">Shuffle & play again ↻</button><button class="button subtle" data-route="games">Other games</button></div>`)}</div>`;wireTimer(picked.seconds);$('#moreCards').onclick=()=>{clearTimer();shuffle()};soundEffect('reveal')});
  $('#reshuffle').onclick=shuffle;soundEffect('tick');
 }
 shuffle();
}

function renderPrompts(root,g){
 const choices=g.config?.choices||[];if(!choices.length){root.innerHTML='<p>Add timed challenge cards in Studio.</p>';return}
 const rounds=Math.max(1,Math.min(30,Number(g.config?.rounds)||5));let n=0;
 function advance(){clearTimer();if(n>=rounds){root.innerHTML=`<div class="game-shell"><div class="game-kicker">SESSION COMPLETE</div><h2>Your challenge is finished</h2><p>Explore another experience whenever you like.</p><button class="button primary" id="replayPrompt">Play again ↻</button></div>`;$('#replayPrompt').onclick=()=>startGame(g.id);addStat('completed');return}
 const option=choices[n%choices.length];root.innerHTML=`<div class="game-shell"><div class="game-kicker">CHALLENGE ${n+1} / ${rounds}</div><h2>${escapeHTML(option.label||'Mystery Round')}</h2><p class="game-help">${escapeHTML(option.prompt||'Choose a reveal and continue.')}</p><div class="prompt-stage"><div class="prompt-card">✧<small>YOUR NEXT REVEAL</small></div></div><div class="game-footer-actions"><button class="button primary" id="promptReveal">Reveal challenge ↗</button><button class="button subtle" id="promptSkip">Skip</button></div></div>`;
 $('#promptSkip').onclick=()=>{n++;advance()};$('#promptReveal').onclick=()=>{addStat();addStat('discoveries');const t=Math.max(1,Number(option.seconds)||12);root.innerHTML=`<div class="game-shell">${drawResult(option,`<button class="button subtle" id="promptNext">Next round ↗</button>`)}</div>`;$('#promptNext').onclick=()=>{n++;advance()};beginTimer(t,()=>{n++;advance()});};
 }
 advance();
}
function renderDuel(root,g){const choices=g.config?.choices||[];if(choices.length<2){root.innerHTML='<p>Add at least two choices in Studio.</p>';return}const max=Math.max(1,Math.min(12,Number(g.config?.rounds)||5));let round=0,history=[];
function nextRound(){clearTimer();if(round>=max){root.innerHTML=`<div class="game-shell"><div class="game-kicker">YOU MADE YOUR CHOICES</div><h2>Session complete ✦</h2><p class="game-help">${max} rounds finished. Thanks for playing at your own pace.</p><div class="result-card"><div class="result-icon">◇</div><div><strong>Your discoveries</strong><p>${history.map(x=>escapeHTML(x.label)).join(' · ')}</p></div></div><div class="game-footer-actions"><button class="button primary" id="replayDuel">Play again ↻</button><button class="button subtle" data-route="games">Other games</button></div></div>`;$('#replayDuel').onclick=()=>startGame(g.id);addStat('completed');return}
const picks=chooseMany(choices,2).map(c=>({...c}));if(rotateAllowed(g)){const mids=drawMedia(2);picks.forEach((c,i)=>{c.mediaId=mids[i]||c.mediaId;c.creatorId=media(c.mediaId)?.creator_id||c.creatorId})}root.innerHTML=`<div class="game-shell"><div class="game-kicker">THIS OR THAT · ROUND ${round+1} / ${max}</div><h2>Go with your instinct.</h2><p class="game-help">Choose between two possible reveals.</p><div class="progress-dots">${Array.from({length:max},(_,i)=>`<span class="${i<round?'done':''}"></span>`).join('')}</div><div class="duel-grid">${picks.map((v,i)=>`<button class="duel-option" data-duel="${i}"><div class="duel-art sealed-duel"><span>${i===0?'♠':'♥'}</span><small>SEALED DISCOVERY</small></div><div class="duel-caption">Option ${i===0?'A':'B'} · Reveal ↗</div></button>`).join('')}</div><div class="duel-versus">PICK ONE TO REVEAL</div></div>`;$$('[data-duel]',root).forEach(b=>b.onclick=()=>{const picked=picks[Number(b.dataset.duel)];history.push(picked);round++;addStat();addStat('discoveries');beep();root.innerHTML=`<div class="game-shell">${drawResult(picked,`<div class="game-footer-actions"><button class="button primary" id="nextDuel">${round<max?'Next round →':'View summary →'}</button><button class="button subtle" data-route="games">Finish early</button></div>`)}</div>`;wireTimer(picked.seconds);$('#nextDuel').onclick=nextRound})}nextRound();}
function openCreator(id){const c=creator(id);if(!c)return;$('#modalBody').innerHTML=`<div class="overline">CREATOR PROFILE</div><h2>${escapeHTML(c.name)}</h2><p>${escapeHTML(c.bio||'Independent creator')}</p><div class="mini-note">Only creator-authorized media should be published. Creator profiles appear here only when published from the live database.</div><div class="studio-actions">${urlLink(c.url,'Visit official profile ↗')}<button class="button subtle" id="modalOkay">Close</button></div>`;showModal();$('#modalOkay').onclick=closeModal}
function openReport(mediaId='',experienceId=''){
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 $('#modalBody').innerHTML=`<div class="overline">CONTENT CONCERN</div><h2>Report content</h2><p>Please report content or consent concerns. This form sends a report only when the Supabase backend is connected.</p><form id="reportForm"><div class="field"><label>Reason</label><select name="reason" required><option value="rights">Rights / ownership</option><option value="age">Age concern</option><option value="consent">Consent concern</option><option value="privacy">Privacy concern</option><option value="other">Other</option></select></div><div class="field" style="margin-top:12px"><label>Additional information</label><textarea name="details" maxlength="2000" placeholder="Describe the issue"></textarea></div><button class="button primary" style="margin-top:15px" type="submit">Submit report</button></form>`;
 showModal();$('#reportForm').onsubmit=async e=>{e.preventDefault();if(!remote||!supabase)return notify('Reporting requires the backend connection. Please use the contact/removal details once configured.');if(!uuid.test(mediaId)&&!uuid.test(experienceId))return notify('This sample content is not published to the live database.');const f=new FormData(e.currentTarget),payload={reason:f.get('reason'),details:String(f.get('details')||'').slice(0,2000),media_id:uuid.test(mediaId)?mediaId:null,experience_id:uuid.test(experienceId)?experienceId:null};const {error}=await supabase.from('content_reports').insert(payload);if(error)return notify('Report error: '+error.message);closeModal();notify('Report received by the moderation queue.');};
}
function showModal(){const e=$('#modal');e.classList.remove('hidden');$('#modalClose').focus()}
function closeModal(){$('#modal').classList.add('hidden')}
function studioIntro(title,description){return `<div><h2>${title}</h2><p>${description}</p></div>`}
function renderStudio(){const status=$('#studioStatus');if(status)status.textContent=isAdmin?'HOUSE MASTER · SECURE DASHBOARD':'Dashboard unavailable';$('#studioAuthButton').textContent=isAdmin?'Sign out':'Admin sign in';if(!remote){$('#studioContent').innerHTML='<div class="member-card"><h2>Live connection required</h2><p>Studio uses live Supabase records only. Check your internet connection, then reload.</p></div>';return;}if(remote&&!isAdmin){$('#studioContent').innerHTML=`${studioIntro('Owner sign-in required','Visitors do not need accounts. Your admin tools are protected by Supabase Auth and row-level security.')}<div class="mini-note">Guests can browse published games without signing in. To publish, sign in with an authorized Master account.</div><button class="button primary" id="loginFromStudio">Sign in to studio ↗</button>`;$('#loginFromStudio').onclick=authModal;return}
$$('[data-studio-tab]').forEach(e=>e.classList.toggle('active',e.dataset.studioTab===state.studioTab));const root=$('#studioContent');switch(state.studioTab){case'overview':renderStudioOverview(root);break;case'creators':renderStudioCreators(root);break;case'applications':renderStudioApplications(root);break;case'media':renderStudioMedia(root);break;case'experiences':renderStudioGames(root);break;case'reports':renderStudioReports(root);break;case'settings':renderStudioSettings(root);break;}}
async function renderStudioReports(root){
 root.innerHTML=studioIntro('Content reports','Review and act on reported posts, media and games.')+'<p class="muted">Loading reports…</p>';
 if(!remote||!supabase||!isAdmin){root.innerHTML='<p>Master account required.</p>';return;}
 const {data,error}=await supabase.from('content_reports')
  .select('id,reason,details,post_id,media_id,experience_id,created_at')
  .order('created_at',{ascending:false}).limit(100);
 if(error){root.innerHTML='<p>'+escapeHTML(error.message)+'</p>';return;}
 root.innerHTML=studioIntro('Content reports','Review complaints and remove content that infringes rights, privacy or consent.')+
 '<div class="table-scroller"><table><thead><tr><th>REASON</th><th>CONTENT ID</th><th>DETAILS</th><th>DATE</th><th>ACTION</th></tr></thead><tbody>'+
 ((data||[]).map(report=>'<tr><td>'+escapeHTML(report.reason)+'</td><td>'+
 escapeHTML(report.post_id||report.media_id||report.experience_id||'—')+'</td><td>'+
 escapeHTML(report.details||'—')+'</td><td>'+new Date(report.created_at).toLocaleString()+'</td><td>'+
 (report.post_id?'<button class="table-action danger" data-unpublish-report="'+escapeHTML(report.post_id)+'" type="button">Remove post from feed</button>':'—')+
 '</td></tr>').join('')||'<tr><td colspan="5">No reports yet</td></tr>')+'</tbody></table></div>';
 root.querySelectorAll('[data-unpublish-report]').forEach(button=>button.onclick=async()=>{
  if(!confirm('Remove this reported post from public view?'))return;
  button.disabled=true;
  const {error}=await supabase.from('community_posts').update({published:false,review_status:'rejected'}).eq('id',button.dataset.unpublishReport);
  if(error){button.disabled=false;return notify(error.message);}
  notify('Reported post removed from the public feed.');renderStudioReports(root);
 });
}
function renderStudioOverview(root){root.innerHTML=`${studioIntro('Overview','Content inventory and experience management.')}
<div class="studio-stats"><div class="studio-stat"><b>${state.experiences.length}</b><small>INTERACTIVE GAMES</small></div><div class="studio-stat"><b>${state.creators.length}</b><small>CREATOR PROFILES</small></div><div class="studio-stat"><b>${state.media.length}</b><small>MEDIA RECORDS</small></div></div>
<div class="mini-note"><strong>Release checklist</strong><br>① Written creator permission + rights records · ② verified adult subjects and release documentation · ③ content review · ④ legally appropriate age assurance · ⑤ compatible media hosting and ad partners · ⑥ real report / removal workflow.</div>
<div class="studio-actions"><button class="button primary" data-studio-tab="experiences">Build a game ↗</button><button class="button secondary" data-studio-tab="media">Add media</button><button class="button secondary" data-studio-tab="creators">Add creator</button><button class="button subtle" id="clearDemoContent" type="button">Remove five test profiles &amp; posts</button></div>`}

async function renderStudioApplications(root){
 if(!isAdmin||!supabase)return;
 root.innerHTML=studioIntro('House Creator applications','Game creation is available to ordinary player accounts. Only public adult-media publishing requires documented identity, age and rights verification.')+'<p>Loading applications…</p>';
 const {data,error}=await supabase.from('creator_applications').select('id,user_id,note,portfolio_url,created_at,stage').order('created_at',{ascending:false}).limit(100);
 if(error){root.innerHTML='<p>'+escapeHTML(error.message)+'</p>';return}
 root.innerHTML=studioIntro('House Creator applications','All signed-in players can save private games without approval. Verified House Creators can publish eligible media without a separate review for each post.')+`<div class="table-scroller"><table><thead><tr><th>APPLICANT</th><th>DATE</th><th>STATUS</th><th>REVIEW</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td><strong>${escapeHTML(x.user_id.slice(0,8))}</strong><br><small>${escapeHTML(x.note||'No introduction')}</small></td><td>${new Date(x.created_at).toLocaleString()}</td><td>${escapeHTML(x.stage)}</td><td>${x.stage==='pending'?`<input data-app-evidence="${escapeHTML(x.id)}" type="text" maxlength="240" placeholder="Document / release verification reference" aria-label="Verified adult media documentation reference" style="max-width:180px;font-size:11px"> <button type="button" class="table-action" data-approve-app="${escapeHTML(x.id)}">Verify adult creator</button> <button class="table-action danger" data-decline-app="${escapeHTML(x.id)}">Decline</button>`:'Reviewed'}</td></tr>`).join('')||'<tr><td colspan="4">No applications yet</td></tr>'}</tbody></table></div>`;
 root.querySelectorAll('[data-approve-app]').forEach(b=>b.onclick=async()=>{const evidence=root.querySelector('[data-app-evidence="'+b.dataset.approveApp+'"]')?.value?.trim()||'';if(evidence.length<8)return notify('Game-building accounts need no approval. Public adult media still needs a genuine completed verification reference.');const {error}=await supabase.rpc('lustsino_decide_creator',{p_application:b.dataset.approveApp,p_approve:true,p_evidence_ref:evidence.trim()});if(error)return notify(error.message);notify('House Creator verified.');renderStudioApplications(root)});
 root.querySelectorAll('[data-decline-app]').forEach(b=>b.onclick=async()=>{if(!confirm('Decline this application?'))return;const {error}=await supabase.rpc('lustsino_decide_creator',{p_application:b.dataset.declineApp,p_approve:false,p_evidence_ref:''});if(error)return notify(error.message);renderStudioApplications(root)});
}

function parseCSV(content){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<content.length;i++){const ch=content[i];if(ch==='"'){if(quoted&&content[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(ch===','&&!quoted){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&content[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell=''}else cell+=ch;}row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows}
function renderStudioCreators(root,editId=null){const current=state.creators.find(x=>x.id===editId)||null;root.innerHTML=`${studioIntro('Creator directory','Add, bulk-import, and review creator profiles before publication.')}
<div class="table-scroller"><table><thead><tr><th>NAME</th><th>HANDLE</th><th>RIGHTS REF.</th><th>PUBLIC</th><th></th></tr></thead><tbody>${state.creators.map(c=>`<tr><td>${escapeHTML(c.name)}</td><td>${escapeHTML(c.handle||'—')}</td><td>${escapeHTML(c.permission_ref||'—')}</td><td>${c.published?'Yes':'Draft'}</td><td><button class="table-action" data-edit-creator="${escapeHTML(c.id)}">Edit</button> <button class="table-action danger" data-remove-creator="${escapeHTML(c.id)}">Delete</button></td></tr>`).join('')}</tbody></table></div>
<form id="creatorForm"><div class="overline">${current?'EDIT CREATOR':'ADD CREATOR'}</div><div class="form-grid"><div class="field"><label>Creator name</label><input name="name" required maxlength="90" placeholder="Display name" value="${escapeHTML(current?.name||'')}"></div><div class="field"><label>Handle</label><input name="handle" required maxlength="60" placeholder="creator-handle" value="${escapeHTML(current?.handle||'')}"></div><div class="field span2"><label>Official creator page (HTTPS)</label><input name="url" required type="url" placeholder="https://..." value="${escapeHTML(current?.url||'')}"></div><div class="field"><label>Written permission reference</label><input name="permission_ref" required placeholder="Agreement ID" value="${escapeHTML(current?.permission_ref||'')}"></div><div class="field"><label>Profile initials</label><input name="initials" maxlength="3" placeholder="AB" value="${escapeHTML(current?.initials||'')}"></div><div class="field span2"><label>Short bio</label><textarea name="bio" maxlength="420">${escapeHTML(current?.bio||'')}</textarea></div><div class="field"><label><input name="age_verified" type="checkbox" style="width:auto" ${current?.age_verified?'checked':''}> Adult identity and consent documentation verified</label></div><div class="field"><label><input name="published" type="checkbox" style="width:auto" ${current?.published?'checked':''}> Publish creator profile</label></div></div><button class="button primary" type="submit">${current?'Update creator':'Add creator'} ↗</button> ${current?'<button class="button subtle" type="button" id="cancelEditCreator">Cancel edit</button>':''}</form>
<div class="mini-note" style="margin-top:25px"><strong>50 creators? Bulk import them as drafts.</strong><br>Download the CSV template, fill each person's display name, handle, official HTTPS link, bio and permission reference, then import. All imported creators remain unpublished and unverified until you edit and approve them individually.</div>
<div class="studio-actions"><button class="button secondary" id="downloadCreatorCSV">Download CSV template ↓</button><label class="button subtle" for="creatorCSV">Choose creator CSV</label><input id="creatorCSV" type="file" accept=".csv,text/csv" style="max-width:220px;font-size:11px;color:#bcb0ca"><button class="button primary" id="importCreators" type="button">Import drafts ↗</button></div>`;
$$('[data-edit-creator]',root).forEach(b=>b.onclick=()=>renderStudioCreators(root,b.dataset.editCreator));const cancel=$('#cancelEditCreator');if(cancel)cancel.onclick=()=>renderStudioCreators(root);
$('#creatorForm').onsubmit=async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget),row={name:String(f.get('name')).trim(),handle:String(f.get('handle')).trim().toLowerCase().replace(/[^a-z0-9-]/g,'-'),url:safeURL(f.get('url')),bio:String(f.get('bio')||''),permission_ref:String(f.get('permission_ref')).trim(),initials:String(f.get('initials')||'').trim().toUpperCase(),age_verified:f.has('age_verified'),published:f.has('published')};if(!row.url.startsWith('https:'))return notify('Please use an HTTPS creator URL.');if(row.published&&!row.age_verified)return notify('Verify the adult creator and their consent before publishing.');if(!row.permission_ref)return notify('Add a written permission reference first.');if(remote){const q=current?supabase.from('creators').update(row).eq('id',current.id):supabase.from('creators').insert(row);const {error}=await q;if(error)return notify(error.message);await refreshRemote()}else{return notify('Live Supabase is required.')}renderPublic();renderStudio();notify('Creator saved.');};
$('#downloadCreatorCSV').onclick=()=>{const csv='name,handle,url,bio,permission_ref\n"Creator Example",creator-example,https://example.com/creator,"Creator bio",AGREEMENT-001\n';const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='vyra-creators-template.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('#importCreators').onclick=async()=>{const file=$('#creatorCSV').files[0];if(!file)return notify('Choose a CSV file first.');const csv=parseCSV(await file.text());if(csv.length<2)return notify('CSV needs a header row and at least one creator.');const cols=csv.shift().map(x=>x.trim().toLowerCase());const wanted=['name','handle','url','bio','permission_ref'];if(wanted.some(k=>!cols.includes(k)))return notify('Headers must include: '+wanted.join(', '));const entries=csv.map(r=>Object.fromEntries(cols.map((k,i)=>[k,(r[i]||'').trim()])))
.map(c=>({name:c.name,handle:(c.handle||'').toLowerCase().replace(/[^a-z0-9-]/g,'-'),url:safeURL(c.url),bio:c.bio||'',initials:(c.name||'').slice(0,2).toUpperCase(),permission_ref:c.permission_ref,age_verified:false,published:false}));if(entries.length>100)return notify('Import a maximum of 100 records at once.');if(entries.some(c=>!c.name||!c.handle||!c.url.startsWith('https:')||!c.permission_ref))return notify('Each CSV row needs a name, handle, HTTPS URL and permission reference.');if(remote){const {error}=await supabase.from('creators').insert(entries);if(error)return notify(error.message);await refreshRemote()}else{return notify('Live Supabase is required.')}renderPublic();renderStudio();notify(`${entries.length} draft creator profiles imported. Review each before publishing.`)};
}
function renderStudioMedia(root,editId=null){
 const current=state.media.find(x=>x.id===editId)||null;
 const visible=state.media.slice(0,180);
 root.innerHTML=`${studioIntro('Media vault','${state.media.length} stored media records. Assign the correct creator, permission reference and official link before publishing any asset to the hosted site.')}
 <div class="mini-note"><b>Local vs hosted:</b> imported archive images live in this site folder. They are not automatically in Supabase Storage. Public files cannot be protected by a simple 18+ pop-up. Use your approved hosting and age-assurance workflow before deployment.</div>
 <div class="vault-grid">${visible.map(m=>`<button class="vault-tile ${m.published?'approved':''}" data-edit-media="${escapeHTML(m.id)}" title="Edit ${escapeHTML(m.name)}"><img loading="lazy" src="${escapeHTML(safeURL(m.url))}" alt="${escapeHTML(m.alt_text||m.name)}"><span>${escapeHTML(m.name)} · ${m.published?'Published':'Draft'}</span></button>`).join('')}</div>
 <form id="mediaForm"><h3>${current?'Edit media & attribution':'Add authorized media'}</h3><div class="form-grid">
 <div class="field"><label>Media title</label><input name="name" required value="${escapeHTML(current?.name||'')}" placeholder="Media title"></div>
 <div class="field"><label>Creator</label><select name="creator_id" required>${state.creators.map(c=>`<option value="${escapeHTML(c.id)}" ${current?.creator_id===c.id?'selected':''}>${escapeHTML(c.name)}${c.published?' ✓':''}</option>`).join('')}</select></div>
 <div class="field"><label>Media type</label><select name="type"><option ${current?.type==='image'?'selected':''} value="image">Photo</option><option ${current?.type==='video'?'selected':''} value="video">Video</option></select></div>
 <div class="field"><label>Permission / release reference</label><input name="rights_ref" required value="${escapeHTML(current?.rights_ref||'')}" placeholder="Agreement or license ID"></div>
 <div class="field span2"><label>Media URL</label><input name="url" required value="${escapeHTML(current?.url||'')}" placeholder="https://your-bunny-pull-zone.b-cdn.net/media/image.webp" ><small>Local asset paths are for preview. Hosted publication requires a real HTTPS URL accessible from your deployed domain.</small></div>
 <div class="field span2"><label>Image/video file for approved storage (optional)</label><input type="file" name="file" accept="image/jpeg,image/webp,image/png,video/mp4,video/webm" ${config.uploadsEnabled?'':'disabled'}><small>Direct Supabase Storage upload is disabled until the bucket is approved and configured.</small></div>
 <div class="field"><label>Image width in pixels</label><input type="number" min="1" max="20000" name="width" value="${current?.width||''}" placeholder="e.g. 1080"></div><div class="field"><label>Image height in pixels</label><input type="number" min="1" max="20000" name="height" value="${current?.height||''}" placeholder="e.g. 1620"></div><div class="field span2"><label>Alt / media description</label><input name="alt_text" value="${escapeHTML(current?.alt_text||'')}"></div>
 <div class="field"><label><input type="checkbox" name="age_verified" style="width:auto" ${current?.age_verified?'checked':''}> Adult age / participant consent verified</label></div>
 <div class="field"><label><input type="checkbox" name="published" style="width:auto" ${current?.published?'checked':''}> Approved for publication</label></div>
 </div><div class="studio-actions"><button class="button primary" type="submit">${current?'Save media attribution':'Add media record'} ↗</button>${current?'<button class="button secondary" id="cancelMediaEdit" type="button">Cancel edit</button>':''}</div></form>
 <div class="mini-note"><b>Batch import:</b> The supplied 177-image archive is already added locally. For live Supabase uploads, sign in as an owner, enable an approved storage bucket, and use the batch upload option below.</div>
 <form id="batchUploadForm"><div class="form-grid"><div class="field span2"><label>Select approved media files (multiple)</label><input type="file" name="batch" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" ${config.uploadsEnabled&&isAdmin?'':'disabled'}></div><div class="field"><label>Assign creator</label><select name="creator_id">${state.creators.map(c=>`<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`).join('')}</select></div><div class="field"><label>Rights reference for selected files</label><input name="rights_ref" placeholder="License / release ID"></div></div><button type="submit" class="button secondary" ${config.uploadsEnabled&&isAdmin?'':'disabled'}>Upload approved batch as drafts</button></form>
 `;
 root.insertAdjacentHTML('afterbegin', '<section class="member-card" id="bunnyLibraryBlock"><div class="overline">BUNNY STORAGE</div><h3>Already-uploaded media</h3><p>Browse Bunny objects, select one, then assign its correct verified creator and rights reference below. Importing a file does not publish it.</p><div class="studio-actions"><button class="button secondary" id="bunnyListBtn" type="button">Browse Bunny files</button><button class="button subtle" id="bunnyHealthBtn" type="button">Test Bunny connection</button><button class="button subtle" id="bunnyMoreBtn" type="button" hidden>Load more</button></div><p id="bunnyHealthStatus" class="mini-note" role="status">Select “Test Bunny connection” to validate storage and CDN configuration.</p><p id="bunnyDeliveryStatus" class="mini-note" role="status" aria-live="polite"></p><div id="bunnyLibrary" class="table-scroller"></div></section>');
 let bunnyEntries=[],continuation=null;
 const drawBunny=()=>{
  const out=$('#bunnyLibrary');
  out.innerHTML=bunnyEntries.length?'<table><thead><tr><th>FILE</th><th>SIZE</th><th>ACTION</th></tr></thead><tbody>'+
   bunnyEntries.map((entry,i)=>'<tr><td style="max-width:360px;overflow-wrap:anywhere">'+escapeHTML(entry.key)+'</td><td>'+Math.round((entry.size||0)/1024)+' KB</td><td><button class="table-action" data-bunny-entry="'+i+'" '+''+'>Use file</button> <button class="table-action" data-bunny-test="'+i+'" '+''+'>Test CDN</button></td></tr>').join('')+
   '</tbody></table>':'<p>No Bunny objects found.</p>';
  out.querySelectorAll('[data-bunny-entry]').forEach(b=>b.onclick=()=>{
   const file=bunnyEntries[Number(b.dataset.bunnyEntry)];
   const form=$('#mediaForm');
   if(!file?.url)return notify('No delivery URL for this object. Check that BUNNY_CDN_BASE_URL is your actual HTTPS Pull Zone hostname.');
   if(!form)return notify('The media form is unavailable; reopen Studio → Media.');
   form.elements.name.value=file.key.split('/').pop().replace(/\.[^.]+$/,'').slice(0,80);
   form.elements.url.value=file.url;
   form.elements.type.value=/\.(mp4|webm)$/i.test(file.key)?'video':'image';
   form.elements.published.checked=false;
   form.elements.age_verified.checked=false;
   form.scrollIntoView({behavior:'smooth',block:'start'});
   notify('File selected. Assign the creator, rights record, and approval status before saving.');
  });
  out.querySelectorAll('[data-bunny-test]').forEach(btn=>btn.onclick=async()=>{
   const file=bunnyEntries[Number(btn.dataset.bunnyTest)];
   const status=$('#bunnyDeliveryStatus');
   if(!file||!status)return;
   const {data:{session}}=await supabase.auth.getSession();
   if(!session){status.textContent='Master session expired. Please sign in again.';return;}
   btn.disabled=true;status.textContent='Testing Bunny CDN delivery for selected file…';
   try{
    const response=await fetch(config.uploadEndpoint,{
     method:'POST',
     headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,apikey:config.supabaseAnonKey},
     body:JSON.stringify({action:'cdn-check',key:file.key})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(result.error||('Gateway HTTP '+response.status));
    const code=Number(result.cdnStatus)||0;
    const kind=String(result.cdnContentType||'not reported').slice(0,80);
    if(!result.cdnReachable){
     status.textContent='Storage contains the file, but CDN returned HTTP '+code+'. Check the Pull Zone origin, token rules and delivery settings before using this file.';
    }else{
     const link=safeURL(result.deliveryUrl||file.url);
     status.innerHTML='CDN HEAD passed: HTTP '+code+' · '+escapeHTML(kind)+' · '+Math.round((Number(result.storageBytes)||0)/1024)+' KB. '+(link?'<a href="'+escapeHTML(link)+'" target="_blank" rel="noopener noreferrer">Open this file in a new tab to verify browser delivery ↗</a>':'');
     if(!/^(image|video)\//i.test(kind))status.insertAdjacentText('beforeend',' Check Content-Type configuration: expected image/* or video/*.');
    }
   }catch(error){status.textContent='CDN test failed: '+(error.message||String(error));}
   finally{btn.disabled=false;}
  });
  $('#bunnyMoreBtn').hidden=!continuation;
 };
 async function listBunny(append=false){
  if(!supabase||!isAdmin)return notify('Master login required.');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)return notify('Sign in again.');
  const target=window.VYRA_CONFIG?.uploadEndpoint;
  const btn=$('#bunnyListBtn');btn.disabled=true;btn.textContent='Loading Bunny files…';
  try{
   const response=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,apikey:config.supabaseAnonKey},body:JSON.stringify({action:'list',continuationToken:append?continuation:null})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||'Bunny listing failed.');
   bunnyEntries=append?bunnyEntries.concat(result.items||[]):result.items||[];
   continuation=result.next||null;
   drawBunny();
   if(!result.deliveryReady)notify('Storage is connected but the Bunny Pull Zone hostname has not been configured. Files can be listed but not used in public pages.');
  }catch(error){notify(error.message||'Could not load Bunny files.');}
  finally{btn.disabled=false;btn.textContent='Browse Bunny files';}
 }
 $('#bunnyHealthBtn').onclick=async()=>{
  const status=$('#bunnyHealthStatus'),btn=$('#bunnyHealthBtn');
  if(!supabase||!isAdmin){status.textContent='Master access is required.';return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){status.textContent='Sign in again to test the Bunny gateway.';return;}
  btn.disabled=true;status.textContent='Testing signed-in gateway and Bunny storage…';
  const invoke=async action=>{
    const res=await fetch(window.VYRA_CONFIG.uploadEndpoint,{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,apikey:config.supabaseAnonKey},
      body:JSON.stringify({action})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(data.error||('Gateway returned HTTP '+res.status));
    return data;
  };
  try{
    const health=await invoke('health');
    if(!health.ready){
      const missing=[!health.storageConfigured?'S3 credentials':'',!health.deliveryConfigured?'CDN hostname':''].filter(Boolean);
      status.textContent='Gateway reachable, but configuration is incomplete: '+missing.join(' and ')+'.';
    }else{
      const result=await invoke('list');
      status.textContent='Bunny S3 connection successful. '+(result.items||[]).length+' objects returned in the first batch. CDN hostname configured; test actual file delivery before publishing.';
    }
  }catch(error){status.textContent='Bunny test failed: '+(error.message||String(error));}
  finally{btn.disabled=false;}
 };
 $('#bunnyListBtn').onclick=()=>listBunny(false);
 $('#bunnyMoreBtn').onclick=()=>listBunny(true);
 root.insertAdjacentHTML('beforeend',`<div class="mini-note"><b>Bulk attribution mapping</b><br>Download a CSV with your media IDs, enter each creator's handle and permission reference, then re-import. Works locally or with records already uploaded to Supabase.</div><div class="studio-actions"><button type="button" class="button secondary" id="exportMediaMap">↓ Download media mapping CSV</button><label class="button subtle">Choose mapping CSV <input id="mediaMapFile" type="file" accept=".csv,text/csv" style="max-width:180px"></label><button class="button primary" type="button" id="importMediaMap">Import mappings</button></div>`);
 $('#exportMediaMap').onclick=()=>{const quote=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const rows=[['id','creator_handle','rights_ref','age_verified','published'].join(','),...state.media.map(m=>[m.id,creator(m.creator_id)?.handle||'',m.rights_ref||'',m.age_verified?'true':'false',m.published?'true':'false'].map(quote).join(','))];const blob=new Blob([rows.join('\n')],{type:'text/csv'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='lustsino-media-mapping.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
 $('#importMediaMap').onclick=async()=>{const file=$('#mediaMapFile').files[0];if(!file)return notify('Choose a mapping CSV.');const rows=parseCSV(await file.text());if(rows.length<2)return notify('No mapping rows found.');const h=rows.shift().map(v=>v.trim());if(!['id','creator_handle','rights_ref','age_verified','published'].every(v=>h.includes(v)))return notify('CSV missing required columns.');let updated=0,skipped=0;for(const vals of rows){const r=Object.fromEntries(h.map((key,i)=>[key,(vals[i]||'').trim()])),m=media(r.id),c=state.creators.find(x=>x.handle===r.creator_handle);if(!m||!c||!r.rights_ref){skipped++;continue}const ver=r.age_verified.toLowerCase()==='true',pub=r.published.toLowerCase()==='true';if(pub&&(!ver||!c.age_verified||!c.published||!c.url)){skipped++;continue}const patch={creator_id:c.id,rights_ref:r.rights_ref,age_verified:ver,published:pub};if(remote){if(!/^[0-9a-f]{8}-/i.test(m.id)){skipped++;continue}const {error}=await supabase.from('media_assets').update(patch).eq('id',m.id);if(error){skipped++;continue}}else{skipped++;continue}updated++;}if(remote)await refreshRemote();renderPublic();renderStudioMedia(root);notify(`Updated ${updated} assets; skipped ${skipped}.`)};
 $$('[data-edit-media]',root).forEach(b=>b.onclick=()=>renderStudioMedia(root,b.dataset.editMedia));
 if($('#cancelMediaEdit'))$('#cancelMediaEdit').onclick=()=>renderStudioMedia(root);
 $('#mediaForm').onsubmit=async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget),file=f.get('file'),c=creator(f.get('creator_id'));
 const row={name:String(f.get('name')).trim(),creator_id:f.get('creator_id'),type:f.get('type'),rights_ref:String(f.get('rights_ref')).trim(),url:String(f.get('url')||'').trim(),alt_text:String(f.get('alt_text')||''),width:Number(f.get('width'))||null,height:Number(f.get('height'))||null,age_verified:f.has('age_verified'),published:f.has('published')};
 if(!c)return notify('Select a creator.');if(!row.rights_ref)return notify('Rights record is required.');
 if(row.published&&(!row.age_verified||!c.age_verified||!c.published||!c.url||!c.permission_ref))return notify('Approve the real creator with an official link and both consent checks first.');
 if(file&&file.size){if(!remote||!isAdmin||!config.uploadsEnabled)return notify('Uploads require an approved bucket and owner login.');if(file.size>25*1024*1024)return notify('Individual upload limit is 25 MB.');const path=`${adminUser.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const {data,error}=await supabase.storage.from(config.mediaBucket).upload(path,file,{contentType:file.type,upsert:false});if(error)return notify(error.message);row.url=supabase.storage.from(config.mediaBucket).getPublicUrl(data.path).data.publicUrl;row.type=file.type.startsWith('video/')?'video':'image'}
 if(!safeURL(row.url))return notify('A valid media URL is required.');
 if(remote){if(!/^https:\/\//.test(row.url))return notify('Supabase requires an HTTPS URL, not a local file path.');const result=current&&/^[\da-f]{8}-/.test(current.id)?await supabase.from('media_assets').update(row).eq('id',current.id):await supabase.from('media_assets').insert(row);if(result.error)return notify(result.error.message);await refreshRemote()}else{return notify('Live Supabase is required.')}
 renderPublic();renderStudioMedia(root);notify('Media details saved.');
 };
 $('#batchUploadForm').onsubmit=async(e)=>{e.preventDefault();if(!remote||!isAdmin||!config.uploadsEnabled)return notify('Batch upload is not enabled.');const f=new FormData(e.currentTarget),files=[...e.currentTarget.elements.batch.files];if(!files.length)return notify('Select files.');const c=creator(f.get('creator_id'));if(!c||!c.age_verified)return notify('Assign a verified creator first.');const ref=String(f.get('rights_ref')||'').trim();if(!ref)return notify('Provide a rights reference.');let done=0;for(const file of files){if(file.size>25*1024*1024)continue;const path=`${adminUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^\w.-]/g,'_')}`;const up=await supabase.storage.from(config.mediaBucket).upload(path,file,{contentType:file.type,upsert:false});if(up.error){notify('Upload failed: '+up.error.message);break}const url=supabase.storage.from(config.mediaBucket).getPublicUrl(up.data.path).data.publicUrl;const {error}=await supabase.from('media_assets').insert({creator_id:c.id,name:file.name,type:file.type.startsWith('video/')?'video':'image',url,rights_ref:ref,age_verified:false,published:false});if(error){notify(error.message);break}done++;}await refreshRemote();renderStudioMedia(root);notify(`Uploaded ${done} unpublished media drafts.`)};
}
function gameTemplate(type){const base=clone(modelExperiences.find(x=>x.type===type)||modelExperiences[0]);const scrub=(v)=>{if(Array.isArray(v))return v.map(scrub);if(v&&typeof v==='object'){for(const k of Object.keys(v)){if(k==='mediaId'||k==='creatorId')v[k]='';else scrub(v[k]);}}return v;};return scrub(base.config)}
function renderStudioGames(root){root.innerHTML=`${studioIntro('Game builder','Create new games, edit configurations, and place interactive hotspots on images.')}
<div class="table-scroller"><table><thead><tr><th>GAME</th><th>TYPE</th><th>STATUS</th><th></th></tr></thead><tbody>${state.experiences.map(g=>`<tr><td>${escapeHTML(g.title)}</td><td>${labelOf(g.type)}</td><td>${g.published?'Published':'Draft'}</td><td><button class="table-action" data-edit-game="${escapeHTML(g.id)}">Edit</button> <button class="table-action danger" data-remove-game="${escapeHTML(g.id)}">Delete</button></td></tr>`).join('')}</tbody></table></div><div class="studio-actions"><button class="button primary" id="newGame">+ New game</button><button class="button secondary" id="exportGames">Export game JSON ↓</button></div><div id="builderZone"></div>`;
$('#newGame').onclick=()=>openBuilder();$('#exportGames').onclick=()=>downloadJSON('vyra-game-configs.json',state.experiences);$$('[data-edit-game]',root).forEach(b=>b.onclick=()=>openBuilder(b.dataset.editGame));}
function downloadJSON(filename,data){const file=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const u=URL.createObjectURL(file);const a=document.createElement('a');a.href=u;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function openBuilder(gameId=null){const g=state.experiences.find(x=>x.id===gameId)||{id:'',title:'',description:'',type:'hotspots',symbol:'◇',theme:'linear-gradient(135deg,#513577,#15121d)',featured:true,published:false,sort_order:state.experiences.length+1,config:gameTemplate('hotspots')};pendingDesignerId=gameId;
const zone=$('#builderZone');zone.innerHTML=`<div class="mini-note">CONFIGURATION EDITOR · Each game config is JSON. The "Place hotspot" designer below makes positioning circles easy for Circle Paths.</div><form id="gameForm"><div class="form-grid"><div class="field"><label>Game title</label><input name="title" required maxlength="90" value="${escapeHTML(g.title)}"></div><div class="field"><label>Game mode</label><select name="type" id="gameMode">${['wheel','hotspots','cards','duel','prompts','doors','tiles','special'].map(t=>`<option value="${t}" ${g.type===t?'selected':''}>${labelOf(t)}</option>`).join('')}</select></div><div class="field span2"><label>Short description</label><input name="description" value="${escapeHTML(g.description||'')}"></div><div class="field"><label>Card symbol</label><input name="symbol" maxlength="4" value="${escapeHTML(g.symbol||'◇')}"></div><div class="field"><label>Sort order</label><input type="number" min="0" max="1000" name="sort_order" value="${Number(g.sort_order)||0}"></div><div class="field"><label><input type="checkbox" style="width:auto" name="featured" ${g.featured!==false?'checked':''}> Show on homepage</label></div><div class="field"><label><input type="checkbox" style="width:auto" name="published" ${g.published?'checked':''}> Publish experience</label></div><div class="field span2"><label><input type="checkbox" style="width:auto" name="rotate_media" ${g.config?.rotateMedia?'checked':''}> Rotate approved media automatically (turn OFF for hand-positioned hotspots)</label></div><div class="field span2"><label>Game configuration JSON</label><textarea class="json-editor" spellcheck="false" name="config" id="gameJSON">${escapeHTML(JSON.stringify(g.config||gameTemplate(g.type),null,2))}</textarea><small>Media records are referenced by mediaId. Creator records are referenced by creatorId. Export configs as backups.</small></div></div><div class="studio-actions"><button class="button primary" type="submit">${gameId?'Save changes':'Create game'} ↗</button><button class="button secondary" id="previewGame" type="button">Preview unsaved config ↗</button><button class="button subtle" id="cancelBuilder" type="button">Close editor</button></div></form><div id="hotspotDesigner"></div>`;
$('#cancelBuilder').onclick=()=>zone.innerHTML='';$('#gameMode').onchange=()=>{$('#gameJSON').value=JSON.stringify(gameTemplate($('#gameMode').value),null,2);renderDesigner()};$('#gameJSON').addEventListener('change',renderDesigner);$('#previewGame').onclick=()=>{try{const game={...g,id:'preview-'+Date.now(),title:$('#gameForm [name="title"]').value,description:$('#gameForm [name="description"]').value,type:$('#gameMode').value,config:JSON.parse($('#gameJSON').value),published:true};startGame(game);notify('Preview game is temporary; use Save to keep it.')}catch(err){notify('Invalid JSON: '+err.message)}};
$('#gameForm').onsubmit=async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);let data;try{data=JSON.parse(String(f.get('config')))}catch(err){notify('Invalid JSON: '+err.message);return}const type=f.get('type');data.rotateMedia=f.has('rotate_media');data.lockMediaAssignments=!data.rotateMedia;if(type==='hotspots'&&(!data.nodes||!data.startNode||!data.nodes[data.startNode]))return notify('Paths need nodes and a valid startNode.');if(type==='hotspots'&&Object.keys(data.nodes).length>31)return notify('Maximum 30 rounds and a final reveal.');if(type==='wheel'&&(!Array.isArray(data.slices)||!data.slices.length))return notify('Wheel needs at least one slice.');if(type==='special'&&(!Array.isArray(data.tagCards)||data.tagCards.length<4||data.tagCards.length>10))return notify('Special requires 4–10 theme cards.');if(['cards','duel','prompts','doors','tiles'].includes(type)&&!Array.isArray(data.choices))return notify('This mode needs a choices array.');
const item={title:String(f.get('title')).trim(),slug:String(f.get('title')).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''),description:String(f.get('description')||''),type,symbol:String(f.get('symbol')||'◇').slice(0,4),theme:g.theme||'linear-gradient(135deg,#513577,#15121d)',sort_order:Number(f.get('sort_order'))||0,featured:f.has('featured'),published:f.has('published'),review_status:f.has('published')?'approved':(g.review_status||'draft'),config:data};
if(remote){const hasUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(g.id||'');let response;if(gameId&&hasUuid)response=await supabase.from('experiences').update(item).eq('id',gameId);else response=await supabase.from('experiences').insert(item);if(response.error)return notify(response.error.message);await refreshRemote()}else{return notify('Live Supabase is required.')}
renderPublic();renderStudio();notify('Game configuration saved.');};renderDesigner();}
function renderChoiceDesigner(place){
 const type=$('#gameMode').value;
 let cfg;try{cfg=JSON.parse($('#gameJSON').value)}catch{place.innerHTML='<p>Fix the JSON first.</p>';return}
 const key=type==='wheel'?'slices':'choices';
 if(!Array.isArray(cfg[key]))cfg[key]=[];
 const entries=cfg[key];
 const mediaOptions=item=>['<option value="">Choose media</option>',...state.media.map(m=>`<option value="${escapeHTML(m.id)}" ${m.id===item.mediaId?'selected':''}>${escapeHTML(m.name)} · ${escapeHTML(m.id)}</option>`)].join('');
 const creatorOptions=item=>['<option value="">Auto from media</option>',...state.creators.map(c=>`<option value="${escapeHTML(c.id)}" ${c.id===item.creatorId?'selected':''}>${escapeHTML(c.name)}</option>`)].join('');
 place.innerHTML=`<div class="designer-section"><div class="overline">QUICK GAME BUILDER</div><h3>${type==='wheel'?'Wheel segments':type==='cards'?'Shuffle card pool':type==='prompts'?'Timed challenge cards':'Versus choices'}</h3><p>Assign an approved media item to each result. Use the buttons to add and delete choices without editing JSON.${type==='cards'?' Three choices will be shuffled into each hand.':''}</p>
 ${['duel','prompts'].includes(type)?`<div class="field" style="max-width:220px"><label>Rounds per match</label><input type="number" id="duelRounds" value="${clamp(cfg.rounds||5,1,type==='prompts'?30:12)}" min="1" max="${type==='prompts'?30:12}"></div>`:''}
 <div class="choice-editor-grid">${entries.map((item,i)=>`<div class="choice-editor-row"><div class="overline">#${i+1}</div><label>Label<input data-choice-field="label" data-entry="${i}" value="${escapeHTML(item.label||'')}" placeholder="Result name"></label><label>Media<select data-choice-field="mediaId" data-entry="${i}">${mediaOptions(item)}</select></label><label>Creator<select data-choice-field="creatorId" data-entry="${i}">${creatorOptions(item)}</select></label>${type==='prompts'?`<label>Instruction<input data-choice-field="prompt" data-entry="${i}" value="${escapeHTML(item.prompt||'')}" placeholder="Short prompt"></label>`:''}<label>Time s<input type="number" min="0" max="1800" data-choice-field="seconds" data-entry="${i}" value="${Number(item.seconds)||0}"></label><button type="button" data-remove-choice="${i}" class="table-action danger">Remove</button></div>`).join('')}</div><div class="studio-actions"><button type="button" id="addChoice" class="button secondary">+ Add result</button><button type="button" id="fillChoices" class="button subtle">Auto-fill from local media</button></div><p class="muted small">This designer writes the JSON above automatically. Save when finished.</p></div>`;
 const write=()=>{$('#gameJSON').value=JSON.stringify(cfg,null,2)};
 if($('#duelRounds'))$('#duelRounds').onchange=e=>{cfg.rounds=clamp(e.target.value,1,type==='prompts'?30:12);write()};
 $$('[data-choice-field]',place).forEach(el=>el.onchange=e=>{const row=entries[Number(e.target.dataset.entry)],key=e.target.dataset.choiceField;row[key]=key==='seconds'?clamp(e.target.value,0,1800):e.target.value;if(key==='mediaId'&&!row.creatorId)row.creatorId=media(row.mediaId)?.creator_id||'';write();setTimeout(renderDesigner,0)});
 $$('[data-remove-choice]',place).forEach(b=>b.onclick=()=>{entries.splice(Number(b.dataset.removeChoice),1);write();renderDesigner()});
 $('#addChoice').onclick=()=>{if(entries.length>=60)return notify('Limit: 60 results in the editor');const m=state.media[entries.length%Math.max(state.media.length,1)];entries.push({label:'New result '+(entries.length+1),symbol:'♥',mediaId:m?.id||'',creatorId:m?.creator_id||'',seconds:15});write();renderDesigner()};
 $('#fillChoices').onclick=()=>{if(!state.media.length)return notify('Add media to the vault first.');const howMany=Math.min(type==='wheel'?24:type==='cards'?48:48,state.media.length);const chosen=drawMedia(howMany);entries.length=0;for(let i=0;i<howMany;i++){const m=media(chosen[i]);entries.push({label:`Feature ${i+1}`,symbol:'♥',mediaId:m.id,creatorId:m.creator_id,seconds:15})}write();renderDesigner();notify('Result pool populated — review before publishing.')};
}
let activeDesignerNode='';let activeDesignerSpot=0;
function renderDesigner(){
 const place=$('#hotspotDesigner');if(!place)return;
 if($('#gameMode').value==='special'){renderSpecialDesigner(place);return}if($('#gameMode').value!=='hotspots'){renderChoiceDesigner(place);return}
 let cfg;try{cfg=JSON.parse($('#gameJSON').value)}catch{place.innerHTML='<p>Fix the JSON to use the visual designer.</p>';return}
 if(!cfg.nodes||!cfg.startNode||!cfg.nodes[cfg.startNode]){place.innerHTML='<p>Add a valid start node first.</p>';return}
 if(!cfg.nodes[activeDesignerNode])activeDesignerNode=cfg.startNode;
 const node=cfg.nodes[activeDesignerNode],keys=Object.keys(cfg.nodes),img=media(node.mediaId),u=safeURL(img?.url);
 const mediaOptions=['<option value="">Choose media...</option>',...state.media.map(m=>`<option value="${escapeHTML(m.id)}" ${m.id===node.mediaId?'selected':''}>${escapeHTML(m.name)} (${escapeHTML(m.id)})</option>`)].join('');
 const creatorOptions=['<option value="">No creator</option>',...state.creators.map(c=>`<option value="${escapeHTML(c.id)}" ${c.id===node.creatorId?'selected':''}>${escapeHTML(c.name)}</option>`)].join('');
 place.innerHTML=`<div class="designer-section"><div class="overline">VISUAL PATH DESIGNER</div><h3>Make a 10–30 round journey.</h3><p>Choose any round, assign its image and draw one or more circles or ovals over it. Each hotspot links to another round; branching is up to you.</p>
 <div class="designer-toolbar"><label>Current round<select id="designerNode">${keys.map(k=>`<option value="${escapeHTML(k)}" ${k===activeDesignerNode?'selected':''}>${escapeHTML(k)} · ${escapeHTML(cfg.nodes[k].title||'Untitled')}</option>`).join('')}</select></label><label>Generate rounds<select id="chainSize"><option value="10">10 rounds</option><option value="20">20 rounds</option><option value="30">30 rounds</option></select></label><button class="button secondary" type="button" id="generateChain">Generate a journey</button><button class="button subtle" type="button" id="appendNode">+ Add node</button></div>
 <div class="form-grid"><div class="field"><label>Round title</label><input id="nodeTitle" value="${escapeHTML(node.title||'')}"></div><div class="field"><label>Round media</label><select id="nodeMedia">${mediaOptions}</select></div><div class="field span2"><label>Prompt / subtitle</label><input id="nodeSubtitle" value="${escapeHTML(node.subtitle||'')}"></div><div class="field"><label>Creator / destination</label><select id="nodeCreator">${creatorOptions}</select></div><div class="field"><label>Final reveal duration (seconds)</label><input id="nodeSeconds" type="number" min="0" max="1800" value="${Number(node.seconds)||0}"></div><div class="field"><label>Region preview seconds (automatic)</label><input id="nodePreviewSeconds" type="number" min="2" max="45" value="${Number(node.preview_seconds)||5}"></div></div>
 <div class="builder-preview" id="builderPreview">${u&&img?.type==='image'?`<img src="${escapeHTML(u)}" alt="${escapeHTML(img.alt_text||'Round media')}">`:'<span style="font-size:65px;opacity:.5">♥</span>'}${(node.spots||[]).map((s,i)=>`<button type="button" class="builder-dot ${activeDesignerSpot===i?'selected':''}" data-spot="${i}" style="${spotStyle(s)}" aria-label="Move hotspot ${i+1}"><span>${escapeHTML(s.label||i+1)}</span></button>`).join('')}<span class="helper">CLICK EMPTY SPACE TO ADD A HOTSPOT · DRAG TO POSITION</span></div>
 <div class="studio-actions"><button class="button subtle" type="button" id="resetSpots">Clear hotspots for this round</button><button class="button secondary" type="button" id="addSpot">+ Add a hotspot</button></div>
 <h4>Hotspot properties</h4><div id="spotEditor">${(node.spots||[]).map((s,i)=>`<div class="spot-row ${activeDesignerSpot===i?'active':''}" data-spot-row="${i}"><button type="button" class="table-action" data-select-spot="${i}">#${i+1}</button><label>Label<input data-spot-field="label" data-index="${i}" value="${escapeHTML(s.label||i+1)}"></label><label>Shape<select data-spot-field="shape" data-index="${i}">${['circle','oval','pill','rectangle'].map(v=>`<option value="${v}" ${s.shape===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Width %<input type="number" min="5" max="85" data-spot-field="w" data-index="${i}" value="${Number(s.w)||13}"></label><label>Height %<input type="number" min="5" max="70" data-spot-field="h" data-index="${i}" value="${Number(s.h)||13}"></label><label>Rotate °<input type="number" min="-180" max="180" data-spot-field="rotate" data-index="${i}" value="${Number(s.rotate)||0}"></label><label>Go to node<select data-spot-field="next" data-index="${i}">${keys.map(k=>`<option value="${escapeHTML(k)}" ${s.next===k?'selected':''}>${escapeHTML(k)}</option>`).join('')}</select></label><button class="table-action danger" type="button" data-del-spot="${i}">✕</button></div>`).join('')||'<p class="muted">No hotspots on this node. Tap the image to add one.</p>'}</div></div>`;
 const write=()=>{$('#gameJSON').value=JSON.stringify(cfg,null,2)};
 $('#designerNode').onchange=e=>{activeDesignerNode=e.target.value;activeDesignerSpot=0;renderDesigner()};
 for(const [field,attr] of [['nodeTitle','title'],['nodeSubtitle','subtitle'],['nodeMedia','mediaId'],['nodeCreator','creatorId'],['nodeSeconds','seconds'],['nodePreviewSeconds','preview_seconds']])$('#'+field).onchange=e=>{node[attr]=field==='nodeSeconds'?clamp(e.target.value,0,1800):field==='nodePreviewSeconds'?clamp(e.target.value,2,45):e.target.value;write();setTimeout(renderDesigner,0)};
 const newSpot=(x=50,y=50)=>{if((node.spots||[]).length>=12){notify('Limit: 12 hotspots per round');return}const next=keys[keys.indexOf(activeDesignerNode)+1]||activeDesignerNode;node.spots=node.spots||[];node.spots.push({label:String(node.spots.length+1),x,y,w:18,h:13,rotate:0,shape:'oval',next});activeDesignerSpot=node.spots.length-1;write();renderDesigner()};
 $('#builderPreview').onclick=e=>{if(e.target.closest('[data-spot]')||e.target.closest('.helper'))return;const r=e.currentTarget.getBoundingClientRect();newSpot(Math.round((e.clientX-r.left)/r.width*100),Math.round((e.clientY-r.top)/r.height*100))};
 $('#addSpot').onclick=()=>newSpot();$('#resetSpots').onclick=()=>{node.spots=[];activeDesignerSpot=0;write();renderDesigner()};
 $('#appendNode').onclick=()=>{if(keys.length>=31)return notify('Maximum 30 playable rounds + final reveal');const key='round_'+String(keys.length+1).padStart(2,'0');cfg.nodes[key]={round:keys.length+1,title:`Round ${keys.length+1}`,subtitle:'Choose a highlighted region.',mediaId:state.media[keys.length%Math.max(1,state.media.length)]?.id||'',seconds:15,spots:[]};activeDesignerNode=key;write();renderDesigner()};
 $('#generateChain').onclick=()=>{if(!confirm('Replace the current path configuration with a new journey?'))return;const n=Number($('#chainSize').value),chainImages=drawMedia(n+1);cfg.lockMediaAssignments=true;cfg.rotateMedia=false;if($('#gameForm [name=rotate_media]'))$('#gameForm [name=rotate_media]').checked=false;cfg.startNode='round_01';cfg.totalRounds=n;cfg.nodes={};for(let i=1;i<=n+1;i++){const key='round_'+String(i).padStart(2,'0'),next='round_'+String(i+1).padStart(2,'0');cfg.nodes[key]={round:Math.min(i,n),title:i<=n?`Round ${i}`:'Final reveal',subtitle:i<=n?'Choose a highlighted region to continue.':'You reached the end.',mediaId:chainImages[i-1]||'',preview_seconds:5,seconds:i===n+1?20:0,spots:i<=n?[{label:'A',x:32,y:45,w:20,h:15,shape:'oval',rotate:-10,next},{label:'B',x:71,y:60,w:14,h:20,shape:'oval',rotate:15,next}]:[]}}activeDesignerNode=cfg.startNode;activeDesignerSpot=0;write();renderDesigner();notify(`${n}-round journey created. Assign media and customize each node.`)};
 $$('[data-select-spot]',place).forEach(b=>b.onclick=()=>{activeDesignerSpot=Number(b.dataset.selectSpot);renderDesigner()});
 $$('[data-spot-field]',place).forEach(input=>input.onchange=e=>{const spot=node.spots[Number(e.target.dataset.index)];const key=e.target.dataset.spotField;spot[key]=['w','h','rotate'].includes(key)?Number(e.target.value):e.target.value;activeDesignerSpot=Number(e.target.dataset.index);write();setTimeout(renderDesigner,0)});
 $$('[data-del-spot]',place).forEach(b=>b.onclick=()=>{node.spots.splice(Number(b.dataset.delSpot),1);activeDesignerSpot=0;write();renderDesigner()});
 $$('[data-spot]',place).forEach(b=>{let moving=false;b.onpointerdown=e=>{e.preventDefault();moving=true;activeDesignerSpot=Number(b.dataset.spot);b.setPointerCapture(e.pointerId)};b.onpointermove=e=>{if(!moving)return;const r=$('#builderPreview').getBoundingClientRect(),spot=node.spots[activeDesignerSpot];spot.x=Math.round(clamp((e.clientX-r.left)/r.width*100,0,100));spot.y=Math.round(clamp((e.clientY-r.top)/r.height*100,0,100));b.style.left=spot.x+'%';b.style.top=spot.y+'%'};b.onpointerup=()=>{if(!moving)return;moving=false;write();renderDesigner()}});
}
function renderStudioSettings(root){root.innerHTML=`${studioIntro('Supabase integration','Live project configured. Content editing requires a valid Master session and connection.')}
<div class="mini-note">Mode: <strong>${remote?'Live Supabase connected':'Disconnected — editing disabled'}</strong><br>Upload storage: <strong>${config.uploadsEnabled?'Enabled':'Disabled'}</strong><br>Viewer accounts: <strong>Not required</strong><br>Studio login: <strong>Supabase Auth + Master allowlist required</strong></div>
<div class="studio-actions"><button class="button secondary" id="refreshData">↻ Refresh public content</button><button class="button secondary" id="backupData">↓ Export server data snapshot</button></div><p style="margin-top:20px">Read <code>README_V7.md</code> for production deployment. Database migrations are already installed. Only a public publishable key belongs in <code>config.js</code>.</p>`;$('#refreshData').onclick=async()=>{if(remote)await refreshRemote();renderStudio();notify(remote?'Data refreshed':'Unable to connect to Supabase.');};$('#backupData').onclick=()=>downloadJSON('vyra-backup.json',{creators:state.creators,media:state.media,experiences:state.experiences});}
async function removeRecord(table,identifier){if(!remote||!isAdmin)return notify('Master sign-in and live Supabase are required.');if(!confirm('Permanently remove this record?'))return;if(remote){const {error}=await supabase.from(table).delete().eq('id',identifier);if(error)return notify(error.message);await refreshRemote()}renderPublic();renderStudio();notify('Record deleted.');}
async function initializeSupabase(){
 if(!config.supabaseUrl||!config.supabaseAnonKey){window.lustsinoConnectionError='Missing public Supabase configuration';notify(window.lustsinoConnectionError);return;}
 try{
  if(!window.supabase?.createClient){
   const sources=['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js','https://unpkg.com/@supabase/supabase-js@2.119.0/dist/umd/supabase.js'];
   let loaded=false;
   for(const url of sources){try{await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('SDK host unavailable'));document.head.appendChild(s)});if(window.supabase?.createClient){loaded=true;break;}}catch(err){console.warn('Supabase SDK host unavailable:',url)}}
   if(!loaded)throw Error('Supabase JavaScript SDK could not load. Check browser network access to jsDelivr or unpkg.');
  }
  supabase=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  remote=true;window.lustsinoConnectionError='';
  supabase.auth.onAuthStateChange(()=>setTimeout(async()=>{await checkAdmin();try{await refreshRemote()}catch(e){notify('Content read: '+e.message)}if(state.route==='studio')renderStudio()},20));
  await checkAdmin();
  try{await refreshRemote();console.info('Content service ready.');}catch(err){window.lustsinoConnectionError='Content catalogue: '+err.message;notify(window.lustsinoConnectionError);console.error(err)}
  window.dispatchEvent(new Event('lustsino:backend-ready'));
 }catch(err){remote=false;window.lustsinoConnectionError=err.message;console.error('Supabase initialization:',err);notify('Sign-in unavailable: '+err.message);renderStudio()}
}
async function refreshRemote(){if(!supabase)return;
 const [cr,me,ex,demos]=await Promise.all([
  supabase.from('creators').select(isAdmin?'*':'id,name,handle,bio,url,initials,published,created_at').order('created_at',{ascending:false}),
  supabase.from('media_assets').select(isAdmin?'*':'id,creator_id,name,type,url,width,height,alt_text,published,created_at').order('created_at',{ascending:false}),
  supabase.from('experiences').select('*').order('sort_order',{ascending:true}),
  supabase.from('community_posts').select('creator_credit,title,description,media_url,source_url,tags').eq('published',true).eq('review_status','approved').contains('tags',['demo']).limit(5)
 ]);
 if(cr.error||me.error||ex.error)throw cr.error||me.error||ex.error;
 state.creators=(cr.data||[]);state.media=(me.data||[]);
 state.demoCreators=(demos?.error?[]:(demos?.data||[]));
 state.experiences=(ex.data||[]).filter(x=>x.published||isAdmin);
 renderPublic();if(state.route==='studio')renderStudio();
}
async function checkAdmin(){if(!supabase)return;try{const {data:{user}}=await supabase.auth.getUser();adminUser=user;if(!user){isAdmin=false;document.querySelectorAll('.master-only').forEach(e=>e.hidden=true);return}const {data,error}=await supabase.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();isAdmin=!error&&!!data;}catch{isAdmin=false}finally{document.querySelectorAll('.master-only').forEach(e=>{e.hidden=!isAdmin});if(state.route==='studio'&&!isAdmin)route('account')}}
function authModal(){$('#modalBody').innerHTML=`<div class="overline">PRIVATE OWNER ACCESS</div><h2>Sign in to LUSTSINO Studio</h2><p>The public site needs no account. Only the operator signs in to manage content.</p><form id="loginForm"><div class="field"><label>Email</label><input type="email" name="email" required autocomplete="username" placeholder="you@example.com"></div><div class="field" style="margin-top:12px"><label>Password</label><input type="password" name="password" required autocomplete="current-password"></div><button class="button primary wide" style="margin-top:20px" type="submit">Sign in securely</button></form>`;showModal();$('#loginForm').onsubmit=async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await supabase.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)return notify(error.message);await checkAdmin();if(!isAdmin)return notify('Signed in, but not on the admin allowlist.');closeModal();await refreshRemote();renderStudio();notify('Owner signed in.')}}
async function studioAuth(){if(!remote){notify('Live Supabase connection unavailable. Studio access is disabled.');return}if(isAdmin){await supabase.auth.signOut();isAdmin=false;adminUser=null;renderStudio();notify('Signed out.')}else authModal()}
function handleClicks(e){if(e.target.closest('#clearDemoContent')){
 if(!isAdmin||!supabase)return notify('Master login required.');
 if(!confirm('Remove exactly the five fictional test feed posts, their sample media records, and their draft creator profiles? Real user submissions will stay untouched.'))return;
 (async()=>{
  const profiles=['demo-ruby-v9','demo-velvet-v9','demo-noir-v9','demo-aura-v9','demo-sable-v9'];
  for(const [table,column,value] of [
   ['community_posts','rights_reference','LUSTSINO-DEMO-SITE-ART-2026'],
   ['media_assets','rights_ref','LUSTSINO-SITE-OWNED-ARTWORK-2026']
  ]){
   const {error}=await supabase.from(table).delete().eq(column,value);
   if(error)return notify('Cleanup failed in '+table+': '+error.message);
  }
  const {error}=await supabase.from('creators').delete().in('handle',profiles);
  if(error)return notify('Creator cleanup failed: '+error.message);
  await refreshRemote();renderStudio();notify('Five fictional test profiles and feed posts removed.');
 })().catch(err=>notify(err.message||'Cleanup failed.'));
 return;
}
const reportBtn=e.target.closest('[data-report]');if(reportBtn){openReport(reportBtn.dataset.mediaId||'',reportBtn.dataset.experienceId||state.current?.id||'');return}const routeBtn=e.target.closest('[data-route]');if(routeBtn){e.preventDefault();route(routeBtn.dataset.route);return}const start=e.target.closest('[data-start]');if(start){e.preventDefault();startGame(start.dataset.start);return}const creatorBtn=e.target.closest('[data-creator]');if(creatorBtn){openCreator(creatorBtn.dataset.creator);return}const filter=e.target.closest('[data-filter]');if(filter){state.filter=filter.dataset.filter;$$('[data-filter]').forEach(b=>b.classList.toggle('active',b===filter));renderPublic();return}const tab=e.target.closest('[data-studio-tab]');if(tab){state.studioTab=tab.dataset.studioTab;renderStudio();return}const cop=e.target.closest('[data-copy-id]');if(cop){navigator.clipboard?.writeText(cop.dataset.copyId).then(()=>notify('Media ID copied.')).catch(()=>notify(cop.dataset.copyId));return}const removeC=e.target.closest('[data-remove-creator]');if(removeC){removeRecord('creators',removeC.dataset.removeCreator);return}const removeM=e.target.closest('[data-remove-media]');if(removeM){removeRecord('media_assets',removeM.dataset.removeMedia);return}const removeG=e.target.closest('[data-remove-game]');if(removeG){removeRecord('experiences',removeG.dataset.removeGame);return}}
function init(){renderPublic();updateStats();document.addEventListener('click',handleClicks);$('#ageAccept').onclick=()=>{$('#ageGate').classList.add('hidden');setSession('lustsino_age_confirm','yes')};$('#ageDecline').onclick=()=>{document.body.innerHTML='<div style="display:grid;place-items:center;min-height:100vh;background:#0b0b12;color:#f5efff;font-family:system-ui;padding:30px;text-align:center"><h2>This experience is for adults of legal age only.</h2></div>'};if(getSession('lustsino_age_confirm')==='yes')$('#ageGate').classList.add('hidden');$('#modalClose').onclick=closeModal;$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});$('#restartGame').onclick=()=>{if(state.current)startGame(state.current)};$('#clearSession').onclick=()=>{if(!confirm('Reset this browser session stats?'))return;state.stats={rounds:0,discoveries:0,completed:0};store('lustsino_stats',state.stats);updateStats();notify('Session stats cleared.')};$('#studioAuthButton').onclick=studioAuth;$('#soundToggle').onclick=()=>{state.sound=!state.sound;$('#soundToggle').classList.toggle('muted-sound',!state.sound);notify(state.sound?'Optional sound enabled':'Sound muted')};$('#soundToggle').classList.add('muted-sound');const path=location.hash.slice(1);route(['home','games','creators','about','account','community','feed','studio'].includes(path)?path:'home');initializeSupabase()}
window.LUSTSINO_CORE={get client(){return supabase},get state(){return state},get admin(){return isAdmin},refreshRemote,renderPublic,startGame,notify,escapeHTML,safeURL};
document.addEventListener('DOMContentLoaded',init);
})();
