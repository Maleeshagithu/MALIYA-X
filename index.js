const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  downloadContentFromMessage,
  jidNormalizedUser
} = require("@whiskeysockets/baileys");

const P = require("pino");
const axios = require("axios");
const express = require("express");
const ytSearch = require("yt-search");
const fs = require("fs");
const path = require("path");

const BOT = process.env.BOT_NAME || "MALIYA-X";
const PREFIX = ".";
const PORT = process.env.PORT || 3000;

const PHONE = (process.env.PHONE_NUMBER || "94770678992").replace(/\D/g, "");
const OWNER = (process.env.OWNER_NUMBER || PHONE).replace(/\D/g, "");

const API =
  process.env.API_BASE ||
  "https://apis.davidcyriltech.my.id";

const AUTH_DIR = path.join(__dirname, "auth_info");
const MENU_IMAGE = path.join(__dirname, "menu.jpg");

const app = express();

app.get("/", (req, res) => {
  res.send(`${BOT} 🇱🇰 is running successfully!`);
});

app.listen(PORT, () => {
  console.log(`🌐 Render server running on port ${PORT}`);
});

const logger = P({ level: "silent" });

/* =========================================================
   BASIC FUNCTIONS
========================================================= */

function getDate() {
  return new Date().toLocaleDateString("en-GB", {
    timeZone: "Asia/Colombo"
  });
}

function getTime() {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Colombo",
    hour12: true
  });
}

function getHour() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Colombo",
      hour: "numeric",
      hour12: false
    }).format(new Date())
  );
}

function getMinute() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Colombo",
      minute: "numeric"
    }).format(new Date())
  );
}

function getJid(x) {
  return jidNormalizedUser(x || "");
}

function getNumber(x) {
  let jid = "";

  if (typeof x === "string") {
    jid = x;
  } else if (x?.id) {
    jid = x.id;
  } else if (x?.jid) {
    jid = x.jid;
  } else if (x?.participant) {
    jid = x.participant;
  }

  return String(jid).split("@")[0];
}

/* =========================================================
   MESSAGE TEXT
========================================================= */

function getText(m) {
  const msg = m?.message || {};

  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg.buttonsResponseMessage?.selectedButtonId ||
    msg.templateButtonReplyMessage?.selectedId ||
    msg.interactiveResponseMessage?.nativeFlowResponseMessage
      ?.paramsJson ||
    ""
  ).trim();
}

function unwrapMessage(m) {
  let msg = m?.message || m || {};

  while (msg.ephemeralMessage?.message) {
    msg = msg.ephemeralMessage.message;
  }

  while (msg.viewOnceMessage?.message) {
    msg = msg.viewOnceMessage.message;
  }

  return msg;
}

function getQuoted(m) {
  const msg = unwrapMessage(m);

  const context =
    msg.extendedTextMessage?.contextInfo ||
    msg.imageMessage?.contextInfo ||
    msg.videoMessage?.contextInfo ||
    msg.documentMessage?.contextInfo;

  return context?.quotedMessage || {};
}

/* =========================================================
   API
========================================================= */

async function api(url, params = {}, timeout = 60000) {
  return axios.get(url, {
    params,
    timeout,
    validateStatus: () => true
  });
}

/* =========================================================
   MAIN MENU
========================================================= */

function mainMenu() {
  return `
╭━━〔 👑 ${BOT} 🇱🇰 〕━━╮
┃ 👋 ආයුබෝවන්!
┃ 🤖 Sri Lankan WhatsApp Bot
┃ ⚡ Fast • Powerful • Secure
┃ 📅 ${getDate()}
┃ 🕐 ${getTime()}
╰━━━━━━━━━━━━━━━━━━━━━━╯

✨ *COMMAND MENU* ✨

1️⃣ 🔎 SEARCH
2️⃣ 📥 DOWNLOAD
3️⃣ 👥 GROUP
4️⃣ 🤖 AI
5️⃣ 🛠️ TOOLS
6️⃣ 🎉 FUN
7️⃣ 👑 OWNER
8️⃣ 📜 ALL COMMANDS

━━━━━━━━━━━━━━━━━━━━━━
📌 *Number එක reply කරන්න.*

👑 Powered by ${BOT} 🇱🇰
`;
}

