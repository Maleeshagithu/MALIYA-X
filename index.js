require("dotenv").config();

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
const ytSearch = require("yt-search");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;
const PHONE_NUMBER = (process.env.PHONE_NUMBER || "").replace(/\D/g, "");
const SESSION_DIR = process.env.SESSION_DIR || "./session";

const BOT_NAME = "MALIYA-X V2 🇱🇰";

const MENU_IMAGE =
  process.env.MENU_IMAGE ||
  "https://i.ibb.co/3W9q55d/default-profile.png";

/* =========================
   RENDER WEB SERVER
========================= */

app.get("/", (req, res) => {
  res.status(200).send("MALIYA-X V2 Bot is Running Successfully! 🇱🇰🔥");
});

app.get("/health", (req, res) => {
  res.json({
    bot: BOT_NAME,
    status: "online"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

/* =========================
   HELPERS
========================= */

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

const random = arr =>
  arr[Math.floor(Math.random() * arr.length)];

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

/* =========================
   SINHALA FUN
========================= */

const fun = {
  joke: [
    "😂 ගුරුවරයා: ඇයි අද පරක්කු? ශිෂ්‍යයා: සර් alarm එක මට කලින් නැගිටලා!",
    "🤣 Wi-Fi එක නැති වුණාම ගෙදර අයත් අලුත් යාළුවෝ වගේ පේනවා.",
    "😂 Diet එකේ ඉන්න කෙනා cake එක දැක්කාම: මේක diet එකේ නැති නිසා කනවා!",
    "🤣 Phone battery 1% වුණාම තමයි ජීවිතයේ වටිනාකම තේරෙන්නේ."
  ],

  fact: [
    "💡 Octopus එකකට හදවත් තුනක් තියෙනවා. 🐙",
    "💡 මිනිස් මොළය නින්දේදීත් ක්‍රියාකාරීව පවතිනවා.",
    "💡 මී මැස්සන්ට මිනිස් මුහුණු හඳුනාගැනීමට හැකියාව තියෙනවා.",
    "💡 පෘථිවියේ ජලයෙන් වැඩි කොටසක් සාගරවල තියෙනවා."
  ],

  quote: [
    "💬 වැටීම අවසානයක් නෙවෙයි. නැගිටීම තමයි වැදගත්.",
    "💬 ඔයාගේ ගමන වෙන කෙනෙකුගේ ගමන එක්ක සසඳන්න එපා.",
    "💬 කුඩා පියවරක් වුණත් ඉදිරියට යන පියවරක් නම් වටිනවා.",
    "💬 අද කරන උත්සාහය හෙට ලැබෙන ප්‍රතිඵලයට පාර හදනවා."
  ],

  motivate: [
    "🔥 අද perfect වෙන්න ඕනේ නැහැ. ඊයේට වඩා ටිකක් හොඳ වෙන්න.",
    "🚀 හීනය ලොකු නම් පියවර කුඩා කරලා අදම පටන් ගන්න.",
    "💪 අමාරු දවස් තමයි ඔයාගේ strength එක පෙන්වන්නේ.",
    "🔥 අත්හරින්න කලින් තව එක පාරක් උත්සාහ කරන්න."
  ],

  life: [
    "❤️ ජීවිතය තරඟයක් නෙවෙයි. තමන්ගේ වේගයෙන් යන ගමනක්.",
    "🌱 අද කරන කුඩා හොඳ දෙයක් හෙට ලොකු වෙනසක් වෙන්න පුළුවන්.",
    "❤️ මිනිස්සු වෙනස් වෙනවා. ඒත් ඔයාගේ වටිනාකම අමතක කරන්න එපා.",
    "🌻 ජීවිතයේ ලස්සනම දේවල් සමහරවිට අපි බලාපොරොත්තු නොවුණු වෙලාවට එනවා."
  ],

  challenge: [
    "🎯 Challenge: අද පැයක් social media නැතුව productive වැඩක් කරන්න!",
    "🎯 Challenge: කෙනෙක්ට හොඳ වචනයක් කියලා ඔහුගේ දවස ලස්සන කරන්න.",
    "🎯 Challenge: අද අලුත් දෙයක් විනාඩි 20ක් ඉගෙනගන්න.",
    "🎯 Challenge: අද unnecessary argument එකක් avoid කරන්න."
  ]
};

/* =========================
   MESSAGE TEXT
========================= */

function getBody(mek) {
  const msg = mek.message || {};

  if (msg.conversation)
    return msg.conversation;

  if (msg.extendedTextMessage?.text)
    return msg.extendedTextMessage.text;

  if (msg.imageMessage?.caption)
    return msg.imageMessage.caption;

  if (msg.videoMessage?.caption)
    return msg.videoMessage.caption;

  if (msg.buttonsResponseMessage?.selectedButtonId)
    return msg.buttonsResponseMessage.selectedButtonId;

  if (
    msg.listResponseMessage?.singleSelectReply?.selectedRowId
  ) {
    return msg.listResponseMessage.singleSelectReply.selectedRowId;
  }

  return "";
}

/* =========================
   STICKER
========================= */

function getQuotedMessage(mek) {
  return mek.message?.extendedTextMessage?.contextInfo
    ?.quotedMessage || null;
}

function getImageMessage(message) {
  if (!message) return null;

  if (message.imageMessage)
    return message.imageMessage;

  if (message.viewOnceMessage?.message?.imageMessage)
    return message.viewOnceMessage.message.imageMessage;

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
  const direct = mek.message?.imageMessage;

  if (direct) {
    const stream = await downloadContentFromMessage(
      direct,
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

/* =========================
   YOUTUBE
========================= */

async function searchYouTube(query) {
  const result = await ytSearch(query);

  if (!result?.videos?.length)
    throw new Error("YouTube result not found");

  return result.videos[0];
}

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

  if (!downloadUrl)
    throw new Error("Audio URL unavailable");

  return downloadUrl;
}

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

  if (!downloadUrl)
    throw new Error("Video URL unavailable");

  return downloadUrl;
}

/* =========================
   DOWNLOAD ERROR
========================= */

async function downloadFailed(sock, from, mek, type) {
  return sock.sendMessage(
    from,
    {
      text:
        `╭━━〔 ❌ DOWNLOAD FAILED 〕━━╮\n` +
        `│ 📦 Type: ${type}\n` +
        `│ 😕 Media එක download කරන්න බැරි වුණා.\n` +
        `│ 🔄 Link/query එක check කරලා නැවත try කරන්න.\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `🤖 ${BOT_NAME}`
    },
    { quoted: mek }
  );
}

/* =========================
   MENU
========================= */

function menuText() {
  return (
    `╭━━━〔 🇱🇰 ${BOT_NAME} 〕━━━╮\n` +
    `┃ ⚡ FAST • SMART • SINHALA\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +

    `🏠 *BASIC*\n` +
    `│ 🏓 .ping\n` +
    `│ 🕐 .time\n` +
    `│ 🤖 .ai <question>\n\n` +

    `🎵 *YOUTUBE*\n` +
    `│ 🎧 .song <name/link>\n` +
    `│ 🎵 .audio <name/link>\n` +
    `│ 🎬 .video <name/link> [quality]\n` +
    `│ 📺 .ytdl <name/link> [quality]\n\n` +

    `🎚️ *QUALITY*\n` +
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

    `🌅 *DAILY*\n` +
    `│ .gm / .goodmorning\n` +
    `│ .gn / .goodnight\n\n` +

    `❤️ *FUN*\n` +
    `│ .love\n` +
    `│ .flirt\n` +
    `│ .romantic\n` +
    `│ .truth\n` +
    `│ .dare\n\n` +

    `👋 Auto Welcome: ON\n` +
    `🚪 Auto Goodbye: ON\n` +
    `🔔 Connection Alert: ON\n\n` +

    `© ${BOT_NAME}`
  );
}

/* =========================
   ADMIN
========================= */

async function isAdmin(sock, group, sender) {
  const metadata =
    await sock.groupMetadata(group);

  const member =
    metadata.participants.find(
      p => p.id === sender
    );

  return Boolean(member?.admin);
}

/* =========================
   START BOT
========================= */

async function startMaliyaX() {
  fs.mkdirSync(SESSION_DIR, {
    recursive: true
  });

  const {
    state,
    saveCreds
  } = await useMultiFileAuthState(
    SESSION_DIR
  );

  const sock = makeWASocket({
    auth: state,

    logger: pino({
      level: "silent"
    }),

    browser: Browsers.macOS("Chrome"),

    printQRInTerminal: false
  });

  /* =======================
     PAIRING CODE
  ======================= */

  if (!state.creds.registered) {

    if (!PHONE_NUMBER) {
      console.error(
        "❌ PHONE_NUMBER is missing from Render Environment Variables."
      );
    } else {
      setTimeout(async () => {
        try {
          console.log(
            "🔑 Requesting WhatsApp pairing code..."
          );

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

          console.log(code);

          console.log(
            "====================================\n"
          );

          console.log(
            "📱 WhatsApp → Linked Devices → Link with phone number instead"
          );

        } catch (error) {
          console.error(
            "❌ Pairing code error:",
            error?.message || error
          );
        }
      }, 5000);
    }
  }

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  /* =======================
     CONNECTION
  ======================= */

  let notified = false;

  sock.ev.on(
    "connection.update",
    async update => {
      const {
        connection,
        lastDisconnect
      } = update;

      if (connection === "open") {

        console.log(
          `\n✅ ${BOT_NAME} CONNECTED!\n`
        );

        if (!notified) {
          notified = true;

          try {
            const botNumber =
              sock.user.id.split(":")[0] +
              "@s.whatsapp.net";

            await sock.sendMessage(
              botNumber,
              {
                text:
                  `╭━━〔 🚀 BOT CONNECTED 〕━━╮\n` +
                  `│ 🤖 ${BOT_NAME}\n` +
                  `│ 🟢 Status: ONLINE\n` +
                  `│ ⚡ Version: 2.0.0\n` +
                  `│ 📅 ${dateLK()}\n` +
                  `│ ⏰ ${timeLK()}\n` +
                  `╰━━━━━━━━━━━━━━━━━━╯\n\n` +
                  `✅ WhatsApp successfully connected!\n` +
                  `🔥 MALIYA-X V2 is ready.\n\n` +
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
          lastDisconnect?.error?.output?.statusCode;

        const shouldReconnect =
          statusCode !==
          DisconnectReason.loggedOut;

        console.log(
          "❌ WhatsApp connection closed."
        );

        console.log(
          "🔄 Reconnect:",
          shouldReconnect
        );

        if (shouldReconnect) {
          await sleep(5000);
          startMaliyaX();
        } else {
          console.log(
            "🚪 WhatsApp logged out."
          );
        }
      }
    }
  );

  /* =======================
     WELCOME / GOODBYE
  ======================= */

  sock.ev.on(
    "group-participants.update",
    async update => {

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

          let dp = null;

          try {
            dp =
              await sock.profilePictureUrl(
                participant,
                "image"
              );
          } catch {}

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
          "Welcome/Goodbye error:",
          error.message
        );
      }
    }
  );

  /* =======================
     COMMAND HANDLER
  ======================= */

  sock.ev.on(
    "messages.upsert",
    async ({ messages }) => {

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

        /* MENU */

        if (
          ["menu", "help", "maliya"]
            .includes(command)
        ) {
          try {
            await sock.sendMessage(
              from,
              {
                image: {
                  url: MENU_IMAGE
                },
                caption: menuText()
              },
              { quoted: mek }
            );
          } catch {
            await sock.sendMessage(
              from,
              {
                text: menuText()
              },
              { quoted: mek }
            );
          }

          return;
        }

        /* PING */

        if (command === "ping") {

          const start =
            Date.now();

          await sock.sendMessage(
            from,
            {
              text: "🏓 Checking..."
            },
            { quoted: mek }
          );

          const speed =
            Date.now() - start;

          return sock.sendMessage(
            from,
            {
              text:
                `🏓 *PONG!*\n\n` +
                `⚡ Speed: ${speed}ms\n` +
                `🤖 ${BOT_NAME}`
            },
            { quoted: mek }
          );
        }

        /* TIME */

        if (command === "time") {
          return sock.sendMessage(
            from,
            {
              text:
                `🇱🇰 *SRI LANKA TIME*\n\n` +
                `📅 ${dateLK()}\n` +
                `⏰ ${timeLK()}`
            },
            { quoted: mek }
          );
        }

        /* FUN */

        if (
          Object.prototype.hasOwnProperty.call(
            fun,
            command
          )
        ) {
          return sock.sendMessage(
            from,
            {
              text: random(
                fun[command]
              )
            },
            { quoted: mek }
          );
        }

        /* SONG */

        if (
          ["song", "audio"].includes(command)
        ) {

          if (!query) {
            return sock.sendMessage(
              from,
              {
                text:
                  "❌ Example: .song Manike Mage Hithe"
              },
              { quoted: mek }
            );
          }

          await sock.sendMessage(
            from,
            {
              text:
                `🔎 YouTube search...\n🎵 ${query}`
            },
            { quoted: mek }
          );

          try {

            const video =
              await searchYouTube(query);

            await sock.sendMessage(
              from,
              {
                image: {
                  url: video.thumbnail
                },
                caption:
                  `╭━━〔 🎵 SONG 〕━━╮\n` +
                  `│ 🎶 ${video.title}\n` +
                  `│ ⏱️ ${video.timestamp || "Unknown"}\n` +
                  `╰━━━━━━━━━━━━━━╯\n\n` +
                  `⬇️ Downloading...`
              },
              { quoted: mek }
            );

            const audioUrl =
              await getAudio(video.url);

            return sock.sendMessage(
              from,
              {
                audio: {
                  url: audioUrl
                },
                mimetype: "audio/mpeg",
                fileName:
                  "MALIYA-X-Audio.mp3"
              },
              { quoted: mek }
            );

          } catch (error) {

            console.error(
              "Song error:",
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

        /* VIDEO */

        if (
          ["video", "ytdl"].includes(command)
        ) {

          if (!query) {
            return sock.sendMessage(
              from,
              {
                text:
                  "❌ Example: .video Song Name 720p"
              },
              { quoted: mek }
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
                `🔎 YouTube search...\n` +
                `🎬 ${cleanQuery}\n` +
                `📺 Quality: ${quality}`
            },
            { quoted: mek }
          );

          try {

            const video =
              await searchYouTube(
                cleanQuery
              );

            await sock.sendMessage(
              from,
              {
                image: {
                  url: video.thumbnail
                },
                caption:
                  `╭━━〔 🎬 VIDEO 〕━━╮\n` +
                  `│ 🎞️ ${video.title}\n` +
                  `│ 📺 ${quality}\n` +
                  `╰━━━━━━━━━━━━━━╯\n\n` +
                  `⬇️ Downloading...`
              },
              { quoted: mek }
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
                  "MALIYA-X-Video.mp4",
                caption:
                  `🎬 ${video.title}\n` +
                  `📺 ${quality}\n\n` +
                  `🤖 ${BOT_NAME}`
              },
              { quoted: mek }
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

        /* STICKER */

        if (
          ["sticker", "s"].includes(command)
        ) {

          try {

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
                    "❌ Image එකකට reply කරලා .s දාන්න, නැත්නම් image caption එකට .s දාන්න."
                },
                { quoted: mek }
              );
            }

            await sock.sendMessage(
              from,
              {
                sticker: image
              },
              { quoted: mek }
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
                  "❌ Sticker creation failed."
              },
              { quoted: mek }
            );
          }

          return;
        }

        /* SOCIAL LINKS */

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
                  `📥 .${command} <public link>`
              },
              { quoted: mek }
            );
          }

          return sock.sendMessage(
            from,
            {
              text:
                `🔗 ${command.toUpperCase()} link received.\n\n` +
                `⏳ Downloader service එක source එක support කරන විට media process කරන්න පුළුවන්.\n\n` +
                `⚠️ Private/restricted media support නොකරයි.`
            },
            { quoted: mek }
          );
        }

        /* MOVIE */

        if (command === "movie") {

          if (!query) {
            return sock.sendMessage(
              from,
              {
                text:
                  "🎬 Example: .movie Avatar"
              },
              { quoted: mek }
            );
          }

          try {

            const result =
              await ytSearch(
                `${query} official trailer`
              );

            const movie =
              result.videos?.[0];

            if (!movie)
              throw new Error("Not found");

            return sock.sendMessage(
              from,
              {
                image: {
                  url: movie.thumbnail
                },
                caption:
                  `╭━━〔 🎬 MOVIE 〕━━╮\n` +
                  `│ 🎞️ ${query}\n` +
                  `│ 🔎 ${movie.title}\n` +
                  `╰━━━━━━━━━━━━━━╯\n\n` +
                  `🔗 ${movie.url}`
              },
              { quoted: mek }
            );

          } catch {
            return sock.sendMessage(
              from,
              {
                text:
                  "❌ Movie search failed."
              },
              { quoted: mek }
            );
          }
        }

        /* AI */

        if (command === "ai") {

          if (!query) {
            return sock.sendMessage(
              from,
              {
                text:
                  "🤖 Example: .ai Sri Lanka ගැන කියන්න"
              },
              { quoted: mek }
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

            if (!answer)
              throw new Error("No response");

            return sock.sendMessage(
              from,
              {
                text:
                  `🤖 *MALIYA-X AI*\n\n${answer}`
              },
              { quoted: mek }
            );

          } catch {
            return sock.sendMessage(
              from,
              {
                text:
                  "❌ AI service unavailable."
              },
              { quoted: mek }
            );
          }
        }

        /* GROUP */

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
              { quoted: mek }
            );
          }

          if (command === "groupinfo") {

            const metadata =
              await sock.groupMetadata(
                from
              );

            const admins =
              metadata.participants.filter(
                p => p.admin
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
              { quoted: mek }
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
                  "❌ Admins only."
              },
              { quoted: mek }
            );
          }

          if (command === "tagall") {

            const metadata =
              await sock.groupMetadata(
                from
              );

            const mentions =
              metadata.participants.map(
                p => p.id
              );

            const text =
              `📢 *TAG ALL*\n\n` +
              mentions
                .map(
                  id =>
                    `• @${id.split("@")[0]}`
                )
                .join("\n");

            return sock.sendMessage(
              from,
              {
                text,
                mentions
              },
              { quoted: mek }
            );
          }

          if (command === "admins") {

            const metadata =
              await sock.groupMetadata(
                from
              );

            const admins =
              metadata.participants.filter(
                p => p.admin
              );

            const mentions =
              admins.map(
                p => p.id
              );

            const text =
              `🛡️ *GROUP ADMINS*\n\n` +
              admins
                .map(
                  p =>
                    `• @${p.id.split("@")[0]}`
                )
                .join("\n");

            return sock.sendMessage(
              from,
              {
                text,
                mentions
              },
              { quoted: mek }
            );
          }

          if (command === "link") {

            const code =
              await sock.groupInviteCode(
                from
              );

            return sock.sendMessage(
              from,
              {
                text:
                  `🔗 *GROUP LINK*\n\n` +
                  `https://chat.whatsapp.com/${code}`
              },
              { quoted: mek }
            );
          }
        }

        /* GM */

        if (
          ["gm", "goodmorning"]
            .includes(command)
        ) {
          return sock.sendMessage(
            from,
            {
              text:
                "🌅 *සුභ උදෑසනක්!* ☀️\n\nඅද දවස සතුටින් පටන් ගන්න. ❤️"
            },
            { quoted: mek }
          );
        }

        /* GN */

        if (
          ["gn", "goodnight"]
            .includes(command)
        ) {
          return sock.sendMessage(
            from,
            {
              text:
                "🌙 *සුභ රාත්‍රියක්!* 😴\n\nහොඳින් විවේක ගන්න. හෙට අලුත් දවසක්! ❤️"
            },
            { quoted: mek }
          );
        }

        /* FUN */

        const replies = {
          love:
            "❤️ ආදරය කියන්නේ trust + respect + care.",

          flirt:
            "😏 ඔයාගේ smile එක තමයි අද secret weapon එක! 😂",

          romantic:
            "🌹 ලස්සන මතක හදන්න expensive දෙයක් ඕනේ නැහැ.",

          truth:
            "🎯 Truth: අද ඔයාට ඇත්තටම සතුටු කරන දෙයක් මොකක්ද?",

          dare:
            "🔥 Dare: කෙනෙක්ට හොඳ message එකක් යවලා surprise කරන්න."
        };

        if (replies[command]) {
          return sock.sendMessage(
            from,
            {
              text:
                replies[command]
            },
            { quoted: mek }
          );
        }

      } catch (error) {
        console.error(
          "❌ Message handler:",
          error.message
        );
      }
    }
  );
}

/* =========================
   START
========================= */

startMaliyaX().catch(error => {
  console.error(
    "❌ Fatal startup error:",
    error
  );
});
