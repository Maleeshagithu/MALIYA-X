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

// ===============================
// MALIYA-X SETTINGS
// ===============================

const PORT = process.env.PORT || 3000;
const PREFIX = ".";
const BOT = process.env.BOT_NAME || "MALIYA-X";

const PHONE = (
  process.env.PHONE_NUMBER || "94770678992"
).replace(/\D/g, "");

const OWNER = (
  process.env.OWNER_NUMBER || PHONE
).replace(/\D/g, "");

const API =
  process.env.API_BASE ||
  "https://apis.davidcyriltech.my.id";

const AUTH = path.join(__dirname, "auth_info");
const MENU = path.join(__dirname, "menu.jpg");

const log = P({
  level: "silent"
});

// ===============================
// EXPRESS SERVER
// ===============================

const app = express();

app.get("/", (req, res) => {
  res.send(`${BOT} 🇱🇰 is running successfully!`);
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// ===============================
// TIME / DATE
// ===============================

const date = () =>
  new Date().toLocaleDateString("en-GB", {
    timeZone: "Asia/Colombo"
  });

const time = () =>
  new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Colombo",
    hour12: true
  });

// ===============================
// MESSAGE HELPERS
// ===============================

function raw(message) {
  let x = message?.message || message || {};

  while (x.ephemeralMessage?.message) {
    x = x.ephemeralMessage.message;
  }

  while (x.viewOnceMessage?.message) {
    x = x.viewOnceMessage.message;
  }

  return x;
}

function getText(message) {
  const x = raw(message);

  return (
    x.conversation ||
    x.extendedTextMessage?.text ||
    x.imageMessage?.caption ||
    x.videoMessage?.caption ||
    x.documentMessage?.caption ||
    x.listResponseMessage?.singleSelectReply?.selectedRowId ||
    x.buttonsResponseMessage?.selectedButtonId ||
    x.templateButtonReplyMessage?.selectedId ||
    ""
  ).trim();
}

function getQuoted(message) {
  const x = raw(message);
  const context =
    x.extendedTextMessage?.contextInfo ||
    x.imageMessage?.contextInfo ||
    x.videoMessage?.contextInfo ||
    x.documentMessage?.contextInfo;

  return raw(context?.quotedMessage || {});
}

function getJid(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.includes("@")
      ? value
      : `${value}@s.whatsapp.net`;
  }

  return (
    value.id ||
    value.jid ||
    value.participant ||
    ""
  );
}

function getNumber(value) {
  return String(getJid(value)).split("@")[0];
}

// ===============================
// MENU
// ===============================

function menuText() {
  return `
╭━━〔 👑 ${BOT} 〕━━╮
┃ 👋 ආයුබෝවන්!
┃ 🤖 Sri Lankan WhatsApp Bot
┃ ⚡ Fast • Secure • Reliable
┃ 🕐 ${time()}
┃ 📅 ${date()}
╰━━━━━━━━━━━━━━━━━━━━━━╯

📲 *${BOT} COMMAND MENU*

🔎 SEARCH
┃ 🎵 .song <song name>
┃ 🎬 .video <name / URL>

📥 DOWNLOAD
┃ 🎵 .song
┃ 🎬 .video
┃ 📥 .social
┃ 🧩 .sticker

👥 GROUP
┃ 👥 .groupinfo
┃ 📢 .tagall
┃ 🛡️ .admins

🤖 AI
┃ 🤖 .ai <question>

🛠️ TOOLS
┃ ⚡ .ping
┃ 🕐 .time
┃ 😂 .joke
┃ 💡 .quote
┃ 🧠 .fact
┃ 🔥 .motivate

❤️ FUN
┃ 🌅 .morning
┃ 🌙 .night
┃ ❤️ .respect
┃ 🤝 .friend

👑 Powered by ${BOT} 🇱🇰
`;
}

