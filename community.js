/* LUSTSINO community layer: member auth, moderation, tags, feed, and server-checked scores. */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s), $all=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const core=()=>window.LUSTSINO_CORE;
const db=()=>core()?.client||null;
const msg=s=>core()?.notify?.(s)||alert(s);
const isUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s));
const cleanTags=s=>[...new Set(String(s||'').toLowerCase().split(/[\s,#]+/).map(x=>x.replace(/[^a-z0-9_-]/g,'')).filter(Boolean))].slice(0,12);
const safeUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch{return ''}};
const policyVersion='2026-11-17';
let viewer=null,profile=null,selectedPost=null,gameRun=null,feedPosts=[],chosenGameType='hotspots';
let feedOffset=0,feedHasMore=true,feedLoading=false,feedObserver=null;
let newGame={type:'hotspots',title:'',description:'',tags:[],nodes:[],currentNode:0,mediaId:''};
const initNode=i=>({round:i+1,title:`Round ${i+1}`,subtitle:'Choose one numbered spot. Follow only the region you selected.',mediaId:'',preview_seconds:5,spots:[{label:'A',x:35,y:45,w:20,h:18,shape:'oval',next:`round_${String(i+2).padStart(2,'0')}`},{label:'B',x:67,y:65,w:15,h:20,shape:'oval',next:`round_${String(i+2).padStart(2,'0')}`}]});

function init(){
 const gate=$('#ageGate'),accept=$('#ageAccept'),check=$('#ageTermsCheck');
 if(!localStorage.getItem('lustsino_consent_'+policyVersion))gate?.classList.remove('hidden');
 if(check&&accept){accept.disabled=true;check.addEventListener('change',()=>accept.disabled=!check.checked);accept.addEventListener('click',()=>{if(!check.checked)return;localStorage.setItem('lustsino_consent_'+policyVersion,new Date().toISOString());sessionStorage.setItem('lustsino_pending_terms','yes')})}
 $all('[data-route="account"]').forEach(b=>b.addEventListener('click',()=>setTimeout(renderAccount,30)));
 // Delegated feed navigation also handles dynamically rendered creator cards.
 $all('[data-route="leaderboard"]').forEach(b=>b.addEventListener('click',()=>setTimeout(loadLeaderboard,20)));
 $all('[data-route="search"]').forEach(b=>b.addEventListener('click',()=>setTimeout(renderSearch,20)));
 document.addEventListener('click',e=>{const f=e.target.closest('[data-route="feed"]');if(f)setTimeout(loadFeed,20);const r=e.target.closest('[data-route="community"]');if(r)setTimeout(renderCommunity,20)});
 const search=$('#communitySearch');search?.addEventListener('input',renderSearch);
 $('#feedRefresh')?.addEventListener('click',()=>loadFeed());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)$all('#communityFeed video').forEach(v=>v.pause())});
 newGame.nodes=[initNode(0),initNode(1),{round:3,title:'Final reveal',subtitle:'Your surprise',mediaId:'',seconds:15,spots:[]}];
 setTimeout(ready,500);
}
let attempts=0;async function ready(){if(!db()){if(++attempts<24)setTimeout(ready,1200);return}const client=db();client.auth.onAuthStateChange((event)=>{setTimeout(loadIdentity,100);if(event==='PASSWORD_RECOVERY')setTimeout(showPasswordRecovery,250)});await loadIdentity();if(core()?.state?.route==='feed')await loadFeed();}
async function loadIdentity(){const client=db();if(!client)return;const {data:{user},error}=await client.auth.getUser();viewer=error?null:user;profile=null;if(viewer){const {data:p}=await client.from('member_profiles').select('*').eq('user_id',viewer.id).maybeSingle();profile=p;if(p&&sessionStorage.getItem('lustsino_pending_terms')==='yes'){const {error:termsError}=await client.rpc('accept_lustsino_terms',{p_version:policyVersion});if(!termsError){sessionStorage.removeItem('lustsino_pending_terms');profile={...p,terms_version:policyVersion}}}}
 if(core()?.state?.route==='account')renderAccount();if(core()?.state?.route==='community')renderCommunity();}

