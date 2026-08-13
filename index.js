require("dotenv").config();

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
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.send("MALIYA-X V2 🇱🇰 is Online!");
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

const PHONE_NUMBER = (process.env.PHONE_NUMBER || "").replace(/\D/g, "");
const SESSION_DIR = process.env.SESSION_DIR || "./session";

const BOT_NAME = "MALIYA-X V2 🇱🇰";

const MENU_IMAGE =
  process.env.MENU_IMAGE ||
  "https://i.ibb.co/3W9q55d/default-profile.png";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* =========================================================
   🇱🇰 SINHALA FUN CONTENT
========================================================= */

const fun = {
  joke: [
    "😂 ගුරුවරයා: ඇයි පරක්කු? ශිෂ්‍යයා: සර් alarm එක මට කලින් නැගිටලා!",
    "🤣 Wi-Fi එක ගියාම ගෙදර හැමෝම අලුත් යාළුවෝ වගේ හම්බෙනවා.",
    "😂 Diet එකේ ඉන්න කෙනෙක් cake එක දැක්කම: මේක diet එකේ නැති නිසා කනවා!"
  ],

  fact: [
    "💡 Octopus එකකට හදවත් තුනක් තියෙනවා. 🐙",
    "💡 මිනිස් මොළය නින්දේදීත් ක්‍රියාකාරීව පවතිනවා.",
    "💡 මී මැස්සන්ට මිනිස් මුහුණු හඳුනාගැනීමට හැකියාව තියෙනවා."
  ],

  quote: [
    "💬 වැටීම අවසානයක් නෙවෙයි. නැගිටීම තමයි වැදගත්.",
    "💬 ඔයාගේ ගමන වෙන කෙනෙකුගේ ගමන එක්ක සසඳන්න එපා.",
    "💬 කුඩා පියවරක් වුණත් ඉදිරියට යන පියවරක් නම් වටිනවා."
  ],

  motivate: [
    "🔥 අද perfect වෙන්න ඕනේ නැහැ. ඊයේට වඩා ටිකක් හොඳ වෙන්න.",
    "🚀 හීනය ලොකු නම් පියවර කුඩා කරලා අදම පටන් ගන්න.",
    "💪 අමාරු දවස් තමයි ඔයාගේ strength එක පෙන්වන්නේ."
  ],

  life: [
    "❤️ ජීවිතය තරඟයක් නෙවෙයි. තමන්ගේ වේගයෙන් යන ගමනක්.",
    "🌱 අද කරන කුඩා හොඳ දෙයක් හෙට ලොකු වෙනසක් වෙන්න පුළුවන්.",
    "❤️ මිනිස්සු වෙනස් වෙනවා. ඒත් ඔයාගේ වටිනාකම අමතක කරන්න එපා."
  ],

  challenge: [
    "🎯 Challenge: අද පැයක් social media නැතුව productive වැඩක් කරන්න!",
    "🎯 Challenge: කෙනෙක්ට හොඳ වචනයක් කියලා ඔහුගේ දවස ලස්සන කරන්න.",
    "🎯 Challenge: අද අලුත් දෙයක් විනාඩි 20ක් ඉගෙනගන්න."
  ]
};

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* =========================================================
   🕐 SRI LANKA TIME
========================================================= */

function dateLK() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    dateStyle: "medium"
  }).format(new Date());
}

function timeLK() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Colombo",
    timeStyle: "medium"
  }).format(new Date());
}

/* =========================================================
   📨 MESSAGE TEXT
========================================================= */

function getBody(mek) {
  const msg = mek.message || {};

  if (msg.conversation) {
    return msg.conversation;
  }

  if (msg.extendedTextMessage?.text) {
    return msg.extendedTextMessage.text;
  }

  if (msg.imageMessage?.caption) {
    return msg.imageMessage.caption;
  }

  if (msg.videoMessage?.caption) {
    return msg.videoMessage.caption;
  }

  if (msg.buttonsResponseMessage?.selectedButtonId) {
    return msg.buttonsResponseMessage.selectedButtonId;
  }

  if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return msg.listResponseMessage.singleSelectReply.selectedRowId;
  }

  return "";
}