async function sendMenu(sock, jid, quoted) {
  const caption = menuText();

  try {
    if (fs.existsSync(MENU)) {
      return await sock.sendMessage(
        jid,
        {
          image: fs.readFileSync(MENU),
          caption
        },
        {
          quoted
        }
      );
    }

    return await sock.sendMessage(
      jid,
      {
        text: caption
      },
      {
        quoted
      }
    );
  } catch (error) {
    console.error("Menu error:", error.message);

    return sock.sendMessage(
      jid,
      {
        text: caption
      },
      {
        quoted
      }
    );
  }
}

// ===============================
// PING
// ===============================

async function ping(sock, jid, quoted) {
  const start = process.hrtime.bigint();

  try {
    const msg = await sock.sendMessage(
      jid,
      {
        text: "📍 Checking MALIYA-X speed..."
      },
      {
        quoted
      }
    );

    const end = process.hrtime.bigint();

    const ms = Math.max(
      1,
      Number(end - start) / 1000000
    ).toFixed(2);

    const uptime = process.uptime();

    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);

    const result = `
╭━━〔 ⚡ ${BOT} SPEED 〕━━╮
┃ ⚡ Response : ${ms} ms
┃ ⏳ Uptime : ${h}h ${m}m ${s}s
┃ 🟢 Status : ONLINE
┃ 📅 Date : ${date()}
┃ 🕐 Time : ${time()}
╰━━━━━━━━━━━━━━━━━━━━━━╯

👑 ${BOT} — Sri Lankan WhatsApp Bot 🇱🇰
`;

    try {
      return await sock.sendMessage(
        jid,
        {
          text: result,
          edit: msg.key
        }
      );
    } catch {
      return sock.sendMessage(
        jid,
        {
          text: result
        },
        {
          quoted
        }
      );
    }
  } catch (error) {
    console.error("Ping error:", error.message);

    return sock.sendMessage(
      jid,
      {
        text: "⚡ MALIYA-X ONLINE! 🟢"
      },
      {
        quoted
      }
    );
  }
}

// ===============================
// API
// ===============================

async function api(url, params = {}, timeout = 60000) {
  return axios.get(url, {
    params,
    timeout,
    validateStatus: () => true
  });
}

// ===============================
// SONG
// ===============================