const menus = new Map();

async function sendMenu(sock, jid, quoted) {
  menus.set(jid, Date.now());

  setTimeout(() => {
    menus.delete(jid);
  }, 10 * 60 * 1000);

  if (fs.existsSync(MENU_IMAGE)) {
    await sock.sendMessage(
      jid,
      {
        image: fs.readFileSync(MENU_IMAGE),
        caption: mainMenu()
      },
      { quoted }
    );
  } else {
    await sock.sendMessage(
      jid,
      {
        text: mainMenu()
      },
      { quoted }
    );
  }
}

/* =========================================================
   SUB MENUS
========================================================= */

const subMenus = {
  1: `
╭━━〔 🔎 SEARCH MENU 〕━━╮

🎵 .song <name>
🎬 .video <name>
🔗 .yt <URL>

╰━━━━━━━━━━━━━━━━━━━━━━╯
`,

  2: `
╭━━〔 📥 DOWNLOAD MENU 〕━━╮

🎵 .song <song>
🎬 .video <URL/name>
📥 .social <URL>
🧩 .sticker

╰━━━━━━━━━━━━━━━━━━━━━━╯
`,

  3: `
╭━━〔 👥 GROUP MENU 〕━━╮

👥 .groupinfo
👑 .admins
📢 .tagall
➕ .promote @user
➖ .demote @user
🚫 .kick @user

╰━━━━━━━━━━━━━━━━━━━━━━╯
`,

  4: `
╭━━〔 🤖 AI MENU 〕━━╮

🤖 .ai <question>

Example:
.ai Sri Lanka ගැන කියන්න

╰━━━━━━━━━━━━━━━━━━━━━━╯
`,

  5: `
╭━━〔 🛠️ TOOLS MENU 〕━━╮

⚡ .ping
🕐 .time
🌅 .morning
🌙 .night
❤️ .respect
🤝 .friend

╰━━━━━━━━━━━━━━━━━━━━━━╯
`,

  6: `
╭━━〔 🎉 FUN MENU 〕━━╮

😂 .joke
💡 .quote
🧠 .fact
🔥 .motivate

╰━━━━━━━━━━━━━━━━━━━━━━╯
`,

  7: `
╭━━〔 👑 OWNER MENU 〕━━╮

👑 .owner
📊 .botinfo
🔄 .restart

╰━━━━━━━━━━━━━━━━━━━━━━╯
`,

  8: `
╭━━〔 📜 ALL COMMANDS 〕━━╮

.menu
.ping
.time
.song
.audio
.video
.ytdl
.social
.dl
.sticker
.s
.ai

.groupinfo
.admins
.tagall
.promote
.demote
.kick

.morning
.night
.respect
.friend
.joke
.quote
.fact
.motivate

.owner
.botinfo
.restart

╰━━━━━━━━━━━━━━━━━━━━━━╯
`
};

/* =========================================================
   PING
========================================================= */

async function ping(sock, jid, quoted) {
  const start = Date.now();

  const msg = await sock.sendMessage(
    jid,
    {
      text: "⚡ MALIYA-X speed checking..."
    },
    { quoted }
  );

  const ms = Date.now() - start;

  const uptime = process.uptime();

  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  const s = Math.floor(uptime % 60);

  const result = `
╭━━〔 ⚡ ${BOT} SPEED 〕━━╮
┃ 🚀 Speed : ${ms} ms
┃ ⏳ Uptime : ${h}h ${m}m ${s}s
┃ 🟢 Status : ONLINE
┃ 📅 Date : ${getDate()}
┃ 🕐 Time : ${getTime()}
╰━━━━━━━━━━━━━━━━━━━━━━╯

👑 ${BOT} 🇱🇰
`;

  try {
    return await sock.sendMessage(jid, {
      text: result,
      edit: msg.key
    });
  } catch {
    return sock.sendMessage(
      jid,
      {
        text: result
      },
      { quoted }
    );
  }
}

/* =========================================================
   TIME
========================================================= */

