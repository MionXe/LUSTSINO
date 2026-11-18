/* LUSTSINO site designer — safe, admin-only text/image/audio customization.
   Database row-level security, not hidden UI, authorizes changes. */
(()=>{'use strict';
 const core=()=>window.LUSTSINO_CORE;
 const db=()=>core()?.client;
 const $=s=>document.querySelector(s);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const allowedUrl=s=>{try{let u=new URL(s);return u.protocol==='https:'?u.href:''}catch{return ''}};
 const names={
  hero_eyebrow:'Hero eyebrow',hero_caption:'Hero description',hero_image_url:'Hero background image / GIF URL',
  hero_primary_label:'Primary hero button',hero_secondary_label:'Secondary hero button',
  featured_title:'Game-carousel heading',feed_heading:'Feed heading',
  feed_caption:'Feed subtitle',arcade_caption:'Game-carousel subtitle',
  logo_image_url:'Site logo image / GIF URL',community_banner_url:'Community section image / GIF URL',
  community_heading:'Community section heading',community_description:'Community description',
  community_button_label:'Community section button label'
 };
 let settings={},tracks=[],playingIndex=0;
 function textSet(selector,value){
  const target=$(selector);
  if(target&&value)target.textContent=value;
 }
 function apply(){
  textSet('#view-home .kicker',settings.hero_eyebrow);
  textSet('#view-home .hero-left>p',settings.hero_caption);
  textSet('#view-home .hero-actions .hero-start',settings.hero_primary_label);
  textSet('#view-home .hero-actions .button.secondary',settings.hero_secondary_label);
  textSet('#view-home .section-top h2',settings.featured_title);
  textSet('#view-home .section-top p',settings.arcade_caption);
  textSet('#view-feed .subheading h1',settings.feed_heading);
  textSet('#view-feed .subheading p',settings.feed_caption);
  textSet('#view-home .community-showcase h2',settings.community_heading);
  textSet('#view-home .community-showcase p',settings.community_description);
  textSet('#view-home .community-showcase .button',settings.community_button_label);
  if(allowedUrl(settings.logo_image_url))document.querySelectorAll('.identity img').forEach(el=>el.src=allowedUrl(settings.logo_image_url));
  if(allowedUrl(settings.community_banner_url)&&$('#view-home .community-showcase img'))$('#view-home .community-showcase img').src=allowedUrl(settings.community_banner_url);
  const art=$('#view-home .hero-photo');
  if(art&&allowedUrl(settings.hero_image_url)){
   art.style.backgroundImage='linear-gradient(90deg,#100d1480,#1a0e1442),url("'+allowedUrl(settings.hero_image_url).replace(/"/g,'')+'")';
   art.style.backgroundSize='cover';art.style.backgroundPosition='center';
  }
  configureMusic();
 }
 function configureMusic(){
  const player=$('#ambientMusic');
  if(!player)return;
  const active=tracks.filter(x=>x.active).sort((a,b)=>a.sort_order-b.sort_order);
  if(!active.length){
   const original=$('#defaultMusicAttribution');if(original)original.hidden=false;
   const defaultAudio=new URL('assets/audio/saavane-tuesday-321650.mp3',location.href).href;
   if(player.src!==defaultAudio){const wasPlaying=!player.paused;player.src=defaultAudio;player.load();if(wasPlaying)void player.play().catch(()=>{});}
   player.loop=true;player.onended=null;const label=$('#currentTrackLabel');if(label)label.textContent='';return;
  }
  const original=$('#defaultMusicAttribution');if(original)original.hidden=true;
  const prev=player.currentSrc||player.src;
  if(playingIndex>=active.length)playingIndex=0;
  let next=allowedUrl(active[playingIndex].audio_url);
  if(!next)return;
  const wasPlaying=!player.paused;
  if(prev!==next){player.src=next;player.load();if(wasPlaying)void player.play().catch(()=>{})}
  player.loop=settings.playlist_mode!=='rotate'||active.length===1;
  player.onended=()=>{
   if(settings.playlist_mode!=='rotate'||active.length<2)return;
   playingIndex=(playingIndex+1)%active.length;
   const selected=allowedUrl(active[playingIndex].audio_url);
   if(!selected)return;
   player.src=selected;player.load();
   const info=$('#currentTrackLabel');
   if(info)info.textContent='Playing: '+String(active[playingIndex].title||'Soundtrack')+
     (active[playingIndex].credit?' · '+active[playingIndex].credit:'');
   void player.play().catch(()=>{});
  };
  let label=$('#currentTrackLabel');
  if(!label){label=document.createElement('span');label.id='currentTrackLabel';label.className='site-now-playing';$('.music-credit')?.appendChild(label);}
  if(label)label.textContent='Playing: '+String(active[playingIndex].title||'Soundtrack')+
   (active[playingIndex].credit?' · '+active[playingIndex].credit:'');
 }
 async function load(){
  if(!db())return;
  const [a,b]=await Promise.all([
   db().from('site_content').select('key,value'),
   db().from('site_playlist').select('id,title,audio_url,credit,active,sort_order').order('sort_order',{ascending:true})
  ]);
  if(a.error||b.error){console.warn('Site customization unavailable',a.error||b.error);return}
  settings=Object.fromEntries((a.data||[]).map(x=>[x.key,x.value]));
  tracks=b.data||[];
  apply();
 }
 async function renderMaster(root){
  if(!core()?.admin||!db()){root.textContent='Master authorization required.';return}
  await load();
  const fields=Object.entries(names).map(([k,label])=>
   '<label class="site-edit-field"><span>'+escape(label)+'</span>'+
   (['hero_caption','feed_caption','arcade_caption','community_description'].includes(k)?
    '<textarea name="'+k+'" rows="3" maxlength="900">'+escape(settings[k]||'')+'</textarea>':
    '<input name="'+k+'" '+(['hero_image_url','logo_image_url','community_banner_url'].includes(k)?'type="url" placeholder="https://...gif or webp"':'type="text"')+' value="'+escape(settings[k]||'')+'" maxlength="900">')+
   '</label>').join('');
  root.innerHTML='<div class="site-editor-master"><span class="overline">LUSTSINO MASTERS</span><h2>Site designer</h2>'+
  '<p>Edit public copy, homepage art and the audio queue. Changes are saved to Supabase and applied to all visitors.</p>'+
  '<form id="siteDesignerForm" class="site-designer-form">'+fields+
  '<label>Upload image/GIF to a site slot<select id="siteAssetTarget"><option value="hero_image_url">Hero background</option><option value="community_banner_url">Community section image</option><option value="logo_image_url">Site logo</option></select></label>'+  '<label>Image or GIF file<input type="file" id="siteHeroFile" accept="image/png,image/jpeg,image/webp,image/gif"></label>'+
  '<label>Rights/license reference for any new upload<input id="siteHeroRights" placeholder="Required for upload"></label>'+
  '<p id="siteUploadStatus" aria-live="polite"></p><div class="studio-actions"><button class="button primary" type="submit">Save site changes</button></div></form>'+
  '<section class="site-playlist-editor"><h3>Background soundtrack</h3>'+
  '<label>Play mode<select id="sitePlaylistMode"><option value="single"'+(settings.playlist_mode==='single'?' selected':'')+'>Repeat one track</option>'+
  '<option value="rotate"'+(settings.playlist_mode==='rotate'?' selected':'')+'>Rotate active queue</option></select></label>'+
  '<div id="siteTrackList">'+tracks.map(t=>'<div class="site-track-line"><div><b>'+escape(t.title)+'</b>'+
  '<small>'+escape(t.credit||'')+'</small><small>'+escape(t.audio_url)+'</small></div>'+
  '<label>On <input type="checkbox" data-track-active="'+escape(t.id)+'"'+(t.active?' checked':'')+'></label>'+
  '<button type="button" class="button subtle" data-track-remove="'+escape(t.id)+'">Remove</button></div>').join('')+'</div>'+
  '<form id="siteTrackForm" class="site-designer-form"><label>Track name<input name="title" required maxlength="120"></label>'+
  '<label>Existing MP3 HTTPS URL (optional)<input type="url" name="audio_url" placeholder="https://.../soundtrack.mp3"></label>'+  '<label>Or upload an MP3<input type="file" id="siteTrackFile" accept="audio/mpeg,.mp3"></label>'+  '<label>Audio license or permission reference<input id="siteTrackRights" placeholder="Required to upload"></label>'+
  '<label>Music credit / attribution<input name="credit" maxlength="200" placeholder="Creator, license"></label>'+
  '<label>Queue order<input type="number" name="sort_order" min="0" max="10000" value="10"></label>'+
  '<button type="submit" class="button secondary">Add soundtrack</button></form></section></div>';
  const hero=$('#siteHeroFile');hero.onchange=()=>{const f=hero.files?.[0];if(f)$('#siteUploadStatus').textContent=f.name+' selected. The upload happens when you save.'};
  $('#siteDesignerForm').onsubmit=async e=>{
   e.preventDefault();const submit=e.submitter;submit.disabled=true;
   try{
    const form=new FormData(e.currentTarget);
    const updates=Object.keys(names).map(key=>({key,value:String(form.get(key)||'').trim()}));
    for(const entry of updates){if(['hero_image_url','logo_image_url','community_banner_url'].includes(entry.key)&&entry.value&&!allowedUrl(entry.value))throw Error('Image URLs must use HTTPS.');}
    const target=$('#siteAssetTarget').value;
    let image=updates.find(x=>x.key===target);
    const f=$('#siteHeroFile').files?.[0];
    if(f){const status=$('#siteUploadStatus');const ref=$('#siteHeroRights').value.trim();
     if(f.type.startsWith('video/'))throw Error('Use an image or GIF for this site slot.');
     const out=await window.LUSTSINO_UPLOAD.upload(f,ref,x=>status.textContent=x);
     image.value=out.url;
    }
    for(const entry of updates){
     const {error}=await db().from('site_content').upsert(entry,{onConflict:'key'});if(error)throw error;
    }
    core().notify('Public site changes saved.');await renderMaster(root);
   }catch(error){core().notify(error.message||'Could not save site changes.')}
   finally{if(submit.isConnected)submit.disabled=false}
  };
  $('#sitePlaylistMode').onchange=async e=>{
   const {error}=await db().from('site_content').upsert({key:'playlist_mode',value:e.target.value},{onConflict:'key'});
   if(error)return core().notify(error.message);await renderMaster(root);
  };
  root.querySelectorAll('[data-track-active]').forEach(check=>check.onchange=async()=>{
   const {error}=await db().from('site_playlist').update({active:check.checked}).eq('id',check.dataset.trackActive);
   if(error){check.checked=!check.checked;return core().notify(error.message)}await load();
  });
  root.querySelectorAll('[data-track-remove]').forEach(button=>button.onclick=async()=>{
   if(!confirm('Remove this track from the queue?'))return;
   const {error}=await db().from('site_playlist').delete().eq('id',button.dataset.trackRemove);
   if(error)return core().notify(error.message);await renderMaster(root);
  });
  $('#siteTrackForm').onsubmit=async e=>{
   e.preventDefault();const form=new FormData(e.currentTarget);
   let url=allowedUrl(form.get('audio_url'));const file=$('#siteTrackFile')?.files?.[0];
   try{if(file){const result=await window.LUSTSINO_UPLOAD.upload(file,$('#siteTrackRights')?.value||'',text=>core().notify(text));url=result.url;}}
   catch(error){return core().notify(error.message||'Audio upload failed.')}
   if(!url)return core().notify('Enter an HTTPS audio URL or choose an MP3 to upload.');
   const payload={title:String(form.get('title')).trim(),audio_url:url,
     credit:String(form.get('credit')||'').trim(),sort_order:Number(form.get('sort_order'))||10,active:true};
   const {error}=await db().from('site_playlist').insert(payload);
   if(error)return core().notify(error.message);await renderMaster(root);
  };
 }
 window.LUSTSINO_SITE_EDITOR={load,renderMaster};
 window.addEventListener('lustsino:backend-ready',load);
 document.addEventListener('DOMContentLoaded',()=>setTimeout(load,1000));
})();