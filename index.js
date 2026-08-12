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

const BOT_NAME = "MALIYA-X 🇱🇰";
const PREFIX = ".";
const AUTH_DIR = "./auth_info";

const PHONE_NUMBER = String(process.env.PHONE_NUMBER || "")
  .replace(/\D/g, "");

const OWNER_NUMBER = String(process.env.OWNER_NUMBER || "")
  .replace(/\D/g, "");

const PORT = Number(process.env.PORT || 3000);

const logger = P({ level: "silent" });

/* =====================================================
   EXPRESS SERVER
===================================================== */

const app = express();

app.get("/", (req, res) => {
  res.send(`${BOT_NAME} is running successfully!`);
});

app.get("/health", (req, res) => {
  res.json({
    bot: BOT_NAME,
    status: "online",
    time: new Date().toISOString()
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

/* =====================================================
   AUTH DIRECTORY
===================================================== */

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

/* =====================================================
   HELPERS
===================================================== */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanNumber(jid) {
  return String(jid || "")
    .split("@")[0]
    .split(":")[0];
}

function isGroup(jid) {
  return String(jid || "").endsWith("@g.us");
}

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

function getQuoted(message) {
  return message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

async function sendText(sock, jid, text, quoted) {
  return sock.sendMessage(
    jid,
    { text },
    quoted ? { quoted } : {}
  );
}

/* =====================================================
   MENU
===================================================== */

async function sendMainMenu(sock, jid, quoted, name) {
  const text = `
╭━━━〔 ${BOT_NAME} 〕━━━╮
┃
┃ 👋 Hello ${name}
┃ 🇱🇰 Sri Lankan WhatsApp Bot
┃
╰━━━━━━━━━━━━━━━━━━━━╯

🎵 1. Song / Audio
🎬 2. Video
🤖 3. AI
🖼️ 4. Sticker
📥 5. Social Download
👥 6. Group
👑 7. Owner
🤖 8. Bot Info
😂 9. Fun

👇 Button එකක් click කරන්න.
හෝ number එක reply කරන්න.
`;

  try {
    await sock.sendMessage(
      jid,
      {
        text,
        footer: BOT_NAME,
        buttons: [
          {
            buttonId: "menu_1",
            buttonText: { displayText: "🎵 Song" },
            type: 1
          },
          {
            buttonId: "menu_2",
            buttonText: { displayText: "🎬 Video" },
            type: 1
          },
          {
            buttonId: "menu_3",
            buttonText: { displayText: "🤖 AI" },
            type: 1
          }
        ],
        headerType: 1
      },
      { quoted }
    );
  } catch (error) {
    console.log("Menu fallback:", error.message);
    await sendText(sock, jid, text, quoted);
  }
}

async function sendGroupMenu(sock, jid, quoted) {
  const text = `
╭━━━〔 👥 GROUP MENU 〕━━━╮

1️⃣ 👥 Group Info
2️⃣ 📢 Tag All
3️⃣ 🔒 Mute Group
4️⃣ 🔓 Unmute Group

Number එක reply කරන්න.
`;

  try {
    await sock.sendMessage(
      jid,
      {
        text,
        footer: BOT_NAME,
        buttons: [
          {
            buttonId: "group_info",
            buttonText: { displayText: "👥 Group Info" },
            type: 1
          },
          {
            buttonId: "group_tagall",
            buttonText: { displayText: "📢 Tag All" },
            type: 1
          },
          {
            buttonId: "group_mute",
            buttonText: { displayText: "🔒 Mute" },
            type: 1
          }
        ],
        headerType: 1
      },
      { quoted }
    );
  } catch {
    await sendText(sock, jid, text, quoted);
  }
}

/* =====================================================
   MEDIA
===================================================== */

async function downloadMedia(message, type) {
  const stream = await downloadContentFromMessage(
    message,
    type
  );

  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/* =====================================================
   GROUP
===================================================== */

async function getGroupMetadata(sock, jid) {
  try {
    return await sock.groupMetadata(jid);
  } catch (error) {
    console.log("Group metadata error:", error.message);
    return null;
  }
}

async function isAdmin(sock, jid, user) {
  const metadata = await getGroupMetadata(sock, jid);

  if (!metadata) return false;

  const participant = metadata.participants.find(
    p => cleanNumber(p.id) === cleanNumber(user)
  );

  return Boolean(participant?.admin);
}

async function isBotAdmin(sock, jid) {
  const metadata = await getGroupMetadata(sock, jid);

  if (!metadata || !sock.user?.id) {
    return false;
  }

  const botNumber = cleanNumber(sock.user.id);

  const participant = metadata.participants.find(
    p => cleanNumber(p.id) === botNumber
  );

  return Boolean(participant?.admin);
}

/* =====================================================
   API
===================================================== */

async function apiGet(url) {
  const response = await axios.get(url, {
    timeout: 60000
  });

  return response.data?.result || response.data;
}

async function aiRequest(query) {
  return apiGet(
    "https://apis.davidcyriltech.my.id/ai/gemini?query=" +
      encodeURIComponent(query)
  );
}

async function audioDownload(url) {
  return apiGet(
    "https://apis.davidcyriltech.my.id/download/ytmp3?url=" +
      encodeURIComponent(url)
  );
}

async function videoDownload(url) {
  return apiGet(
    "https://apis.davidcyriltech.my.id/download/ytmp4?url=" +
      encodeURIComponent(url)
  );
}

async function socialDownload(url) {
  return apiGet(
    "https://apis.davidcyriltech.my.id/download/all?url=" +
      encodeURIComponent(url)
  );
}

/* =====================================================
   BOT
===================================================== */

let sock = null;
let starting = false;
let reconnectTimer = null;
let pairingRequested = false;

async function startMaliya() {
  if (starting) return;

  starting = true;

  try {
    const { state, saveCreds } =
      await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      logger,

      browser: Browsers.macOS("Chrome"),

      printQRInTerminal: false,

      syncFullHistory: false,

      markOnlineOnConnect: false,

      connectTimeoutMs: 60000,

      defaultQueryTimeoutMs: 60000,

      keepAliveIntervalMs: 25000
    });

    sock.ev.on("creds.update", saveCreds);

    /* =================================================
       PAIRING
    ================================================= */

    if (!state.creds.registered && PHONE_NUMBER) {
      setTimeout(async () => {
        if (pairingRequested) return;
        if (state.creds.registered) return;

        pairingRequested = true;

        try {
          console.log("📱 Requesting pairing code...");

          const code =
            await sock.requestPairingCode(PHONE_NUMBER);

          console.log("");
          console.log("================================");
          console.log("       MALIYA-X PAIRING");
          console.log("================================");
          console.log("PAIRING CODE:", code);
          console.log("WhatsApp → Linked Devices");
          console.log("→ Link with phone number");
          console.log("================================");
          console.log("");
        } catch (error) {
          pairingRequested = false;

          console.log(
            "❌ Pairing error:",
            error?.message || error
          );
        }
      }, 5000);
    }

    /* =================================================
       CONNECTION
    ================================================= */

    sock.ev.on("connection.update", async update => {
      const {
        connection,
        lastDisconnect
      } = update;

      if (connection === "connecting") {
        console.log("🔄 Connecting to WhatsApp...");
      }

      if (connection === "open") {
        starting = false;

        console.log("");
        console.log("================================");
        console.log("       MALIYA-X 🇱🇰");
        console.log("    CONNECTED SUCCESSFULLY");
        console.log("================================");
        console.log("");
      }

      if (connection === "close") {
        starting = false;

        const error =
          lastDisconnect?.error;

        const statusCode =
          error?.output?.statusCode ||
          error?.statusCode ||
          "unknown";

        console.log(
          "❌ Connection closed:",
          statusCode
        );

        if (
          statusCode === 401 ||
          statusCode === DisconnectReason.loggedOut
        ) {
          console.log(
            "⚠️ WhatsApp logged out."
          );

          console.log(
            "Delete auth_info and pair again."
          );

          return;
        }

        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            pairingRequested = false;

            startMaliya().catch(err => {
              console.log(
                "Reconnect error:",
                err.message
              );
            });
          }, 10000);
        }
      }
    });

    /* =================================================
       WELCOME / GOODBYE
    ================================================= */

    sock.ev.on(
      "group-participants.update",
      async update => {
        try {
          const metadata =
            await getGroupMetadata(
              sock,
              update.id
            );

          if (!metadata) return;

          for (const participant of update.participants) {
            const number =
              cleanNumber(participant);

            if (update.action === "add") {
              await sock.sendMessage(
                update.id,
                {
                  text:
`╭━━━〔 👋 WELCOME 〕━━━╮

👤 Welcome @${number}

🏠 ${metadata.subject}

📅 ${getDate()}
🕐 ${getTime()}

🇱🇰 Enjoy the group!

> ${BOT_NAME}`,
                  mentions: [participant]
                }
              );
            }

            if (
              update.action === "remove" ||
              update.action === "leave"
            ) {
              await sock.sendMessage(
                update.id,
                {
                  text:
`╭━━━〔 👋 GOODBYE 〕━━━╮

👤 @${number} left the group.

🏠 ${metadata.subject}

📅 ${getDate()}
🕐 ${getTime()}

> ${BOT_NAME}`,
                  mentions: [participant]
                }
              );
            }
          }
        } catch (error) {
          console.log(
            "Welcome error:",
            error.message
          );
        }
      }
    );

    /* =================================================
       MESSAGE HANDLER
    ================================================= */

    sock.ev.on(
      "messages.upsert",
      async ({ messages }) => {
        try {
          const m = messages?.[0];

          if (!m?.message) return;

          const jid =
            m.key.remoteJid;

          if (
            !jid ||
            jid === "status@broadcast"
          ) {
            return;
          }

          /*
           * IMPORTANT:
           * fromMe intentionally NOT blocked.
           * This allows Message Yourself testing.
           */

          const text =
            getText(m.message).trim();

          if (!text) return;

          const quoted =
            getQuoted(m.message);

          const group =
            isGroup(jid);

          const sender =
            m.key.participant ||
            jid;

          console.log(
            `[MESSAGE] ${text}`
          );

          /* =============================================
             MENU BUTTONS / NUMBERS
          ============================================= */

          if (
            text === "menu_1" ||
            text === "1" ||
            text === "1️⃣"
          ) {
            await sendText(
              sock,
              jid,
`🎵 SONG / AUDIO

.song <song name>

Example:
.song Alan Walker Faded`,
              m
            );

            return;
          }

          if (
            text === "menu_2" ||
            text === "2" ||
            text === "2️⃣"
          ) {
            await sendText(
              sock,
              jid,
`🎬 VIDEO

.video <video name>

Example:
.video Alan Walker Faded`,
              m
            );

            return;
          }

          if (
            text === "menu_3" ||
            text === "3" ||
            text === "3️⃣"
          ) {
            await sendText(
              sock,
              jid,
`🤖 AI

.ai <question>

Example:
.ai What is AI?`,
              m
            );

            return;
          }

          if (
            text === "4" ||
            text === "4️⃣"
          ) {
            await sendText(
              sock,
              jid,
`🖼️ STICKER

Image එකකට reply කරලා:

.sticker

හෝ image එක send කරලා caption එකට .sticker දාන්න.`,
              m
            );

            return;
          }

          if (
            text === "5" ||
            text === "5️⃣"
          ) {
            await sendText(
              sock,
              jid,
`📥 SOCIAL DOWNLOAD

.social <TikTok/Instagram/Facebook URL>`,
              m
            );

            return;
          }

          if (
            text === "6" ||
            text === "6️⃣"
          ) {
            if (!group) {
              await sendText(
                sock,
                jid,
                "❌ Group එකකදී විතරයි.",
                m
              );
              return;
            }

            await sendGroupMenu(
              sock,
              jid,
              m
            );

            return;
          }

          if (
            text === "7" ||
            text === "7️⃣"
          ) {
            await sendText(
              sock,
              jid,
              OWNER_NUMBER
                ? `👑 OWNER\n\n📱 +${OWNER_NUMBER}`
                : "❌ OWNER_NUMBER configure කරලා නැහැ.",
              m
            );

            return;
          }

          if (
            text === "8" ||
            text === "8️⃣"
          ) {
            await sendText(
              sock,
              jid,
`🤖 ${BOT_NAME}

🟢 Online
🇱🇰 Sri Lanka
📅 ${getDate()}
🕐 ${getTime()}

Private + Groups
Audio + Video
AI + Sticker`,
              m
            );

            return;
          }

          if (
            text === "9" ||
            text === "9️⃣"
          ) {
            await sendText(
              sock,
              jid,
`😂 FUN

.joke
.fact
.quote
.motivate
.life
.challenge`,
              m
            );

            return;
          }

          /* =============================================
             NON COMMAND
          ============================================= */

          if (!text.startsWith(PREFIX)) {
            return;
          }

          const parts =
            text
              .slice(PREFIX.length)
              .trim()
              .split(/\s+/);

          const cmd =
            (parts.shift() || "")
              .toLowerCase();

          const args =
            parts.join(" ").trim();

          /* =============================================
             MENU
          ============================================= */

          if (
            cmd === "menu" ||
            cmd === "help" ||
            cmd === "start"
          ) {
            await sendMainMenu(
              sock,
              jid,
              m,
              m.pushName || "Friend"
            );

            return;
          }

          /* =============================================
             PING
          ============================================= */

          if (cmd === "ping") {
            const start = Date.now();

            await sendText(
              sock,
              jid,
`🏓 PONG!

⚡ ${Date.now() - start} ms

🤖 ${BOT_NAME}
📅 ${getDate()}
🕐 ${getTime()}`,
              m
            );

            return;
          }

          /* =============================================
             TIME
          ============================================= */

          if (cmd === "time") {
            await sendText(
              sock,
              jid,
`🕐 ${getTime()}

📅 ${getDate()}

🌍 Asia/Colombo 🇱🇰`,
              m
            );

            return;
          }

          /* =============================================
             BOT INFO
          ============================================= */

          if (
            cmd === "botinfo" ||
            cmd === "info"
          ) {
            await sendText(
              sock,
              jid,
`🤖 ${BOT_NAME}

🟢 Status: Online
🇱🇰 Sri Lanka
📱 Private + Group

🎵 Audio
🎬 Video
🤖 AI
🖼️ Sticker
📥 Social Downloader

> Powered by MALIYA-X`,
              m
            );

            return;
          }

          /* =============================================
             OWNER
          ============================================= */

          if (cmd === "owner") {
            await sendText(
              sock,
              jid,
              OWNER_NUMBER
                ? `👑 OWNER\n\n📱 +${OWNER_NUMBER}`
                : "❌ OWNER_NUMBER configure කරලා නැහැ.",
              m
            );

            return;
          }

          /* =============================================
             AI
          ============================================= */

          if (cmd === "ai") {
            if (!args) {
              await sendText(
                sock,
                jid,
                "🤖 Usage:\n.ai <question>",
                m
              );
              return;
            }

            await sendText(
              sock,
              jid,
              "🤖 AI is thinking...",
              m
            );

            try {
              const result =
                await aiRequest(args);

              await sendText(
                sock,
                jid,
`🤖 MALIYA-X AI

${String(result)}`,
                m
              );
            } catch (error) {
              console.log(
                "AI error:",
                error.message
              );

              await sendText(
                sock,
                jid,
                "❌ AI service unavailable.",
                m
              );
            }

            return;
          }

          /* =============================================
             SONG
          ============================================= */

          if (
            cmd === "song" ||
            cmd === "audio"
          ) {
            if (!args) {
              await sendText(
                sock,
                jid,
`🎵 Usage:

.song <song name>
.song <YouTube URL>`,
                m
              );
              return;
            }

            try {
              await sendText(
                sock,
                jid,
                "🔎 Searching song...",
                m
              );

              let url = args;
              let title = args;

              if (
                !/^https?:\/\//i.test(args)
              ) {
                const result =
                  await ytSearch(args);

                if (
                  !result.videos?.length
                ) {
                  await sendText(
                    sock,
                    jid,
                    "❌ Song not found.",
                    m
                  );
                  return;
                }

                url =
                  result.videos[0].url;

                title =
                  result.videos[0].title;
              }

              const result =
                await audioDownload(url);

              const media =
                result?.download_url ||
                result?.url;

              if (!media) {
                throw new Error(
                  "No audio URL returned"
                );
              }

              const safeTitle =
                String(title)
                  .substring(0, 70)
                  .replace(
                    /[\/\\:*?"<>|]/g,
                    ""
                  );

              await sock.sendMessage(
                jid,
                {
                  audio: {
                    url: media
                  },
                  mimetype: "audio/mpeg",
                  fileName:
                    `${safeTitle}.mp3`
                },
                { quoted: m }
              );
            } catch (error) {
              console.log(
                "Song error:",
                error.message
              );

              await sendText(
                sock,
                jid,
                "❌ Song download failed.",
                m
              );
            }

            return;
          }

          /* =============================================
             VIDEO
          ============================================= */

          if (
            cmd === "video" ||
            cmd === "ytdl"
          ) {
            if (!args) {
              await sendText(
                sock,
                jid,
`🎬 Usage:

.video <video name>
.video <YouTube URL>`,
                m
              );
              return;
            }

            try {
              await sendText(
                sock,
                jid,
                "🔎 Searching video...",
                m
              );

              let url = args;
              let title = args;

              if (
                !/^https?:\/\//i.test(args)
              ) {
                const result =
                  await ytSearch(args);

                if (
                  !result.videos?.length
                ) {
                  await sendText(
                    sock,
                    jid,
                    "❌ Video not found.",
                    m
                  );
                  return;
                }

                url =
                  result.videos[0].url;

                title =
                  result.videos[0].title;
              }

              const result =
                await videoDownload(url);

              const media =
                result?.download_url ||
                result?.url;

              if (!media) {
                throw new Error(
                  "No video URL returned"
                );
              }

              await sock.sendMessage(
                jid,
                {
                  video: {
                    url: media
                  },
                  caption:
`🎬 ${title}

> ${BOT_NAME}`
                },
                { quoted: m }
              );
            } catch (error) {
              console.log(
                "Video error:",
                error.message
              );

              await sendText(
                sock,
                jid,
                "❌ Video download failed.",
                m
              );
            }

            return;
          }

          /* =============================================
             SOCIAL
          ============================================= */

          if (
            cmd === "social" ||
            cmd === "dl"
          ) {
            if (!args) {
              await sendText(
                sock,
                jid,
`📥 Usage:

.social <TikTok/Instagram/Facebook URL>`,
                m
              );
              return;
            }

            try {
              await sendText(
                sock,
                jid,
                "📥 Downloading...",
                m
              );

              const result =
                await socialDownload(args);

              const media =
                result?.download_url ||
                result?.url ||
                result?.video ||
                result?.media;

              if (!media) {
                throw new Error(
                  "No media URL returned"
                );
              }

              await sock.sendMessage(
                jid,
                {
                  video: {
                    url: media
                  },
                  caption:
                    `📥 Downloaded\n\n${BOT_NAME}`
                },
                { quoted: m }
              );
            } catch (error) {
              console.log(
                "Social error:",
                error.message
              );

              await sendText(
                sock,
                jid,
                "❌ Social download failed.",
                m
              );
            }

            return;
          }

          /* =============================================
             STICKER
          ============================================= */

          if (
            cmd === "sticker" ||
            cmd === "s"
          ) {
            const image =
              m.message.imageMessage ||
              quoted?.imageMessage;

            if (!image) {
              await sendText(
                sock,
                jid,
`🖼️ Image එකකට reply කරලා:

.sticker`,
                m
              );
              return;
            }

            try {
              const buffer =
                await downloadMedia(
                  image,
                  "image"
                );

              await sock.sendMessage(
                jid,
                {
                  sticker: buffer
                },
                { quoted: m }
              );
            } catch (error) {
              console.log(
                "Sticker error:",
                error.message
              );

              await sendText(
                sock,
                jid,
                "❌ Sticker creation failed.",
                m
              );
            }

            return;
          }

          /* =============================================
             GROUP INFO
          ============================================= */

          if (cmd === "groupinfo") {
            if (!group) {
              await sendText(
                sock,
                jid,
                "❌ Group එකකදී විතරයි.",
                m
              );
              return;
            }

            const metadata =
              await getGroupMetadata(
                sock,
                jid
              );

            if (!metadata) return;

            const admins =
              metadata.participants.filter(
                p => p.admin
              ).length;

            await sendText(
              sock,
              jid,
`👥 GROUP INFO

🏠 ${metadata.subject}

👥 Members:
${metadata.participants.length}

👑 Admins:
${admins}

📅 ${getDate()}
🕐 ${getTime()}`,
              m
            );

            return;
          }

          /* =============================================
             TAG ALL
          ============================================= */

          if (cmd === "tagall") {
            if (!group) {
              await sendText(
                sock,
                jid,
                "❌ Group only.",
                m
              );
              return;
            }

            const metadata =
              await getGroupMetadata(
                sock,
                jid
              );

            if (!metadata) return;

            const mentions =
              metadata.participants.map(
                p => p.id
              );

            const body =
              "📢 TAG ALL\n\n" +
              metadata.participants
                .map(
                  p =>
                    `👤 @${cleanNumber(p.id)}`
                )
                .join("\n");

            await sock.sendMessage(
              jid,
              {
                text: body,
                mentions
              },
              { quoted: m }
            );

            return;
          }

          /* =============================================
             MUTE / UNMUTE
          ============================================= */

          if (
            cmd === "mute" ||
            cmd === "unmute"
          ) {
            if (!group) {
              await sendText(
                sock,
                jid,
                "❌ Group only.",
                m
              );
              return;
            }

            if (
              !(await isAdmin(
                sock,
                jid,
                sender
              ))
            ) {
              await sendText(
                sock,
                jid,
                "❌ Admins only.",
                m
              );
              return;
            }

            if (
              !(await isBotAdmin(
                sock,
                jid
              ))
            ) {
              await sendText(
                sock,
                jid,
                "❌ Bot එකට admin permission ඕන.",
                m
              );
              return;
            }

            await sock.groupSettingUpdate(
              jid,
              cmd === "mute"
                ? "announcement"
                : "not_announcement"
            );

            await sendText(
              sock,
              jid,
              cmd === "mute"
                ? "🔒 Group muted."
                : "🔓 Group unmuted.",
              m
            );

            return;
          }

          /* =============================================
             FUN
          ============================================= */

          if (cmd === "joke") {
            const jokes = [
              "😂 Teacher: Why are you late? Student: Because the sign said SCHOOL AHEAD.",
              "😂 WiFi password එක අහලා 'askme' කිව්වා. මම 'askme?' කියලා ආයෙ ඇහුවා 🤣"
            ];

            await sendText(
              sock,
              jid,
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
            const facts = [
              "🌍 Earth is not a perfect sphere.",
              "🐙 Octopus එකකට hearts තුනක් තියෙනවා.",
              "🌙 Moon එක Earth එකෙන් ටිකෙන් ටික ඈත් වෙනවා."
            ];

            await sendText(
              sock,
              jid,
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
            const quotes = [
              "✨ Believe in yourself and keep moving forward.",
              "🔥 Small progress is still progress.",
              "🌟 Your future needs your effort today."
            ];

            await sendText(
              sock,
              jid,
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
              jid,
`💪 අද ගන්න පොඩි step එකක්
හෙට ලොකු result එකක් වෙන්න පුළුවන්.

🔥 Give up නොවී continue කරන්න.`,
              m
            );

            return;
          }

          if (cmd === "life") {
            await sendText(
              sock,
              jid,
`❤️ Life එක perfect නෑ.

Difficult days permanent නෑ.

Keep going! 💪🇱🇰`,
              m
            );

            return;
          }

          if (cmd === "challenge") {
            await sendText(
              sock,
              jid,
`🎯 TODAY'S CHALLENGE

අද ඔයාගේ goal එක වෙනුවෙන්
එක action එකක් ගන්න.

🔥 Don't wait.
🚀 Start now!`,
              m
            );

            return;
          }

          /* =============================================
             UNKNOWN COMMAND
          ============================================= */

          await sendText(
            sock,
            jid,
`❌ Unknown command.

📋 .menu දාන්න.

හෝ menu එකේ number එක select කරන්න.`,
            m
          );

        } catch (error) {
          console.log(
            "Message handler error:",
            error?.message || error
          );
        }
      }
    );

  } catch (error) {
    starting = false;

    console.log(
      "❌ Start error:",
      error?.message || error
    );

    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        pairingRequested = false;

        startMaliya().catch(err => {
          console.log(
            "Retry error:",
            err.message
          );
        });
      }, 15000);
    }
  }
}

/* =====================================================
   START
===================================================== */

console.log("");
console.log("================================");
console.log("       MALIYA-X 🇱🇰");
console.log("       STARTING BOT...");
console.log("================================");
console.log("");

if (!PHONE_NUMBER) {
  console.log(
    "⚠️ PHONE_NUMBER is not configured."
  );
  console.log(
    "Render → Environment → PHONE_NUMBER"
  );
} else {
  console.log(
    `📱 Phone number loaded: ${PHONE_NUMBER.slice(0, 3)}******`
  );
}

startMaliya().catch(error => {
  console.log(
    "Fatal error:",
    error.message
  );
});
