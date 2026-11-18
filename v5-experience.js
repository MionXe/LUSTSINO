/* LUSTSINO V9 — focused, visibly animated game showcase. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
const DURATION=4200;
let current=0,nextAt=Date.now()+DURATION,autoplay=!reduce.matches;
let touchStart=null,manualUntil=0,lastSignature='',firstNode=null;
const cards=()=>Array.from($('#featuredGames')?.querySelectorAll('.game-card')||[]);
const wrap=(n,total)=>((n%total)+total)%total;
function layout(n,resetClock=true){
 const slides=cards(),total=slides.length,stage=$('#featuredGames');
 if(!stage||!total)return;
 current=wrap(n,total);
 const width=slides[0].offsetWidth||220;
 const mobile=stage.clientWidth<580;
 const distances=mobile?[0,.78,1.38,1.8]:[0,.93,1.59,2.04];
 const scales=[1.09,.77,.58,.46];
 const opacity=[1,.72,.32,0];
 slides.forEach((slide,i)=>{
  let signed=wrap(i-current,total);if(signed>Math.floor(total/2))signed-=total;
  const depth=Math.min(Math.abs(signed),3),side=Math.sign(signed);
  const offset=Math.round(distances[depth]*width*side);
  slide.style.transform='translate3d(calc(-50% + '+offset+'px),'+(depth*15)+'px,0) rotateY('+(-side*Math.min(depth,2)*18)+'deg) scale('+scales[depth]+')';
  slide.style.opacity=String(opacity[depth]);slide.style.zIndex=String(50-depth);
  slide.style.pointerEvents=depth>2?'none':'auto';
  slide.classList.toggle('feature-active',signed===0);
  slide.setAttribute('aria-current',String(signed===0));
  slide.setAttribute('aria-hidden',String(depth>2));
 });
 stage.classList.add('lobby-initialized');
 const active=slides[current];
 const title=active.querySelector('h3')?.textContent||'';
 const description=active.querySelector('p')?.textContent||'';
 const photo=active.querySelector('.game-cover-image')?.getAttribute('src')||'';
 const cover=$('#spotlightCover');
 if(cover){
  cover.style.backgroundImage='linear-gradient(95deg,#190915a3,#19091536),url("'+photo.replace(/["\\]/g,'')+'")';
  cover.classList.remove('spotlight-flash');void cover.offsetWidth;cover.classList.add('spotlight-flash');
 }
 if($('#spotlightTitle'))$('#spotlightTitle').textContent=title;
 if($('#spotlightDescription'))$('#spotlightDescription').textContent=description;
 if($('#spotlightPosition'))$('#spotlightPosition').textContent=String(current+1).padStart(2,'0')+' / '+String(total).padStart(2,'0');
 const button=$('#spotlightPlay');
 if(button){
  delete button.dataset.start;delete button.dataset.route;
  if(active.dataset.start){button.dataset.start=active.dataset.start;button.textContent='Play game ↗'}
  else{button.dataset.route='games';button.textContent='Explore this game ↗'}
 }
 const dots=$('#featureDots');
 if(dots)dots.innerHTML=slides.map((_,i)=>'<button class="feature-dot '+(i===current?'on':'')+'" aria-label="Show game '+(i+1)+'" data-index="'+i+'" aria-current="'+(i===current)+'"></button>').join('');
 if(resetClock){nextAt=Date.now()+DURATION;restartProgress()}
}
function restartProgress(){
 const bar=$('#lobbyProgressBar'),toggle=$('#lobbyAuto');
 if(toggle){toggle.textContent=autoplay?'Ⅱ Pause slides':'▶ Play slides';toggle.setAttribute('aria-pressed',String(autoplay))}
 if(bar){
  bar.style.animation='none';void bar.offsetWidth;
  bar.style.animation=autoplay?'lobbyCountdown '+DURATION+'ms linear forwards':'none';
  bar.style.transform=autoplay?'':'scaleX(0)';
 }
}
function navigate(n){
 manualUntil=Date.now()+1700;
 layout(n,true);
}
function sync(){
 const list=cards();
 const sig=list.map(el=>el.getAttribute('data-start')||el.textContent.slice(0,30)).join('|');
 if(sig!==lastSignature||firstNode!==list[0]){lastSignature=sig;firstNode=list[0]||null;current=Math.min(current,Math.max(0,list.length-1));layout(current,true)}
}
function start(){
 const stage=$('#featuredGames');
 if(!stage)return;
 const observer=new MutationObserver(sync);
 observer.observe(stage,{childList:true});
 $('#gamesBack')?.addEventListener('click',()=>navigate(current-1));
 $('#gamesForward')?.addEventListener('click',()=>navigate(current+1));
 $('#featureDots')?.addEventListener('click',e=>{const t=e.target.closest('[data-index]');if(t)navigate(Number(t.dataset.index))});
 $('#lobbyAuto')?.addEventListener('click',()=>{autoplay=!autoplay;nextAt=Date.now()+DURATION;restartProgress()});
 stage.addEventListener('pointerdown',e=>{touchStart=e.clientX},{passive:true});
 stage.addEventListener('pointerup',e=>{
  if(touchStart===null)return;const dx=e.clientX-touchStart;touchStart=null;
  if(Math.abs(dx)>38){e.preventDefault();navigate(current+(dx<0?1:-1))}
 });
 stage.addEventListener('click',e=>{
  const slide=e.target.closest('.game-card');if(!slide)return;
  const i=cards().indexOf(slide);
  if(i>=0&&i!==current){e.preventDefault();e.stopImmediatePropagation();navigate(i)}
 },true);
 stage.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'){e.preventDefault();navigate(current-1)}
  if(e.key==='ArrowRight'){e.preventDefault();navigate(current+1)}
 });
 window.addEventListener('resize',()=>layout(current,false));
 document.addEventListener('visibilitychange',()=>{nextAt=Date.now()+DURATION;restartProgress()});
 reduce.addEventListener?.('change',e=>{if(e.matches)autoplay=false;restartProgress()});
 sync();
 setInterval(()=>{
  if(!autoplay||document.hidden||!$('#view-home')?.classList.contains('show'))return;
  if(Date.now()<manualUntil)return;
  if(Date.now()>=nextAt&&cards().length>1){layout(current+1,true)}
 },200);
}
function music(){const el=$('#ambientMusic'),button=$('#musicToggle');if(!el||!button)return;const key='lustsino_volume_v7',mute='lustsino_music_muted_v7',volume=Number(localStorage.getItem(key));el.volume=Number.isFinite(volume)&&volume>0&&volume<=1?volume:.34;
 let muted=localStorage.getItem(mute)==='yes';el.muted=muted;
 function update(){button.textContent=el.paused?'♪ Music off':el.muted?'♫ Unmute music':'♫ Music on';button.setAttribute('aria-pressed',String(!el.paused&&!el.muted))}
 async function play(){try{await el.play()}catch(e){button.title='Tap to enable music: '+String(e.message||'blocked')}update()}
 $('#ageAccept')?.addEventListener('click',()=>{if($('#ageTermsCheck')?.checked)void play()});
 button.addEventListener('click',()=>{if(el.paused){muted=false;el.muted=false;localStorage.setItem(mute,'no');void play()}else{el.muted=!el.muted;localStorage.setItem(mute,el.muted?'yes':'no');update()}});
 const wrapper=document.createElement('div');wrapper.className='music-credit';wrapper.innerHTML='<span>SOUNDTRACK</span> <span id="defaultMusicAttribution">Music by <a href="https://pixabay.com/users/saavane-32312792/" target="_blank" rel="noopener">saavane</a> · Pixabay</span> <label>Volume <input id="ambientVolume" type="range" min="0" max="100" value="'+Math.round(el.volume*100)+'" aria-label="Soundtrack volume"></label>';
 $('#view-home .page-wrap')?.appendChild(wrapper);
 $('#ambientVolume')?.addEventListener('input',e=>{el.volume=Number(e.target.value)/100;localStorage.setItem(key,el.volume)});
 update();
}
document.addEventListener('DOMContentLoaded',()=>{start();music()});
})();