function showPasswordRecovery(){const root=$('#memberPanel');if(!root||!db())return;core()?.state?.route!=='account'&&document.querySelector('[data-route="account"]')?.click();setTimeout(()=>{const el=$('#memberPanel');if(!el)return;el.insertAdjacentHTML('afterbegin',`<section class="member-card" id="recoveryPanel"><h2>Set a new password</h2><form id="changePassword"><label>New password<input name="password" type="password" autocomplete="new-password" minlength="12" required></label><label>Confirm password<input name="confirm" type="password" autocomplete="new-password" minlength="12" required></label><button class="button primary">Update password</button></form></section>`);$('#changePassword').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);if(f.get('password')!==f.get('confirm'))return msg('Passwords do not match.');const {error}=await db().auth.updateUser({password:String(f.get('password'))});if(error)return msg(error.message);$('#recoveryPanel')?.remove();msg('Password updated.')};},300)}
function validPlayerEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'').trim())}
const avatarBadge=(style='rose',size='large')=>`<div class="v5-avatar ${size} avatar-${['rose','amber','moon','teal','royal'].includes(style)?style:'rose'}"><span>♠</span></div>`;
function renderAccount(){
 const root=$('#memberPanel');if(!root)return;
 const online=!!db();const configured=online;
 if(!viewer){
 root.innerHTML=`<div class="account-columns">
 <section class="member-card"><span class="overline">THE VELVET PLAYER CLUB</span><h2>Claim your player name.</h2><div class="avatar-selector"><span class="v5-avatar avatar-rose">♠</span><span class="v5-avatar avatar-amber">♦</span><span class="v5-avatar avatar-moon">☾</span><span class="v5-avatar avatar-teal">♣</span><span class="v5-avatar avatar-royal">✦</span></div>
 <p>Choose a username and supply an email for secure sign-in and password recovery. No social sign-in. Your email is used for sign-in and account recovery.</p>
 ${!online?'<div class="v5-notice">Unable to reach authentication. Check network access to the Supabase SDK, then reload.</div>':!configured?'<div class="v5-notice">Signups require your live Supabase project. To allow immediate sign-in without a confirmation link, turn OFF Confirm Email in Supabase Authentication → Providers → Email.</div>':''}
 <form id="joinForm" class="stack-form"><label>Email for sign-in and recovery<input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label><label>Player username<input name="handle" required pattern="[a-zA-Z0-9_]{3,24}" maxlength="24" autocomplete="username" placeholder="velvetplayer"></label><label>Password<input type="password" name="password" required minlength="12" maxlength="128" autocomplete="new-password" placeholder="12+ characters"></label><label>Confirm password<input type="password" name="confirm" required minlength="12" maxlength="128" autocomplete="new-password"></label><label>Avatar<select name="avatar_style"><option value="rose">Rose · ♠</option><option value="amber">Gold · ♦</option><option value="moon">Moon · ☾</option><option value="teal">Teal · ♣</option><option value="royal">Royal · ✦</option></select></label><label>Player color<select name="accent_color"><option value="magenta">Magenta</option><option value="ruby">Ruby</option><option value="gold">Gold</option><option value="violet">Violet</option><option value="teal">Teal</option></select></label><label class="check-row"><input type="checkbox" name="adult" required> I am an adult in my jurisdiction and agree to the <a href="terms.html" target="_blank">Terms</a> and <a href="privacy.html" target="_blank">Privacy</a>.</label><button class="button primary" ${!online||!configured?'disabled':''} type="submit">Create Velvet Player ↗</button></form>
 <p class="micro-note">The color and avatar are cosmetic, not login factors. Your email is private and is not shown on the leaderboard. Your email inbox is not verified when confirmation is disabled.</p></section>
 <section class="member-card"><span class="overline">RETURN TO THE HOUSE</span><h2>Player sign in</h2><form id="signForm" class="stack-form"><label>Email<input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label><button class="button secondary" ${!online||!configured?'disabled':''} type="submit">Enter the arcade ↗</button></form><div class="v5-notice">Forgot your password? Enter your email to receive a recovery link.</div><form id="resetForm" class="stack-form"><label>Forgot password? Enter your email<input type="email" name="email" required placeholder="you@example.com"></label><button class="button subtle" type="submit">Send reset email</button></form></section></div>`;
 const form=$('#joinForm');form.onsubmit=async e=>{e.preventDefault();if(!online)return msg('Connect Supabase first.');const f=new FormData(form);const email=String(f.get('email')||'').trim().toLowerCase();const handle=String(f.get('handle')||'').trim().toLowerCase();const pass=String(f.get('password')||'');if(!validPlayerEmail(email))return msg('Enter a valid email address.');if(!/^[a-z0-9_]{3,24}$/.test(handle))return msg('Username must contain 3–24 letters, numbers or underscores.');if(pass!==String(f.get('confirm')))return msg('Passwords do not match.');if(!f.get('adult'))return msg('Please accept the agreement.');const {data,error}=await db().auth.signUp({email,password:pass,options:{data:{nickname:handle}}});if(error)return msg(error.message);if(!data.session){return msg('Signup requested, but a session was not issued. Check Supabase → Authentication → Providers → Email → Confirm Email (turn it OFF). If this email is already used, try signing in or reset your password.')}sessionStorage.setItem('lustsino_pending_terms','yes');const {error:termsError}=await db().rpc('accept_lustsino_terms',{p_version:policyVersion});if(termsError)return msg('Account created, but Terms could not be recorded: '+termsError.message);const {error:profileError}=await db().from('member_profiles').update({display_name:handle,avatar_style:f.get('avatar_style'),accent_color:f.get('accent_color')}).eq('user_id',data.user.id);if(profileError)return msg('Account created; finish your profile after sign-in: '+profileError.message);await loadIdentity();msg('Velvet Player created. Welcome!')};
 $('#signForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),email=String(f.get('email')||'').trim().toLowerCase();if(!validPlayerEmail(email))return msg('Enter your email.');const {error}=await db().auth.signInWithPassword({email,password:String(f.get('password'))});if(error)return msg('Could not sign in. Check your email and password, or reset your password.');await loadIdentity();msg('Welcome back.')};
 $('#resetForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),email=String(f.get('email')||'').trim().toLowerCase();if(!validPlayerEmail(email))return msg('Enter a valid email.');const redirectTo=location.origin+location.pathname+'#account';const {error}=await db().auth.resetPasswordForEmail(email,{redirectTo});if(error)return msg(error.message);msg('If that address has an account, a reset email has been requested. Check your inbox.')};

 return;
 }
 const style=profile?.avatar_style||'rose';const isMaster=!!core()?.admin;
 root.innerHTML=`<div class="member-card player-profile-card"><div class="player-profile-head">${avatarBadge(style)}<div><span class="overline">${isMaster?'LUSTSINO MASTERS':profile?.creator_status==='verified'?'HOUSE CREATOR':'VELVET PLAYER'}</span><h2>${esc(profile?.display_name||profile?.handle||'Player')}</h2><span class="player-handle">@${esc(profile?.handle||'player')}</span></div></div>
 <p>${profile?.terms_version===policyVersion?'✓ Terms recorded':'You must accept the current Terms to submit content or earn points.'}</p>${profile?.terms_version===policyVersion?'':'<label class="check-row"><input type="checkbox" id="reacceptTerms"> I agree to the current <a href="terms.html" target="_blank">Terms</a> and <a href="privacy.html" target="_blank">Privacy</a>.</label><button id="acceptMemberTerms" class="button primary">Record agreement</button>'}
 <p class="micro-note">Adult access: <strong id="ageStatus">Checking status...</strong></p>
 <form id="profileForm" class="stack-form"><label>Your permanent player username<input readonly value="${esc(profile?.handle||'')}" title="The login name cannot be changed without secure account migration."></label><label>Display name<input name="display_name" maxlength="70" required value="${esc(profile?.display_name||'')}"></label><label>Bio<textarea name="bio" maxlength="280">${esc(profile?.bio||'')}</textarea></label><label>Avatar design<select name="avatar_style">${[['rose','Rose'],['amber','Golden'],['moon','Moonlit'],['teal','Teal'],['royal','Royal']].map(([v,n])=>`<option value="${v}" ${style===v?'selected':''}>${n}</option>`).join('')}</select></label><label>Profile accent<select name="accent_color">${['magenta','ruby','gold','violet','teal'].map(v=>`<option value="${v}" ${profile?.accent_color===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="check-row"><input name="show_playing" type="checkbox" ${profile?.show_playing?'checked':''}> Show my current game on the leaderboard (off by default)</label><button class="button secondary" type="submit">Save profile ↗</button></form>
 <div class="member-actions"><button class="button primary" data-route="community">Game Studio ↗</button>${isMaster?'<button class="button secondary" data-route="studio">Master dashboard ↗</button>':''}<button class="button subtle" id="signOut">Sign out</button></div><div id="creatorUpgrade" class="creator-upgrade"></div></div>`;
 if($('#acceptMemberTerms'))$('#acceptMemberTerms').onclick=async()=>{if(!$('#reacceptTerms')?.checked)return msg('Accept the terms first.');const {error}=await db().rpc('accept_lustsino_terms',{p_version:policyVersion});if(error)return msg(error.message);await loadIdentity();msg('Terms recorded.')};
 $('#profileForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const row={display_name:String(f.get('display_name')).trim(),bio:String(f.get('bio')).trim(),avatar_style:f.get('avatar_style'),accent_color:f.get('accent_color'),show_playing:!!f.get('show_playing')};const {error}=await db().from('member_profiles').update(row).eq('user_id',viewer.id);if(error)return msg(error.message);if(!row.show_playing)await db().from('arcade_presence').upsert({user_id:viewer.id,visible:false,experience_id:null,updated_at:new Date().toISOString()});await loadIdentity();msg('Profile saved.')};
 $('#signOut').onclick=async()=>{if(viewer)await db().from('arcade_presence').upsert({user_id:viewer.id,visible:false,experience_id:null,updated_at:new Date().toISOString()});await db().auth.signOut();viewer=null;profile=null;renderAccount()};
 db().from('member_age_assurance').select('status').eq('user_id',viewer.id).maybeSingle().then(({data})=>{if($('#ageStatus'))$('#ageStatus').textContent=data?.status==='verified'?'Verified':'Unverified · legal-age declaration is not proof.'});
 renderCreatorUpgrade();
}
async function renderCreatorUpgrade(){const root=$('#creatorUpgrade');if(!root||!viewer)return;
 if(profile?.creator_status==='verified'){root.innerHTML='<div class="v5-notice">✦ House Creator verified. You can submit original media and games in Community Studio.</div>';return}
 const {data}=await db().from('creator_applications').select('id,stage,created_at').eq('user_id',viewer.id).order('created_at',{ascending:false}).limit(1);
 if(data?.[0]?.stage==='pending'){root.innerHTML='<div class="v5-notice">Your House Creator application is pending verification. You can prepare private drafts in your Studio while the identity and content-rights checks are completed. The application status is not proof of verification. <button class="button secondary" type="button" data-route="community">Open your Studio</button></div>';return}
 root.innerHTML=`<h3>Become a House Creator</h3><p>Apply for House Creator status. No fan page is required. You can prepare drafts while your identity and content rights are checked before public distribution.</p><form id="creatorApplication" class="stack-form"><label>Portfolio or creator page (optional)<input name="portfolio_url" type="url" placeholder="https://..."></label><label>Creator introduction<textarea name="note" maxlength="1000" placeholder="Tell us about the content you create"></textarea></label><button class="button secondary" type="submit">Request House Creator status ↗</button></form>`;
 $('#creatorApplication').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const rawUrl=String(f.get('portfolio_url')||'').trim();const url=rawUrl?safeUrl(rawUrl):null;if(rawUrl&&!url)return msg('Enter a valid HTTPS URL or leave it blank.');const {error}=await db().from('creator_applications').insert({user_id:viewer.id,portfolio_url:url,note:String(f.get('note')||'').slice(0,1000)});if(error)return msg(error.message);msg('Creator application submitted.');renderCreatorUpgrade()};
}
function renderSearch(){const root=$('#searchResults');if(!root)return;const q=($('#communitySearch')?.value||'').trim().replace(/^#/,'').toLowerCase(),games=(core()?.state?.experiences||[]).filter(g=>g.published!==false);const matches=games.filter(g=>!q||[g.title,g.description,g.type,...(g.tags||[])].join(' ').toLowerCase().includes(q));root.innerHTML=matches.map(g=>`<button class="search-card" data-start="${esc(g.id)}"><img src="assets/covers/${['wheel','cards','hotspots','duel','prompts','doors','tiles'].includes(g.type)?g.type:'wheel'}.webp" alt="" loading="lazy"><strong>${esc(g.title)}</strong><small>${esc(g.description||g.type)}</small><span>${(g.tags||[]).map(t=>'#'+esc(t)).join(' ')}</span></button>`).join('')||'<p>No matching games yet.</p>';const tags=[...new Set(games.flatMap(g=>g.tags||[]))].slice(0,15);$('#trendingTags').innerHTML=tags.map(t=>`<button class="tag-chip" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')||'<span class="micro-note">New tags appear as creators publish their games.</span>';$all('[data-tag]',$('#trendingTags')).forEach(b=>b.onclick=()=>{$('#communitySearch').value=b.dataset.tag;renderSearch()})}
async function loadFeed({append=false}={}){
 const root=$('#communityFeed'),pager=$('#feedPagination');if(!root||!db()||feedLoading)return;
 feedLoading=true;
 if(!append){feedOffset=0;feedHasMore=true;feedPosts=[];feedObserver?.disconnect();root.innerHTML='<div class="feed-message">Loading the latest posts…</div>';}
 const pageSize=24;
 const {data,error}=await db().from('community_posts')
  .select('id,title,description,creator_credit,source_url,media_url,media_type,tags,created_at,owner_id')
  .eq('published',true).eq('review_status','approved')
  .order('created_at',{ascending:false}).range(feedOffset,feedOffset+pageSize-1);
 feedLoading=false;
 if(error){if(!append)root.innerHTML='<p class="feed-message">'+esc(error.message)+'</p>';return}
 const rows=data||[];
 feedPosts=append?feedPosts.concat(rows):rows;
 feedOffset+=rows.length;
 feedHasMore=rows.length===pageSize;
 if(!feedPosts.length){
  root.innerHTML='<div class="feed-empty"><img src="assets/covers/doors.webp" alt=""><div><h2>Your feed starts here</h2><p>No creator posts yet. Be the first to share an authorized image, GIF or short video.</p><button class="button primary" data-route="community">＋ Create post</button></div></div>';
  if(pager)pager.innerHTML='';return;
 }
 const markup=rows.map((p,i)=>{
  const url=safeUrl(p.media_url),posted=p.created_at?new Date(p.created_at).toLocaleDateString():'';const artist=p.creator_credit||'Creator';
  return '<article class="feed-reel" data-reel="'+esc(p.id)+'" aria-label="'+esc(p.title)+'">'+
    '<header class="feed-post-header"><span class="feed-avatar">✦</span><div class="feed-post-by"><strong>'+esc(artist)+'</strong><small>'+esc(posted)+'</small></div><button class="feed-post-more" data-report-post="'+esc(p.id)+'" aria-label="Report this post">•••</button></header>'+
    '<div class="feed-stage">'+(p.media_type==='video'?
      '<video src="'+esc(url)+'" preload="metadata" muted playsinline loop controls></video>':
      '<img src="'+esc(url)+'" alt="'+esc(p.title)+'" loading="lazy">')+'</div>'+
    '<div class="feed-actions"><button type="button" class="reel-like" data-like="'+esc(p.id)+'" aria-label="Like">♡ <span>Like</span></button>'+
     '<button type="button" data-share="'+esc(p.id)+'" aria-label="Share">↗ <span>Share</span></button>'+
     '<button type="button" data-report-post="'+esc(p.id)+'" aria-label="Report">⚑ <span>Report</span></button>'+
     (safeUrl(p.source_url)?'<a href="'+esc(safeUrl(p.source_url))+'" target="_blank" rel="noopener noreferrer">✦ Creator page</a>':'')+'</div>'+
    '<div class="feed-meta"><p class="feed-caption"><strong>'+esc(artist)+'</strong> '+esc(p.title)+'</p>'+
    (p.description?'<p>'+esc(p.description)+'</p>':'')+
    '<div class="tag-list">'+(p.tags||[]).map(tag=>'<button class="tag-chip" data-feed-tag="'+esc(tag)+'">#'+esc(tag)+'</button>').join('')+'</div></div></article>';
 }).join('');
 if(append)root.insertAdjacentHTML('beforeend',markup);else root.innerHTML=markup;
 if(pager){pager.innerHTML=feedHasMore?'<button type="button" class="button secondary" id="feedLoadMore">Load more posts ↓</button>':
 '<p class="feed-end">You’re all caught up.</p>';const more=$('#feedLoadMore');if(more)more.onclick=()=>loadFeed({append:true});}
 $all('[data-like]',root).forEach(b=>b.onclick=()=>toggleLike(b));
 $all('[data-report-post]',root).forEach(button=>button.onclick=()=>{
  const postId=button.dataset.reportPost;
  if(!isUuid(postId))return;
  let dialog=$('#lustsinoReportDialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='lustsinoReportDialog';dialog.className='lustsino-report-dialog';document.body.appendChild(dialog);}
  dialog.innerHTML='<form id="lustsinoReportForm"><h3>Report a post</h3><p>Report a suspected rights, consent, age or privacy issue. Reports reach the House Master.</p>'+
  '<label>Reason<select name="reason" required><option value="rights">Copyright or image rights</option><option value="consent">Consent or non-consensual media</option><option value="age">Person may be underage</option><option value="privacy">Privacy violation</option><option value="other">Other safety concern</option></select></label>'+
  '<label>Details<textarea name="details" maxlength="2000" required placeholder="Briefly explain the concern" rows="4"></textarea></label>'+
  '<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="submit" class="button primary">Send report</button><button id="lustsinoCancelReport" type="button" class="button subtle">Cancel</button></div></form>';
  $('#lustsinoCancelReport').onclick=()=>dialog.close();
  $('#lustsinoReportForm').onsubmit=async e=>{
   e.preventDefault();
   const form=new FormData(e.currentTarget);
   const details=String(form.get('details')||'').trim();
   if(details.length<5)return msg('Please describe the concern.');
   const {error}=await db().from('content_reports').insert({post_id:postId,reason:form.get('reason'),details});
   if(error)return msg('Report could not be sent: '+error.message);
   dialog.close();msg('Report sent. The House Master can review and remove the post.');
  };
  dialog.showModal();
 });
$all('[data-share]',root).forEach(b=>b.onclick=()=>{const url=location.origin+location.pathname+'#feed';navigator.share?.({title:'LUSTSINO',url}).catch(()=>{})||navigator.clipboard?.writeText(url).then(()=>msg('Feed link copied'))});$all('[data-feed-tag]',root).forEach(b=>b.onclick=()=>{core().state.route='search';$('[data-route="search"]')?.click();$('#communitySearch').value=b.dataset.feedTag;renderSearch()});
 feedObserver?.disconnect();
 feedObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
   const video=entry.target;
   if(document.hidden || !$('#view-feed')?.classList.contains('show') || entry.intersectionRatio<.60){video.pause();return}
   video.muted=true;video.playsInline=true;
   video.play().catch(()=>{});
  });
 },{threshold:[0,.25,.60,.9]});
 $all('.feed-stage video',root).forEach(video=>feedObserver.observe(video));
}
async function toggleLike(b){if(!viewer)return msg('Sign in with a player account to save reactions.');const post_id=b.dataset.like;const {data}=await db().from('post_reactions').select('post_id').eq('post_id',post_id).eq('user_id',viewer.id).maybeSingle();let result;if(data){result=await db().from('post_reactions').delete().eq('user_id',viewer.id).eq('post_id',post_id)}else{result=await db().from('post_reactions').insert({post_id,user_id:viewer.id})}if(result.error)return msg(result.error.message);b.classList.toggle('active',!data);b.firstChild.textContent=data?'♡':'♥'}
async function loadLeaderboard(){
 const root=$('#leaderboardPanel');if(!root)return;root.innerHTML='<p>Opening the Hall of Fame…</p>';
 if(!db()){root.innerHTML='<p>Live leaderboard requires Supabase.</p>';return}
 const [scores,presence,gameRows]=await Promise.all([db().from('arcade_scores').select('user_id,handle,points,updated_at').order('points',{ascending:false}).limit(50),db().from('arcade_presence').select('user_id,experience_id,updated_at,visible').eq('visible',true).gte('updated_at',new Date(Date.now()-120000).toISOString()).limit(100),db().from('experiences').select('id,title').eq('published',true).limit(100)]);
 if(scores.error){root.innerHTML='<p>'+esc(scores.error.message)+'</p>';return}
 const live=new Map((presence.data||[]).map(p=>[p.user_id,p]));const games=new Map((gameRows.data||[]).map(g=>[g.id,g.title]));
 root.innerHTML=`<div class="leaderboard-hero"><div><span class="overline">THE HALL OF FAME</span><h2>The Velvet Ranking</h2><p>Every point comes from a server-recorded eligible run. Current games appear only when players opt in.</p></div><strong>✦ ${(scores.data||[]).length} PLAYERS</strong></div><div class="score-head"><span>RANK</span><span>PLAYER / GAME</span><span>POINTS</span></div>${(scores.data||[]).map((s,i)=>{const p=live.get(s.user_id);const game=p&&games.get(p.experience_id);const level=(s.points>=500?'High Roller':s.points>=200?'Night Rider':s.points>=50?'Velvet Regular':'Velvet Rookie');return `<div class="score-row deluxe ${i<3?'top-three':''}"><strong>${['♛','♜','♞'][i]||String(i+1).padStart(2,'0')}</strong><span class="score-person"><span class="score-nick">@${esc(s.handle)}</span><small>${level}${game?` · <b class="live-playing">● Playing ${esc(game)}</b>`:''}</small></span><b>${Number(s.points)||0} <small>pts</small></b></div>`}).join('')||'<div class="score-row">No ranked scores yet. The first verified game completion will appear here.</div>'}<p class="micro-note">Scores have replay cooldowns, one-time claims and time limits; the system is not yet resistant to determined automation. You can hide your current game in profile settings.</p>`;
}
function ensureGate(){if(!viewer)return 'Sign in to publish content or build games.';if(profile?.terms_version!==policyVersion)return 'Your account must accept the latest Terms. Sign out and sign in again after accepting.';return ''}
function renderCommunity(){let root=$('#communityPanel');if(!root)return;const warning=ensureGate();if(warning){root.innerHTML=`<div class="member-card"><h2>Member Studio</h2><p>${esc(warning)}</p><button class="button primary" data-route="account">Go to account ↗</button></div>`;return}
 root.innerHTML=`<div class="member-tool-tabs"><button class="active" data-tool="post">Submit a post</button><button data-tool="game">Create a game</button><button data-tool="mine">My drafts</button>${core()?.admin?'<button data-tool="review">Moderate</button>':''}</div><div id="memberToolBody"></div>`;$all('[data-tool]',root).forEach(b=>b.onclick=()=>{$all('[data-tool]',root).forEach(x=>x.classList.toggle('active',x===b));renderTool(b.dataset.tool)});renderTool('post')}
function renderTool(tool){if(tool==='post')renderPostTool();else if(tool==='game')renderGameTool();else if(tool==='mine')renderMyDrafts();else if(tool==='review')renderReviewTool()}
function renderPostTool(){const root=$('#memberToolBody');root.innerHTML=`<div class="member-card"><span class="overline">POST TO THE VELVET FEED</span><h2>Submit authorized media</h2><p>Verified House Creators can publish their own Bunny uploads to the feed immediately. Other players can save a private submission while creator verification is completed. Content rights and consent are required.</p><form id="submitPost" class="stack-form"><label>Title<input name="title" required maxlength="140"></label><label>Description<textarea name="description" maxlength="1000"></textarea></label><input type="hidden" name="media_type" value="image"><label>Media link (filled after upload)<input id="mediaRemoteURL" type="url" name="media_url" placeholder="https://approved-host.example/file.webp"></label><label>Choose an image, GIF, or short video<input id="uploadCandidate" type="file" accept="image/webp,image/png,image/jpeg,image/gif,video/mp4,video/webm"></label><div id="uploadPreview" class="micro-note">Add your permission reference, select media, and upload to Bunny. An upload alone does not publish the content.</div><button id="sendToStorage" class="button subtle" type="button" disabled>Upload to Bunny</button><label>Creator credit<input name="creator_credit" required maxlength="120"></label><label>Creator page (optional)<input name="source_url" type="url" placeholder="https://..."></label><label>Written permission reference<input name="rights_reference" required minlength="3" maxlength="200"></label><label>Tags<input name="tags" placeholder="editorial, cosplay, creative" maxlength="160"></label><label class="check-row"><input name="permission" type="checkbox" required> I have permission to submit this content, and the depicted adults are verified with documented consent.</label><button class="button primary" type="submit">Publish / save post ↗</button></form></div>`;
 const f=$('#uploadCandidate'),preview=$('#uploadPreview'),send=$('#sendToStorage');f.onchange=()=>{const file=f.files[0];if(!file)return;const obj=URL.createObjectURL(file);preview.innerHTML=`<p>Preview only · ${esc(file.name)} (${Math.round(file.size/1024)} KB)</p>${file.type.startsWith('image/')?`<img style="max-width:180px;max-height:220px;border-radius:12px" src="${obj}" alt="Local preview">`:`<video style="max-width:180px" controls src="${obj}"></video>`}`;send.disabled=!window.VYRA_CONFIG?.uploadEndpoint};send.onclick=async()=>{
 const endpoint=window.VYRA_CONFIG?.uploadEndpoint,file=f.files[0];
 if(!endpoint||!file)return msg("Choose a file first.");
 const {data:{session}}=await db().auth.getSession();
 if(!session)return msg("Please sign in before uploading.");
 const rightsRef=String($('#submitPost [name="rights_reference"]')?.value||"").trim();
 if(rightsRef.length<3)return msg("Enter the written permission reference before uploading.");
 send.disabled=true;send.textContent="Preparing upload…";
 try {
  let upload=file;
  if(["image/jpeg","image/png","image/webp"].includes(file.type)&&file.size<20000000){
   try{const bitmap=await createImageBitmap(file),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);const converted=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",.85));bitmap.close();if(converted)upload=new File([converted],file.name.replace(/\.[^.]+$/,"")+".webp",{type:"image/webp"})}catch{}
  }
  const post=async payload=>{
   const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token,apikey:window.VYRA_CONFIG.supabaseAnonKey},body:JSON.stringify(payload)});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||("Storage request failed ("+response.status+")"));
   return data;
  };
  const grant=await post({action:"presign",type:upload.type,size:upload.size,rightsRef});
  send.textContent="Uploading to Bunny…";
  const uploaded=await fetch(grant.uploadUrl,{method:"PUT",headers:{"Content-Type":grant.contentType},body:upload});
  if(!uploaded.ok)throw Error("Bunny rejected the file ("+uploaded.status+"). Check your S3 zone's CORS settings.");
  send.textContent="Confirming upload…";
  const result=await post({action:"finalize",uploadId:grant.uploadId});
  if(result.url){
   $('#mediaRemoteURL').value=result.url;
   msg("Bunny upload complete. Add the caption and attribution, then publish if verified.");
  } else msg("File stored. The Bunny CDN Pull Zone must be connected before it can be shown on the site.");
 }catch(error){msg(error.message||"Upload failed.")}
 finally{send.disabled=false;send.textContent="Upload to Bunny";}
}
 $('#submitPost').onsubmit=async e=>{
  e.preventDefault();
  const fd=new FormData(e.target);
  const media_url=safeUrl(fd.get('media_url'));
  const rawSource=String(fd.get('source_url')||'').trim();
  const source_url=rawSource?safeUrl(rawSource):null;
  if(!media_url||(rawSource&&!source_url))return msg('Provide a valid HTTPS media URL. Creator page links are optional.');
  if(!fd.get('permission'))return msg('Confirm documented permission and consent first.');
  const instant=profile?.creator_status==='verified'||!!core()?.admin;
  const row={
   owner_id:viewer.id,title:String(fd.get('title')).trim(),
   description:String(fd.get('description')||'').trim(),
   media_type:($('#uploadCandidate')?.files?.[0]?.type.startsWith('video/')||/\.(mp4|webm)(?:[?#]|$)/i.test(media_url))?'video':'image',
   media_url,source_url,
   creator_credit:String(fd.get('creator_credit')).trim(),
   rights_reference:String(fd.get('rights_reference')).trim(),
   tags:cleanTags(fd.get('tags')),published:instant,review_status:instant?'approved':'draft'
  };
  const {error}=await db().from('community_posts').insert(row);
  if(error){
   if(instant)return msg('Post not published: '+error.message+'. You must be fully verified, and this must be your completed Bunny upload with a matching rights reference.');
   return msg(error.message);
  }
  e.target.reset();
  msg(instant?'Published to your feed.':'Saved privately. Public adult-media publishing requires verified House Creator status.');
  if(instant)setTimeout(()=>document.querySelector('[data-route="feed"]')?.click(),350);
 }
}
function renderGameTool(){const root=$('#memberToolBody');const approved=core()?.state?.media?.filter(m=>m.published===true)||[];const options=approved.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');root.innerHTML=`<div class="member-card"><span class="overline">MEMBER GAME BUILDER</span><h2>Make a new interactive game</h2><p>Choose a mode, add tags and configure its outcomes. All players can save drafts. Verified House Creators publish complete games automatically when every media assignment meets the existing safeguards.</p><form id="submitGame" class="stack-form"><label>Game title<input name="title" maxlength="90" required></label><label>Description<input name="description" maxlength="240" required></label><label>Game mode<select id="memberGameType" name="type">${[['hotspots','Circle Paths'],['wheel','Roulette'],['cards','Shuffle'],['duel','This or That'],['prompts','Timed prompts'],['doors','Mystery Doors'],['tiles','Lucky Tiles'],['special','The LUSTSINO Special']].map(([v,t])=>`<option value="${v}" ${v===chosenGameType?'selected':''}>${t}</option>`).join('')}</select></label><label>Tags (comma or hashtag separated)<input name="tags" placeholder="creative, challenge, arcade"></label><div id="memberGameEditor"></div><button class="button primary" type="submit">Save game draft ↗</button></form></div>`;$('#memberGameType').onchange=e=>{chosenGameType=e.target.value;renderMemberEditor(approved)};renderMemberEditor(approved);
 $('#submitGame').onsubmit=async e=>{e.preventDefault();const form=new FormData(e.target),type=form.get('type'),config=makeGameConfig(type);if(!config)return msg('Complete the configuration first.');const title=String(form.get('title')).trim();const slug='member-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);const instant=profile?.creator_status==='verified'||!!core()?.admin;const record={title,slug,description:String(form.get('description')||''),type,author_id:viewer.id,tags:cleanTags(form.get('tags')),published:instant,review_status:instant?'approved':'draft',featured:false,symbol:'◇',sort_order:100,config};let {error}=await db().from('experiences').insert(record);if(error&&instant){const retry=await db().from('experiences').insert({...record,published:false,review_status:'draft'});if(!retry.error){msg('Game saved privately. Public release requires every media and creator record to meet the publishing checks.');e.target.reset();chosenGameType='hotspots';renderGameTool();return;}return msg('Could not save game: '+retry.error.message)}if(error)return msg(error.message);msg(instant?'Game published to the arcade.':'Game draft saved in your Studio.');e.target.reset();chosenGameType='hotspots';renderGameTool()}
}
function makeGameConfig(type){
 if(type==='special'){
  const input=String($('#memberSpecialTags')?.value||'');
  const cards=input.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{
   const i=line.lastIndexOf(':');
   return i<1?null:{label:line.slice(0,i).trim().slice(0,36),tag:line.slice(i+1).trim().toLowerCase()}
  }).filter(Boolean);
  if(cards.length<4||cards.length>10||cards.some(c=>!c.label||!/^[a-z0-9_-]{2,35}$/.test(c.tag)))return null;
  const voice={};
  $all('[data-member-voice]').forEach(el=>{
    const url=String(el.value||'').trim();
    voice[el.dataset.memberVoice]=url?safeUrl(url):'';
  });
  if($all('[data-member-voice]').some(el=>el.value.trim()&&!safeUrl(el.value.trim())))return null;
  return {tagCards:cards,reelSpeedMs:Math.max(150,Math.min(650,Number($('#memberSpecialSpeed')?.value)||210)),
          voice,lockMediaAssignments:true,rotateMedia:false};
 }
 if(type==='hotspots'){if(newGame.nodes.length<2)return null;const nodes={};newGame.nodes.forEach((n,i)=>nodes['round_'+String(i+1).padStart(2,'0')]=JSON.parse(JSON.stringify(n)));return {nodes,startNode:'round_01',totalRounds:newGame.nodes.length-1,lockMediaAssignments:true,rotateMedia:false}}
 const c=[];$all('.outcome-row').forEach((row,i)=>{const label=$('[data-outcome-label]',row)?.value||'Mystery '+(i+1),mediaId=$('[data-outcome-media]',row)?.value||'';c.push({label,mediaId,seconds:15,prompt:label})});if(type==='wheel')return{slices:c};if(type==='duel')return{choices:c,rounds:5};if(type==='prompts')return{choices:c,rounds:5};return{choices:c}}
function renderMemberEditor(approved){const root=$('#memberGameEditor');if(!root)return;
 if(chosenGameType==='special'){
  const starter='Roulette:roulette\nShuffle:shuffle\nChoices:choices\nMystery:mystery\nArcade:arcade\nHighlights:test';
  root.innerHTML='<div class="member-card" style="padding:16px"><div class="overline">SPECIAL GAME BUILDER</div>'+
   '<h3>Configure the card themes</h3><p class="micro-note">Choose 4–10 cards. Each line has a label and a published feed hashtag separated by a colon. Use tags already present in your posts.</p>'+
   '<label>Theme cards<textarea id="memberSpecialTags" rows="7" spellcheck="false">'+esc(starter)+'</textarea></label>'+
   '<label>Fast-reel speed<select id="memberSpecialSpeed"><option value="180">Very fast (180 ms)</option><option value="210" selected>Fast (210 ms)</option><option value="260">Steady (260 ms)</option><option value="350">Relaxed (350 ms)</option><option value="500">Slow (500 ms)</option></select></label>'+
   '<h3>Optional narration clips (MP3)</h3><p class="micro-note">Use approved HTTPS media URLs to MP3 files. These clips are played at the matching stage where the browser allows audio.</p>'+
   [['welcome','Welcome'],['shuffle','Shuffle'],['reel','Reel'],['gallery','Gallery'],['finish','Finish']].map(([id,label])=>
    '<label>'+label+' MP3 URL<input type="url" data-member-voice="'+id+'" placeholder="https://.../audio.mp3"></label>').join('')+
   '</div>';
  return;
 }
const opts='<option value="">No media / placeholder</option>'+approved.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');if(chosenGameType!=='hotspots'){const number=chosenGameType==='wheel'?8:chosenGameType==='tiles'?9:chosenGameType==='duel'?4:3;root.innerHTML=`<p class="micro-note">Assign authorized media and editable choice labels. You can save the game privately before publication.</p><div class="outcome-list">${Array.from({length:number},(_,i)=>`<div class="outcome-row"><label>Result ${i+1}<input data-outcome-label placeholder="Choice ${i+1}" maxlength="80"></label><label>Approved media<select data-outcome-media>${opts}</select></label></div>`).join('')}</div>`;return}
 const n=newGame.nodes.length,idx=Math.min(newGame.currentNode,n-1),node=newGame.nodes[idx];root.innerHTML=`<div class="path-member-editor"><div class="path-toolbar"><label>Round<select id="memberRound">${newGame.nodes.map((n,i)=>`<option value="${i}" ${idx===i?'selected':''}>${i+1}. ${esc(n.title)}</option>`).join('')}</select></label><label>Length<select id="memberLength">${[5,10,20,30].map(i=>`<option value="${i}" ${n-1===i?'selected':''}>${i} rounds</option>`).join('')}</select></label><button type="button" id="memberGenerate" class="button subtle">Generate path</button></div><p class="micro-note">Move any circle by dragging. Tap empty space to add an oval. The last round is a final reveal.</p><label>Round title<input id="memberNodeTitle" value="${esc(node.title)}"></label><label>Round image<select id="memberNodeMedia">${opts.replace(`value="${esc(node.mediaId)}"`,`value="${esc(node.mediaId)}" selected`)}</select></label><div class="member-hotspot-canvas" id="memberCanvas" style="background-image:${node.mediaId&&approved.find(m=>m.id===node.mediaId)?`linear-gradient(#0002,#0005),url('${esc(approved.find(m=>m.id===node.mediaId).url)}')`:'none'}">${node.spots.map((s,i)=>`<button type="button" class="member-hotspot" data-index="${i}" style="left:${s.x}%;top:${s.y}%;width:${s.w}%;height:${s.h}%;border-radius:${s.shape==='oval'?'50%':'12px'}">${esc(s.label)}</button>`).join('')}<span class="canvas-caption">${node.spots.length?'DRAG TO PLACE · TAP EMPTY AREA TO ADD':'FINAL REVEAL'}</span></div><div class="hotspot-properties">${node.spots.map((s,i)=>`<div class="spot-properties"><span>Spot ${i+1}</span><input data-label="${i}" value="${esc(s.label)}" aria-label="Spot label"><select data-shape="${i}"><option value="oval" ${s.shape==='oval'?'selected':''}>Oval</option><option value="rectangle" ${s.shape==='rectangle'?'selected':''}>Rectangle</option></select><input type="number" data-width="${i}" min="5" max="90" value="${s.w}" aria-label="Width %"><input type="number" data-height="${i}" min="5" max="90" value="${s.h}" aria-label="Height %"><button class="button subtle" type="button" data-remove-hotspot="${i}">×</button></div>`).join('')}</div></div>`;
 $('#memberRound').onchange=e=>{newGame.currentNode=Number(e.target.value);renderMemberEditor(approved)};$('#memberGenerate').onclick=()=>{const amount=Number($('#memberLength').value);newGame.nodes=Array.from({length:amount},(_,i)=>initNode(i));newGame.nodes.push({round:amount+1,title:'Final reveal',subtitle:'Your discovery',mediaId:'',seconds:15,spots:[]});newGame.currentNode=0;renderMemberEditor(approved)};$('#memberNodeTitle').onchange=e=>{node.title=e.target.value};$('#memberNodeMedia').onchange=e=>{node.mediaId=e.target.value;renderMemberEditor(approved)};
 const canvas=$('#memberCanvas');canvas.onclick=e=>{if(e.target.closest('button')||node.spots.length>=8||idx===n-1)return;const r=canvas.getBoundingClientRect(),x=Math.round((e.clientX-r.left)/r.width*100),y=Math.round((e.clientY-r.top)/r.height*100);node.spots.push({x,y,w:18,h:15,shape:'oval',label:String(node.spots.length+1),next:`round_${String(idx+2).padStart(2,'0')}`});renderMemberEditor(approved)};
 $all('.member-hotspot',canvas).forEach(b=>{let drag=false;b.onpointerdown=e=>{e.preventDefault();drag=true;b.setPointerCapture(e.pointerId)};b.onpointermove=e=>{if(!drag)return;const r=canvas.getBoundingClientRect(),s=node.spots[Number(b.dataset.index)];s.x=Math.max(0,Math.min(100,Math.round((e.clientX-r.left)/r.width*100)));s.y=Math.max(0,Math.min(100,Math.round((e.clientY-r.top)/r.height*100)));b.style.left=s.x+'%';b.style.top=s.y+'%'};b.onpointerup=()=>{drag=false}});
 $all('[data-label]',root).forEach(el=>el.onchange=e=>{node.spots[Number(el.dataset.label)].label=e.target.value;renderMemberEditor(approved)});$all('[data-shape]',root).forEach(el=>el.onchange=e=>{node.spots[Number(el.dataset.shape)].shape=e.target.value;renderMemberEditor(approved)});$all('[data-width]',root).forEach(el=>el.onchange=e=>{node.spots[Number(el.dataset.width)].w=Number(e.target.value);renderMemberEditor(approved)});$all('[data-height]',root).forEach(el=>el.onchange=e=>{node.spots[Number(el.dataset.height)].h=Number(e.target.value);renderMemberEditor(approved)});$all('[data-remove-hotspot]',root).forEach(el=>el.onclick=()=>{node.spots.splice(Number(el.dataset.removeHotspot),1);renderMemberEditor(approved)})
}
async function renderMyDrafts(){
 const root=$('#memberToolBody');
 root.innerHTML='<p>Loading your saved content…</p>';
 const [posts,games]=await Promise.all([
  db().from('community_posts').select('id,title,review_status,published').eq('owner_id',viewer.id).order('created_at',{ascending:false}).limit(50),
  db().from('experiences').select('id,title,review_status,published').eq('author_id',viewer.id).order('created_at',{ascending:false}).limit(50)
 ]);
 const canPublish=profile?.creator_status==='verified'||!!core()?.admin;
 const gameRows=(games.data||[]).map(g=>'<div class="draft-row"><span>'+esc(g.title)+'</span><small>'+(g.published?'Live':'Saved draft')+'</small></div>').join('');
 const postRows=(posts.data||[]).map(p=>'<div class="draft-row"><span>'+esc(p.title)+'</span><small>'+(p.published?'Live':'Saved draft')+'</small>'+
  (canPublish&&!p.published?'<button type="button" class="button secondary smallish" data-publish-post="'+esc(p.id)+'">Publish</button>':'')+'</div>').join('');
 root.innerHTML='<div class="member-card"><h2>Your creations</h2><p>Your drafts stay private. Once verified, completed Bunny uploads can go live immediately without another review.</p><h3>Games</h3>'+
  (gameRows||'<p>No games yet.</p>')+'<h3>Media posts</h3>'+(postRows||'<p>No posts yet.</p>')+'</div>';
 $all('[data-publish-post]',root).forEach(btn=>btn.onclick=async()=>{
  btn.disabled=true;
  const {error}=await db().from('community_posts').update({published:true,review_status:'approved'}).eq('id',btn.dataset.publishPost).eq('owner_id',viewer.id);
  if(error){btn.disabled=false;return msg('Cannot publish this draft: '+error.message+'. Confirm it is your completed Bunny upload, with the same rights reference and verified House Creator access.');}
  msg('Post published.');renderMyDrafts();
 });
}
async function renderReviewTool(){
 const root=$('#memberToolBody');if(!core()?.admin)return root.innerHTML='<p>LUSTSINO Master access required. Sign in through Studio first.</p>';
 root.innerHTML='<p>Loading moderation queue…</p>';
 const [posts,games,apps]=await Promise.all([
  db().from('community_posts').select('*').eq('review_status','pending').order('created_at',{ascending:true}).limit(100),
  db().from('experiences').select('id,title,description,review_status,author_id,config,tags,type').eq('review_status','pending').limit(100),
  db().from('creator_applications').select('id,user_id,portfolio_url,note,created_at').eq('stage','pending').order('created_at',{ascending:true}).limit(100)
 ]);
 root.innerHTML=`<div class="member-card"><span class="overline">MASTER CONTROL · CONTENT SAFETY</span><h2>Creator applications</h2><p>Players can create game drafts without this check. Verify actual adult age, identity, consent and rights only when enabling public adult-media publishing. Never paste raw identity documents here.</p>
 ${(apps.data||[]).map(a=>`<div class="moderation-row"><div><strong>House Creator application</strong><small>${esc(a.note||'No introduction')} · ${new Date(a.created_at).toLocaleDateString()}</small>${safeUrl(a.portfolio_url)?`<a href="${esc(safeUrl(a.portfolio_url))}" target="_blank" rel="noopener noreferrer">Creator portfolio ↗</a>`:""}</div><label class="micro-note">Adult-media evidence ref <input type="text" data-verification-ref="${esc(a.id)}" maxlength="240" placeholder="Completed verification reference"></label><button class="button secondary" data-verify-creator="${esc(a.id)}">Verify for media publishing</button><button class="button subtle" data-decline-creator="${esc(a.id)}">Decline</button></div>`).join('')||'<p>No pending creator applications.</p>'}
 <h2>Game submissions</h2>${(games.data||[]).map(g=>`<div class="moderation-row"><div><strong>${esc(g.title)}</strong><small>${esc(g.type)} · ${esc(g.description||'')}</small></div><button class="button secondary" data-approve-game="${esc(g.id)}">Review & approve</button><button class="button subtle" data-reject-game="${esc(g.id)}">Reject</button></div>`).join('')||'<p>No game requests.</p>'}
 <h2>Media submissions</h2>${(posts.data||[]).map(p=>`<div class="moderation-row"><div><strong>${esc(p.title)}</strong><small>${esc(p.rights_reference)} · ${esc(p.creator_credit)}</small><a href="${esc(safeUrl(p.source_url))}" target="_blank" rel="noopener noreferrer">Official creator page ↗</a><a href="${esc(safeUrl(p.media_url))}" target="_blank" rel="noopener noreferrer">Inspect media ↗</a></div><button class="button secondary" data-approve-post="${esc(p.id)}">Review & approve</button><button class="button subtle" data-reject-post="${esc(p.id)}">Reject</button></div>`).join('')||'<p>No media requests.</p>'}
 <p class="micro-note">Never approve media or creators based only on a claim or checkbox. Keep a secure audit of age, identity, consent, rights and removal requests.</p></div>`;
 $all('[data-approve-game]',root).forEach(b=>b.onclick=()=>moderate('experiences',b.dataset.approveGame,true));
 $all('[data-reject-game]',root).forEach(b=>b.onclick=()=>moderate('experiences',b.dataset.rejectGame,false));
 $all('[data-approve-post]',root).forEach(b=>b.onclick=()=>moderate('community_posts',b.dataset.approvePost,true));
 $all('[data-reject-post]',root).forEach(b=>b.onclick=()=>moderate('community_posts',b.dataset.rejectPost,false));
 $all('[data-verify-creator]',root).forEach(b=>b.onclick=()=>decideCreator(b.dataset.verifyCreator,true));
 $all('[data-decline-creator]',root).forEach(b=>b.onclick=()=>decideCreator(b.dataset.declineCreator,false));
}
async function decideCreator(application,approve){
 if(!core()?.admin)return;
 const evidence=approve?($('#memberToolBody [data-verification-ref="'+application+'"]')?.value?.trim()||''):'';
 if(approve&&evidence.length<8)return msg('Game building requires no approval. For public adult media, enter the real completed evidence reference first.');
 if(!confirm(approve?'You personally verified this creator is an adult, their identity and their publication rights?':'Decline this application?'))return;
 const {error}=await db().rpc('lustsino_decide_creator',{p_application:application,p_approve:approve,p_evidence_ref:evidence});
 if(error)return msg(error.message);
 msg(approve?'House Creator verified.':'Application declined.');await renderReviewTool();
}
async function moderate(table,id,approve){if(!core()?.admin)return;const okay=confirm(approve?'Confirm you have independently reviewed rights, age, consent and hosting compliance?':'Reject this submission?');if(!okay)return;const {error}=await db().from(table).update({review_status:approve?'approved':'rejected',published:approve}).eq('id',id);if(error)return msg(error.message);msg(approve?'Approved and published.':'Rejected.');await renderReviewTool();if(table==='experiences')await core().refreshRemote()}
async function scoreStart(gameId){gameRun=null;const panel=$('#scoreWidget');if(!panel)return;if(!viewer||!profile){panel.innerHTML='Sign in to earn verified points. Guests can still play.';return}if(!isUuid(gameId)){panel.innerHTML='Only published server-backed games earn ranked points.';return}const {data,error}=await db().rpc('start_lustsino_run',{p_experience:gameId});if(error){panel.textContent='Unranked: '+error.message;return}gameRun=data;panel.innerHTML='<span>Ranked game in progress</span><button class="button secondary" id="completeScore" disabled>Score unlocks in 30s</button>';const b=$('#completeScore'),ts=Date.now();const interval=setInterval(()=>{if(!document.contains(b)){clearInterval(interval);return}const t=Math.ceil(Math.max(0,30-(Date.now()-ts)/1000));b.textContent=t?`Score unlocks in ${t}s`:'Finish and claim 10 points';b.disabled=t>0;if(!t)clearInterval(interval)},300);b.onclick=async()=>{b.disabled=true;const {data:points,error}=await db().rpc('complete_lustsino_run',{p_run:gameRun});if(error){panel.textContent=error.message;return}panel.textContent='✓ Score registered. Total: '+points+' points';gameRun=null}}
window.addEventListener('lustsino:game-start',e=>{const widget=$('#scoreWidget');if(widget)widget.textContent='Preparing scoring…';scoreStart(e.detail.id);if(viewer&&profile?.show_playing&&isUuid(e.detail.id)){db().from('arcade_presence').upsert({user_id:viewer.id,experience_id:e.detail.id,visible:true,updated_at:new Date().toISOString()}).then(()=>{});}});
document.addEventListener('DOMContentLoaded',init);
})();
