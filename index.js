const {default:makeWASocket,useMultiFileAuthState,DisconnectReason,Browsers,downloadContentFromMessage,jidNormalizedUser}=require("@whiskeysockets/baileys");
const P=require("pino"),axios=require("axios"),express=require("express"),ytSearch=require("yt-search"),fs=require("fs"),path=require("path");

const PORT=process.env.PORT||3000, PREFIX=".", BOT=process.env.BOT_NAME||"MALIYA-X";
const PHONE=(process.env.PHONE_NUMBER||"94770678992").replace(/\D/g,"");
const OWNER=(process.env.OWNER_NUMBER||PHONE||"94770678992").replace(/\D/g,"");
const API=process.env.API_BASE||"https://apis.davidcyriltech.my.id";
const AUTH=path.join(__dirname,"auth_info"), MENU=path.join(__dirname,"menu.jpg");
const app=express(); app.get("/",(_,r)=>r.send(`${BOT} 🇱🇰 is running!`)); app.listen(PORT,()=>console.log(`🌐 Server running on ${PORT}`));
const log=P({level:"silent"}), menus=new Map();

const date=()=>new Date().toLocaleDateString("en-GB",{timeZone:"Asia/Colombo"});
const time=()=>new Date().toLocaleTimeString("en-US",{timeZone:"Asia/Colombo",hour12:true});
const jid=x=>jidNormalizedUser(x||"");
function text(m){let x=m.message||{};return(x.conversation||x.extendedTextMessage?.text||x.imageMessage?.caption||x.videoMessage?.caption||x.listResponseMessage?.singleSelectReply?.selectedRowId||x.buttonsResponseMessage?.selectedButtonId||"").trim()}
function raw(m){let x=m?.message||m||{};while(x.ephemeralMessage?.message)x=x.ephemeralMessage.message;while(x.viewOnceMessage?.message)x=x.viewOnceMessage.message;return x}
function quoted(m){return raw(raw(m).extendedTextMessage?.contextInfo?.quotedMessage||raw(m).imageMessage?.contextInfo?.quotedMessage||raw(m).videoMessage?.contextInfo?.quotedMessage||{})}
function pj(p){if(typeof p==="string")return p.includes("@")?p:`${p}@s.whatsapp.net`;return p?.id||p?.jid||p?.participant||""}
function num(p){return String(pj(p)).split("@")[0]}
function menu(){return `╭━━〔 👑 ${BOT} 〕━━╮
┃ 👋 ආයුබෝවන්! ${BOT} 🇱🇰
┃ 🤖 Sri Lankan WhatsApp Bot
┃ ⚡ Fast • Secure • Reliable
┃ 🕐 ${time()}  📅 ${date()}
╰━━━━━━━━━━━━━━━━━━━━━━╯

📲 පහළින් තියෙන menu එකෙන් අවශ්‍ය option එක **click** කරන්න.

👑 Powered by ${BOT} 🇱🇰`}
async function sendMenu(s,j,q){
  menus.set(j,Date.now());setTimeout(()=>menus.delete(j),300000);
  const c=menu();
  if(fs.existsSync(MENU)) await s.sendMessage(j,{image:fs.readFileSync(MENU),caption:c},{quoted:q});
  else await s.sendMessage(j,{text:c},{quoted:q});
  return s.sendMessage(j,{text:`📌 ${BOT} MENU\n\n👇 අවශ්‍ය category එක click කරන්න.`,title:`👑 ${BOT} COMMANDS`,footer:`🇱🇰 ${BOT}`,buttonText:'OPEN MENU',sections:[{title:'📂 COMMAND CATEGORIES',rows:[
    {title:'🔎 Search Menu',rowId:'menu_search',description:'Song / Video search'},
    {title:'📥 Download Menu',rowId:'menu_download',description:'Song / Video / Social / Sticker'},
    {title:'👥 Group Menu',rowId:'menu_group',description:'Group info / Tag all / Admins'},
    {title:'🤖 AI Menu',rowId:'menu_ai',description:'AI chat'},
    {title:'🛠️ Tools Menu',rowId:'menu_tools',description:'Ping / Time / Fun commands'},
    {title:'📜 Main Commands',rowId:'menu_main',description:'All available commands'}
  ]}]},{quoted:q});
}
async function ping(s,j,q){let a=process.hrtime.bigint(),m=await s.sendMessage(j,{text:"📍 Checking MALIYA-X speed..."},{quoted:q}),b=process.hrtime.bigint(),ms=Math.max(1,Number(b-a)/1e6),u=process.uptime(),h=Math.floor(u/3600),mi=Math.floor(u%3600/60),se=Math.floor(u%60),t=`╭━━〔 ⚡ ${BOT} SPEED 〕━━╮
┃ ⚡ Response Speed : ${ms} ms
┃ ⏳ Uptime : ${h}h ${mi}m ${se}s
┃ 📅 Date : ${date()}
┃ 🕐 Time : ${time()}
╰━━━━━━━━━━━━━━━━━━━━━━╯

👑 ${BOT} — Sri Lankan WhatsApp Bot 🇱🇰`;try{return await s.sendMessage(j,{text:t,edit:m.key},{quoted:q})}catch{return s.sendMessage(j,{text:t},{quoted:q})}}
async function api(url,params={},timeout=60000){return axios.get(url,{params,timeout,validateStatus:()=>true})}

