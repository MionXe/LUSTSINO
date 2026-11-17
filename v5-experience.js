/* LUSTSINO V7 live feature carousel — animated center stage, no false game data. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
let index=0,hold=0,carousel=null,lastCount=0;
const cards=()=>Array.from($('#featuredGames')?.querySelectorAll('.game-card')||[]);
const wrap=(n,max)=>((n%max)+max)%max;
function show(n){const els=cards(),N=els.length;if(!N)return;index=wrap(n,N);
 const stage=$('#featuredGames'),tileW=Math.min(290,Math.max(205,(stage?.clientWidth||900)*.43));
 for(let i=0;i<N;i++){const e=els[i];let delta=i-index;if(delta>N/2)delta-=N;if(delta<-N/2)delta+=N;const depth=Math.abs(delta);const scale=depth===0?1:depth===1?.84:.62;
  e.style.transform=`translateX(calc(-50% + ${Math.round(delta*tileW*.86)}px)) translateY(${depth*16}px) rotateY(${delta*-16}deg) scale(${scale})`;
  e.style.opacity=depth>2?'0':depth===2?'.31':depth===1?'.72':'1';e.style.zIndex=String(20-depth);e.style.pointerEvents=depth>2?'none':'auto';
  e.classList.toggle('feature-active',i===index);e.setAttribute('aria-current',i===index?'true':'false');
 }
 const active=els[index],h=active.querySelector('h3')?.textContent||'',p=active.querySelector('p')?.textContent||'',image=active.querySelector('.game-cover-image')?.getAttribute('src')||'';
 const cover=$('#spotlightCover');if(cover){cover.style.backgroundImage=`linear-gradient(90deg,#160a1699,#160a1655),url("${image}")`;cover.classList.remove('spotlight-flash');void cover.offsetWidth;cover.classList.add('spotlight-flash')}
 if($('#spotlightTitle'))$('#spotlightTitle').textContent=h;
 if($('#spotlightDescription'))$('#spotlightDescription').textContent=p;
 if($('#spotlightPosition'))$('#spotlightPosition').textContent=`${String(index+1).padStart(2,'0')} / ${String(N).padStart(2,'0')}`;
 const play=$('#spotlightPlay');if(play){delete play.dataset.start;delete play.dataset.route;if(active.dataset.start){play.dataset.start=active.dataset.start;play.textContent='Play published game ↗'}else{play.dataset.route='games';play.textContent='Browse this mode ↗'}}
 const dots=$('#featureDots');if(dots)dots.innerHTML=els.map((_,i)=>`<button class="feature-dot ${index===i?'on':''}" data-index="${i}" aria-label="View carousel card ${i+1}" aria-current="${i===index}"></button>`).join('');
}
function start(){const e=$('#featuredGames');if(!e)return;
 const obs=new MutationObserver(()=>{if(cards().length!==lastCount){lastCount=cards().length;index=0;}show(index)});obs.observe(e,{childList:true});
 $('#gamesBack')?.addEventListener('click',()=>{hold=Date.now()+10000;show(index-1)});
 $('#gamesForward')?.addEventListener('click',()=>{hold=Date.now()+10000;show(index+1)});
 $('#featureDots')?.addEventListener('click',event=>{const t=event.target.closest('[data-index]');if(!t)return;hold=Date.now()+10000;show(Number(t.dataset.index))});
 e.addEventListener('pointerdown',()=>hold=Date.now()+8000);e.addEventListener('pointerenter',()=>hold=Date.now()+6000);e.addEventListener('focusin',()=>hold=Date.now()+6000);
 $('#featureSpotlight')?.addEventListener('pointerenter',()=>hold=Date.now()+5000);
 window.addEventListener('resize',()=>show(index));show(0);
 carousel=setInterval(()=>{if(document.hidden||mq.matches||Date.now()<hold||!$('#view-home')?.classList.contains('show'))return;if(cards().length>1)show(index+1)},3600);
}
function music(){const el=$('#ambientMusic'),button=$('#musicToggle');if(!el||!button)return;const key='lustsino_volume_v7',mute='lustsino_music_muted_v7',volume=Number(localStorage.getItem(key));el.volume=Number.isFinite(volume)&&volume>0&&volume<=1?volume:.34;
 let muted=localStorage.getItem(mute)==='yes';el.muted=muted;
 function update(){button.textContent=el.paused?'♪ Music off':el.muted?'♫ Unmute music':'♫ Music on';button.setAttribute('aria-pressed',String(!el.paused&&!el.muted))}
 async function play(){try{await el.play()}catch(e){button.title='Tap to enable music: '+String(e.message||'blocked')}update()}
 $('#ageAccept')?.addEventListener('click',()=>{if($('#ageTermsCheck')?.checked)void play()});
 button.addEventListener('click',()=>{if(el.paused){muted=false;el.muted=false;localStorage.setItem(mute,'no');void play()}else{el.muted=!el.muted;localStorage.setItem(mute,el.muted?'yes':'no');update()}});
 const wrapper=document.createElement('div');wrapper.className='music-credit';wrapper.innerHTML='<span>SOUNDTRACK</span> Music by <a href="https://pixabay.com/users/saavane-32312792/" target="_blank" rel="noopener">saavane</a> · Pixabay <label>Volume <input id="ambientVolume" type="range" min="0" max="100" value="'+Math.round(el.volume*100)+'" aria-label="Soundtrack volume"></label>';
 $('#view-home .page-wrap')?.appendChild(wrapper);
 $('#ambientVolume')?.addEventListener('input',e=>{el.volume=Number(e.target.value)/100;localStorage.setItem(key,el.volume)});
 update();
}
document.addEventListener('DOMContentLoaded',()=>{start();music()});
})();