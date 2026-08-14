const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  downloadContentFromMessage
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const axios = require("axios");
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("MALIYA-X V2 is running 🇱🇰🔥"));
app.listen(PORT, () => console.log(`Web server running on ${PORT}`));

const PHONE_NUMBER = process.env.PHONE_NUMBER;
const MENU_IMAGE = path.join(__dirname, "menu.png");
const SESSION_DIR = process.env.SESSION_DIR || "./session";
const AUTO_STATE_FILE = path.join(__dirname, "auto_state.json");

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const MORNING_MESSAGES = [
  "☀️ සුභ උදෑසනක් හැමෝටම! අද අලුත් සතියේ පළමු පියවර. සතුටින් සහ ශක්තියෙන් දවස පටන් ගමු! 🇱🇰❤️",
  "🌻 සුභ උදෑසනක්! අදත් හොඳ සිතුවිලි එක්ක දවස පටන් ගන්න. ඔයාගේ අද දවස ඊයේට වඩා ලස්සන වේවා! ✨",
  "🌅 මැද සතියට සුභ උදෑසනක්! 💪 මහන්සි වුණත් අතහරින්න එපා. ඉදිරියටම යමු! ❤️",
  "☀️ සුභ උදෑසනක් අපේ යාළුවනේ! අද දවසේ කෙනෙක්ට හිනාවක් දෙන්න. 😊🌸",
  "🌞 සුභ උදෑසනක්! සතිය අවසන් වෙන්න ළඟයි. අද දවස සාර්ථක වේවා! 🔥",
  "🌸 සුභ උදෑසනක්! අද පවුලේ අයත් යාළුවොත් එක්ක සතුටින් කාලය ගත කරන්න. ❤️☕",
  "🌅❤️ සුභ ඉරිදාවක් හැමෝටම! අද හිතට සැනසීමක් දෙන දේවල් කරන්න. 🌿✨"
];

const NIGHT_MESSAGES = [
  "🌙 සුභ රාත්‍රියක් හැමෝටම! අද කළ මහන්සියට හොඳ විවේකයක් දෙන්න. හෙට අලුත් දවසක්. 😴❤️",
  "🌌 අද දවසේ හොඳ දේවල් මතක් කරගෙන සතුටින් නිදාගන්න. සුභ රාත්‍රියක්! 🌙✨",
  "🌙 මැද සතියත් ඉවරයි! දැන් හොඳ නින්දක් ගන්න. හෙට නැවත හමුවෙමු. 😴",
  "✨ අද දවසේ අඩුපාඩු ගැන හිත හිත ඉන්න එපා. හෙට තවත් අවස්ථාවක් තියෙනවා. ❤️🌙",
  "🌙❤️ සතියේ වැඩ ටික ඉවරයි! සතුටින් relax වෙලා හොඳට නිදාගන්න. 😴✨",
  "🌃 අද ලස්සන දවසක් ගත කළා නම් ඒ මතකත් එක්ක සැනසීමෙන් නිදාගන්න. 🌸❤️",
  "🌙✨ ඉරිදා දවසත් අවසන්. හෙට අලුත් සතියක්, අලුත් බලාපොරොත්තු. ❤️🇱🇰"
];