async function song(sock, jid, quoted, args) {
  if (!args) {
    return sock.sendMessage(
      jid,
      {
        text: "🎵 භාවිතය:\n.song <song name>\n\nඋදා:\n.song Lelena"
      },
      {
        quoted
      }
    );
  }

  await sock.sendMessage(
    jid,
    {
      text: "🔎 Song එක හොයනවා..."
    },
    {
      quoted
    }
  );

  try {
    const search = await ytSearch(args);
    const video = search.videos?.[0];

    if (!video) {
      throw new Error("YouTube result not found");
    }

    const response = await api(
      `${API}/download/ytmp3`,
      {
        url: video.url
      }
    );

    const downloadUrl =
      response.data?.result?.download_url;

    if (!downloadUrl) {
      throw new Error("Download URL unavailable");
    }

    const fileName =
      video.title.replace(
        /[\\/:*?"<>|]/g,
        "_"
      ) + ".mp3";

    return await sock.sendMessage(
      jid,
      {
        audio: {
          url: downloadUrl
        },
        mimetype: "audio/mpeg",
        fileName
      },
      {
        quoted
      }
    );
  } catch (error) {
    console.error("Song error:", error.message);

    return sock.sendMessage(
      jid,
      {
        text:
          "❌ Song download එක මේ වෙලාවේ වැඩ කරන්නේ නැහැ."
      },
      {
        quoted
      }
    );
  }
}

// ===============================
// VIDEO
// ===============================

async function video(sock, jid, quoted, args) {
  if (!args) {
    return sock.sendMessage(
      jid,
      {
        text:
          "🎬 භාවිතය:\n.video <YouTube URL/name>"
      },
      {
        quoted
      }
    );
  }

  await sock.sendMessage(
    jid,
    {
      text: "📥 Video download කරනවා..."
    },
    {
      quoted
    }
  );

  try {
    let url = args;
    let title = "MALIYA-X Video";

    if (!/^https?:\/\//i.test(args)) {
      const search = await ytSearch(args);
      const result = search.videos?.[0];

      if (!result) {
        throw new Error("Video not found");
      }

      url = result.url;
      title = result.title;
    }

    const response = await api(
      `${API}/download/ytmp4`,
      {
        url
      }
    );

    const downloadUrl =
      response.data?.result?.download_url;

    if (!downloadUrl) {
      throw new Error("Video URL unavailable");
    }

    return await sock.sendMessage(
      jid,
      {
        video: {
          url: downloadUrl
        },
        mimetype: "video/mp4",
        caption:
          `🎬 ${title}\n\n👑 ${BOT} 🇱🇰`
      },
      {
        quoted
      }
    );
  } catch (error) {
    console.error("Video error:", error.message);

    return sock.sendMessage(
      jid,
      {
        text:
          "❌ Video download කරන්න බැරි වුණා.\n\nYouTube/API server එකේ ප්‍රශ්නයක් වෙන්න පුළුවන්."
      },
      {
        quoted
      }
    );
  }
}

// ===============================
// SOCIAL DOWNLOAD
// ===============================

async function social(sock, jid, quoted, args) {
  if (!args) {
    return sock.sendMessage(
      jid,
      {
        text:
          "📥 භාවිතය:\n.social <URL>"
      },
      {
        quoted
      }
    );
  }

  await sock.sendMessage(
    jid,
    {
      text: "📥 Download කරනවා..."
    },
    {
      quoted
    }
  );

  try {
    const response = await api(
      `${API}/download/all`,
      {
        url: args
      }
    );

    const result =
      response.data?.result ||
      response.data;

    const url =
      result?.download_url ||
      result?.url ||
      result?.video ||
      result?.media;

    if (!url) {
      throw new Error("No media URL");
    }

    return await sock.sendMessage(
      jid,
      {
        video: {
          url
        },
        mimetype: "video/mp4",
        caption:
          `📥 Downloaded by ${BOT} 🇱🇰`
      },
      {
        quoted
      }
    );
  } catch (error) {
    console.error("Social error:", error.message);

    return sock.sendMessage(
      jid,
      {
        text:
          "❌ Social download එක මේ වෙලාවේ වැඩ කරන්නේ නැහැ."
      },
      {
        quoted
      }
    );
  }
}

// ===============================
// STICKER
// ===============================

async function sticker(sock, jid, message) {
  const current = raw(message);
  const q = getQuoted(message);

  const image =
    current.imageMessage ||
    q.imageMessage;

  const video =
    current.videoMessage ||
    q.videoMessage;

  if (!image && !video) {
    return sock.sendMessage(
      jid,
      {
        text:
          "🖼️ Image එකක් reply කරලා `.sticker` ගහන්න."
      },
      {
        quoted: message
      }
    );
  }

  try {
    const type = image ? "image" : "video";

    const stream =
      await downloadContentFromMessage(
        image || video,
        type
      );

    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    return await sock.sendMessage(
      jid,
      {
        sticker: buffer
      },
      {
        quoted: message
      }
    );
  } catch (error) {
    console.error("Sticker error:", error.message);

    return sock.sendMessage(
      jid,
      {
        text:
          "❌ Sticker එක හදන්න බැරි වුණා."
      },
      {
        quoted: message
      }
    );
  }
}

// ===============================
// AI
// ===============================

async function ai(sock, jid, quoted, args) {
  if (!args) {
    return sock.sendMessage(
      jid,
      {
        text:
          "🤖 භාවිතය:\n.ai <question>"
      },
      {
        quoted
      }
    );
  }

  await sock.sendMessage(
    jid,
    {
      text: "🤖 AI හිතනවා..."
    },
    {
      quoted
    }
  );

  try {
    const response = await api(
      `${API}/ai/gemini`,
      {
        query: args
      },
      45000
    );

    const result =
      response.data?.result ||
      response.data?.response ||
      response.data?.answer;

    if (!result) {
      throw new Error("AI response unavailable");
    }

    return await sock.sendMessage(
      jid,
      {
        text:
          `🤖 ${BOT} AI\n\n${result}`
      },
      {
        quoted
      }
    );
  } catch (error) {
    console.error("AI error:", error.message);

    return sock.sendMessage(
      jid,
      {
        text:
          "❌ AI service එක මේ වෙලාවේ unavailable."
      },
      {
        quoted
      }
    );
  }
}

// ===============================
// SIMPLE COMMANDS
// ===============================

async function simpleCommand(sock, jid, quoted, command) {
  let text = "";

  switch (command) {
    case ".time":
      text =
        `🕐 Time: ${time()}\n` +
        `📅 Date: ${date()}\n\n` +
        `👑 ${BOT} 🇱🇰`;
      break;

    case ".morning":
      text =
        "🌅 Good Morning! ❤️\n\n" +
        "සුභ උදෑසනක්! 🇱🇰";
      break;

    case ".night":
      text =
        "🌙 Good Night! ❤️\n\n" +
        "සුභ රාත්‍රියක්! 😴";
      break;

    case ".respect":
      text = "❤️ Respect! 🤝";
      break;

    case ".friend":
      text =
        "🤝 Friends forever! ❤️🔥";
      break;

    case ".joke":
      text =
        "😂 Teacher: Homework කළාද?\n" +
        "Student: Sir, WiFi තිබුණේ නෑ. 😭😂";
      break;

    case ".quote":
      text =
        "💡 Small steps every day become big results. 🔥";
      break;

    case ".fact":
      text =
        "🧠 Fact: Octopus එකකට hearts 3ක් තියෙනවා. 🐙❤️";
      break;

    case ".motivate":
      text =
        "🔥 Don't give up!\n" +
        "අද අමාරු වුණත් හෙට ජයග්‍රහණයක් වෙන්න පුළුවන්. 💪";
      break;

    default:
      return;
  }

  return sock.sendMessage(
    jid,
    {
      text
    },
    {
      quoted
    }
  );
}

// ===============================
// GROUP INFO
// ===============================

async function groupInfo(sock, jid, quoted) {
  if (!jid.endsWith("@g.us")) {
    return sock.sendMessage(
      jid,
      {
        text:
          "❌ මේ command එක group එකකදී විතරයි."
      },
      {
        quoted
      }
    );
  }

  try {
    const group =
      await sock.groupMetadata(jid);

    const admins =
      group.participants.filter(
        p => p.admin
      ).length;

    const text = `
╭━━〔 👥 GROUP INFO 〕━━╮
┃ 🏷️ Group : ${group.subject}
┃ 👥 Members : ${group.participants.length}
┃ 👑 Admins : ${admins}
╰━━━━━━━━━━━━━━━━━━━━━━╯

🤖 ${BOT} 🇱🇰
`;

    return sock.sendMessage(
      jid,
      {
        text
      },
      {
        quoted
      }
    );
  } catch (error) {
    return sock.sendMessage(
      jid,
      {
        text:
          "❌ Group information ලබාගන්න බැරි වුණා."
      },
      {
        quoted
      }
    );
  }
}

// ===============================
// ADMINS
// ===============================

async function admins(sock, jid, quoted) {
  if (!jid.endsWith("@g.us")) {
    return sock.sendMessage(
      jid,
      {
        text:
          "❌ මේ command එක group එකකදී විතරයි."
      },
      {
        quoted
      }
    );
  }

  try {
    const group =
      await sock.groupMetadata(jid);

    const adminList =
      group.participants.filter(
        p => p.admin
      );

    const mentions =
      adminList
        .map(p => getJid(p))
        .filter(Boolean);

    const text =
      "👑 GROUP ADMINS\n\n" +
      adminList
        .map(
          p =>
            `👑 @${getNumber(p)}`
        )
        .join("\n");

    return sock.sendMessage(
      jid,
      {
        text,
        mentions
      },
      {
        quoted
      }
    );
  } catch (error) {
    return sock.sendMessage(
      jid,
      {
        text:
          "❌ Admin list ලබාගන්න බැරි වුණා."
      },
      {
        quoted
      }
    );
  }
}

// ===============================
// TAG ALL
// ===============================

async function tagAll(sock, jid, quoted) {
  if (!jid.endsWith("@g.us")) {
    return sock.sendMessage(
      jid,
      {
        text:
          "❌ මේ command එක group එකකදී විතරයි."
      },
      {
        quoted
      }
    );
  }

  try {
    const group =
      await sock.groupMetadata(jid);

    const participants =
      group.participants;

    const mentions =
      participants
        .map(p => getJid(p))
        .filter(Boolean);

    const text =
      "📢 GROUP MEMBERS\n\n" +
      participants
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
      {
        quoted
      }
    );
  } catch (error) {
    return sock.sendMessage(
      jid,
      {
        text:
          "❌ Members tag කරන්න බැරි වුණා."
      },
      {
        quoted
      }
    );
  }
}

