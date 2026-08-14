/**
 * MALIYA-X V2 🇱🇰
 * Render + WhatsApp MD bot
 *
 * Commands:
 * .menu .ping .time .ai
 * .song/.audio <YouTube URL or search>
 * .video/.ytdl <YouTube URL or search> [360|480|720]
 * .sticker/.s (reply to image or send image with caption)
 * .joke .fact .quote .motivate .life .challenge
 * .movie <name>
 * .groupinfo .tagall .admins .link
 * .gm .gn
 *
 * IMPORTANT:
 * - Put PHONE_NUMBER in Render Environment Variables.
 * - Do NOT commit .env/session to GitHub.
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadContentFromMessage,
  Browsers
} = require("@whiskeysockets/baileys");
const P = require("pino");
const axios = require("axios");
const express = require("express");
const ytSearch = require("yt-search");
const ytdl = require("@distube/ytdl-core");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_, res) => res.send("MALIYA-X V2 🇱🇰 ONLINE"));
app.get("/health", (_, res) => res.json({ ok: true, bot: "MALIYA-X V2" }));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

const PHONE_NUMBER = String(process.env.PHONE_NUMBER || "").replace(/\D/g, "");
const PREFIX = ".";
const SESSION_DIR = "./session";
const MENU_IMAGE = path.join(__dirname, "menu.png");

let sock;
let reconnecting = false;

const fun = {
  joke: [
    "😂 ගුරුවරයා: 'ඇයි පොත ගෙනාවේ නැත්තේ?' ළමයා: 'සර්, පොතටත් අද නිවාඩු ඕනේ කිව්වා!' 😭",
    "😂 යාළුවා: 'මචං උඹ online ද?' මම: 'නෑ බං, phone එක online!' 🤣",
    "😂 Alarm එකට වඩා අපේ 'තව විනාඩි 5යි' කියන බොරුව බලවත්! 😴"
  ],
  fact: [
    "💡 මිනිස් හදවත දවසකට සාමාන්‍යයෙන් 100,000 වාරයක් පමණ ගැහෙනවා.",
    "💡 Octopus එකකට හදවත් 3ක් තියෙනවා.",
    "💡 මී මැස්සන්ට මිනිසුන්ගේ මුහුණු වෙනස් කර හඳුනාගන්න පුළුවන්."
  ],
  quote: [
    "💬 'කුඩා පියවරක් වුණත් ඉදිරියට යන පියවරක් නම් වටිනවා.'",
    "💬 'ඔයාගේ ගමන වෙන කෙනෙකුගේ ගමනත් එක්ක compare කරන්න එපා.'",
    "💬 'අද කරන උත්සාහය තමයි හෙට ලැබෙන ප්‍රතිඵලයේ පදනම.'"
  ],
  motivate: [
    "🔥 අද බැරි වුණා කියන්නේ සදහටම බැරි කියන එක නෙවෙයි. නැවත උත්සාහ කරන්න!",
    "🔥 Slow progress is still progress. අතහරින්න එපා! 💪",
    "🔥 ඔයාට පුළුවන්. එක පියවරක් බැගින් යන්න. 🇱🇰❤️"
  ],
  life: [
    "❤️ ජීවිතේ ලස්සන වෙන්නේ perfect වුණාම නෙවෙයි; imperfect දේවල් අතරින් සතුට හොයාගත්තමයි.",
    "❤️ හැමෝම ඔයාගේ ගමන තේරුම් ගන්න ඕනේ නෑ. ඔයාට ඔයාගේ ගමන දැනගන්න එක ඇති.",
    "❤️ කාලය වෙනස් කරන දේවල් තියෙනවා; ඒ අතර ඔයාගේ උත්සාහය අමතක කරන්න එපා."
  ],
  challenge: [
    "🎯 Challenge: අද පැය 1ක් phone එක පැත්තක තියලා වැදගත් වැඩක් කරන්න!",
    "🎯 Challenge: අද කෙනෙක්ට හොඳ වචනයක් කියලා ඔහු/ඇයගේ දවස ලස්සන කරන්න.",
    "🎯 Challenge: අද අලුත් දෙයක් ඉගෙනගන්න. 📚🔥"
  ]
};

const pick = a => a[Math.floor(Math.random() * a.length)];

function getBody(mek) {
  const msg = mek.message;
  if (!msg) return "";
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  if (msg.videoMessage?.caption) return msg.videoMessage.caption;
  if (msg.buttonsResponseMessage?.selectedButtonId) return msg.buttonsResponseMessage.selectedButtonId;
  if (msg.listResponseMessage?.singleSelectReply?.selectedRowId)
    return msg.listResponseMessage.singleSelectReply.selectedRowId;
  return "";
}

function jidNumber(jid) {
  return String(jid || "").split("@")[0].split(":")[0];
}

function participantJid(p) {
  if (typeof p === "string") return p;
  if (p?.id) return p.id;
  if (p?.jid) return p.jid;
  return null;
}

function quotedImageMessage(mek) {
  return mek.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage || null;
}

async function sendText(jid, text, quoted) {
  return sock.sendMessage(jid, { text }, quoted ? { quoted } : undefined);
}

async function searchYouTube(query) {
  if (ytdl.validateURL(query)) {
    const info = await ytdl.getInfo(query);
    const v = info.videoDetails;
    return {
      url: query,
      title: v.title,
      thumbnail: v.thumbnails?.[v.thumbnails.length - 1]?.url,
      duration: v.lengthSeconds
    };
  }

  const result = await ytSearch(query);
  if (!result.videos?.length) throw new Error("YouTube result not found");
  const v = result.videos[0];
  return {
    url: v.url,
    title: v.title,
    thumbnail: v.thumbnail,
    duration: v.seconds
  };
}

function chooseProgressiveFormat(formats, requested) {
  const progressive = formats.filter(
    f => f.hasVideo && f.hasAudio && f.container === "mp4"
  );
  if (!progressive.length) return null;

  const wanted = requested ? Number(requested) : 0;
  const sorted = progressive
    .filter(f => !wanted || Number(f.height || 0) <= wanted)
    .sort((a, b) => Number(b.height || 0) - Number(a.height || 0));

  return (sorted[0] || [...progressive].sort((a,b) =>
    Number(b.height || 0) - Number(a.height || 0)
  )[0]);
}

async function downloadVideo(url, requestedQuality) {
  const info = await ytdl.getInfo(url);
  const format = chooseProgressiveFormat(info.formats, requestedQuality);
  if (!format) throw new Error("No compatible MP4 video+audio format available");

  const chunks = [];
  await new Promise((resolve, reject) => {
    const stream = ytdl(url, {
      format,
      quality: format.itag,
      highWaterMark: 1 << 20
    });
    stream.on("data", c => chunks.push(c));
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  return {
    buffer: Buffer.concat(chunks),
    quality: `${format.height || "unknown"}p`,
    title: info.videoDetails.title
  };
}

async function downloadAudio(url) {
  const info = await ytdl.getInfo(url);
  const format = ytdl.chooseFormat(info.formats, {
    quality: "highestaudio",
    filter: "audioonly"
  });
  if (!format) throw new Error("Audio format unavailable");

  const chunks = [];
  await new Promise((resolve, reject) => {
    const stream = ytdl(url, {
      format,
      highWaterMark: 1 << 20
    });
    stream.on("data", c => chunks.push(c));
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  return {
    buffer: Buffer.concat(chunks),
    title: info.videoDetails.title,
    mime: format.mimeType?.split(";")[0] || "audio/mp4"
  };
}

async function makeSticker(imageMsg) {
  const stream = await downloadContentFromMessage(imageMsg, "image");
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return sharp(Buffer.concat(chunks))
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 })
    .toBuffer();
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    browser: Browsers.macOS("Chrome"),
    markOnlineOnConnect: true,
    syncFullHistory: false
  });

  sock.ev.on("creds.update", saveCreds);

  if (!state.creds.registered) {
    if (!PHONE_NUMBER) {
      console.log("⚠️ PHONE_NUMBER is missing in Render Environment Variables.");
    } else {
      setTimeout(async () => {
        try {
          console.log("🔑 Requesting WhatsApp pairing code...");
          let code = await sock.requestPairingCode(PHONE_NUMBER);
          code = code?.match(/.{1,4}/g)?.join("-") || code;
          console.log("\n==============================");
          console.log(`🔑 MALIYA-X V2 PAIRING CODE: ${code}`);
          console.log("==============================\n");
        } catch (e) {
          console.error("❌ Pairing code error:", e?.message || e);
        }
      }, 5000);
    }
  }

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      reconnecting = false;
      console.log("✅ MALIYA-X V2 CONNECTED! 🇱🇰🔥");
      try {
        const botJid = sock.user?.id;
        if (botJid) {
          await sendText(botJid, "🚀 *MALIYA-X V2 Connected Successfully!* 🇱🇰\n\n✅ Online\n✅ Commands loaded\n✅ Render server active");
        }
      } catch {}
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.log(`⚠️ WhatsApp connection closed. Reconnect: ${!loggedOut}`);
      if (!loggedOut && !reconnecting) {
        reconnecting = true;
        setTimeout(startBot, 5000);
      }
    }
  });

  // Welcome / goodbye - safely handles Baileys participant objects
  sock.ev.on("group-participants.update", async update => {
    try {
      const groupJid = update.id;
      const metadata = await sock.groupMetadata(groupJid);

      for (const raw of update.participants || []) {
        const jid = participantJid(raw);
        if (!jid) continue;

        const name = jidNumber(jid);
        let dp;
        try { dp = await sock.profilePictureUrl(jid, "image"); } catch {}

        const action = update.action;
        const text = action === "add"
          ? `╭━━〔 👋 WELCOME 〕━━╮\n┃ Welcome @${name}!\n┃\n┃ 👥 Group: ${metadata.subject}\n┃ 🇱🇰 MALIYA-X V2\n╰━━━━━━━━━━━━━━━━╯`
          : action === "remove"
          ? `╭━━〔 👋 GOODBYE 〕━━╮\n┃ Goodbye @${name}!\n┃\n┃ 👥 Group: ${metadata.subject}\n┃ 🇱🇰 MALIYA-X V2\n╰━━━━━━━━━━━━━━━━╯`
          : null;

        if (!text) continue;

        if (dp) {
          await sock.sendMessage(groupJid, {
            image: { url: dp },
            caption: text,
            mentions: [jid]
          });
        } else {
          await sock.sendMessage(groupJid, { text, mentions: [jid] });
        }
      }
    } catch (e) {
      console.error("❌ Welcome/Goodbye error:", e?.message || e);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const mek = messages?.[0];
    if (!mek?.message) return;

    try {
      const from = mek.key.remoteJid;
      if (!from) return;

      const body = getBody(mek).trim();
      if (!body.startsWith(PREFIX)) return;

      const parts = body.slice(1).trim().split(/\s+/);
      const command = (parts.shift() || "").toLowerCase();
      const query = parts.join(" ");
      const isGroup = from.endsWith("@g.us");

      // BASIC
      if (command === "ping") {
        const t = Date.now();
        await sendText(from, "🏓 Pinging...", mek);
        return sendText(from, `🏓 *MALIYA-X V2*\n⚡ ${Date.now() - t}ms\n🟢 Online`, mek);
      }

      if (["menu", "help", "maliya"].includes(command)) {
        const caption = `🇱🇰 *MALIYA-X V2* 🇱🇰\n\n` +
          `╭━━〔 ⚡ BASIC 〕━━╮\n` +
          `┃ .ping  .time  .ai <text>\n` +
          `╰━━━━━━━━━━━━━━╯\n\n` +
          `╭━━〔 🎵 YOUTUBE 〕━━╮\n` +
          `┃ .song <name/link>\n┃ .audio <name/link>\n┃ .video <name/link> [360/480/720]\n┃ .ytdl <name/link> [quality]\n` +
          `╰━━━━━━━━━━━━━━━━╯\n\n` +
          `╭━━〔 🖼️ MEDIA 〕━━╮\n┃ .sticker / .s (reply image)\n╰━━━━━━━━━━━━━━╯\n\n` +
          `╭━━〔 😂 FUN 〕━━╮\n┃ .joke  .fact  .quote\n┃ .motivate  .life  .challenge\n╰━━━━━━━━━━━━━━╯\n\n` +
          `╭━━〔 👥 GROUP 〕━━╮\n┃ .groupinfo  .tagall\n┃ .admins  .link\n┃ Auto Welcome / Goodbye\n╰━━━━━━━━━━━━━━╯\n\n` +
          `╭━━〔 🌅 DAILY 〕━━╮\n┃ .gm  .gn\n╰━━━━━━━━━━━━━━╯\n\n` +
          `╭━━〔 🎬 SEARCH 〕━━╮\n┃ .movie <name>\n╰━━━━━━━━━━━━━━╯\n\n` +
          `╭━━〔 📱 SOCIAL 〕━━╮\n┃ .media <public URL>\n┃ .instagram <URL>\n┃ .tiktok <URL>\n┃ .facebook <URL>\n╰━━━━━━━━━━━━━━╯\n\n` +
          `💜 *Fast • Secure • Reliable*\n🔥 *MALIYA-X V2*`;

        if (fs.existsSync(MENU_IMAGE)) {
          await sock.sendMessage(from, {
            image: fs.readFileSync(MENU_IMAGE),
            caption
          }, { quoted: mek });
        } else {
          await sendText(from, caption, mek);
        }
        return;
      }

      if (command === "time") {
        const now = new Date();
        const date = now.toLocaleDateString("en-GB", { timeZone: "Asia/Colombo" });
        const time = now.toLocaleTimeString("en-US", { timeZone: "Asia/Colombo" });
        return sendText(from, `🇱🇰 *Sri Lanka Time*\n📅 ${date}\n⏰ ${time}`, mek);
      }

      // FUN
      if (fun[command]) return sendText(from, pick(fun[command]), mek);

      if (command === "gm") return sendText(from, `🌅 *සුභ උදෑසනක්!* ☀️\nඅද දවස ලස්සන දවසක් කරගන්න. 🇱🇰❤️`, mek);
      if (command === "gn") return sendText(from, `🌙 *සුභ රාත්‍රියක්!* ✨\nහොඳින් විවේක ගන්න. 😴❤️`, mek);

      // STICKER
      if (["sticker", "s"].includes(command)) {
        const img = mek.message.imageMessage || quotedImageMessage(mek);
        if (!img) return sendText(from, "❌ Image එකක් send/reply කරලා `.s` හෝ `.sticker` දාන්න.", mek);
        await sendText(from, "🖼️ Sticker හදනවා... ⏳", mek);
        const webp = await makeSticker(img);
        await sock.sendMessage(from, { sticker: webp }, { quoted: mek });
        return;
      }

      // YOUTUBE AUDIO
      if (["song", "audio"].includes(command)) {
        if (!query) return sendText(from, "❌ `.song <song name or YouTube URL>`", mek);
        await sendText(from, `🎵 YouTube audio හොයනවා...\n🔎 ${query}`, mek);

        try {
          const result = await searchYouTube(query);
          const audio = await downloadAudio(result.url);
          await sock.sendMessage(from, {
            image: { url: result.thumbnail },
            caption: `🎵 *${result.title}*\n🇱🇰 MALIYA-X V2\n\n⬇️ Audio downloading...`
          }, { quoted: mek });

          await sock.sendMessage(from, {
            audio: audio.buffer,
            mimetype: audio.mime,
            fileName: `${result.title.replace(/[\\/:*?"<>|]/g, "_")}.m4a`
          }, { quoted: mek });
        } catch (e) {
          console.error("❌ Audio error:", e?.message || e);
          await sendText(from, "❌ *Audio download failed.*\n\nYouTube result එක unavailable හෝ source එක block කරලා තියෙන්න පුළුවන්. Bot එක online — crash වෙලා නෑ. 🔄", mek);
        }
        return;
      }

      // YOUTUBE VIDEO
      if (["video", "ytdl"].includes(command)) {
        if (!query) return sendText(from, "❌ `.video <name or URL> [360/480/720]`", mek);

        const qParts = query.split(/\s+/);
        const last = qParts[qParts.length - 1];
        const requested = ["360", "480", "720"].includes(last) ? last : "";
        const searchQuery = requested ? qParts.slice(0, -1).join(" ") : query;

        await sendText(from,
          `🎬 *Video search started*\n🔎 ${searchQuery}\n🎚️ Quality: ${requested ? requested + "p" : "Auto"}\n⏳ Please wait...`,
          mek
        );

        try {
          const result = await searchYouTube(searchQuery);
          const video = await downloadVideo(result.url, requested);

          // Protect Render/WhatsApp from very large files
          if (video.buffer.length > 60 * 1024 * 1024) {
            throw new Error("Selected video is larger than 60MB");
          }

          await sock.sendMessage(from, {
            video: video.buffer,
            mimetype: "video/mp4",
            fileName: `${result.title.replace(/[\\/:*?"<>|]/g, "_")}.mp4`,
            caption: `🎬 *${result.title}*\n🎚️ Quality: ${video.quality}\n🇱🇰 MALIYA-X V2`
          }, { quoted: mek });
        } catch (e) {
          console.error("❌ Video error:", e?.stack || e);
          await sendText(from,
            `❌ *Video download failed.*\n\n` +
            `Possible reason: YouTube format unavailable, video restriction, timeout, or file too large.\n\n` +
            `Try:\n• \`.video <name> 360\`\n• \`.video <name> 480\`\n\n` +
            `🟢 *Bot is still online.*`,
            mek
          );
        }
        return;
      }

      // MOVIE INFO (OMDb if API key exists)
      if (command === "movie") {
        if (!query) return sendText(from, "🎬 `.movie <movie name>`", mek);
        const key = process.env.OMDB_API_KEY;
        if (!key) return sendText(from, `🎬 *Movie:* ${query}\n\nOMDb API key එක Render Environment Variables වල add කළොත් poster/info enable කරන්න පුළුවන්.`, mek);

        try {
          const r = await axios.get("https://www.omdbapi.com/", {
            params: { apikey: key, t: query, plot: "short" },
            timeout: 10000
          });
          if (r.data.Response !== "True") return sendText(from, "❌ Movie not found.", mek);
          const d = r.data;
          const caption = `🎬 *${d.Title}*\n\n⭐ ${d.imdbRating}\n📅 ${d.Year}\n🎭 ${d.Genre}\n\n${d.Plot}`;
          if (d.Poster && d.Poster !== "N/A") {
            await sock.sendMessage(from, { image: { url: d.Poster }, caption }, { quoted: mek });
          } else await sendText(from, caption, mek);
        } catch {
          await sendText(from, "❌ Movie search failed. Try again.", mek);
        }
        return;
      }

      // GROUP COMMANDS
      if (["groupinfo", "tagall", "admins", "link"].includes(command) && !isGroup)
        return sendText(from, "❌ මේ command එක Group එකක විතරයි.", mek);

      if (isGroup && command === "groupinfo") {
        const meta = await sock.groupMetadata(from);
        return sendText(from,
          `👥 *${meta.subject}*\n\n👤 Members: ${meta.participants.length}\n🆔 ${from}`,
          mek
        );
      }

      if (isGroup && command === "tagall") {
        const meta = await sock.groupMetadata(from);
        const mentions = meta.participants.map(p => participantJid(p)).filter(Boolean);
        const text = mentions.map(j => `@${jidNumber(j)}`).join(" ");
        return sock.sendMessage(from, { text: `📢 *TAG ALL*\n\n${text}`, mentions }, { quoted: mek });
      }

      if (isGroup && command === "admins") {
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin).map(p => participantJid(p)).filter(Boolean);
        const text = admins.map(j => `👑 @${jidNumber(j)}`).join("\n") || "No admins found.";
        return sock.sendMessage(from, { text: `👑 *GROUP ADMINS*\n\n${text}`, mentions: admins }, { quoted: mek });
      }

      if (isGroup && command === "link") {
        try {
          const code = await sock.groupInviteCode(from);
          return sendText(from, `🔗 *Group Invite Link*\nhttps://chat.whatsapp.com/${code}`, mek);
        } catch {
          return sendText(from, "❌ Bot needs admin permission to get the group link.", mek);
        }
      }

      // PUBLIC SOCIAL URL HANDLER
      if (["media", "instagram", "tiktok", "facebook"].includes(command)) {
        if (!query) return sendText(from, `📱 Public URL එකක් දෙන්න.\nExample: .${command} https://...`, mek);
        return sendText(from,
          `📱 *${command.toUpperCase()}*\n\nURL received successfully.\n\n⚠️ Downloader provider එක වෙනස්/blocked නම් download fail වෙන්න පුළුවන්. Bot එක crash නොවෙයි.`,
          mek
        );
      }

      if (command === "ai") {
        if (!query) return sendText(from, "🤖 `.ai <your question>`", mek);
        return sendText(from, `🤖 AI request received:\n\n${query}\n\n⚠️ AI API එක configure කරලා නැත්නම් මෙතන response provider එක add කරන්න ඕනේ.`, mek);
      }

    } catch (e) {
      console.error("❌ Message handler error:", e?.stack || e);
      try {
        await sendText(mek.key.remoteJid, "❌ Command error එකක් වුණා. Bot එක online. නැවත try කරන්න.", mek);
      } catch {}
    }
  });
}

startBot().catch(err => {
  console.error("❌ Fatal startup error:", err);
  setTimeout(startBot, 10000);
});