const FUN = {
  joke: [
    "😂 ජීවිතේ Wi-Fi වගේ… signal නැති වෙලාවට තමයි හැමෝම හොයන්නේ!",
    "🤣 වැඩ කරන්න හිතුවා… හිතුවා විතරයි!",
    "😂 Alarm එකට වඩා නිදාගන්න තියෙන ආසාව strong!"
  ],
  fact: [
    "💡 මී මැස්සන්ට මිනිසුන්ගේ මුහුණු රටා හඳුනාගැනීමට හැකියාවක් තියෙනවා.",
    "💡 පෘථිවියේ දවසක් සෑම තැනකම එකම දිගකින් නොපෙනේ; කාල කලාප නිසා වේලාව වෙනස් වෙනවා.",
    "💡 Octopus එකකට හදවත් තුනක් තියෙනවා."
  ],
  quote: [
    "💬 වැටීම අවසානයක් නෙවෙයි; නැගිටීමට ලැබෙන අවස්ථාවක්.",
    "💬 අද කරන කුඩා උත්සාහය හෙට ලොකු වෙනසක් කරන්න පුළුවන්.",
    "💬 සාර්ථකත්වයට වේගයට වඩා අඛණ්ඩ උත්සාහය වැදගත්."
  ],
  motivate: [
    "🔥 ඔයාට පුළුවන්! අද එක පියවරක් හරි ඉදිරියට යන්න.",
    "💪 අමාරු දවස් තිබුණත් උත්සාහය අත්හරින්න එපා.",
    "🚀 පොඩි progress එකක් වුණත් progress එකක්මයි!"
  ],
  life: [
    "❤️ ජීවිතය perfect වෙන්න ඕනේ නැහැ; ලස්සන මතක හදන එකයි වැදගත්.",
    "🌿 සමහර දේවල් අපේ control එකේ නැහැ. ඒත් අපේ උත්සාහය අපේ අතේ.",
    "❤️ අන් අයට කරන හොඳකම කවදාහරි හොඳ මතකයක් වෙලා ආපහු එනවා."
  ],
  challenge: [
    "🎯 අද පැයක් social media නැතුව productive දෙයක් කරන්න.",
    "🎯 අද කෙනෙක්ට genuine compliment එකක් දෙන්න.",
    "🎯 අද ඉගෙනගන්න අලුත් දෙයක් එකක් try කරන්න."
  ]
};

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function readState() {
  try { return JSON.parse(fs.readFileSync(AUTO_STATE_FILE, "utf8")); }
  catch { return {}; }
}
function writeState(s) {
  try { fs.writeFileSync(AUTO_STATE_FILE, JSON.stringify(s, null, 2)); } catch {}
}

function sriLankaParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo", weekday: "long", hour: "2-digit", minute: "2-digit",
    year: "numeric", month: "2-digit", day: "2-digit", hour12: false
  }).formatToParts(new Date());
  const get = t => parts.find(x => x.type === t)?.value;
  return { weekday: get("weekday"), hour: Number(get("hour")), minute: Number(get("minute")),
    date: `${get("year")}-${get("month")}-${get("day")}` };
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Chrome"),
    markOnlineOnConnect: true
  });

  sock.ev.on("creds.update", saveCreds);

  if (!state.creds.registered) {
    if (!PHONE_NUMBER) {
      console.log("Set PHONE_NUMBER in Render Environment Variables.");
    } else {
      setTimeout(async () => {
        try {
          let code = await sock.requestPairingCode(PHONE_NUMBER.replace(/\D/g, ""));
          console.log(`PAIRING CODE: ${code}`);
        } catch (e) {
          console.error("Pairing code error:", e.message);
        }
      }, 5000);
    }
  }

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ MALIYA-X V2 CONNECTED 🇱🇰🔥");
      try {
        const me = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
        await sock.sendMessage(me, { text:
          "🚀 *MALIYA-X V2 Connected Successfully!* 🇱🇰🔥\n\nStatus: Online ✅\nVersion: V2.0.0" });
      } catch {}
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log("Connection closed. Reconnecting...");
        setTimeout(startBot, 3000);
      } else {
        console.log("Logged out. Pair again.");
      }
    }
  });

  // Sinhala welcome / goodbye
  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    for (const num of participants) {
      let dp;
      try { dp = await sock.profilePictureUrl(num, "image"); } catch {}
      const mention = `@${num.split("@")[0]}`;
      let caption = "";
      if (action === "add") {
        caption = `🌸 *අපේ පවුලට ආදරයෙන් පිළිගනිමු!* 🇱🇰\n\n👤 ${mention}\n🤝 දැන් ඔයා මේ group එකේ සාමාජිකයෙක්.\n💬 හැමෝත් එක්කම සුහදව ඉන්න.\n✨ සුභ දවසක් වේවා!\n\n🤖 *MALIYA-X V2*`;
      } else if (action === "remove") {
        caption = `💐 *අපෙන් සමුගන්නා ඔබට සුභ ගමනක්!*\n\n👤 ${mention}\n😢 අපේ group එකෙන් අද සමුගත්තා.\n❤️ නැවතත් අපිත් එක්ක එකතු වෙන්න ලැබේවා!\n\n🤖 *MALIYA-X V2*`;
      } else continue;

      try {
        if (dp) await sock.sendMessage(id, { image: { url: dp }, caption, mentions: [num] });
        else await sock.sendMessage(id, { text: caption, mentions: [num] });
      } catch {}
    }
  });

  // One message per group per scheduled slot. Sri Lanka time.
  let schedulerRunning = false;
  setInterval(async () => {
    if (schedulerRunning || !sock.user) return;
    const t = sriLankaParts();
    if (t.minute !== 0 || ![8, 22].includes(t.hour)) return;
    schedulerRunning = true;
    try {
      const slot = `${t.date}-${t.hour}`;
      const state = readState();
      if (state[slot]) return;
      const groups = await sock.groupFetchAllParticipating();
      for (const g of Object.values(groups || {})) {
        const i = DAYS.indexOf(t.weekday);
        const text = t.hour === 8
          ? `╭━━〔 🌅 *සුභ උදෑසනක්* 〕━━╮\n${MORNING_MESSAGES[i]}\n\n👥 ${g.subject}\n🤖 *MALIYA-X V2* 🇱🇰\n╰━━━━━━━━━━━━━━━━╯`
          : `╭━━〔 🌙 *සුභ රාත්‍රියක්* 〕━━╮\n${NIGHT_MESSAGES[i]}\n\n👥 ${g.subject}\n🤖 *MALIYA-X V2* 🇱🇰\n╰━━━━━━━━━━━━━━━━╯`;
        try { await sock.sendMessage(g.id, { text }); } catch {}
        await new Promise(r => setTimeout(r, 300));
      }
      state[slot] = true;
      writeState(state);
    } finally { schedulerRunning = false; }
  }, 60 * 1000);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const mek = messages?.[0];
    if (!mek?.message) return;

    const msg = mek.message;
    const type = Object.keys(msg)[0];
    let body = "";
    if (type === "conversation") body = msg.conversation;
    else if (type === "extendedTextMessage") body = msg.extendedTextMessage.text || "";
    else if (type === "imageMessage") body = msg.imageMessage.caption || "";
    else if (type === "videoMessage") body = msg.videoMessage.caption || "";
    else return;

    if (!body.startsWith(".")) return;
    const parts = body.trim().slice(1).split(/\s+/);
    const command = (parts.shift() || "").toLowerCase();
    const query = parts.join(" ");
    const from = mek.key.remoteJid;
    const isGroup = from?.endsWith("@g.us");

    const send = text => sock.sendMessage(from, { text }, { quoted: mek });

    if (command === "ping") return send(`🏓 *MALIYA-X V2 Pong!* 🚀\n⏱️ ${Date.now() - (mek.messageTimestamp || Date.now())}ms\n🇱🇰 Online`);

    if (["menu","help","maliya"].includes(command)) {
      const menu = `╭━━〔 🟣 *MALIYA-X V2* 〕━━╮
┃ 🇱🇰 Sri Lankan WhatsApp Bot
╰━━━━━━━━━━━━━━━━╯

🏓 *BASIC*
┃ .ping
┃ .time
┃ .ai <question>

🎵 *MEDIA*
┃ .song <name/link>
┃ .audio <name/link>
┃ .video <name/link>
┃ .ytdl <name/link>
┃ .sticker / .s

😂 *SINHALA FUN*
┃ .joke
┃ .fact
┃ .quote
┃ .motivate
┃ .life
┃ .challenge

👥 *GROUP*
┃ .groupinfo
┃ .tagall
┃ .admins
┃ .link

👋 *AUTO GROUP*
┃ 🌅 08:00 Good Morning
┃ 🌙 22:00 Good Night
┃ 📅 දවස් 7ට වෙනස් messages
┃ 🌸 Sinhala Welcome / Goodbye

🎬 .movie <name>

🤖 *MALIYA-X V2* 🇱🇰🔥`;
      if (fs.existsSync(MENU_IMAGE)) {
        return sock.sendMessage(from, { image: fs.readFileSync(MENU_IMAGE), caption: menu }, { quoted: mek });
      }
      return send(menu);
    }

    if (command === "time") {
      const now = new Date().toLocaleString("en-GB", { timeZone: "Asia/Colombo" });
      return send(`🕒 *Sri Lanka Time*\n🇱🇰 ${now}`);
    }

    if (FUN[command]) return send(random(FUN[command]));

    if (command === "gm" || command === "gn") {
      const t = sriLankaParts(), i = DAYS.indexOf(t.weekday);
      return send(command === "gm"
        ? `🌅 *සුභ උදෑසනක්!*\n\n${MORNING_MESSAGES[i]}\n\n🤖 *MALIYA-X V2* 🇱🇰`
        : `🌙 *සුභ රාත්‍රියක්!*\n\n${NIGHT_MESSAGES[i]}\n\n🤖 *MALIYA-X V2* 🇱🇰`);
    }

    if (["groupinfo","tagall","admins","link"].includes(command) && !isGroup)
      return send("❌ මේ command එක WhatsApp group එකකදී පමණයි භාවිතා කරන්න.");

    if (command === "groupinfo") {
      const g = await sock.groupMetadata(from);
      return send(`👥 *Group Info*\n\n📌 Name: ${g.subject}\n👤 Members: ${g.participants.length}\n🆔 ${g.id}`);
    }

    if (command === "tagall") {
      const g = await sock.groupMetadata(from);
      const mentions = g.participants.map(p => p.id);
      return sock.sendMessage(from, {
        text: `📢 *Attention Everyone!*\n\n${mentions.map(x => `@${x.split("@")[0]}`).join(" ")}`,
        mentions
      }, { quoted: mek });
    }

    if (command === "admins") {
      const g = await sock.groupMetadata(from);
      const admins = g.participants.filter(p => p.admin);
      const mentions = admins.map(p => p.id);
      return sock.sendMessage(from, {
        text: `👑 *Group Admins*\n\n${mentions.map(x => `@${x.split("@")[0]}`).join("\n")}`,
        mentions
      }, { quoted: mek });
    }

    if (command === "link") {
      try {
        const code = await sock.groupInviteCode(from);
        return send(`🔗 *Group Link*\nhttps://chat.whatsapp.com/${code}`);
      } catch { return send("❌ Group invite link ලබාගන්න බැරි වුණා. Bot admin ද බලන්න."); }
    }

    if (["sticker","s"].includes(command)) {
      const quoted = msg.extendedTextMessage?.contextInfo?.quotedMessage;
      const image = msg.imageMessage || quoted?.imageMessage;
      if (!image) return send("🖼️ Image එකක් send කරලා caption එකට `.s` දාන්න, නැත්නම් image එකකට reply කරලා `.s` දාන්න.");
      try {
        const stream = await downloadContentFromMessage(image, "image");
        const chunks = [];
        for await (const c of stream) chunks.push(c);
        return sock.sendMessage(from, { sticker: Buffer.concat(chunks) }, { quoted: mek });
      } catch { return send("❌ Sticker create failed."); }
    }

    if (["song","audio","video","ytdl"].includes(command)) {
      return send(`⏳ *${command}* request received.\n\n"${query || "query එකක් නැහැ"}"\n\n⚠️ Downloader API එකක් configure කරලා නැති නිසා fake download link එකක් නොයවමි.`);
    }

    if (command === "movie") return send(query
      ? `🎬 Movie search request: *${query}*\n\nPoster/info API එක configure කළාම full results එවිය හැක.`
      : "🎬 Example: `.movie Avatar`");

    if (command === "ai") return send(query
      ? `🤖 AI request received: "${query}"\n\nAI API එක configure කළාම response එක මෙතනින් එවිය හැක.`
      : "🤖 Example: `.ai hello`");
  });
}

startBot().catch(e => console.error("Fatal:", e));