// ===============================
// WELCOME / GOODBYE
// ===============================

async function groupParticipants(sock, update) {
  try {
    const group =
      await sock.groupMetadata(
        update.id
      );

    for (const participant of update.participants || []) {
      const jid =
        getJid(participant);

      const number =
        getNumber(participant);

      if (!jid || !number) continue;

      if (update.action === "add") {
        await sock.sendMessage(
          update.id,
          {
            text: `
╭━━〔 👋 WELCOME 〕━━╮
┃ 🎉 Welcome @${number}!
┃ 👑 ${BOT} 🇱🇰
╰━━━━━━━━━━━━━━━━━━━━━━╯

🏠 Group : ${group.subject}
📅 Date : ${date()}
🕐 Time : ${time()}

❤️ අපේ group එකට සාදරයෙන් පිළිගන්නවා!
✨ Rules follow කරලා හොඳින් ඉන්න.

👑 Powered by ${BOT} 🇱🇰
`,
            mentions: [jid]
          }
        );
      }

      if (update.action === "remove") {
        await sock.sendMessage(
          update.id,
          {
            text: `
╭━━〔 👋 GOODBYE 〕━━╮
┃ @${number} group එකෙන් ඉවත් වුණා.
┃ 👑 ${BOT} 🇱🇰
╰━━━━━━━━━━━━━━━━━━━━━━╯

🏠 Group : ${group.subject}
📅 Date : ${date()}
🕐 Time : ${time()}

💔 අපිව මතක් වෙයි. නැවත එන්න! ❤️
`,
            mentions: [jid]
          }
        );
      }

      if (update.action === "promote") {
        await sock.sendMessage(
          update.id,
          {
            text:
              `👑 @${number} දැන් group admin කෙනෙක්!\n\n` +
              `🏠 ${group.subject}\n` +
              `🤖 ${BOT} 🇱🇰`,
            mentions: [jid]
          }
        );
      }

      if (update.action === "demote") {
        await sock.sendMessage(
          update.id,
          {
            text:
              `🔻 @${number} admin තනතුරෙන් ඉවත් කර ඇත.\n\n` +
              `🏠 ${group.subject}\n` +
              `🤖 ${BOT} 🇱🇰`,
            mentions: [jid]
          }
        );
      }
    }
  } catch (error) {
    console.error(
      "Group update error:",
      error.message
    );
  }
}