async function sendTime(sock, jid, quoted) {
  return sock.sendMessage(
    jid,
    {
      text: `
╭━━〔 🕐 TIME 〕━━╮

📅 Date : ${getDate()}
🕐 Time : ${getTime()}
🌏 Timezone : Asia/Colombo

👑 ${BOT} 🇱🇰
`
    },
    { quoted }
  );
}

/* =========================================================
   SONG
========================================================= */

async function song(sock, jid, quoted, query) {
  if (!query) {
    return sock.sendMessage(
      jid,
      {
        text: "🎵 භාවිතය:\n.song <song name>\n\nExample:\n.song Lelena"
      },
      { quoted }
    );
  }

  await sock.sendMessage(
    jid,
    {
      text: "🔎 Song එක search කරනවා..."
    },
    { quoted }
  );

  try {
    const result = await ytSearch(query);
    const video = result.videos?.[0];

    if (!video) {
      throw new Error("Song not found");
    }

    const title = video.title;
    const url = video.url;
    const duration = video.timestamp || "Unknown";
    const thumbnail = video.thumbnail;

    /*
      Search result card
    */

    const info = `
╭━━〔 🎵 ${BOT} MUSIC 〕━━╮

🎧 *TITLE*
${title}

⏱️ *DURATION* : ${duration}

🔗 *YOUTUBE*
${url}

━━━━━━━━━━━━━━━━━━━━━━

🎶 Downloading audio...

👑 Powered by ${BOT} 🇱🇰
`;

    if (thumbnail) {
      try {
        await sock.sendMessage(
          jid,
          {
            image: { url: thumbnail },
            caption: info
          },
          { quoted }
        );
      } catch {
        await sock.sendMessage(
          jid,
          {
            text: info
          },
          { quoted }
        );
      }
    } else {
      await sock.sendMessage(
        jid,
        {
          text: info
        },
        { quoted }
      );
    }

    const response = await api(
      `${API}/download/ytmp3`,
      { url },
      90000
    );

    const downloadUrl =
      response.data?.result?.download_url ||
      response.data?.result?.url ||
      response.data?.download_url;

    if (!downloadUrl) {
      throw new Error("Audio URL unavailable");
    }

    return sock.sendMessage(
      jid,
      {
        audio: { url: downloadUrl },
        mimetype: "audio/mpeg",
        fileName:
          title.replace(/[\\/:*?"<>|]/g, "_") + ".mp3"
      },
      { quoted }
    );
  } catch (e) {
    console.error("SONG ERROR:", e.message);

    return sock.sendMessage(
      jid,
      {
        text:
          "❌ Song download කරන්න බැරි වුණා.\n\nAPI server එක temporary unavailable වෙන්න පුළුවන්."
      },
      { quoted }
    );
  }
}

/* =========================================================
   VIDEO
========================================================= */

async function video(sock, jid, quoted, query) {
  if (!query) {
    return sock.sendMessage(
      jid,
      {
        text: "🎬 භාවිතය:\n.video <YouTube URL/name>"
      },
      { quoted }
    );
  }

  await sock.sendMessage(
    jid,
    {
      text: "🎬 Video එක search/download කරනවා..."
    },
    { quoted }
  );

  try {
    let url = query;
    let title = "MALIYA-X Video";
    let thumbnail = null;

    if (!/^https?:\/\//i.test(query)) {
      const result = await ytSearch(query);
      const found = result.videos?.[0];

      if (!found) {
        throw new Error("Video not found");
      }

      url = found.url;
      title = found.title;
      thumbnail = found.thumbnail;
    }

    const response = await api(
      `${API}/download/ytmp4`,
      { url },
      120000
    );

    const downloadUrl =
      response.data?.result?.download_url ||
      response.data?.result?.url ||
      response.data?.download_url;

    if (!downloadUrl) {
      throw new Error("Video URL unavailable");
    }

    if (thumbnail) {
      try {
        await sock.sendMessage(
          jid,
          {
            image: { url: thumbnail },
            caption: `
🎬 *${title}*

📥 Video download started...

👑 ${BOT} 🇱🇰
`
          },
          { quoted }
        );
      } catch {}
    }

    return sock.sendMessage(
      jid,
      {
        video: { url: downloadUrl },
        mimetype: "video/mp4",
        caption: `
🎬 ${title}

👑 Downloaded by ${BOT} 🇱🇰
`
      },
      { quoted }
    );
  } catch (e) {
    console.error("VIDEO ERROR:", e.message);

    return sock.sendMessage(
      jid,
      {
        text: "❌ Video download කරන්න බැරි වුණා."
      },
      { quoted }
    );
  }
}

/* =========================================================
   SOCIAL
========================================================= */

async function social(sock, jid, quoted, url) {
  if (!url) {
    return sock.sendMessage(
      jid,
      {
        text: "📥 භාවිතය:\n.social <TikTok/Instagram/Facebook URL>"
      },
      { quoted }
    );
  }

  try {
    await sock.sendMessage(
      jid,
      {
        text: "📥 Social media video download කරනවා..."
      },
      { quoted }
    );

    const response = await api(
      `${API}/download/all`,
      { url },
      120000
    );

    const data =
      response.data?.result ||
      response.data;

    const downloadUrl =
      data?.download_url ||
      data?.url ||
      data?.video ||
      data?.media;

    if (!downloadUrl) {
      throw new Error("No download URL");
    }

    return sock.sendMessage(
      jid,
      {
        video: { url: downloadUrl },
        mimetype: "video/mp4",
        caption: `📥 Downloaded by ${BOT} 🇱🇰`
      },
      { quoted }
    );
  } catch (e) {
    console.error("SOCIAL ERROR:", e.message);

    return sock.sendMessage(
      jid,
      {
        text: "❌ Social download එක වැඩ කළේ නැහැ."
      },
      { quoted }
    );
  }
}

/* =========================================================
   STICKER
========================================================= */

async function sticker(sock, jid, message) {
  const msg = unwrapMessage(message);
  const quoted = getQuoted(message);

  const image =
    msg.imageMessage ||
    quoted.imageMessage;

  const video =
    msg.videoMessage ||
    quoted.videoMessage;

  if (!image && !video) {
    return sock.sendMessage(
      jid,
      {
        text:
          "🧩 Image/video එකක් reply කරලා `.sticker` ගහන්න."
      },
      { quoted: message }
    );
  }

  try {
    const media = image || video;

    const stream = await downloadContentFromMessage(
      media,
      image ? "image" : "video"
    );

    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return sock.sendMessage(
      jid,
      {
        sticker: Buffer.concat(chunks)
      },
      { quoted: message }
    );
  } catch (e) {
    console.error("STICKER ERROR:", e.message);

    return sock.sendMessage(
      jid,
      {
        text: "❌ Sticker එක හදන්න බැරි වුණා."
      },
      { quoted: message }
    );
  }
}

/* =========================================================
   AI
========================================================= */

async function ai(sock, jid, quoted, query) {
  if (!query) {
    return sock.sendMessage(
      jid,
      {
        text: "🤖 භාවිතය:\n.ai <question>"
      },
      { quoted }
    );
  }

  try {
    await sock.sendMessage(
      jid,
      {
        text: "🤖 AI thinking..."
      },
      { quoted }
    );

    const response = await api(
      `${API}/ai/gemini`,
      { query },
      60000
    );

    const answer =
      response.data?.result ||
      response.data?.response ||
      response.data?.answer;

    if (!answer) {
      throw new Error("No AI response");
    }

    return sock.sendMessage(
      jid,
      {
        text: `🤖 ${BOT} AI\n\n${answer}`
      },
      { quoted }
    );
  } catch (e) {
    console.error("AI ERROR:", e.message);

    return sock.sendMessage(
      jid,
      {
        text: "❌ AI service එක දැන් unavailable."
      },
      { quoted }
    );
  }
}

/* =========================================================
   GROUP FUNCTIONS
========================================================= */

async function groupInfo(sock, jid, quoted) {
  if (!jid.endsWith("@g.us")) {
    return sock.sendMessage(
      jid,
      {
        text: "❌ මේ command එක Group එකකදී විතරයි."
      },
      { quoted }
    );
  }

  const group = await sock.groupMetadata(jid);

  const admins = group.participants.filter(
    p => p.admin
  ).length;

  return sock.sendMessage(
    jid,
    {
      text: `
╭━━〔 👥 GROUP INFO 〕━━╮

🏷️ Name : ${group.subject}
👥 Members : ${group.participants.length}
👑 Admins : ${admins}
🆔 Group ID : ${jid}

👑 ${BOT} 🇱🇰
`
    },
    { quoted }
  );
}

async function admins(sock, jid, quoted) {
  if (!jid.endsWith("@g.us")) {
    return sock.sendMessage(
      jid,
      {
        text: "❌ Group එකකදී විතරයි."
      },
      { quoted }
    );
  }

  const group = await sock.groupMetadata(jid);

  const list = group.participants.filter(
    p => p.admin
  );

  const mentions = list
    .map(p => p.id)
    .filter(Boolean);

  const text =
    "╭━━〔 👑 GROUP ADMINS 〕━━╮\n\n" +
    list
      .map(
        (p, i) =>
          `${i + 1}. @${getNumber(p)}`
      )
      .join("\n") +
    "\n\n╰━━━━━━━━━━━━━━━━━━━━━━╯";

  return sock.sendMessage(
    jid,
    {
      text,
      mentions
    },
    { quoted }
  );
}

async function tagAll(sock, jid, quoted) {
  if (!jid.endsWith("@g.us")) {
    return sock.sendMessage(
      jid,
      {
        text: "❌ Group එකකදී විතරයි."
      },
      { quoted }
    );
  }

  const group = await sock.groupMetadata(jid);

  const mentions = group.participants
    .map(p => p.id)
    .filter(Boolean);

  const text =
    `📢 *${group.subject}*\n\n` +
    group.participants
      .map(
        (p, i) =>
          `${i + 1}. @${getNumber(p)}`
      )
      .join("\n");

  return sock.sendMessage(
    jid,
    {
      text,
      mentions
    },
    { quoted }
  );
}

/* =========================================================
   ADMIN CHECK
========================================================= */

async function isAdmin(sock, jid, user) {
  if (!jid.endsWith("@g.us")) return false;

  const group = await sock.groupMetadata(jid);

  const participant = group.participants.find(
    p => p.id === user
  );

  return Boolean(participant?.admin);
}

async function getTarget(message, group) {
  const msg = unwrapMessage(message);

  const mentioned =
    msg.extendedTextMessage?.contextInfo
      ?.mentionedJid;

  if (mentioned?.length) {
    return mentioned[0];
  }

  const quoted =
    msg.extendedTextMessage?.contextInfo
      ?.participant;

  if (quoted) {
    return quoted;
  }

  return null;
}

/* =========================================================
   PROMOTE / DEMOTE / KICK
========================================================= */

async function groupAction(sock, jid, message, action) {
  if (!jid.endsWith("@g.us")) {
    return sock.sendMessage(jid, {
      text: "❌ Group එකකදී විතරයි."
    });
  }

  const sender = message.key.participant || message.key.remoteJid;

  const botNumber = `${PHONE}@s.whatsapp.net`;

  const senderAdmin = await isAdmin(
    sock,
    jid,
    sender
  );

  if (sender !== botNumber && !senderAdmin) {
    return sock.sendMessage(jid, {
      text: "❌ මේ command එක use කරන්න Group Admin කෙනෙක් වෙන්න ඕන."
    });
  }

  const target = await getTarget(message, jid);

  if (!target) {
    return sock.sendMessage(jid, {
      text:
        `❌ User mention/reply කරන්න.\n\nExample:\n.${action} @user`
    });
  }

  try {
    await sock.groupParticipantsUpdate(
      jid,
      [target],
      action
    );

    const messages = {
      promote: `👑 @${getNumber(target)} දැන් Admin!`,
      demote: `🔻 @${getNumber(target)} Admin තනතුරෙන් ඉවත් කළා.`,
      remove: `🚫 @${getNumber(target)} group එකෙන් remove කළා.`
    };

    return sock.sendMessage(jid, {
      text: messages[action],
      mentions: [target]
    });
  } catch (e) {
    return sock.sendMessage(jid, {
      text: "❌ Group action එක කරන්න බැරි වුණා."
    });
  }
}

/* =========================================================
   AUTO GOOD MORNING / GOOD NIGHT
========================================================= */

const autoSent = new Map();

async function autoGreetings(sock) {
  try {
    const hour = getHour();
    const minute = getMinute();

    let type = null;

    if (hour === 6 && minute === 30) {
      type = "morning";
    }

    if (hour === 22 && minute === 0) {
      type = "night";
    }

    if (!type) return;

    const groups = await sock.groupFetchAllParticipating();

    for (const jid of Object.keys(groups)) {
      const key = `${jid}-${getDate()}-${type}`;

      if (autoSent.has(key)) continue;

      autoSent.set(key, true);

      if (type === "morning") {
        await sock.sendMessage(jid, {
          text: `
╭━━〔 🌅 GOOD MORNING 〕━━╮

☀️ සුභ උදෑසනක් හැමෝටම! ❤️

✨ අද දවස සතුටින්
💪 ශක්තියෙන්
🔥 ජයග්‍රහණයෙන් පිරුණු
දවසක් වේවා!

👑 ${BOT} 🇱🇰
`
        });
      }

      if (type === "night") {
        await sock.sendMessage(jid, {
          text: `
╭━━〔 🌙 GOOD NIGHT 〕━━╮

🌙 සුභ රාත්‍රියක් හැමෝටම! ❤️

😴 හොඳින් නිදාගන්න.
✨ හෙට අලුත් දවසක්!

👑 ${BOT} 🇱🇰
`
        });
      }
    }
  } catch (e) {
    console.error("AUTO GREETING:", e.message);
  }
}

/* =========================================================
   SIMPLE COMMANDS
========================================================= */

async function simpleCommand(sock, jid, quoted, command) {
  const replies = {
    morning: `
🌅 Good Morning! ❤️

සුභ උදෑසනක්! 🇱🇰
අද දවස සාර්ථක දවසක් වේවා! 🔥
`,

    night: `
🌙 Good Night! ❤️

සුභ රාත්‍රියක්! 😴
හෙට තවත් ලස්සන දවසක්! ✨
`,

    respect:
      "❤️ Respect everyone. Stay kind! 🤝",

    friend:
      "🤝 Friends forever! ❤️🔥",

    joke:
      "😂 Teacher: Homework කළාද?\nStudent: Sir, WiFi තිබුණේ නෑ. 😭😂",

    quote:
      "💡 Small steps every day become big results. 🔥",

    fact:
      "🧠 Fact: Octopus එකකට hearts 3ක් තියෙනවා. 🐙❤️",

    motivate:
      "🔥 Don't give up! අද අමාරු වුණත් හෙට ජයග්‍රහණයක් වෙන්න පුළුවන්. 💪"
  };

  return sock.sendMessage(
    jid,
    {
      text: replies[command]
    },
    { quoted }
  );
}

/* =========================================================
   BOT INFO
========================================================= */

async function botInfo(sock, jid, quoted) {
  const uptime = process.uptime();

  return sock.sendMessage(
    jid,
    {
      text: `
╭━━〔 🤖 BOT INFORMATION 〕━━╮

👑 Bot : ${BOT}
🟢 Status : ONLINE
⚡ Prefix : ${PREFIX}
🌐 Platform : Render
📅 Date : ${getDate()}
🕐 Time : ${getTime()}

⏳ Uptime :
${Math.floor(uptime / 3600)}h ${Math.floor(
        (uptime % 3600) / 60
      )}m ${Math.floor(uptime % 60)}s

🇱🇰 Sri Lankan WhatsApp Bot

╰━━━━━━━━━━━━━━━━━━━━━━╯
`
    },
    { quoted }
  );
}

/* =========================================================
   START BOT
========================================================= */

async function startBot() {
  const {
    state,
    saveCreds
  } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    logger,
    browser: Browsers.macOS("Chrome"),
    markOnlineOnConnect: true,
    syncFullHistory: false,
    generateHighQualityLinkPreview: true
  });

  sock.ev.on("creds.update", saveCreds);

  /* =======================================================
     CONNECTION
  ======================================================= */

  sock.ev.on(
    "connection.update",
    async ({
      connection,
      lastDisconnect
    }) => {
      if (connection === "open") {
        console.log(`
╭━━〔 👑 ${BOT} 〕━━╮
┃ ✅ WhatsApp Connected
┃ 🟢 Status : ONLINE
┃ 📅 ${getDate()}
┃ 🕐 ${getTime()}
┃ 🌐 Render
╰━━━━━━━━━━━━━━━━━━━━━━╯
`);

        try {
          if (OWNER) {
            await sock.sendMessage(
              `${OWNER}@s.whatsapp.net`,
              {
                text: `
╭━━〔 👑 ${BOT} 〕━━╮
┃ ✅ WhatsApp Bot Connected!
┃ 🟢 Status : ONLINE
┃ 🤖 Bot : ${BOT}
┃ 📅 Date : ${getDate()}
┃ 🕐 Time : ${getTime()}
┃ 🌐 Platform : Render
╰━━━━━━━━━━━━━━━━━━━━━━╯

🔥 Bot එක දැන් වැඩ!
🚀 Commands ready!

Type:
.menu

👑 Powered by ${BOT} 🇱🇰
`
              }
            );
          }
        } catch (e) {
          console.error(
            "Owner message:",
            e.message
          );
        }
      }

      if (connection === "close") {
        const code =
          lastDisconnect?.error?.output
            ?.statusCode ||
          lastDisconnect?.error?.statusCode;

        if (code !== DisconnectReason.loggedOut) {
          console.log(
            "🔄 Connection closed. Reconnecting..."
          );

          setTimeout(startBot, 5000);
        } else {
          console.log(
            "🚪 WhatsApp logged out."
          );
        }
      }
    }
  );

  /* =======================================================
     PAIRING CODE
  ======================================================= */

  if (!state.creds.registered && PHONE) {
    setTimeout(async () => {
      try {
        const code =
          await sock.requestPairingCode(PHONE);

        console.log(`
╭━━〔 🔐 PAIRING CODE 〕━━╮
┃ ${code}
╰━━━━━━━━━━━━━━━━━━━━━━╯
`);
      } catch (e) {
        console.error(
          "PAIRING ERROR:",
          e.message
        );
      }
    }, 5000);
  }

  /* =======================================================
     WELCOME / GOODBYE
  ======================================================= */

  sock.ev.on(
    "group-participants.update",
    async update => {
      try {
        const group =
          await sock.groupMetadata(update.id);

        for (const participant of update.participants || []) {
          const jid = participant;
          const number = getNumber(participant);

          if (update.action === "add") {
            await sock.sendMessage(update.id, {
              text: `
╭━━〔 👋 WELCOME 〕━━╮

🎉 Welcome @${number}!

🏠 Group : ${group.subject}
📅 Date : ${getDate()}
🕐 Time : ${getTime()}

❤️ අපේ group එකට සාදරයෙන් පිළිගන්නවා!

👑 ${BOT} 🇱🇰
`,
              mentions: [jid]
            });
          }

          if (update.action === "remove") {
            await sock.sendMessage(update.id, {
              text: `
👋 @${number} group එකෙන් ඉවත් වුණා.

💔 අපිව මතක් වෙයි!
👑 ${BOT} 🇱🇰
`,
              mentions: [jid]
            });
          }
        }
      } catch (e) {
        console.error(
          "GROUP UPDATE:",
          e.message
        );
      }
    }
  );

  /* =======================================================
     MESSAGE HANDLER
  ======================================================= */

  sock.ev.on(
    "messages.upsert",
    async ({ messages }) => {
      const message = messages?.[0];

      if (!message) return;

      /*
        IMPORTANT:
        fromMe commands are NOT ignored.
        ඒ නිසා Bot number එකෙන්ම .ping/.menu test
        කරන්න පුළුවන්.
      */

      try {
        const jid =
          message.key.remoteJid;

        const body =
          getText(message);

        if (!jid || !body) return;

        const lower =
          body.toLowerCase().trim();

        /* =================================================
           NUMBER MENU
        ================================================= */

        if (
          /^[1-8]$/.test(lower) &&
          menus.has(jid)
        ) {
          const created =
            menus.get(jid);

          if (
            Date.now() - created <
            10 * 60 * 1000
          ) {
            menus.set(jid, Date.now());

            return sock.sendMessage(
              jid,
              {
                text:
                  subMenus[Number(lower)]
              },
              {
                quoted: message
              }
            );
          }
        }

        /* =================================================
           PREFIX
        ================================================= */

        if (!lower.startsWith(PREFIX)) {
          return;
        }

        const parts =
          body.trim().split(/\s+/);

        const command =
          parts[0]
            .slice(PREFIX.length)
            .toLowerCase();

        const args =
          parts.slice(1).join(" ");

        /* =================================================
           COMMANDS
        ================================================= */

        switch (command) {
          case "menu":
          case "help":
          case "start":
            return sendMenu(
              sock,
              jid,
              message
            );

          case "ping":
            return ping(
              sock,
              jid,
              message
            );

          case "time":
            return sendTime(
              sock,
              jid,
              message
            );

          case "song":
          case "audio":
            return song(
              sock,
              jid,
              message,
              args
            );

          case "video":
          case "ytdl":
            return video(
              sock,
              jid,
              message,
              args
            );

          case "social":
          case "dl":
            return social(
              sock,
              jid,
              message,
              args
            );

          case "sticker":
          case "s":
            return sticker(
              sock,
              jid,
              message
            );

          case "ai":
            return ai(
              sock,
              jid,
              message,
              args
            );

          case "groupinfo":
            return groupInfo(
              sock,
              jid,
              message
            );

          case "admins":
            return admins(
              sock,
              jid,
              message
            );

          case "tagall":
            return tagAll(
              sock,
              jid,
              message
            );

          case "promote":
            return groupAction(
              sock,
              jid,
              message,
              "promote"
            );

          case "demote":
            return groupAction(
              sock,
              jid,
              message,
              "demote"
            );

          case "kick":
          case "remove":
            return groupAction(
              sock,
              jid,
              message,
              "remove"
            );

          case "morning":
            return simpleCommand(
              sock,
              jid,
              message,
              "morning"
            );

          case "night":
            return simpleCommand(
              sock,
              jid,
              message,
              "night"
            );

          case "respect":
            return simpleCommand(
              sock,
              jid,
              message,
              "respect"
            );

          case "friend":
            return simpleCommand(
              sock,
              jid,
              message,
              "friend"
            );

          case "joke":
            return simpleCommand(
              sock,
              jid,
              message,
              "joke"
            );

          case "quote":
            return simpleCommand(
              sock,
              jid,
              message,
              "quote"
            );

          case "fact":
            return simpleCommand(
              sock,
              jid,
              message,
              "fact"
            );

          case "motivate":
            return simpleCommand(
              sock,
              jid,
              message,
              "motivate"
            );

          case "botinfo":
            return botInfo(
              sock,
              jid,
              message
            );

          case "owner":
            return sock.sendMessage(
              jid,
              {
                text: `
╭━━〔 👑 OWNER 〕━━╮

👑 Owner : ${OWNER}
🤖 Bot : ${BOT}

🇱🇰 ${BOT} WhatsApp Bot
`
              },
              { quoted: message }
            );

          case "restart":
            if (
              getNumber(
                message.key.participant ||
                  message.key.remoteJid
              ) !== OWNER
            ) {
              return;
            }

            await sock.sendMessage(
              jid,
              {
                text:
                  "🔄 Bot restarting..."
              },
              { quoted: message }
            );

            process.exit(0);

          default:
            return sock.sendMessage(
              jid,
              {
                text: `
❌ Unknown command!

📌 ${PREFIX}menu

උදාහරණ:
.ping
.song Lelena
.video URL
.ai hello
`
              },
              { quoted: message }
            );
        }
      } catch (e) {
        console.error(
          "MESSAGE ERROR:",
          e
        );
      }
    }
  );

  /* =======================================================
     AUTO GREETING CHECK
  ======================================================= */

  setInterval(() => {
    autoGreetings(sock);
  }, 60000);
}

/* =========================================================
   START
========================================================= */

startBot().catch(error => {
  console.error(
    "FATAL ERROR:",
    error
  );

  setTimeout(
    startBot,
    5000
  );
});