async function song(s,j,q,a){if(!a)return s.sendMessage(j,{text:"🎵 භාවිතය: .song <song name>"},{quoted:q});await s.sendMessage(j,{text:"🔎 Song එක හොයනවා..."},{quoted:q});try{let r=await ytSearch(a),v=r.videos?.[0];if(!v)throw Error("not found");let x=await api(`${API}/download/ytmp3`,{url:v.url});let u=x.data?.result?.download_url;if(!u||x.status>=500)throw Error("API failed");return s.sendMessage(j,{audio:{url:u},mimetype:"audio/mpeg",fileName:v.title.replace(/[\\/:*?"<>|]/g,"_")+".mp3"},{quoted:q})}catch(e){console.error("Song:",e.message);return s.sendMessage(j,{text:"❌ Song download එක මේ වෙලාවේ වැඩ කරන්නේ නැහැ."},{quoted:q})}}
async function video(s,j,q,a){if(!a)return s.sendMessage(j,{text:"🎬 භාවිතය: .video <YouTube URL/name>"},{quoted:q});await s.sendMessage(j,{text:"📥 Video download කරනවා..."},{quoted:q});try{let u=a,title="MALIYA-X Video";if(!/^https?:\/\//i.test(u)){let r=await ytSearch(u),v=r.videos?.[0];if(!v)throw Error("not found");u=v.url;title=v.title}let x=await api(`${API}/download/ytmp4`,{url:u});let d=x.data?.result?.download_url;if(!d||x.status>=500)throw Error("API failed");return s.sendMessage(j,{video:{url:d},mimetype:"video/mp4",caption:`🎬 ${title}\n\n👑 ${BOT} 🇱🇰`},{quoted:q})}catch(e){console.error("Video:",e.message);return s.sendMessage(j,{text:"❌ Video download කරන්න බැරි වුණා. YouTube/API server එකෙන් video එක ලබාගන්න බැරි වී ඇත."},{quoted:q})}}
async function social(s,j,q,a){if(!a)return s.sendMessage(j,{text:"📥 භාවිතය: .social <URL>"},{quoted:q});try{let x=await api(`${API}/download/all`,{url:a}),d=x.data?.result||x.data,u=d?.download_url||d?.url||d?.video||d?.media;if(!u||x.status>=500)throw Error("API failed");return s.sendMessage(j,{video:{url:u},caption:`📥 Downloaded by ${BOT} 🇱🇰`,mimetype:"video/mp4"},{quoted:q})}catch(e){console.error("Social:",e.message);return s.sendMessage(j,{text:"❌ Social download එක මේ වෙලාවේ වැඩ කරන්නේ නැහැ."},{quoted:q})}}
async function sticker(s,j,m){let x=raw(m),q=quoted(m),im=x.imageMessage||q.imageMessage,vi=x.videoMessage||q.videoMessage;if(!im&&!vi)return s.sendMessage(j,{text:"🖼️ Image එකක් reply කරලා `.sticker` ගහන්න."},{quoted:m});try{let st=await downloadContentFromMessage(im||vi,im?"image":"video"),c=[];for await(const z of st)c.push(z);return s.sendMessage(j,{sticker:Buffer.concat(c)},{quoted:m})}catch(e){return s.sendMessage(j,{text:"❌ Sticker එක හදන්න බැරි වුණා."},{quoted:m})}}
async function ai(s,j,q,a){if(!a)return s.sendMessage(j,{text:"🤖 භාවිතය: .ai <question>"},{quoted:q});try{let x=await api(`${API}/ai/gemini`,{query:a},45000),r=x.data?.result||x.data?.response||x.data?.answer;if(!r)throw Error("no response");return s.sendMessage(j,{text:`🤖 ${BOT} AI\n\n${r}`},{quoted:q})}catch(e){return s.sendMessage(j,{text:"❌ AI service එක unavailable."},{quoted:q})}}

const sm={
menu_search:`╭━━〔 🔎 SEARCH MENU 〕━━╮
┃ 🎵 .song <name>
┃ 🎬 .video <name>
╰━━━━━━━━━━━━━━━━━━━━━━╯`,
menu_download:`╭━━〔 📥 DOWNLOAD MENU 〕━━╮
┃ 🎵 .song <name>
┃ 🎬 .video <url/name>
┃ 📥 .social <url>
┃ 🧩 .sticker
╰━━━━━━━━━━━━━━━━━━━━━━╯`,
menu_group:`╭━━〔 👥 GROUP MENU 〕━━╮
┃ 👥 .groupinfo
┃ 👑 .tagall
┃ 🛡️ .admins
╰━━━━━━━━━━━━━━━━━━━━━━╯`,
menu_ai:`╭━━〔 🤖 AI MENU 〕━━╮
┃ 🤖 .ai <question>
╰━━━━━━━━━━━━━━━━━━━━━━╯`,
menu_tools:`╭━━〔 🛠️ TOOLS MENU 〕━━╮
┃ ⚡ .ping
┃ 🕐 .time
┃ 😂 .joke
┃ 💡 .quote
┃ 🧠 .fact
┃ 🔥 .motivate
╰━━━━━━━━━━━━━━━━━━━━━━╯`,
menu_main:`╭━━〔 📜 MAIN COMMANDS 〕━━╮
┃ .menu  .ping  .song
┃ .video .social .sticker
┃ .ai .time .groupinfo
┃ .tagall .admins
┃ .morning .night
┃ .respect .friend
┃ .joke .quote .fact
┃ .motivate
╰━━━━━━━━━━━━━━━━━━━━━━╯`};
async function sendSubMenu(s,j,q,key){
  if(!sm[key])return;
  await s.sendMessage(j,{text:sm[key]},{quoted:q});
  const rows={
    menu_search:[
      ['🎵 Song','cmd_song','.song <name>'],['🎬 Video','cmd_video','.video <URL/name>']
    ],
    menu_download:[
      ['🎵 Song Download','cmd_song','.song <name>'],['🎬 Video Download','cmd_video','.video <URL/name>'],['📥 Social Download','cmd_social','.social <URL>'],['🧩 Sticker','cmd_sticker','Image/video එකක් reply කරලා']
    ],
    menu_group:[
      ['👥 Group Info','cmd_groupinfo','Group details'],['📢 Tag All','cmd_tagall','සියලු members tag කරන්න'],['🛡️ Admins','cmd_admins','Group admins']
    ],
    menu_ai:[['🤖 AI Chat','cmd_ai','.ai <question>']],
    menu_tools:[
      ['⚡ Ping','cmd_ping','Speed test'],['🕐 Time','cmd_time','Date & time'],['😂 Joke','cmd_joke','Random joke'],['💡 Quote','cmd_quote','Motivational quote'],['🧠 Fact','cmd_fact','Fun fact'],['🔥 Motivate','cmd_motivate','Motivation']
    ],
    menu_main:[
      ['⚡ Ping','cmd_ping','Speed test'],['🕐 Time','cmd_time','Date & time'],['🎵 Song','cmd_song','.song <name>'],['🎬 Video','cmd_video','.video <URL/name>'],['📥 Social','cmd_social','.social <URL>'],['🧩 Sticker','cmd_sticker','Reply to image/video'],['🤖 AI','cmd_ai','.ai <question>'],['👥 Group Info','cmd_groupinfo','Group details'],['📢 Tag All','cmd_tagall','Tag everyone'],['🛡️ Admins','cmd_admins','Group admins'],['🌅 Morning','cmd_morning','Good morning'],['🌙 Night','cmd_night','Good night'],['❤️ Respect','cmd_respect','Respect'],['🤝 Friend','cmd_friend','Friends'],['😂 Joke','cmd_joke','Joke'],['💡 Quote','cmd_quote','Quote'],['🧠 Fact','cmd_fact','Fact'],['🔥 Motivate','cmd_motivate','Motivation']
    ]
  }[key]||[];
  return s.sendMessage(j,{text:'👇 Command එක click කරන්න. Number ගහන්න ඕන නෑ.',buttonText:'CLICK COMMAND',sections:[{title:'📲 AVAILABLE COMMANDS',rows:rows.map(r=>({title:r[0],rowId:r[1],description:r[2]}))}]},{quoted:q});
}

async function handleMenuCommand(s,j,m,id){
  switch(id){
    case'cmd_ping': return ping(s,j,m);
    case'cmd_time': return s.sendMessage(j,{text:`🕐 Time: ${time()}\n📅 Date: ${date()}\n\n👑 ${BOT} 🇱🇰`},{quoted:m});
    case'cmd_song': return s.sendMessage(j,{text:'🎵 භාවිතය: .song <song name>\n\nඋදා: .song Lelena'},{quoted:m});
    case'cmd_video': return s.sendMessage(j,{text:'🎬 භාවිතය: .video <YouTube URL/name>'},{quoted:m});
    case'cmd_social': return s.sendMessage(j,{text:'📥 භාවිතය: .social <URL>'},{quoted:m});
    case'cmd_sticker': return sticker(s,j,m);
    case'cmd_ai': return s.sendMessage(j,{text:'🤖 භාවිතය: .ai <question>'},{quoted:m});
    case'cmd_groupinfo': return s.sendMessage(j,{text:'.groupinfo'},{quoted:m});
    case'cmd_tagall': return s.sendMessage(j,{text:'.tagall'},{quoted:m});
    case'cmd_admins': return s.sendMessage(j,{text:'.admins'},{quoted:m});
    case'cmd_morning': return s.sendMessage(j,{text:'🌅 Good Morning! ❤️\n\nසුභ උදෑසනක්! 🇱🇰'},{quoted:m});
    case'cmd_night': return s.sendMessage(j,{text:'🌙 Good Night! ❤️\n\nසුභ රාත්‍රියක්! 😴'},{quoted:m});
    case'cmd_respect': return s.sendMessage(j,{text:'❤️ Respect! 🤝'},{quoted:m});
    case'cmd_friend': return s.sendMessage(j,{text:'🤝 Friends forever! ❤️🔥'},{quoted:m});
    case'cmd_joke': return s.sendMessage(j,{text:'😂 Teacher: Homework කළාද?\nStudent: Sir, WiFi තිබුණේ නෑ. 😭😂'},{quoted:m});
    case'cmd_quote': return s.sendMessage(j,{text:'💡 Small steps every day become big results. 🔥'},{quoted:m});
    case'cmd_fact': return s.sendMessage(j,{text:'🧠 Fact: Octopus එකකට hearts 3ක් තියෙනවා. 🐙❤️'},{quoted:m});
    case'cmd_motivate': return s.sendMessage(j,{text:'🔥 Don\'t give up! අද අමාරු වුණත් හෙට ජයග්‍රහණයක් වෙන්න පුළුවන්. 💪'},{quoted:m});
  }
}

async function start(){const{state,saveCreds}=await useMultiFileAuthState(AUTH);const s=makeWASocket({auth:state,logger:log,browser:Browsers.macOS("Chrome"),markOnlineOnConnect:false,syncFullHistory:false,generateHighQualityLinkPreview:true});s.ev.on("creds.update",saveCreds);
s.ev.on("connection.update",async({connection,lastDisconnect})=>{if(connection==="open"){console.log(`👑 ${BOT} ONLINE 🇱🇰`);try{const owner=(process.env.OWNER_NUMBER||PHONE).replace(/\D/g,"");if(owner){const jidOwner=`${owner}@s.whatsapp.net`;await s.sendMessage(jidOwner,{text:`╭━━〔 👑 ${BOT} 〕━━╮
┃ ✅ WhatsApp Bot Connected!
┃ 🟢 Status : ONLINE
┃ 🤖 Bot : ${BOT}
┃ 📅 Date : ${date()}
┃ 🕐 Time : ${time()}
┃ 🌐 Platform : Render
╰━━━━━━━━━━━━━━━━━━━━━━╯

🔥 ${BOT} දැන් සාර්ථකව WhatsApp එකට connect වී ඇත.
🚀 Bot එක ready!

👑 Powered by ${BOT} 🇱🇰`});console.log("📩 Connection message sent to:",owner)}}catch(e){console.error("Connection message:",e.message)}}if(connection==="close"){let c=lastDisconnect?.error?.output?.statusCode||lastDisconnect?.error?.statusCode;if(c!==DisconnectReason.loggedOut)setTimeout(start,3000);else console.log("🚪 Logged out.")}});
if(!state.creds.registered&&PHONE)setTimeout(async()=>{try{console.log("🔐 PAIRING CODE:",await s.requestPairingCode(PHONE))}catch(e){console.error("Pairing:",e.message)}},5000);

s.ev.on("group-participants.update",async a=>{
  try{
    const g=await s.groupMetadata(a.id);
    for(const p of a.participants||[]){
      const x=pj(p),n=num(p); if(!x||!n)continue;
      if(a.action==="add") await s.sendMessage(a.id,{text:`╭━━〔 👋 WELCOME 〕━━╮
┃ 🎉 Welcome @${n}!
┃ 👑 ${BOT} 🇱🇰
╰━━━━━━━━━━━━━━━━━━━━━━╯

🏠 Group : ${g.subject}
📅 Date : ${date()}
🕐 Time : ${time()}

❤️ අපේ group එකට සාදරයෙන් පිළිගන්නවා!
✨ Rules follow කරලා හොඳින් ඉන්න.

👑 Powered by ${BOT} 🇱🇰`,mentions:[x]});
      if(a.action==="remove") await s.sendMessage(a.id,{text:`╭━━〔 👋 GOODBYE 〕━━╮
┃ @${n} group එකෙන් ඉවත් වුණා.
┃ 👑 ${BOT} 🇱🇰
╰━━━━━━━━━━━━━━━━━━━━━━╯

🏠 Group : ${g.subject}
📅 Date : ${date()}
🕐 Time : ${time()}

💔 අපිව මතක් වෙයි. නැවත එන්න! ❤️`,mentions:[x]});
      if(a.action==="promote") await s.sendMessage(a.id,{text:`👑 @${n} දැන් group admin කෙනෙක්!\n\n🏠 ${g.subject}\n🤖 ${BOT} 🇱🇰`,mentions:[x]});
      if(a.action==="demote") await s.sendMessage(a.id,{text:`🔻 @${n} admin තනතුරෙන් ඉවත් කර ඇත.\n\n🏠 ${g.subject}\n🤖 ${BOT} 🇱🇰`,mentions:[x]});
    }
  }catch(e){console.error("Group update:",e.message)}
});

s.ev.on("messages.upsert",async({messages})=>{let m=messages?.[0];if(!m||m.key.fromMe)return;try{let j=m.key.remoteJid,t=text(m),l=t.toLowerCase().trim();if(!j||!t)return;
const selected=t.trim();
if(/^menu_(search|download|group|ai|tools|main)$/.test(selected)&&menus.has(j)&&Date.now()-menus.get(j)<300000){
  return sendSubMenu(s,j,m,selected);
}
if(/^cmd_/.test(selected)&&menus.has(j)&&Date.now()-menus.get(j)<300000){
  return handleMenuCommand(s,j,m,selected);
}
if(/^[1-6]$/.test(l)&&menus.has(j)&&Date.now()-menus.get(j)<300000){
  const map={1:'menu_search',2:'menu_download',3:'menu_group',4:'menu_ai',5:'menu_tools',6:'menu_main'};
  return sendSubMenu(s,j,m,map[l]);
}
if(!l.startsWith(PREFIX))return;let [c,...z]=t.trim().split(/\s+/),a=z.join(" ");
switch(c.toLowerCase()){
case".menu":case".help":case".start":return sendMenu(s,j,m);
case".ping":return ping(s,j,m);
case".song":case".audio":return song(s,j,m,a);
case".video":case".ytdl":return video(s,j,m,a);
case".social":case".dl":return social(s,j,m,a);
case".sticker":case".s":return sticker(s,j,m);
case".ai":return ai(s,j,m,a);
case".time":return s.sendMessage(j,{text:`🕐 Time: ${time()}\n📅 Date: ${date()}\n\n👑 ${BOT} 🇱🇰`},{quoted:m});
case".morning":return s.sendMessage(j,{text:"🌅 Good Morning! ❤️\n\nසුභ උදෑසනක්! 🇱🇰"},{quoted:m});
case".night":return s.sendMessage(j,{text:"🌙 Good Night! ❤️\n\nසුභ රාත්‍රියක්! 😴"},{quoted:m});
case".respect":return s.sendMessage(j,{text:"❤️ Respect! 🤝"},{quoted:m});
case".friend":return s.sendMessage(j,{text:"🤝 Friends forever! ❤️🔥"},{quoted:m});
case".joke":return s.sendMessage(j,{text:"😂 Teacher: Homework කළාද?\nStudent: Sir, WiFi තිබුණේ නෑ. 😭😂"},{quoted:m});
case".quote":return s.sendMessage(j,{text:"💡 Small steps every day become big results. 🔥"},{quoted:m});
case".fact":return s.sendMessage(j,{text:"🧠 Fact: Octopus එකකට hearts 3ක් තියෙනවා. 🐙❤️"},{quoted:m});
case".motivate":return s.sendMessage(j,{text:"🔥 Don't give up! අද අමාරු වුණත් හෙට ජයග්‍රහණයක් වෙන්න පුළුවන්. 💪"},{quoted:m});
case".groupinfo":{if(!j.endsWith("@g.us"))return s.sendMessage(j,{text:"❌ Group එකකදී විතරයි."},{quoted:m});let g=await s.groupMetadata(j),ad=g.participants.filter(p=>p.admin).length;return s.sendMessage(j,{text:`╭━━〔 👥 GROUP INFO 〕━━╮\n┃ 🏷️ ${g.subject}\n┃ 👥 Members: ${g.participants.length}\n┃ 👑 Admins: ${ad}\n╰━━━━━━━━━━━━━━━━━━━━━━╯`},{quoted:m})}
case".admins":{if(!j.endsWith("@g.us"))return s.sendMessage(j,{text:"❌ Group එකකදී විතරයි."},{quoted:m});let g=await s.groupMetadata(j),ps=g.participants.filter(p=>p.admin),ms=ps.map(p=>pj(p)).filter(Boolean);return s.sendMessage(j,{text:"👑 GROUP ADMINS\n\n"+ps.map(p=>"👑 @"+num(p)).join("\n"),mentions:ms},{quoted:m})}
case".tagall":{if(!j.endsWith("@g.us"))return s.sendMessage(j,{text:"❌ Group එකකදී විතරයි."},{quoted:m});let g=await s.groupMetadata(j),ps=g.participants,ms=ps.map(p=>pj(p)).filter(Boolean);return s.sendMessage(j,{text:"📢 GROUP MEMBERS\n\n"+ps.map((p,i)=>`${i+1}. @${num(p)}`).join("\n"),mentions:ms},{quoted:m})}
}}
catch(e){console.error("Handler:",e.message)}})}
start().catch(e=>{console.error("Fatal:",e);setTimeout(start,5000)});