/* =========================================================
   🖼️ STICKER HELPERS
========================================================= */

function getQuotedMessage(mek) {
  return (
    mek.message?.extendedTextMessage?.contextInfo?.quotedMessage || null
  );
}

function getImageMessage(message) {
  if (!message) return null;

  if (message.imageMessage) {
    return message.imageMessage;
  }

  if (message.viewOnceMessage?.message?.imageMessage) {
    return message.viewOnceMessage.message.imageMessage;
  }

  return null;
}

async function streamToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function getStickerImage(sock, mek) {
  const directImage = mek.message?.imageMessage;

  if (directImage) {
    const stream = await downloadContentFromMessage(
      directImage,
      "image"
    );

    return streamToBuffer(stream);
  }

  const quoted = getQuotedMessage(mek);
  const quotedImage = getImageMessage(quoted);

  if (quotedImage) {
    const stream = await downloadContentFromMessage(
      quotedImage,
      "image"
    );

    return streamToBuffer(stream);
  }

  return null;
}

/* =========================================================
   ❌ DOWNLOAD ERROR
========================================================= */

async function downloadFailed(sock, from, mek, type) {
  await sock.sendMessage(
    from,
    {
      text:
        `╭━━〔 ❌ DOWNLOAD FAILED 〕━━╮\n` +
        `│ 📦 Type: ${type}\n` +
        `│ 😕 Download කරන්න බැරි වුණා.\n` +
        `│ 🔄 Link/query එක check කරලා\n` +
        `│ නැවත try කරන්න.\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `🤖 ${BOT_NAME}`
    },
    { quoted: mek }
  );
}

/* =========================================================
   🔎 YOUTUBE SEARCH
========================================================= */

async function searchYouTube(query) {
  const result = await ytSearch(query);

  if (!result?.videos?.length) {
    throw new Error("YouTube result not found");
  }

  return result.videos[0];
}

/* =========================================================
   🎵 YOUTUBE AUDIO API
========================================================= */

async function getAudio(url) {
  const api =
    "https://apis.davidcyriltech.my.id/download/ytmp3?url=" +
    encodeURIComponent(url);

  const response = await axios.get(api, {
    timeout: 30000
  });

  const result = response.data?.result;

  const downloadUrl =
    result?.download_url ||
    result?.download ||
    result?.url;

  if (!downloadUrl) {
    throw new Error("Audio URL unavailable");
  }

  return downloadUrl;
}

/* =========================================================
   🎬 YOUTUBE VIDEO API
========================================================= */

async function getVideo(url, quality) {
  const api =
    "https://apis.davidcyriltech.my.id/download/ytmp4?url=" +
    encodeURIComponent(url) +
    "&quality=" +
    encodeURIComponent(quality);

  const response = await axios.get(api, {
    timeout: 30000
  });

  const result = response.data?.result;

  const downloadUrl =
    result?.download_url ||
    result?.download ||
    result?.url;

  if (!downloadUrl) {
    throw new Error("Video URL unavailable");
  }

  return downloadUrl;
}

/* =========================================================
   📋 MENU
========================================================= */

function menuText() {
  return (
    `╭━━━〔 🇱🇰 ${BOT_NAME} 〕━━━╮\n` +
    `┃ ⚡ Fast • Sinhala • Smart\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +

    `🏠 *BASIC*\n` +
    `│ .ping\n` +
    `│ .time\n` +
    `│ .ai <question>\n\n` +

    `🎵 *YOUTUBE*\n` +
    `│ .song <name/link>\n` +
    `│ .audio <name/link>\n` +
    `│ .video <name/link> [quality]\n` +
    `│ .ytdl <name/link> [quality]\n\n` +

    `🎚️ *VIDEO QUALITY*\n` +
    `│ 144p • 240p • 360p\n` +
    `│ 480p • 720p HD • 1080p FHD\n\n` +

    `🖼️ *STICKER*\n` +
    `│ .sticker\n` +
    `│ .s\n\n` +

    `📱 *SOCIAL*\n` +
    `│ .tiktok <public link>\n` +
    `│ .instagram <public link>\n` +
    `│ .whatsapp <public link>\n` +
    `│ .viber <public link>\n` +
    `│ .imo <public link>\n\n` +

    `😂 *SINHALA FUN*\n` +
    `│ .joke\n` +
    `│ .fact\n` +
    `│ .quote\n` +
    `│ .motivate\n` +
    `│ .life\n` +
    `│ .challenge\n\n` +

    `🎬 *MOVIE*\n` +
    `│ .movie <name>\n\n` +

    `👥 *GROUP*\n` +
    `│ .groupinfo\n` +
    `│ .tagall\n` +
    `│ .admins\n` +
    `│ .link\n\n` +

    `❤️ *FUN*\n` +
    `│ .love\n` +
    `│ .flirt\n` +
    `│ .romantic\n` +
    `│ .truth\n` +
    `│ .dare\n\n` +

    `👋 Auto Welcome: ON\n` +
    `🚪 Auto Goodbye: ON\n` +
    `🔔 Connected Alert: ON\n\n` +

    `© ${BOT_NAME}`
  );
}

/* =========================================================
   📸 SEND MENU IMAGE
========================================================= */

async function sendMenu(sock, from, mek) {
  try {
    await sock.sendMessage(
      from,
      {
        image: {
          url: MENU_IMAGE
        },
        caption: menuText()
      },
      {
        quoted: mek
      }
    );
  } catch {
    await sock.sendMessage(
      from,
      {
        text: menuText()
      },
      {
        quoted: mek
      }
    );
  }
}

/* =========================================================
   👑 CHECK ADMIN
========================================================= */

async function isAdmin(sock, group, sender) {
  const metadata = await sock.groupMetadata(group);

  const participant = metadata.participants.find(
    (p) => p.id === sender
  );

  return Boolean(participant?.admin);
}

/* =========================================================
   🤖 START BOT
========================================================= */

async function startMaliyaX() {
  fs.mkdirSync(SESSION_DIR, {
    recursive: true
  });

  const {
    state,
    saveCreds
  } = await useMultiFileAuthState(SESSION_DIR);

  const sock = makeWASocket({
    auth: state,
    logger: P({
      level: "silent"
    }),
    browser: Browsers.macOS("Chrome"),
    printQRInTerminal: false
  });

  /* =======================================================
     🔑 PAIRING CODE
  ======================================================= */

  if (!sock.authState.creds.registered && PHONE_NUMBER) {
    setTimeout(async () => {
      try {
        const code =
          await sock.requestPairingCode(
            PHONE_NUMBER
          );

        console.log(
          "\n===================================="
        );

        console.log(
          "🔑 MALIYA-X V2 PAIRING CODE"
        );

        console.log(
          code
        );

        console.log(
          "====================================\n"
        );

      } catch (error) {
        console.error(
          "Pairing error:",
          error.message
        );
      }
    }, 5000);
  }

  /* =======================================================
     🔐 SAVE SESSION
  ======================================================= */

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  /* =======================================================
     🟢 CONNECTION
  ======================================================= */

  let connectedNotice = false;

  sock.ev.on(
    "connection.update",
    async (update) => {
      const {
        connection,
        lastDisconnect
      } = update;

      if (connection === "open") {

        console.log(
          `\n✅ ${BOT_NAME} CONNECTED! 🇱🇰🔥\n`
        );

        if (!connectedNotice) {

          connectedNotice = true;

          try {

            const botNumber =
              sock.user.id.split(":")[0] +
              "@s.whatsapp.net";

            await sock.sendMessage(
              botNumber,
              {
                text:
                  `╭━━〔 🚀 CONNECTED 〕━━╮\n` +
                  `│ 🤖 ${BOT_NAME}\n` +
                  `│ 🟢 Status: ONLINE\n` +
                  `│ ⚡ Version: 2.0.0\n` +
                  `│ 📅 ${dateLK()}\n` +
                  `│ ⏰ ${timeLK()}\n` +
                  `╰━━━━━━━━━━━━━━━━━━╯\n\n` +

                  `✅ WhatsApp successfully connected!\n` +
                  `🔥 All main systems are ready.\n\n` +

                  `Type *.menu* to view commands.`
              }
            );

          } catch (error) {

            console.error(
              "Connection message error:",
              error.message
            );

          }
        }
      }

      if (connection === "close") {

        const statusCode =
          lastDisconnect
            ?.error
            ?.output
            ?.statusCode;

        const reconnect =
          statusCode !== DisconnectReason.loggedOut;

        console.log(
          "❌ Connection closed."
        );

        console.log(
          "🔄 Reconnect:",
          reconnect
        );

        if (reconnect) {

          await sleep(3000);

          startMaliyaX();

        } else {

          console.log(
            "🚪 WhatsApp logged out."
          );

        }
      }
    }
  );

  /* =======================================================
     👋 GROUP WELCOME / GOODBYE
  ======================================================= */

  sock.ev.on(
    "group-participants.update",
    async (update) => {

      try {

        const groupId =
          update.id;

        const metadata =
          await sock.groupMetadata(
            groupId
          );

        for (
          const participant
          of update.participants
        ) {

          let name =
            participant.split("@")[0];

          try {

            const contact =
              await sock.onWhatsApp(
                participant
              );

            if (
              contact?.[0]?.notify
            ) {
              name =
                contact[0].notify;
            }

          } catch {}

          let dp = null;

          try {

            dp =
              await sock.profilePictureUrl(
                participant,
                "image"
              );

          } catch {}

          /* ===============================
             WELCOME
          =============================== */

          if (
            update.action === "add"
          ) {

            const text =
              `╭━━〔 👋 WELCOME 〕━━╮\n` +
              `│ 👤 ${name}\n` +
              `│ 👥 ${metadata.subject}\n` +
              `╰━━━━━━━━━━━━━━━━╯\n\n` +

              `❤️ ආයුබෝවන් @${participant.split("@")[0]}!\n` +
              `✨ අපේ group එකට welcome!\n\n` +

              `📅 ${dateLK()}\n` +
              `⏰ ${timeLK()}\n\n` +

              `🤖 ${BOT_NAME}`;

            if (dp) {

              await sock.sendMessage(
                groupId,
                {
                  image: {
                    url: dp
                  },
                  caption: text,
                  mentions: [
                    participant
                  ]
                }
              );

            } else {

              await sock.sendMessage(
                groupId,
                {
                  text,
                  mentions: [
                    participant
                  ]
                }
              );

            }
          }

          /* ===============================
             GOODBYE
          =============================== */

          if (
            update.action === "remove"
          ) {

            const text =
              `╭━━〔 👋 GOODBYE 〕━━╮\n` +
              `│ 👤 ${name}\n` +
              `│ 👥 ${metadata.subject}\n` +
              `╰━━━━━━━━━━━━━━━━╯\n\n` +

              `👋 @${participant.split("@")[0]} group එකෙන් ඉවත් වුණා.\n` +
              `❤️ අපි ඔබට සුබ පතනවා!\n\n` +

              `🤖 ${BOT_NAME}`;

            if (dp) {

              await sock.sendMessage(
                groupId,
                {
                  image: {
                    url: dp
                  },
                  caption: text,
                  mentions: [
                    participant
                  ]
                }
              );

            } else {

              await sock.sendMessage(
                groupId,
                {
                  text,
                  mentions: [
                    participant
                  ]
                }
              );

            }
          }
        }

      } catch (error) {

        console.error(
          "Welcome error:",
          error.message
        );

      }
    }
  );

  /* =======================================================
     📨 MESSAGE HANDLER
  ======================================================= */

  sock.ev.on(
    "messages.upsert",
    async ({
      messages
    }) => {

      const mek =
        messages?.[0];

      if (
        !mek ||
        !mek.message
      ) return;

      if (
        mek.key.remoteJid ===
        "status@broadcast"
      ) return;

      try {

        const from =
          mek.key.remoteJid;

        const sender =
          mek.key.participant ||
          from;

        const body =
          getBody(mek).trim();

        if (
          !body.startsWith(".")
        ) return;

        const parts =
          body
            .slice(1)
            .trim()
            .split(/\s+/);

        const command =
          (
            parts.shift() ||
            ""
          ).toLowerCase();

        const query =
          parts.join(" ");

        const isGroup =
          from.endsWith("@g.us");

        /* ================================================
           MENU
        ================================================= */

        if (
          [
            "menu",
            "help",
            "maliya"
          ].includes(command)
        ) {

          return sendMenu(
            sock,
            from,
            mek
          );

        }

        /* ================================================
           PING
        ================================================= */

        if (
          command === "ping"
        ) {

          const start =
            Date.now();

          await sock.sendMessage(
            from,
            {
              text: "🏓 Checking..."
            },
            {
              quoted: mek
            }
          );

          const speed =
            Date.now() -
            start;

          return sock.sendMessage(
            from,
            {
              text:
                `🏓 *PONG!*\n\n` +
                `⚡ Speed: ${speed}ms\n` +
                `🤖 ${BOT_NAME}`
            },
            {
              quoted: mek
            }
          );

        }

        /* ================================================
           TIME
        ================================================= */

        if (
          command === "time"
        ) {

          return sock.sendMessage(
            from,
            {
              text:
                `🇱🇰 *SRI LANKA TIME*\n\n` +
                `📅 ${dateLK()}\n` +
                `⏰ ${timeLK()}\n\n` +
                `Asia/Colombo`
            },
            {
              quoted: mek
            }
          );

        }

        /* ================================================
           FUN
        ================================================= */

        if (
          [
            "joke",
            "fact",
            "quote",
            "motivate",
            "life",
            "challenge"
          ].includes(command)
        ) {

          return sock.sendMessage(
            from,
            {
              text:
                random(
                  fun[command]
                )
            },
            {
              quoted: mek
            }
          );

        }

        /* ================================================
           SONG / AUDIO
        ================================================= */

        if (
          [
            "song",
            "audio"
          ].includes(command)
        ) {

          if (!query) {

            return sock.sendMessage(
              from,
              {
                text:
                  `❌ Usage:\n` +
                  `.song <song name>\n\n` +
                  `Example:\n` +
                  `.song Manike Mage Hithe`
              },
              {
                quoted: mek
              }
            );

          }

          await sock.sendMessage(
            from,
            {
              text:
                `🔎 *Searching YouTube...*\n\n` +
                `🎵 ${query}`
            },
            {
              quoted: mek
            }
          );

          try {

            const video =
              /^https?:\/\//i.test(query)
                ? {
                    url: query,
                    title: query,
                    thumbnail: MENU_IMAGE,
                    timestamp: ""
                  }
                : await searchYouTube(
                    query
                  );

            /* THUMBNAIL */

            await sock.sendMessage(
              from,
              {
                image: {
                  url:
                    video.thumbnail
                },
                caption:
                  `╭━━〔 🎵 AUDIO 〕━━╮\n` +
                  `│ 🎶 ${video.title}\n` +
                  `│ ⏱️ ${video.timestamp || "Unknown"}\n` +
                  `╰━━━━━━━━━━━━━━╯\n\n` +

                  `⬇️ Downloading audio...\n` +
                  `🤖 ${BOT_NAME}`
              },
              {
                quoted: mek
              }
            );

            const audioUrl =
              await getAudio(
                video.url
              );

            return sock.sendMessage(
              from,
              {
                audio: {
                  url: audioUrl
                },
                mimetype:
                  "audio/mpeg",
                fileName:
                  `${(video.title || "MALIYA-X").slice(0, 80)}.mp3`
              },
              {
                quoted: mek
              }
            );

          } catch (error) {

            console.error(
              "Audio error:",
              error.message
            );

            return downloadFailed(
              sock,
              from,
              mek,
              "AUDIO"
            );

          }

        }

        /* ================================================
           VIDEO / YTDL
        ================================================= */

        if (
          [
            "video",
            "ytdl"
          ].includes(command)
        ) {

          if (!query) {

            return sock.sendMessage(
              from,
              {
                text:
                  `❌ Usage:\n` +
                  `.video <name/link> [quality]\n\n` +
                  `Quality:\n` +
                  `144p | 240p | 360p | 480p | 720p | 1080p\n\n` +
                  `Example:\n` +
                  `.video Manike Mage Hithe 720p`
              },
              {
                quoted: mek
              }
            );

          }

          const qualityMatch =
            query.match(
              /\b(144p|240p|360p|480p|720p|1080p)\b/i
            );

          const quality =
            qualityMatch
              ? qualityMatch[1].toLowerCase()
              : "720p";

          const cleanQuery =
            query
              .replace(
                qualityMatch?.[0] || "",
                ""
              )
              .trim();

          await sock.sendMessage(
            from,
            {
              text:
                `🔎 *Searching YouTube...*\n\n` +
                `🎬 ${cleanQuery}\n` +
                `📺 Quality: ${quality}`
            },
            {
              quoted: mek
            }
          );

          try {

            const video =
              /^https?:\/\//i.test(cleanQuery)
                ? {
                    url: cleanQuery,
                    title: cleanQuery,
                    thumbnail: MENU_IMAGE,
                    timestamp: ""
                  }
                : await searchYouTube(
                    cleanQuery
                  );

            /* VIDEO THUMBNAIL */

            await sock.sendMessage(
              from,
              {
                image: {
                  url:
                    video.thumbnail
                },
                caption:
                  `╭━━〔 🎬 VIDEO 〕━━╮\n` +
                  `│ 🎞️ ${video.title}\n` +
                  `│ ⏱️ ${video.timestamp || "Unknown"}\n` +
                  `│ 📺 ${quality}\n` +
                  `╰━━━━━━━━━━━━━━╯\n\n` +

                  `⬇️ Downloading video...\n` +
                  `🤖 ${BOT_NAME}`
              },
              {
                quoted: mek
              }
            );

            const videoUrl =
              await getVideo(
                video.url,
                quality
              );

            return sock.sendMessage(
              from,
              {
                video: {
                  url: videoUrl
                },
                mimetype:
                  "video/mp4",
                fileName:
                  `${(video.title || "MALIYA-X").slice(0, 70)}.mp4`,
                caption:
                  `🎬 *${video.title || "MALIYA-X VIDEO"}*\n` +
                  `📺 Quality: ${quality}\n\n` +
                  `🤖 ${BOT_NAME}`
              },
              {
                quoted: mek
              }
            );

          } catch (error) {

            console.error(
              "Video error:",
              error.message
            );

            return downloadFailed(
              sock,
              from,
              mek,
              "VIDEO"
            );

          }

        }

        /* ================================================
           STICKER
        ================================================= */

        if (
          [
            "sticker",
            "s"
          ].includes(command)
        ) {

          const image =
            await getStickerImage(
              sock,
              mek
            );

          if (!image) {

            return sock.sendMessage(
              from,
              {
                text:
                  `❌ Image එකක් send කරලා .s caption එක දාන්න.\n\n` +
                  `නැත්නම් image එකකට reply කරලා .s දාන්න.`
              },
              {
                quoted: mek
              }
            );

          }

          try {

            await sock.sendMessage(
              from,
              {
                sticker: image
              },
              {
                quoted: mek
              }
            );

          } catch (error) {

            console.error(
              "Sticker error:",
              error.message
            );

            await sock.sendMessage(
              from,
              {
                text:
                  "❌ Sticker creation failed. නැවත try කරන්න."
              },
              {
                quoted: mek
              }
            );

          }

          return;
        }

        /* ================================================
           SOCIAL LINK COMMANDS
        ================================================= */

        if (
          [
            "tiktok",
            "instagram",
            "whatsapp",
            "viber",
            "imo"
          ].includes(command)
        ) {

          if (!query) {

            return sock.sendMessage(
              from,
              {
                text:
                  `📥 *${command.toUpperCase()} DOWNLOADER*\n\n` +
                  `Public link එක send කරන්න.\n\n` +
                  `Example:\n` +
                  `.${command} https://...`
              },
              {
                quoted: mek
              }
            );

          }

          return sock.sendMessage(
            from,
            {
              text:
                `🔎 ${command.toUpperCase()} link received.\n\n` +
                `⏳ Downloader service එක available නම් media එක process කරනවා.\n\n` +
                `⚠️ Private/restricted links support නොකරයි.`
            },
            {
              quoted: mek
            }
          );

        }

        /* ================================================
           MOVIE
        ================================================= */

        if (
          command === "movie"
        ) {

          if (!query) {

            return sock.sendMessage(
              from,
              {
                text:
                  "🎬 Usage: .movie <movie name>"
              },
              {
                quoted: mek
              }
            );

          }

          try {

            const result =
              await ytSearch(
                `${query} official trailer`
              );

            const movie =
              result.videos?.[0];

            if (!movie) {
              throw new Error(
                "Movie not found"
              );
            }

            return sock.sendMessage(
              from,
              {
                image: {
                  url:
                    movie.thumbnail
                },
                caption:
                  `╭━━〔 🎬 MOVIE 〕━━╮\n` +
                  `│ 🎞️ ${query}\n` +
                  `│ 🔎 ${movie.title}\n` +
                  `│ ⏱️ ${movie.timestamp || "Unknown"}\n` +
                  `╰━━━━━━━━━━━━━━╯\n\n` +
                  `🔗 ${movie.url}\n\n` +
                  `🤖 ${BOT_NAME}`
              },
              {
                quoted: mek
              }
            );

          } catch {

            return sock.sendMessage(
              from,
              {
                text:
                  "❌ Movie search failed. වෙන movie name එකක් try කරන්න."
              },
              {
                quoted: mek
              }
            );

          }

        }

        /* ================================================
           AI
        ================================================= */

        if (
          command === "ai"
        ) {

          if (!query) {

            return sock.sendMessage(
              from,
              {
                text:
                  "🤖 Usage: .ai <your question>"
              },
              {
                quoted: mek
              }
            );

          }

          try {

            const api =
              "https://apis.davidcyriltech.my.id/ai/gemini?query=" +
              encodeURIComponent(query);

            const response =
              await axios.get(
                api,
                {
                  timeout: 30000
                }
              );

            const answer =
              response.data?.result ||
              response.data?.response ||
              response.data?.answer;

            if (!answer) {
              throw new Error(
                "No AI response"
              );
            }

            return sock.sendMessage(
              from,
              {
                text:
                  `🤖 *MALIYA-X AI*\n\n${answer}`
              },
              {
                quoted: mek
              }
            );

          } catch {

            return sock.sendMessage(
              from,
              {
                text:
                  "❌ AI service unavailable. ටිකකින් නැවත try කරන්න."
              },
              {
                quoted: mek
              }
            );

          }

        }

        /* ================================================
           GROUP COMMANDS
        ================================================= */

        if (
          [
            "groupinfo",
            "tagall",
            "admins",
            "link"
          ].includes(command)
        ) {

          if (!isGroup) {

            return sock.sendMessage(
              from,
              {
                text:
                  "❌ මේ command එක group එකකදී විතරයි."
              },
              {
                quoted: mek
              }
            );

          }

          /* GROUP INFO */

          if (
            command ===
            "groupinfo"
          ) {

            const metadata =
              await sock.groupMetadata(
                from
              );

            const admins =
              metadata.participants
                .filter(
                  (p) => p.admin
                ).length;

            return sock.sendMessage(
              from,
              {
                text:
                  `╭━━〔 👥 GROUP INFO 〕━━╮\n` +
                  `│ 📌 ${metadata.subject}\n` +
                  `│ 👤 Members: ${metadata.participants.length}\n` +
                  `│ 🛡️ Admins: ${admins}\n` +
                  `╰━━━━━━━━━━━━━━━━━━╯`
              },
              {
                quoted: mek
              }
            );

          }

          const admin =
            await isAdmin(
              sock,
              from,
              sender
            );

          if (!admin) {

            return sock.sendMessage(
              from,
              {
                text:
                  "❌ මේ command එක භාවිතා කරන්න admin කෙනෙක් වෙන්න ඕනේ."
              },
              {
                quoted: mek
              }
            );

          }

          /* TAG ALL */

          if (
            command ===
            "tagall"
          ) {

            const metadata =
              await sock.groupMetadata(
                from
              );

            const mentions =
              metadata.participants.map(
                (p) => p.id
              );

            const text =
              `📢 *TAG ALL*\n\n` +
              mentions
                .map(
                  (id, i) =>
                    `${i + 1}. @${id.split("@")[0]}`
                )
                .join("\n");

            return sock.sendMessage(
              from,
              {
                text,
                mentions
              },
              {
                quoted: mek
              }
            );

          }

          /* ADMINS */

          if (
            command ===
            "admins"
          ) {

            const metadata =
              await sock.groupMetadata(
                from
              );

            const admins =
              metadata.participants
                .filter(
                  (p) => p.admin
                );

            const mentions =
              admins.map(
                (p) => p.id
              );

            const text =
              `🛡️ *GROUP ADMINS*\n\n` +
              admins
                .map(
                  (p) =>
                    `• @${p.id.split("@")[0]}`
                )
                .join("\n");

            return sock.sendMessage(
              from,
              {
                text,
                mentions
              },
              {
                quoted: mek
              }
            );

          }

          /* GROUP LINK */

          if (
            command ===
            "link"
          ) {

            const code =
              await sock.groupInviteCode(
                from
              );

            return sock.sendMessage(
              from,
              {
                text:
                  `🔗 *GROUP INVITE LINK*\n\n` +
                  `https://chat.whatsapp.com/${code}`
              },
              {
                quoted: mek
              }
            );

          }

        }

        /* ================================================
           GOOD MORNING
        ================================================= */

        if (
          [
            "goodmorning",
            "gm"
          ].includes(command)
        ) {

          return sock.sendMessage(
            from,
            {
              text:
                `🌅 *සුභ උදෑසනක්!* ☀️\n\n` +
                `අද දවස ලස්සන දවසක් කරගන්න! ❤️\n\n` +
                `🤖 ${BOT_NAME}`
            },
            {
              quoted: mek
            }
          );

        }

        /* ================================================
           GOOD NIGHT
        ================================================= */

        if (
          [
            "goodnight",
            "gn"
          ].includes(command)
        ) {

          return sock.sendMessage(
            from,
            {
              text:
                `🌙 *සුභ රාත්‍රියක්!* 😴\n\n` +
                `හොඳින් විවේක ගන්න.\n` +
                `හෙට අලුත් දවසක්! ❤️\n\n` +
                `🤖 ${BOT_NAME}`
            },
            {
              quoted: mek
            }
          );

        }

        /* ================================================
           LOVE / FUN
        ================================================= */

        const funReplies = {

          love:
            "❤️ ආදරය කියන්නේ trust + respect + care.",

          flirt:
            "😏 ඔයාගේ smile එක තමයි අද secret weapon එක! 😂",

          romantic:
            "🌹 ලස්සන මතක හදන්න expensive දෙයක් ඕනේ නැහැ.",

          truth:
            "🎯 Truth: අද ඔයාට ඇත්තටම සතුටු කරන දෙයක් මොකක්ද?",

          dare:
            "🔥 Dare: හොඳ යාළුවෙක්ට 'ඔයා වටින කෙනෙක්' කියලා message එකක් යවන්න."
        };

        if (
          funReplies[command]
        ) {

          return sock.sendMessage(
            from,
            {
              text:
                funReplies[command]
            },
            {
              quoted: mek
            }
          );

        }

      } catch (error) {

        console.error(
          "Message handler error:",
          error.message
        );

      }

    }
  );
}

/* =========================================================
   🚀 START
========================================================= */

startMaliyaX().catch(
  (error) => {
    console.error(
      "Fatal startup error:",
      error
    );
  }
);
