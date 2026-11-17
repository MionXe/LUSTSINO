/* LUSTSINO V8 animated center-card game lobby */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
let index=0,hold=0,lastCount=0;
const cards=()=>Array.from($('#featuredGames')?.querySelectorAll('.game-card')||[]);
const wrap=(n,max)=>((n%max)+max)%max;
function show(n){const els=cards(),N=els.length;if(!N)return;index=wrap(n,N);
 const w=els[0].offsetWidth||220,X=[0,.98,1.62,2.05],SC=[1.07,.8,.62,.5],OP=[1,.82,.4,0];
 els.forEach((el,i)=>{let d=wrap(i-index,N);if(d>Math.floor(N/2))d-=N;const depth=Math.min(Math.abs(d),3),side=Math.sign(d);
  el.style.transform='translateX(calc(-50% + '+Math.round(X[depth]*w*side)+'px)) scale('+SC[depth]+') rotateY('+(-side*Math.min(depth,2)*16)+'deg)';
  el.style.opacity=OP[depth];el.style.zIndex=String(20-depth);el.style.pointerEvents=depth>2?'none':'auto';
  el.classList.toggle('feature-active',d===0);el.setAttribute('aria-current',String(d===0));
 });
 const active=els[index],h=active.querySelector('h3')?.textContent||'',p=active.querySelector('p')?.textContent||'';
 const src=active.querySelector('.game-cover-image')?.getAttribute('src')||'';
 const cover=$('#spotlightCover');if(cover){cover.style.backgroundImage='linear-gradient(90deg,#160a1699,#160a1655),url("'+src.replace(/["\\]/g,'')+'")';cover.classList.remove('spotlight-flash');void cover.offsetWidth;cover.classList.add('spotlight-flash')}
 if($('#spotlightTitle'))$('#spotlightTitle').textContent=h;
 if($('#spotlightDescription'))$('#spotlightDescription').textContent=p;
 if($('#spotlightPosition'))$('#spotlightPosition').textContent=String(index+1).padStart(2,'0')+' / '+String(N).padStart(2,'0');
 const play=$('#spotlightPlay');if(play){delete play.dataset.start;delete play.dataset.route;if(active.dataset.start){play.dataset.start=active.dataset.start;play.textContent='Play this game ↗'}else{play.dataset.route='games';play.textContent='Explore this mode ↗'}}
 const dots=$('#featureDots');if(dots)dots.innerHTML=els.map((_,i)=>'<button class="feature-dot '+(index===i?'on':'')+'" data-index="'+i+'" aria-label="Show game '+(i+1)+'" aria-current="'+(i===index)+'"></button>').join('');
}
function start(){const el=$('#featuredGames');if(!el)return;
 const obs=new MutationObserver(()=>{if(cards().length!==lastCount){lastCount=cards().length;index=0}show(index)});obs.observe(el,{childList:true});
 const nav=n=>{hold=Date.now()+7500;show(n)};
 $('#gamesBack')?.addEventListener('click',()=>nav(index-1));$('#gamesForward')?.addEventListener('click',()=>nav(index+1));
 $('#featureDots')?.addEventListener('click',event=>{const b=event.target.closest('[data-index]');if(b)nav(Number(b.dataset.index))});
 el.addEventListener('click',event=>{const c=event.target.closest('.game-card');if(!c)return;const i=cards().indexOf(c);if(i!==index){event.preventDefault();event.stopPropagation();nav(i)}},true);
 let sx=null;el.addEventListener('pointerdown',event=>{sx=event.clientX;hold=Date.now()+7500});
 el.addEventListener('pointerup',event=>{if(sx===null)return;const dx=event.clientX-sx;sx=null;if(Math.abs(dx)>45)nav(index+(dx<0?1:-1))});
 el.addEventListener('pointerenter',()=>hold=Date.now()+5500);el.addEventListener('focusin',()=>hold=Date.now()+5500);
 $('#featureSpotlight')?.addEventListener('pointerenter',()=>hold=Date.now()+5000);
 window.addEventListener('resize',()=>show(index));show(0);
 setInterval(()=>{if(document.hidden||mq.matches||Date.now()<hold||!$('#view-home')?.classList.contains('show'))return;if(cards().length>1)show(index+1)},4800);
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