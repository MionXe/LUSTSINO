/* LUSTSINO shared authenticated Bunny uploader. Never includes storage credentials. */
(()=>{'use strict';
 const api=()=>window.VYRA_CONFIG?.uploadEndpoint;
 const client=()=>window.LUSTSINO_CORE?.client;
 const supported=new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg']);
 const maxByType=t=>t.startsWith('video/')?50*1024*1024:20*1024*1024;
 async function upload(file,rightsReference,onProgress=()=>{}){
  if(!(file instanceof File))throw Error('Choose an image, GIF, or short video first.');
  if(!supported.has(file.type))throw Error('Choose JPEG, PNG, WebP, GIF, MP4, or WebM.');
  if(!Number.isFinite(file.size)||file.size<1||file.size>maxByType(file.type))
   throw Error('This file exceeds the upload size limit.');
  const rightsRef=String(rightsReference||'').trim();
  if(rightsRef.length<3)throw Error('Enter the documented rights/permission reference.');
  if(!client()||!api())throw Error('The file service is not available.');
  const {data:{session}}=await client().auth.getSession();
  if(!session)throw Error('Sign in to upload.');
  let prepared=file;
  if(['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size<20*1024*1024&&typeof createImageBitmap==='function'){
   try{
    onProgress('Optimizing image…');
    const bitmap=await createImageBitmap(file),scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.88));
    bitmap.close();
    if(blob&&blob.size>0)prepared=new File([blob],file.name.replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp'});
   }catch(error){console.warn('Media optimization unavailable',error)}
  }
  const call=async payload=>{
   const response=await fetch(api(),{
    method:'POST',headers:{'Content-Type':'application/json',apikey:window.VYRA_CONFIG.supabaseAnonKey,
      Authorization:'Bearer '+session.access_token},
    body:JSON.stringify(payload)
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||'Upload service request failed: '+response.status);
   return data;
  };
  onProgress('Preparing secure upload…');
  const grant=await call({action:'presign',type:prepared.type,size:prepared.size,rightsRef});
  onProgress('Uploading media…');
  const written=await fetch(grant.uploadUrl,{method:'PUT',headers:{'Content-Type':grant.contentType},body:prepared});
  if(!written.ok)throw Error('Bunny Storage rejected the file (HTTP '+written.status+'). Check S3 CORS.');
  onProgress('Confirming stored media…');
  const stored=await call({action:'finalize',uploadId:grant.uploadId});
  if(!stored.url)throw Error('File was stored, but a usable Bunny CDN hostname is not configured.');
  onProgress('Upload complete.');
  return {url:stored.url,uploadId:stored.uploadId,mime:prepared.type,originalName:file.name};
 }
 window.LUSTSINO_UPLOAD={upload};
})();