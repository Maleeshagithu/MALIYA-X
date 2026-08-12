const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const P = require("pino");
const axios = require("axios");
const express = require("express");
const ytSearch = require("yt-search");
const fs = require("fs");
const path = require("path");

/* =========================================================
   MALIYA-X 🇱🇰
   WhatsApp MD Bot
   ========================================================= */

// =========================
// CONFIG
// =========================

const BOT_NAME = "MALIYA-X 🇱🇰";

const PREFIX = ".";

// Put your number in Render Environment Variables.
// Example: 94771234567
const PHONE_NUMBER = process.env.PHONE_NUMBER || "";

// Optional owner number
const OWNER_NUMBER = process.env.OWNER_NUMBER || PHONE_NUMBER;

// Render port
const PORT = process.env.PORT || 3000;

// Auth folder
const AUTH_DIR = "./auth_info";

// Menu image
const MENU_IMAGE =
  "https://i.ibb.co/6Pqj45q/file-000000001bac8208a30c54ead6b411f7.png";

// =========================
// EXPRESS SERVER
// =========================

const app = express();

app.get("/", (req, res) => {
  res.send("MALIYA-X Bot is running successfully! 🇱🇰");
});

app.get("/health", (req, res) => {
  res.json({
    bot: BOT_NAME,
    status: "online",
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// =========================
// HELPERS
// =========================

function getText(message) {
  if (!message) return "";

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    message.buttonsResponseMessage?.selectedButtonId ||
    message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    message.templateButtonReplyMessage?.selectedId ||
    ""
  );
}

function cleanNumber(jid = "") {
  return jid.split("@")[0].split(":")[0];
}

function formatDate() {
  return new Date().toLocaleDateString("en-GB", {
    timeZone: "Asia/Colombo"
  });
}

function formatTime() {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Colombo",
    hour12: true
  });
}

function isGroup(jid = "") {
  return jid.endsWith("@g.us");
}

async function sendText(sock, jid, text, quoted) {
  return sock.sendMessage(jid, { text }, { quoted });
}

async function downloadMedia(message, type) {
  const stream = await downloadContentFromMessage(message, type);

  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function getGroupMetadata(sock, jid) {
  try {
    return await sock.groupMetadata(jid);
  } catch {
    return null;
  }
}

async function isAdmin(sock, jid, userJid) {
  if (!isGroup(jid)) return false;

  const metadata = await getGroupMetadata(sock, jid);

  if (!metadata) return false;

  const user = metadata.participants.find(
    p => p.id === userJid
  );

  return Boolean(user?.admin);
}

async function isBotAdmin(sock, jid) {
  if (!isGroup(jid)) return false;

  const metadata = await getGroupMetadata(sock, jid);

  if (!metadata || !sock.user?.id) return false;

  const botNumber = cleanNumber(sock.user.id);

  const bot = metadata.participants.find(
    p => cleanNumber(p.id) === botNumber
  );

  return Boolean(bot?.admin);
}

function getMentioned(message) {
  return (
    message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    []
  );
}

function getQuotedMessage(message) {
  return message?.extendedTextMessage?.contextInfo?.quotedMessage;
}

// =========================
// MENU
// =========================

function menuText(userName) {
  return `
╭━━━〔 ${BOT_NAME} 〕━━━╮
┃ 👋 Hello ${userName}
┃
┃ 🇱🇰 Sri Lankan WhatsApp Bot
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 STATUS 〕━━━╮
┃ ⚡ .ping
┃ 🕐 .time
┃ 🤖 .botinfo
┃ 👑 .owner
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 DOWNLOADS 〕━━━╮
┃ 🎵 .song <name/link>
┃ 🎧 .audio <name/link>
┃ 🎬 .video <name/link>
┃ 📥 .ytdl <name/link>
┃ 📱 .social <TikTok/IG/FB URL>
┃ 📥 .dl <URL>
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 AI & FUN 〕━━━╮
┃ 🤖 .ai <question>
┃ 😂 .joke
┃ 💡 .fact
┃ 💪 .motivate
┃ 💬 .quote
┃ ❤️ .life
┃ 🎯 .challenge
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 GROUP 〕━━━╮
┃ 👋 .tagall
┃ ℹ️ .groupinfo
┃ 🔗 .antilink on/off
┃ 👋 .welcome on/off
┃ 🔕 .mute
┃ 🔊 .unmute
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 MEDIA 〕━━━╮
┃ 🖼️ .sticker
┃ 🖼️ .s
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 OTHER 〕━━━╮
┃ 📋 .menu
┃ 📋 .help
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 BOT INFO 〕━━━╮
┃ 🤖 ${BOT_NAME}
┃ 🇱🇰 Made for WhatsApp
┃ 📅 ${formatDate()}
┃ 🕐 ${formatTime()}
╰━━━━━━━━━━━━━━━━━━━━╯

> Powered by ${BOT_NAME}
`;
}

// =========================
// RANDOM CONTENT
// =========================

const jokes = [
  "😂 Teacher: Why are you late? Student: Because the sign said SCHOOL AHEAD, so I went ahead slowly.",
  "😂 මම WiFi password එක අහලා තිබ්බා... Password එක 'askme' කිව්වා. මම 'askme' කියලා ඇහුවා. 🤣",
  "😂 Computer එකට doctor කෙනෙක් ඕන වුණේ virus එකක් තිබ්බ නිසා."
];

const facts = [
  "🌍 Earth is not a perfect sphere.",
  "🐙 Octopuses have three hearts.",
  "🌙 The Moon is slowly moving away from Earth.",
  "🦈 Sharks are older than trees."
];

const quotes = [
  "✨ Believe in yourself and keep moving forward.",
  "🔥 Small progress is still progress.",
  "💪 Never give up on something you truly want.",
  "🌟 Your future needs your effort today."
];

const motivations = [
  "💪 අද පොඩි step එකක් ගත්තත් හෙට ලොකු result එකක් ලැබෙන්න පුළුවන්.",
  "🔥 Give up නොවී continue කරන්න.",
  "🌟 ඔයාට පුළුවන්. Start now!",
  "🚀 Slow progress is better than no progress."
];

const challenges = [
  "🎯 Challenge: අද අලුත් දෙයක් ඉගෙනගන්න.",
  "🎯 Challenge: පැයක් phone එකෙන් break එකක් ගන්න.",
  "🎯 Challenge: අද කෙනෙක්ට හොඳ වචනයක් කියන්න.",
  "🎯 Challenge: ඔයාගේ goal එක වෙනුවෙන් අද එක action එකක් ගන්න."
];

const lifeReplies = [
  "❤️ Life එක perfect නෑ. ඒත් ඒක තමයි ලස්සන.",
  "❤️ Difficult days permanent නෑ.",
  "🌱 හැම experience එකකින්ම දෙයක් ඉගෙනගන්න."
];

// =========================
// DOWNLOAD APIs
// =========================

async function youtubeAudio(url) {
  const api =
    "https://apis.davidcyriltech.my.id/download/ytmp3?url=" +
    encodeURIComponent(url);

  const response = await axios.get(api, {
    timeout: 30000
  });

  return response.data?.result;
}

async function youtubeVideo(url) {
  const api =
    "https://apis.davidcyriltech.my.id/download/ytmp4?url=" +
    encodeURIComponent(url);

  const response = await axios.get(api, {
    timeout: 30000
  });

  return response.data?.result;
}

async function socialDownload(url) {
  const api =
    "https://apis.davidcyriltech.my.id/download/all?url=" +
    encodeURIComponent(url);

  const response = await axios.get(api, {
    timeout: 30000
  });

  return response.data?.result;
}

async function aiAsk(query) {
  const api =
    "https://apis.davidcyriltech.my.id/ai/gemini?query=" +
    encodeURIComponent(query);

  const response = await axios.get(api, {
    timeout: 30000
  });

  return response.data?.result || response.data?.answer;
}

// =========================
// START BOT
// =========================

let reconnecting = false;

async function startMaliya() {
  if (reconnecting) return;

  const { state, saveCreds } =
    await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,

    logger: P({
      level: "silent"
    }),

    browser: Browsers.macOS("Chrome"),

    printQRInTerminal: false,

    markOnlineOnConnect: false,

    syncFullHistory: false
  });

  // =========================
  // SAVE AUTH
  // =========================

  sock.ev.on("creds.update", saveCreds);

  // =========================
  // PAIRING CODE
  // =========================

  if (!state.creds.registered && PHONE_NUMBER) {
    setTimeout(async () => {
      try {
        const number = PHONE_NUMBER
          .replace(/\+/g, "")
          .replace(/ /g, "")
          .replace(/-/g, "");

        const code = await sock.requestPairingCode(number);

        console.log("");
        console.log("╔════════════════════════════╗");
        console.log("║       MALIYA-X 🇱🇰         ║");
        console.log("║                            ║");
        console.log("║ PAIRING CODE:              ║");
        console.log(`║ ${code}                   ║`);
        console.log("╚════════════════════════════╝");
        console.log("");
      } catch (error) {
        console.log("❌ Pairing code error:", error.message);
      }
    }, 4000);
  }

  // =========================
  // CONNECTION
  // =========================

  sock.ev.on(
    "connection.update",
    async ({ connection, lastDisconnect }) => {
      if (connection === "open") {
        reconnecting = false;

        console.log("");
        console.log("╔══════════════════════════════╗");
        console.log("║       MALIYA-X 🇱🇰           ║");
        console.log("║                              ║");
        console.log("║      CONNECTED SUCCESSFULLY  ║");
        console.log("╚══════════════════════════════╝");
        console.log("");
      }

      if (connection === "close") {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        const shouldReconnect =
          statusCode !== DisconnectReason.loggedOut;

        console.log(
          "❌ Connection closed:",
          statusCode || "unknown"
        );

        if (shouldReconnect) {
          reconnecting = true;

          setTimeout(() => {
            startMaliya().catch(console.error);
          }, 5000);
        } else {
          console.log(
            "⚠️ WhatsApp logged out. Delete auth_info and pair again."
          );
        }
      }
    }
  );

  // =========================
  // GROUP PARTICIPANTS
  // =========================

  sock.ev.on(
    "group-participants.update",
    async anu => {
      try {
        const jid = anu.id;

        const metadata =
          await sock.groupMetadata(jid);

        for (const participant of anu.participants) {
          const number = cleanNumber(participant);

          if (anu.action === "add") {
            const text = `
╭━━━〔 👋 WELCOME 〕━━━╮

👤 Welcome @${number}

🏠 Group:
${metadata.subject}

📅 Date: ${formatDate()}
🕐 Time: ${formatTime()}

🇱🇰 Enjoy the group!

╰━━━━━━━━━━━━━━━━━━━━╯

> Powered by ${BOT_NAME}
`;

            await sock.sendMessage(
              jid,
              {
                text,
                mentions: [participant]
              }
            );
          }

          if (
            anu.action === "remove" ||
            anu.action === "leave"
          ) {
            const text = `
╭━━━〔 👋 GOODBYE 〕━━━╮

👤 @${number} left the group.

🏠 Group:
${metadata.subject}

📅 ${formatDate()}
🕐 ${formatTime()}

╰━━━━━━━━━━━━━━━━━━━━╯
`;

            await sock.sendMessage(
              jid,
              {
                text,
                mentions: [participant]
              }
            );
          }
        }
      } catch (error) {
        console.log(
          "Group participant error:",
          error.message
        );
      }
    }
  );

  // =========================
  // MESSAGES
  // =========================

  sock.ev.on(
    "messages.upsert",
    async ({ messages }) => {
      try {
        const m = messages[0];

        if (!m || !m.message) return;

        /*
         * IMPORTANT:
         * Do NOT use:
         *
         * if(m.key.fromMe)return;
         *
         * because Message Yourself testing can be ignored.
         *
         * We only ignore protocol/status messages.
         */

        const remoteJid = m.key.remoteJid;

        if (!remoteJid) return;

        if (
          remoteJid === "status@broadcast"
        ) {
          return;
        }

        const message = m.message;

        const text = getText(message).trim();

        if (!text) return;

        const lowerText = text.toLowerCase();

        const isCommand =
          lowerText.startsWith(PREFIX);

        if (!isCommand) return;

        const parts = text.slice(PREFIX.length)
          .trim()
          .split(/\s+/);

        const cmd =
          (parts.shift() || "").toLowerCase();

        const args = parts.join(" ").trim();

        const sender =
          m.key.participant ||
          m.key.remoteJid;

        const senderNumber =
          cleanNumber(sender);

        const botNumber =
          cleanNumber(sock.user?.id || "");

        const ownerNumber =
          cleanNumber(OWNER_NUMBER);

        const group =
          isGroup(remoteJid);

        const quoted =
          getQuotedMessage(message);

        const mentioned =
          getMentioned(message);

        console.log(
          `[CMD] ${cmd} | ${senderNumber} | ${
            group ? "GROUP" : "PRIVATE"
          }`
        );

        // =========================
        // PING
        // =========================

        if (cmd === "ping") {
          const start = Date.now();

          await sendText(
            sock,
            remoteJid,
            "🏓 Checking...",
            m
          );

          const speed = Date.now() - start;

          await sendText(
            sock,
            remoteJid,
            `
╭━━━〔 🏓 PONG 〕━━━╮

⚡ Speed: ${speed} ms
🤖 Bot: ${BOT_NAME}
📅 Date: ${formatDate()}
🕐 Time: ${formatTime()}
🟢 Status: Online

╰━━━━━━━━━━━━━━━━━━╯
`,
            m
          );

          return;
        }

        // =========================
        // MENU
        // =========================

        if (
          cmd === "menu" ||
          cmd === "help"
        ) {
          const name =
            m.pushName || "Friend";

          await sock.sendMessage(
            remoteJid,
            {
              image: {
                url: MENU_IMAGE
              },
              caption: menuText(name)
            },
            {
              quoted: m
            }
          );

          return;
        }

        // =========================
        // TIME
        // =========================

        if (cmd === "time") {
          await sendText(
            sock,
            remoteJid,
            `
🕐 *MALIYA-X TIME*

📅 Date: ${formatDate()}
⏰ Time: ${formatTime()}
🌍 Timezone: Asia/Colombo 🇱🇰
`,
            m
          );

          return;
        }

        // =========================
        // BOT INFO
        // =========================

        if (
          cmd === "botinfo" ||
          cmd === "info"
        ) {
          await sendText(
            sock,
            remoteJid,
            `
╭━━━〔 🤖 BOT INFO 〕━━━╮

🤖 Name: ${BOT_NAME}
⚡ Status: Online
🇱🇰 Country: Sri Lanka
📅 ${formatDate()}
🕐 ${formatTime()}

╰━━━━━━━━━━━━━━━━━━━━╯
`,
            m
          );

          return;
        }

        // =========================
        // OWNER
        // =========================

        if (cmd === "owner") {
          if (!OWNER_NUMBER) {
            await sendText(
              sock,
              remoteJid,
              "❌ Owner number is not configured.",
              m
            );

            return;
          }

          await sock.sendMessage(
            remoteJid,
            {
              contacts: {
                displayName: "MALIYA-X Owner",
                contacts: [
                  {
                    vcard:
                      `BEGIN:VCARD\n` +
                      `VERSION:3.0\n` +
                      `FN:MALIYA-X Owner\n` +
                      `TEL;type=CELL;waid=${ownerNumber}:` +
                      `+${ownerNumber}\n` +
                      `END:VCARD`
                  }
                ]
              }
            },
            {
              quoted: m
            }
          );

          return;
        }

        // =========================
        // AI
        // =========================

        if (cmd === "ai") {
          if (!args) {
            await sendText(
              sock,
              remoteJid,
              "🤖 Usage:\n.ai What is artificial intelligence?",
              m
            );

            return;
          }

          await sendText(
            sock,
            remoteJid,
            "🤖 AI is thinking...",
            m
          );

          try {
            const result = await aiAsk(args);

            await sendText(
              sock,
              remoteJid,
              `🤖 *MALIYA-X AI*\n\n${result}`,
              m
            );
          } catch (error) {
            await sendText(
              sock,
              remoteJid,
              "❌ AI service එක මේ වෙලාවේ වැඩ කරන්නේ නැහැ.",
              m
            );
          }

          return;
        }

        // =========================
        // SONG / AUDIO
        // =========================

        if (
          cmd === "song" ||
          cmd === "audio"
        ) {
          if (!args) {
            await sendText(
              sock,
              remoteJid,
              "🎵 Usage:\n.song <song name or YouTube URL>",
              m
            );

            return;
          }

          try {
            await sendText(
              sock,
              remoteJid,
              "🔎 Song searching...",
              m
            );

            let url = args;
            let title = args;

            if (
              !/^https?:\/\//i.test(args)
            ) {
              const result =
                await ytSearch(args);

              if (!result.videos?.length) {
                await sendText(
                  sock,
                  remoteJid,
                  "❌ Song එක හමු වුණේ නැහැ.",
                  m
                );

                return;
              }

              const video =
                result.videos[0];

              url = video.url;
              title = video.title;
            }

            await sendText(
              sock,
              remoteJid,
              `🎵 Found:\n${title}\n\n⬇️ Downloading audio...`,
              m
            );

            const result =
              await youtubeAudio(url);

            const downloadUrl =
              result?.download_url ||
              result?.url;

            if (!downloadUrl) {
              throw new Error(
                "No audio URL"
              );
            }

            await sock.sendMessage(
              remoteJid,
              {
                audio: {
                  url: downloadUrl
                },
                mimetype: "audio/mpeg",
                fileName:
                  `${title.substring(0, 80)}.mp3`
              },
              {
                quoted: m
              }
            );
          } catch (error) {
            console.log(
              "Song error:",
              error.message
            );

            await sendText(
              sock,
              remoteJid,
              "❌ Audio download failed. වෙනත් song එකක් try කරන්න.",
              m
            );
          }

          return;
        }

        // =========================
        // VIDEO / YTDL
        // =========================

        if (
          cmd === "video" ||
          cmd === "ytdl"
        ) {
          if (!args) {
            await sendText(
              sock,
              remoteJid,
              "🎬 Usage:\n.video <video name or YouTube URL>",
              m
            );

            return;
          }

          try {
            await sendText(
              sock,
              remoteJid,
              "🔎 Video searching...",
              m
            );

            let url = args;
            let title = args;

            if (
              !/^https?:\/\//i.test(args)
            ) {
              const result =
                await ytSearch(args);

              if (!result.videos?.length) {
                await sendText(
                  sock,
                  remoteJid,
                  "❌ Video එක හමු වුණේ නැහැ.",
                  m
                );

                return;
              }

              const video =
                result.videos[0];

              url = video.url;
              title = video.title;
            }

            await sendText(
              sock,
              remoteJid,
              `🎬 Found:\n${title}\n\n⬇️ Downloading video...`,
              m
            );

            const result =
              await youtubeVideo(url);

            const downloadUrl =
              result?.download_url ||
              result?.url;

            if (!downloadUrl) {
              throw new Error(
                "No video URL"
              );
            }

            await sock.sendMessage(
              remoteJid,
              {
                video: {
                  url: downloadUrl
                },
                caption:
                  `🎬 ${title}\n\n> ${BOT_NAME}`
              },
              {
                quoted: m
              }
            );
          } catch (error) {
            console.log(
              "Video error:",
              error.message
            );

            await sendText(
              sock,
              remoteJid,
              "❌ Video download failed.",
              m
            );
          }

          return;
        }

        // =========================
        // SOCIAL DOWNLOADER
        // =========================

        if (
          cmd === "social" ||
          cmd === "dl"
        ) {
          if (!args) {
            await sendText(
              sock,
              remoteJid,
              "📥 Usage:\n.social <TikTok / Instagram / Facebook URL>",
              m
            );

            return;
          }

          try {
            await sendText(
              sock,
              remoteJid,
              "📥 Downloading...",
              m
            );

            const result =
              await socialDownload(args);

            const mediaUrl =
              result?.download_url ||
              result?.url ||
              result?.video ||
              result?.media;

            if (!mediaUrl) {
              throw new Error(
                "No media URL"
              );
            }

            await sock.sendMessage(
              remoteJid,
              {
                video: {
                  url: mediaUrl
                },
                caption:
                  `📥 Social Downloader\n\n> ${BOT_NAME}`
              },
              {
                quoted: m
              }
            );
          } catch (error) {
            console.log(
              "Social error:",
              error.message
            );

            await sendText(
              sock,
              remoteJid,
              "❌ Social media download failed.",
              m
            );
          }

          return;
        }

        // =========================
        // STICKER
        // =========================

        if (
          cmd === "sticker" ||
          cmd === "s"
        ) {
          let imageMessage = null;

          if (message.imageMessage) {
            imageMessage =
              message.imageMessage;
          }

          if (
            quoted?.imageMessage
          ) {
            imageMessage =
              quoted.imageMessage;
          }

          if (!imageMessage) {
            await sendText(
              sock,
              remoteJid,
              "🖼️ Image එකක් send කරලා `.sticker` කියන්න, නැත්නම් image එකකට reply කරලා `.sticker` කියන්න.",
              m
            );

            return;
          }

          try {
            const buffer =
              await downloadMedia(
                imageMessage,
                "image"
              );

            await sock.sendMessage(
              remoteJid,
              {
                sticker: buffer
              },
              {
                quoted: m
              }
            );
          } catch (error) {
            console.log(
              "Sticker error:",
              error.message
            );

            await sendText(
              sock,
              remoteJid,
              "❌ Sticker create කරන්න බැරි වුණා.",
              m
            );
          }

          return;
        }

        // =========================
        // GROUP INFO
        // =========================

        if (cmd === "groupinfo") {
          if (!group) {
            await sendText(
              sock,
              remoteJid,
              "❌ මේ command එක group එකක විතරයි.",
              m
            );

            return;
          }

          try {
            const metadata =
              await sock.groupMetadata(
                remoteJid
              );

            const admins =
              metadata.participants.filter(
                p => p.admin
              ).length;

            await sendText(
              sock,
              remoteJid,
              `
╭━━━〔 👥 GROUP INFO 〕━━━╮

🏠 Name:
${metadata.subject}

👥 Members:
${metadata.participants.length}

👑 Admins:
${admins}

🆔 Group ID:
${remoteJid}

📅 ${formatDate()}
🕐 ${formatTime()}

╰━━━━━━━━━━━━━━━━━━━━━━╯
`,
              m
            );
          } catch {
            await sendText(
              sock,
              remoteJid,
              "❌ Group info ලබාගන්න බැරි වුණා.",
              m
            );
          }

          return;
        }

        // =========================
        // TAG ALL
        // =========================

        if (cmd === "tagall") {
          if (!group) {
            await sendText(
              sock,
              remoteJid,
              "❌ Group එකක විතරක් use කරන්න.",
              m
            );

            return;
          }

          const metadata =
            await sock.groupMetadata(
              remoteJid
            );

          const participants =
            metadata.participants;

          let text =
            `╭━━━〔 📢 TAG ALL 〕━━━╮\n\n`;

          const mentions = [];

          for (const participant of participants) {
            const jid = participant.id;

            mentions.push(jid);

            text += `👤 @${cleanNumber(jid)}\n`;
          }

          text +=
            `\n╰━━━━━━━━━━━━━━━━━━╯`;

          await sock.sendMessage(
            remoteJid,
            {
              text,
              mentions
            },
            {
              quoted: m
            }
          );

          return;
        }

        // =========================
        // MUTE GROUP
        // =========================

        if (cmd === "mute") {
          if (!group) {
            await sendText(
              sock,
              remoteJid,
              "❌ Group එකක use කරන්න.",
              m
            );

            return;
          }

          if (
            !(await isAdmin(
              sock,
              remoteJid,
              sender
            ))
          ) {
            await sendText(
              sock,
              remoteJid,
              "❌ Admins only.",
              m
            );

            return;
          }

          if (
            !(await isBotAdmin(
              sock,
              remoteJid
            ))
          ) {
            await sendText(
              sock,
              remoteJid,
              "❌ Bot must be group admin.",
              m
            );

            return;
          }

          try {
            await sock.groupSettingUpdate(
              remoteJid,
              "announcement"
            );

            await sendText(
              sock,
              remoteJid,
              "🔒 Group muted. Only admins can send messages.",
              m
            );
          } catch {
            await sendText(
              sock,
              remoteJid,
              "❌ Group mute කරන්න බැරි වුණා.",
              m
            );
          }

          return;
        }

        // =========================
        // UNMUTE
        // =========================

        if (cmd === "unmute") {
          if (!group) {
            await sendText(
              sock,
              remoteJid,
              "❌ Group එකක use කරන්න.",
              m
            );

            return;
          }

          if (
            !(await isAdmin(
              sock,
              remoteJid,
              sender
            ))
          ) {
            await sendText(
              sock,
              remoteJid,
              "❌ Admins only.",
              m
            );

            return;
          }

          if (
            !(await isBotAdmin(
              sock,
              remoteJid
            ))
          ) {
            await sendText(
              sock,
              remoteJid,
              "❌ Bot must be group admin.",
              m
            );

            return;
          }

          try {
            await sock.groupSettingUpdate(
              remoteJid,
              "not_announcement"
            );

            await sendText(
              sock,
              remoteJid,
              "🔓 Group unmuted.",
              m
            );
          } catch {
            await sendText(
              sock,
              remoteJid,
              "❌ Group unmute කරන්න බැරි වුණා.",
              m
            );
          }

          return;
        }

        // =========================
        // RANDOM COMMANDS
        // =========================

        if (cmd === "joke") {
          await sendText(
            sock,
            remoteJid,
            jokes[
              Math.floor(
                Math.random() * jokes.length
              )
            ],
            m
          );

          return;
        }

        if (cmd === "fact") {
          await sendText(
            sock,
            remoteJid,
            facts[
              Math.floor(
                Math.random() * facts.length
              )
            ],
            m
          );

          return;
        }

        if (cmd === "quote") {
          await sendText(
            sock,
            remoteJid,
            quotes[
              Math.floor(
                Math.random() * quotes.length
              )
            ],
            m
          );

          return;
        }

        if (cmd === "motivate") {
          await sendText(
            sock,
            remoteJid,
            motivations[
              Math.floor(
                Math.random() *
                  motivations.length
              )
            ],
            m
          );

          return;
        }

        if (cmd === "challenge") {
          await sendText(
            sock,
            remoteJid,
            challenges[
              Math.floor(
                Math.random() *
                  challenges.length
              )
            ],
            m
          );

          return;
        }

        if (cmd === "life") {
          await sendText(
            sock,
            remoteJid,
            lifeReplies[
              Math.floor(
                Math.random() *
                  lifeReplies.length
              )
            ],
            m
          );

          return;
        }

        // =========================
        // UNKNOWN COMMAND
        // =========================

        await sendText(
          sock,
          remoteJid,
          `❌ Unknown command: .${cmd}\n\n📋 Type *.menu* to see available commands.`,
          m
        );

      } catch (error) {
        console.log(
          "Message handler error:",
          error
        );
      }
    }
  );
}

// =========================
// CREATE AUTH DIRECTORY
// =========================

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, {
    recursive: true
  });
}

// =========================
// START
// =========================

console.log("");
console.log("╔══════════════════════════════╗");
console.log("║       MALIYA-X 🇱🇰           ║");
console.log("║                              ║");
console.log("║        STARTING BOT...       ║");
console.log("╚══════════════════════════════╝");
console.log("");

startMaliya().catch(error => {
  console.error(
    "❌ Fatal startup error:",
    error
  );
});