// ===============================
// MAIN BOT
// ===============================

async function startBot() {
  const {
    state,
    saveCreds
  } = await useMultiFileAuthState(AUTH);

  const sock = makeWASocket({
    auth: state,
    logger: log,
    browser: Browsers.macOS("Chrome"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: true
  });

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  // =============================
  // CONNECTION
  // =============================

  sock.ev.on(
    "connection.update",
    async ({
      connection,
      lastDisconnect
    }) => {

      if (connection === "open") {
        console.log(
          `👑 ${BOT} ONLINE 🇱🇰`
        );

        try {
          if (OWNER) {
            const ownerJid =
              `${OWNER}@s.whatsapp.net`;

            await sock.sendMessage(
              ownerJid,
              {
                text: `
╭━━〔 👑 ${BOT} 〕━━╮
┃ ✅ WhatsApp Bot Connected!
┃ 🟢 Status : ONLINE
┃ 🤖 Bot : ${BOT}
┃ 📅 Date : ${date()}
┃ 🕐 Time : ${time()}
┃ 🌐 Platform : Render
╰━━━━━━━━━━━━━━━━━━━━━━╯

🔥 ${BOT} දැන් සාර්ථකව WhatsApp එකට connect වී ඇත.
🚀 Bot එක ready!

👑 Powered by ${BOT} 🇱🇰
`
              }
            );

            console.log(
              "📩 Connection message sent."
            );
          }
        } catch (error) {
          console.error(
            "Connection message error:",
            error.message
          );
        }
      }

      if (connection === "close") {
        const code =
          lastDisconnect?.error?.output
            ?.statusCode ||
          lastDisconnect?.error
            ?.statusCode;

        if (
          code !==
          DisconnectReason.loggedOut
        ) {
          console.log(
            "🔄 Connection closed. Reconnecting..."
          );

          setTimeout(
            startBot,
            3000
          );
        } else {
          console.log(
            "🚪 WhatsApp logged out."
          );
        }
      }
    }
  );

  // =============================
  // PAIRING CODE
  // =============================

  if (
    !state.creds.registered &&
    PHONE
  ) {
    setTimeout(async () => {
      try {
        const code =
          await sock.requestPairingCode(
            PHONE
          );

        console.log(
          `🔐 PAIRING CODE: ${code}`
        );
      } catch (error) {
        console.error(
          "Pairing error:",
          error.message
        );
      }
    }, 5000);
  }

  // =============================
  // GROUP EVENTS
  // =============================

  sock.ev.on(
    "group-participants.update",
    async update => {
      await groupParticipants(
        sock,
        update
      );
    }
  );

  // =============================
  // MESSAGE HANDLER
  // =============================

  sock.ev.on(
    "messages.upsert",
    async ({ messages }) => {

      const message =
        messages?.[0];

      // IMPORTANT:
      // fromMe check intentionally removed.
      // This allows the bot number itself
      // to use .ping / .menu / etc.

      if (!message) return;

      try {
        const jid =
          message.key.remoteJid;

        const messageText =
          getText(message);

        if (!jid || !messageText)
          return;

        const text =
          messageText.trim();

        const lower =
          text.toLowerCase();

        console.log(
          `📩 Message: ${text}`
        );

        // =========================
        // COMMAND CHECK
        // =========================

        if (
          !lower.startsWith(PREFIX)
        ) {
          return;
        }

        const parts =
          text.split(/\s+/);

        const command =
          parts[0].toLowerCase();

        const args =
          parts
            .slice(1)
            .join(" ");

        // =========================
        // COMMANDS
        // =========================

        switch (command) {

          case ".menu":
          case ".help":
          case ".start":
            return sendMenu(
              sock,
              jid,
              message
            );

          case ".ping":
            return ping(
              sock,
              jid,
              message
            );

          case ".song":
          case ".audio":
            return song(
              sock,
              jid,
              message,
              args
            );

          case ".video":
          case ".ytdl":
            return video(
              sock,
              jid,
              message,
              args
            );

          case ".social":
          case ".dl":
            return social(
              sock,
              jid,
              message,
              args
            );

          case ".sticker":
          case ".s":
            return sticker(
              sock,
              jid,
              message
            );

          case ".ai":
            return ai(
              sock,
              jid,
              message,
              args
            );

          case ".groupinfo":
            return groupInfo(
              sock,
              jid,
              message
            );

          case ".admins":
            return admins(
              sock,
              jid,
              message
            );

          case ".tagall":
            return tagAll(
              sock,
              jid,
              message
            );

          case ".time":
          case ".morning":
          case ".night":
          case ".respect":
          case ".friend":
          case ".joke":
          case ".quote":
          case ".fact":
          case ".motivate":
            return simpleCommand(
              sock,
              jid,
              message,
              command
            );

          default:
            return sock.sendMessage(
              jid,
              {
                text:
                  `❌ Unknown command: ${command}\n\n` +
                  `📲 .menu ගහලා commands බලන්න.`
              },
              {
                quoted: message
              }
            );
        }

      } catch (error) {
        console.error(
          "Message handler error:",
          error
        );
      }
    }
  );
}

// ===============================
// START
// ===============================

startBot().catch(error => {
  console.error(
    "Fatal error:",
    error
  );

  setTimeout(
    startBot,
    5000
  );
});
