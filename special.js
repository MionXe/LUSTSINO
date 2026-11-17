/* LUSTSINO Special — one-hand memory / shuffle / stop-the-reel discovery.
   Uses only published feed items; no unrestricted media access or private keys. */
(()=>{'use strict';
 const cssEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const $=(selector,root=document)=>root.querySelector(selector);
 const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const live=()=>window.LUSTSINO_CORE;
 const cleanTag=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,35);
 const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}};
 const defaultCards=[
  {label:'Roulette',tag:'roulette'},{label:'Shuffle',tag:'shuffle'},
  {label:'Choices',tag:'choices'},{label:'Mystery',tag:'mystery'},
  {label:'Arcade',tag:'arcade'},{label:'Highlights',tag:'test'}
 ];
 let active=null;
 function cleanup(){
  if(!active)return;
  active.disposed=true;
  active.jobs.forEach(id=>clearTimeout(id));
  active.intervals.forEach(id=>clearInterval(id));
  if(active.audio){active.audio.pause();active.audio.src='';active.audio=null}
  window.removeEventListener('keydown',active.keyHandler);
  active=null;
 }
 function mount(root,game){
  cleanup();
  const config=game.config||{};
  const cards=(Array.isArray(config.tagCards)?config.tagCards:defaultCards)
   .filter(v=>v&&typeof v.label==='string'&&cleanTag(v.tag))
   .map((v,i)=>({id:i,label:v.label.slice(0,36),tag:cleanTag(v.tag)})).slice(0,10);
  if(cards.length<4){root.innerHTML='<div class="game-shell"><h2>Game needs at least four theme cards.</h2></div>';return}
  const state={
   root,game,config,cards,step:'entry',chosen:[],guesses:[],permutation:cards.map((_,i)=>i),
   preference:'Any',gallery:[],galleryIndex:0,media:[],reelIndex:0,rolls:0,resultTag:'',
   jobs:[],intervals:[],audio:null,muted:false,disposed:false,paused:false
  };
  active=state;
  const alive=()=>active===state&&!state.disposed&&live()?.state?.route==='play';
  const later=(fn,ms)=>{const t=setTimeout(()=>{state.jobs=state.jobs.filter(x=>x!==t);if(alive())fn()},ms);state.jobs.push(t);return t};
  const interval=(fn,ms)=>{const id=setInterval(()=>{if(alive())fn()},ms);state.intervals.push(id);return id};
  const stopJobs=()=>{
   state.jobs.forEach(clearTimeout);state.intervals.forEach(clearInterval);state.jobs=[];state.intervals=[];
  };
  const title=(phase,heading,subtitle='')=>'<div class="special-eyebrow">✦ LUSTSINO SPECIAL · '+cssEscape(phase)+'</div><h2>'+cssEscape(heading)+'</h2>'+(subtitle?'<p class="special-subtitle">'+cssEscape(subtitle)+'</p>':'');
  const controls=(body,footer='')=>'<div class="game-shell special-shell">'+body+footer+'</div>';
  const voice=kind=>{
   if(state.audio){state.audio.pause();state.audio=null}
   const url=safeURL(config.voice?.[kind]);
   if(!url||state.muted)return;
   const audio=new Audio(url);audio.volume=.55;state.audio=audio;
   audio.play().catch(()=>{ /* Browser may block autoplay; manual controls remain available. */});
  };
  function renderEntry(){
   stopJobs();state.step='entry';
   state.root.innerHTML=controls('<div class="special-hero-mark">✦ ♠ ✦</div>'+title('WELCOME','Two cards. One twist.','Remember your choices, find them after the shuffle, and stop the reveal reel whenever you like.')+
    '<div class="special-summary">6 theme cards <span>·</span> 2 picks <span>·</span> One mystery reel</div>',
    '<div class="special-actions"><button class="button primary special-big" id="specialEnter">Enter the Special →</button></div>');
   $('#specialEnter',root).onclick=()=>{voice('welcome');renderPreference()};
  }
  function renderPreference(){
   stopJobs();state.step='preference';
   state.root.innerHTML=controls(title('01 · PREFERENCE','Pick your view','This preference is optional and does not change your account settings.')+
    '<div class="special-three">'+['Men','Women','Any'].map(x=>'<button type="button" class="special-choice" data-preference="'+x+'"><b>'+x+'</b><small>Continue →</small></button>').join('')+'</div>');
   $$('[data-preference]',root).forEach(button=>button.onclick=()=>{state.preference=button.dataset.preference;renderPick()});
  }
  function renderPick(){
   stopJobs();state.step='pick';state.chosen=[];state.guesses=[];state.permutation=cards.map((_,i)=>i);
   state.root.innerHTML=controls(title('02 · REMEMBER','Choose two theme cards','Watch where they begin. The deck will move and hide their identities.')+
    '<p id="specialSelected" class="special-selection">0 of 2 selected</p>'+
    '<div class="special-tag-grid">'+cards.map(c=>'<button class="special-theme" type="button" data-card-id="'+c.id+'"><span>✦</span><strong>'+cssEscape(c.label)+'</strong><small>#'+cssEscape(c.tag)+'</small></button>').join('')+'</div>'+
    '<div class="special-actions"><button type="button" class="button secondary" id="specialReset">Reset choices</button></div>');
   $$('[data-card-id]',root).forEach(b=>b.onclick=()=>{
    const id=Number(b.dataset.cardId);
    if(state.chosen.includes(id))state.chosen=state.chosen.filter(x=>x!==id);
    else if(state.chosen.length<2)state.chosen.push(id);
    $$('[data-card-id]',root).forEach(el=>el.classList.toggle('selected',state.chosen.includes(Number(el.dataset.cardId))));
    $('#specialSelected',root).textContent=state.chosen.length+' of 2 selected';
    if(state.chosen.length===2)later(renderShuffle,550);
   });
   $('#specialReset',root).onclick=renderPick;
  }
  function renderShuffle(){
   stopJobs();state.step='shuffle';
   state.root.innerHTML=controls(title('03 · SHUFFLE','Track those cards','Keep your eyes on your two cards as the deck rearranges.')+
    '<div class="special-shuffle-board" id="specialShuffleBoard">'+cards.map((c,i)=>
    '<div class="special-moving-card is-open '+(state.chosen.includes(i)?'special-original-pick':'')+'" data-move-id="'+i+'" style="left:'+(((i+.5)/cards.length)*100)+'%"><span class="special-card-back">✦</span><span class="special-card-face">'+cssEscape(c.label)+'</span></div>').join('')+'</div>'+
    '<p class="special-selection" id="specialShuffleStatus">Mixing the deck…</p>');
   voice('shuffle');
   let rounds=0;
   const moving=$('[data-move-id]',root);
   const perform=()=>{
    if(!alive())return;
    const next=state.permutation.slice();
    for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]]}
    state.permutation=next;
    moving.forEach((el,i)=>el.style.left=(((next.indexOf(i)+.5)/cards.length)*100)+'%');
    if(++rounds<6)later(perform,520);
    else later(renderRecall,650);
   };
   later(()=>{moving.forEach(el=>el.classList.remove('is-open','special-original-pick'));$('#specialShuffleStatus',root).textContent='Follow the cards…';perform()},1100);
  }
  function renderRecall(){
   stopJobs();state.step='recall';state.guesses=[];
   state.root.innerHTML=controls(title('04 · MEMORY','Find your two cards','Choose two positions. Your choices are revealed after the second pick.')+
    '<p id="specialMemoryStatus" class="special-selection">0 of 2 chosen</p>'+
    '<div class="special-recall-grid">'+state.permutation.map((id,i)=>'<button class="special-face-down" data-recall="'+id+'" type="button"><span>✦</span><small>Card '+(i+1)+'</small></button>').join('')+'</div>');
   $$('[data-recall]',root).forEach(button=>button.onclick=()=>{
    const id=Number(button.dataset.recall);
    if(state.guesses.includes(id))return;
    state.guesses.push(id);button.classList.add('selected');button.disabled=true;
    $('#specialMemoryStatus',root).textContent=state.guesses.length+' of 2 chosen';
    if(state.guesses.length===2)later(renderMemoryResult,520);
   });
  }
  function renderMemoryResult(){
   stopJobs();state.step='result';
   const hit=state.guesses.every(id=>state.chosen.includes(id));
   const pool=(hit?state.chosen:state.guesses).map(id=>cards[id]).filter(Boolean);
   const result=pool[Math.floor(Math.random()*pool.length)];
   state.resultTag=result?.tag||'test';
   const heading=hit?'Perfect recall!':'The deck made the choice.';
   state.root.innerHTML=controls(title('05 · REVEAL',heading,
    hit?'Both remembered cards were found.':'The cards you landed on determine your theme.')+
    '<div class="special-outcome"><small>YOUR THEME</small><h3>#'+cssEscape(state.resultTag)+'</h3><p>'+cssEscape(result?.label||'Highlights')+'</p></div>',
    '<div class="special-actions"><button class="button primary special-big" id="specialContinue">Open the reel →</button><button class="button subtle" id="specialAgain">Try the cards again</button></div>');
   $('#specialContinue',root).onclick=loadMedia;
   $('#specialAgain',root).onclick=renderPick;
  }
  function mediaCard(item){
   const url=safeURL(item?.media_url);
   if(!url)return '<div class="special-empty-media">No image available</div>';
   if(item.media_type==='video')return '<video muted playsinline controls preload="metadata" src="'+cssEscape(url)+'"></video>';
   return '<img src="'+cssEscape(url)+'" alt="'+cssEscape(item.title||'Creator media')+'" loading="eager">';
  }
  async function loadMedia(){
   stopJobs();state.step='loading';
   root.innerHTML=controls(title('06 · THE REEL','Preparing your gallery','Loading published media tagged #'+state.resultTag+'…'));
   const db=live()?.client;
   if(!db){showMissing('Live media is temporarily unavailable.');return}
   const {data,error}=await db.from('community_posts')
    .select('id,title,description,media_url,media_type,source_url,creator_credit,tags')
    .eq('published',true).eq('review_status','approved')
    .contains('tags',[state.resultTag]).order('created_at',{ascending:false}).limit(75);
   if(!alive())return;
   if(error){showMissing('Could not load this theme. Please try again.');return}
   const all=(data||[]).filter(p=>safeURL(p.media_url));
   const preferenceTag=state.preference==='Men'?'men':state.preference==='Women'?'women':null;
   const preferred=preferenceTag?all.filter(p=>(p.tags||[]).includes(preferenceTag)):[];
   state.media=preferred.length?preferred:all;
   if(!state.media.length){showMissing('No published media is available under #'+state.resultTag+' yet.');return}
   state.reelIndex=Math.floor(Math.random()*state.media.length);
   renderReel();
  }
  function showMissing(msg){
   state.root.innerHTML=controls(title('THE REEL','No items for this theme',msg),
    '<div class="special-actions"><button type="button" class="button primary" id="specialRetry">Choose again →</button></div>');
   $('#specialRetry',root).onclick=renderPick;
  }
  function renderReel(){
   stopJobs();state.step='reel';state.rolls=0;state.paused=false;
   const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
   const pace=reduced?1100:Math.max(180,Math.min(650,Number(config.reelSpeedMs)||210));
   state.root.innerHTML=controls(title('07 · FAST REEL','Watch, then hit Stop','Press the big button or the spacebar to capture your selection.')+
    '<div class="special-reel-window" id="specialReelWindow" aria-live="off"></div>'+
    '<p class="special-selection" id="specialReelCount">Reel running…</p>'+
    '<div class="special-actions"><button class="button primary special-big" id="specialStop">■ Stop the reel</button><button class="button secondary" id="specialPause">Ⅱ Pause</button></div>');
   const update=()=>{const area=$('#specialReelWindow',root);if(!area)return;area.innerHTML=mediaCard(state.media[state.reelIndex]);state.reelIndex=(state.reelIndex+1)%state.media.length;state.rolls++;};
   update();
   interval(()=>{if(!state.paused&&!document.hidden)update()},pace);
   later(()=>{if(state.step==='reel')stopReel()},15000);
   $('#specialStop',root).onclick=stopReel;
   $('#specialPause',root).onclick=()=>{state.paused=!state.paused;$('#specialPause',root).textContent=state.paused?'▶ Resume':'Ⅱ Pause'};
   voice('reel');
  }
  function stopReel(){
   stopJobs();state.step='gallery';state.paused=false;
   const stop=(state.reelIndex-1+state.media.length)%state.media.length;
   const ids=[stop,(stop+1)%state.media.length,(stop+2)%state.media.length];
   state.gallery=[...new Set(ids)].map(i=>state.media[i]);
   state.galleryIndex=0;renderGallery();
   voice('gallery');
  }
  function renderGallery(){
   stopJobs();state.step='gallery';
   const current=state.gallery[state.galleryIndex];
   if(!current){showMissing('No reveal is available.');return}
   state.root.innerHTML=controls(title('08 · THE GALLERY','Your '+state.gallery.length+' discoveries','Swipe or use the arrows. Continue whenever you wish.')+
    '<div class="special-gallery" id="specialGallery">'+mediaCard(current)+'</div>'+
    '<div class="special-gallery-meta"><span>'+(state.galleryIndex+1)+' / '+state.gallery.length+'</span><strong>'+cssEscape(current.title||'Selected media')+'</strong></div>'+
    '<p class="special-selection">'+cssEscape(current.creator_credit||'Creator credited')+'</p>'+
    '<div class="special-actions"><button type="button" class="button secondary special-swap" id="specialPrev" aria-label="Previous media">←</button><button type="button" class="button secondary special-swap" id="specialNext" aria-label="Next media">→</button><button type="button" class="button primary" id="specialFinish">Finish round ✦</button></div>');
   const change=d=>{state.galleryIndex=(state.galleryIndex+d+state.gallery.length)%state.gallery.length;renderGallery()};
   $('#specialPrev',root).onclick=()=>change(-1);
   $('#specialNext',root).onclick=()=>change(1);
   $('#specialFinish',root).onclick=renderEnd;
   const area=$('#specialGallery',root);let startX=null;
   area.addEventListener('touchstart',e=>{startX=e.touches?.[0]?.clientX??null},{passive:true});
   area.addEventListener('touchend',e=>{if(startX===null)return;const dx=(e.changedTouches?.[0]?.clientX??startX)-startX;startX=null;if(Math.abs(dx)>35)change(dx<0?1:-1)},{passive:true});
  }
  function renderEnd(){
   stopJobs();state.step='end';
   state.root.innerHTML=controls('<div class="special-hero-mark">✦</div>'+title('ROUND COMPLETE','Nice work.','Ready for another round, or explore something new?')+
    '<div class="special-outcome"><small>FINAL THEME</small><h3>#'+cssEscape(state.resultTag)+'</h3></div>',
    '<div class="special-actions"><button type="button" class="button primary special-big" id="specialReplay">Another round ↻</button><button type="button" class="button subtle" id="specialLeave">Back to games</button></div>');
   $('#specialReplay',root).onclick=renderPick;
   $('#specialLeave',root).onclick=()=>document.querySelector('[data-route="games"]')?.click();
   voice('finish');
  }
  state.keyHandler=e=>{
   if(!alive()||['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName))return;
   if(e.code==='Space'&&state.step==='reel'){e.preventDefault();stopReel()}
   if(e.key==='ArrowLeft'&&state.step==='gallery'){$('#specialPrev',root)?.click()}
   if(e.key==='ArrowRight'&&state.step==='gallery'){$('#specialNext',root)?.click()}
  };
  window.addEventListener('keydown',state.keyHandler);
  renderEntry();
 }
 window.LUSTSINO_SPECIAL={mount,cleanup};
})();