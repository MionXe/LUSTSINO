
import { createClient } from "npm:@supabase/supabase-js@2.55.0";
import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "npm:@aws-sdk/client-s3@3.800.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.800.0";

const apiUrl = Deno.env.get("SUPABASE_URL") || "";
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const allowed = Deno.env.get("LUSTSINO_ALLOWED_ORIGIN") || "https://lustsino.vercel.app";
const bucket = Deno.env.get("BUNNY_STORAGE_ZONE") || "lustsino-media";
const endpoint = Deno.env.get("BUNNY_S3_ENDPOINT") || "https://ny-s3.storage.bunnycdn.com";
const accessKeyId = Deno.env.get("BUNNY_S3_ACCESS_KEY_ID") || "";
const secretAccessKey = Deno.env.get("BUNNY_S3_SECRET_ACCESS_KEY") || "";
const cdnBase = (Deno.env.get("BUNNY_CDN_BASE_URL") || "").replace(/\/$/, "");
const mimeExtensions: Record<string,string> = {
  "image/webp":"webp", "image/jpeg":"jpg", "image/png":"png", "image/gif":"gif",
  "video/mp4":"mp4", "video/webm":"webm"
};
const h = (origin: string) => ({
  "Content-Type":"application/json",
  "Access-Control-Allow-Origin":origin === allowed ? allowed : "null",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
  "Vary":"Origin",
  "Cache-Control":"no-store"
});
const response = (origin:string, data:unknown, status=200) => new Response(JSON.stringify(data),{status,headers:h(origin)});
const safeUrl = (key:string) => cdnBase && /^https:\/\//.test(cdnBase)
  ? cdnBase + "/" + key.split("/").map(encodeURIComponent).join("/")
  : null;
const s3 = () => {
  if (!accessKeyId || !secretAccessKey) throw new Error("Storage is not configured yet");
  return new S3Client({
    region:"ny",endpoint,forcePathStyle:true,
    credentials:{accessKeyId,secretAccessKey},
    requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED"
  });
};
Deno.serve(async (request:Request) => {
  const origin = request.headers.get("origin")||"";
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:h(origin)});
  if(origin!==allowed) return response(origin,{error:"Origin not allowed"},403);
  if(request.method!=="POST") return response(origin,{error:"Use POST"},405);
  if(!secret || !apiUrl) return response(origin,{error:"Upload service awaiting backend configuration"},503);
  const token = (request.headers.get("authorization")||"").match(/^Bearer (.+)$/i)?.[1];
  if(!token) return response(origin,{error:"Sign in required"},401);
  try {
    const db=createClient(apiUrl,secret,{auth:{autoRefreshToken:false,persistSession:false}});
    const {data:{user},error:authError}=await db.auth.getUser(token);
    if(authError||!user) return response(origin,{error:"Session expired. Sign in again."},401);
    const [{data:profile},{data:master}]=await Promise.all([
      db.from("member_profiles").select("creator_status,terms_version").eq("user_id",user.id).maybeSingle(),
      db.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle()
    ]);
    const admin=!!master;
    if(!admin && (profile?.creator_status!=="verified" || profile?.terms_version!=="2026-11-17"))
      return response(origin,{error:"Your House Creator verification and current Terms are required for uploads"},403);
    const payload=await request.json();
    const action=String(payload?.action||"");
    if(action==="health") return response(origin,{
      ready:!!accessKeyId && !!secretAccessKey && !!cdnBase,
      storageConfigured:!!accessKeyId && !!secretAccessKey,
      deliveryConfigured:!!cdnBase,
      storageZone:bucket
    });
    const client=s3();
    if(action==="presign"){
      const type=String(payload?.type||""),bytes=Number(payload?.size);
      const rights=String(payload?.rightsRef||"").trim().slice(0,200);
      const ext=mimeExtensions[type],limit=type.startsWith("video/")?52428800:20971520;
      if(!ext || !Number.isInteger(bytes) || bytes<1 || bytes>limit)
        return response(origin,{error:"Unsupported format or file exceeds the upload limit"},400);
      if(rights.length<3)return response(origin,{error:"Supply the written permission reference"},400);
      const since=new Date(Date.now()-86400000).toISOString();
      const {count,error:quotaError}=await db.from("bunny_media_uploads").select("id",{count:"exact",head:true})
        .eq("uploader_id",user.id).gte("created_at",since);
      if(quotaError)throw quotaError;
      if((count||0)>=24)return response(origin,{error:"Daily upload allowance reached"},429);
      const id=crypto.randomUUID(),key="incoming/"+user.id+"/"+id+"."+ext;
      const {error:insertError}=await db.from("bunny_media_uploads").insert({
        id,uploader_id:user.id,object_key:key,mime_type:type,
        expected_bytes:bytes,rights_ref:rights,status:"issued"
      });
      if(insertError)throw insertError;
      const putUrl=await getSignedUrl(client,new PutObjectCommand({
        Bucket:bucket,Key:key,ContentType:type
      }),{expiresIn:120});
      return response(origin,{uploadId:id,method:"PUT",uploadUrl:putUrl,contentType:type,expiresIn:120});
    }
    if(action==="finalize"){
      const id=String(payload?.uploadId||"");
      if(!/^[0-9a-f-]{36}$/i.test(id))return response(origin,{error:"Invalid upload ID"},400);
      const {data:record,error:recordError}=await db.from("bunny_media_uploads").select("*")
        .eq("id",id).eq("uploader_id",user.id).maybeSingle();
      if(recordError||!record)return response(origin,{error:"Upload record not found"},404);
      if(record.status!=="issued" && record.status!=="uploaded")return response(origin,{error:"Upload unavailable"},409);
      const meta=await client.send(new HeadObjectCommand({Bucket:bucket,Key:record.object_key}));
      const actual=Number(meta.ContentLength);
      if(actual!==Number(record.expected_bytes)) return response(origin,{error:"Uploaded file size does not match the authorized request"},409);
      const url=safeUrl(record.object_key);
      const {error:updateError}=await db.from("bunny_media_uploads").update({
        status:"uploaded",stored_bytes:actual,cdn_url:url,completed_at:new Date().toISOString()
      }).eq("id",id).eq("uploader_id",user.id);
      if(updateError)throw updateError;
      return response(origin,{uploadId:id,status:"uploaded",objectKey:record.object_key,
        url,deliveryReady:!!url});
    }
    if(action==="list"){
      if(!admin)return response(origin,{error:"Master access required"},403);
      const rawPrefix=String(payload?.prefix||"").trim();
      const prefix=rawPrefix && /^[a-zA-Z0-9/_-]{1,80}$/.test(rawPrefix)?rawPrefix:"";
      const token=String(payload?.continuationToken||"");
      const data=await client.send(new ListObjectsV2Command({
        Bucket:bucket,Prefix:prefix,MaxKeys:60,
        ...(token?{ContinuationToken:token}:{})
      }));
      return response(origin,{items:(data.Contents||[]).filter(x=>x.Key&&!x.Key.endsWith("/")).map(x=>({
        key:x.Key,size:x.Size,modified:x.LastModified?.toISOString(),url:safeUrl(x.Key!)
      })),next:data.NextContinuationToken||null,deliveryReady:!!cdnBase});
    }
    return response(origin,{error:"Unknown action"},400);
  }catch(error){
    const msg=error instanceof Error?error.message:"Upload failed";
    const setup=/not configured|credentials|AccessKey/i.test(msg);
    return response(origin,{error:setup?"Storage credentials must be configured by the site owner":"Upload service failed. Please try again."},setup?503:500);
  }
});
