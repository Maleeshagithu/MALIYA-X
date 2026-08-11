const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const express = require("express");
const axios = require("axios");
const ytSearch = require("yt-search");

// =====================================================
// 👑 MALIYA-X 🇱🇰
// Sri Lankan WhatsApp Bot
// =====================================================

// ==================== RENDER SERVER ====================

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("👑 MALIYA-X 🇱🇰 WhatsApp Bot is running!");
});

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    bot: "MALIYA-X",
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// ==================== HELPERS ====================

function getTime() {
  const now = new Date();

  return {
    date: now.toLocaleDateString("en-GB", {
      timeZone: "Asia/Colombo"
    }),
    time: now.toLocaleTimeString("en-US", {
      timeZone: "Asia/Colombo"
    })
  };
}

// IMPORTANT FIX:
// Baileys participant can sometimes be an object.
// Always return a STRING JID.
function getParticipantId(participant) {
  if (!participant) return "";

  if (typeof participant === "string") {
    return participant;
  }

  if (typeof participant === "object") {
    const id =
      participant.id ||
      participant.jid ||
      participant.phoneNumber ||
      participant.lid ||
      "";

    return typeof id === "string" ? id : String(id || "");
  }

  return String(participant);
}

function getMessageText(msg) {
  const message = msg?.message;

  if (!message) return "";

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    ""
  );
}

// ==================== BOT ====================

async function startMaliya() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Chrome"),
    markOnlineOnConnect: true,
    syncFullHistory: false
  });

  sock.ev.on("creds.update", saveCreds);

  // =====================================================
  // CONNECTION
  // =====================================================

  sock.ev.on(
    "connection.update",
    async ({ connection, lastDisconnect }) => {
      try {
        if (connection === "connecting") {
          console.log("🔄 MALIYA-X connecting...");
        }

        if (connection === "open") {
          console.log("");
          console.log("╔══════════════════════════════╗");
          console.log("║       👑 MALIYA-X 🇱🇰       ║");
          console.log("║     WhatsApp Bot ONLINE      ║");
          console.log("╚══════════════════════════════╝");
          console.log("");
        }

        if (connection === "close") {
          const statusCode =
            lastDisconnect?.error?.output?.statusCode;

          const shouldReconnect =
            statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {
            console.log("🔄 MALIYA-X reconnecting...");

            setTimeout(() => {
              startMaliya().catch((err) => {
                console.log(
                  "❌ Reconnect error:",
                  err?.message || err
                );
              });
            }, 5000);
          } else {
            console.log("❌ WhatsApp logged out.");
            console.log("🔑 Pair again.");
          }
        }
      } catch (err) {
        console.log(
          "❌ Connection error:",
          err?.message || err
        );
      }
    }
  );

  // =====================================================
  // PAIRING CODE
  // =====================================================

  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        let phoneNumber =
          process.env.PHONE_NUMBER || "94770678992";

        phoneNumber = String(phoneNumber)
          .replace(/\+/g, "")
          .replace(/\s/g, "")
          .replace(/-/g, "");

        console.log("📱 Requesting pairing code...");

        const code =
          await sock.requestPairingCode(phoneNumber);

        console.log("");
        console.log("====================================");
        console.log(`🔑 YOUR PAIRING CODE: ${code}`);
        console.log("====================================");
        console.log("");
      } catch (err) {
        console.log(
          "❌ Pairing code error:",
          err?.message || err
        );
      }
    }, 5000);
  }

  // =====================================================
  // 👋 WELCOME & GOODBYE
  // =====================================================

  sock.ev.on(
    "group-participants.update",
    async (anu) => {
      try {
        const metadata =
          await sock.groupMetadata(anu.id);

        const participants =
          Array.isArray(anu.participants)
            ? anu.participants
            : [];

        const { date, time } = getTime();

        for (const participant of participants) {
          // FIX: Always convert participant to string JID
          const num =
            getParticipantId(participant);

          if (!num) {
            console.log(
              "⚠️ Invalid participant:",
              participant
            );
            continue;
          }

          const cleanNumber =
            String(num).split("@")[0];

          const tag =
            `@${cleanNumber}`;

          // ==================== WELCOME ====================

          if (anu.action === "add") {
            const welcomeText =
`╭━━━〔 🌸 WELCOME 〕━━━╮

👋 ආයුබෝවන් ${tag}! 💐

🎉 ${metadata.subject}
සමූහයට ඔබව ආදරයෙන් පිළිගනිමු! ❤️

🤝 හැමෝම සමඟ එකමුතුව
සතුටින් ඉන්න.

📜 Group rules වලට ගරු කරන්න.
🌱 හොඳ මිතුරෙක් වෙන්න.
✨ ඔබේ පැමිණීම අපට සතුටක්!

📅 ${date}
⏰ ${time}

╰━━━〔 👑 MALIYA-X 🇱🇰 〕━━━╯`;

            await sock.sendMessage(
              anu.id,
              {
                text: welcomeText,
                mentions: [num]
              }
            );
          }

          // ==================== GOODBYE ====================

          if (
            anu.action === "remove" ||
            anu.action === "leave"
          ) {
            const goodbyeText =
`╭━━━〔 👋 GOODBYE 〕━━━╮

😔 ${tag} සමූහයෙන් ඉවත් වුණා.

❤️ අපිත් එක්ක ගත කළ
කාලයට ස්තූතියි!

🌿 ඔබ යන හැම තැනකම
සාර්ථකත්වය ලැබේවා.

✨ නැවත හමුවෙමු!

📅 ${date}
⏰ ${time}

╰━━━〔 👑 MALIYA-X 🇱🇰 〕━━━╯`;

            await sock.sendMessage(
              anu.id,
              {
                text: goodbyeText,
                mentions: [num]
              }
            );
          }
        }
      } catch (err) {
        console.log(
          "❌ Welcome/Goodbye error:",
          err?.message || err
        );
      }
    }
  );

  // =====================================================
  // 💬 MESSAGE HANDLER
  // =====================================================

  sock.ev.on(
    "messages.upsert",
    async ({ messages }) => {
      try {
        const msg = messages?.[0];

        if (!msg?.message) return;

        if (
          msg.key?.remoteJid === "status@broadcast"
        ) {
          return;
        }

        if (msg.key?.fromMe) return;

        const text =
          getMessageText(msg).trim();

        if (!text) return;

        const parts =
          text.split(/\s+/);

        const cmd =
          parts[0].toLowerCase();

        const args =
          parts.slice(1).join(" ").trim();

        const remoteJid =
          msg.key?.remoteJid;

        if (!remoteJid) return;

        const pushName =
          msg.pushName || "User";

        const { date, time } =
          getTime();

        // =================================================
        // 🏓 PING
        // =================================================

        if (cmd === ".ping") {
          await sock.sendMessage(
            remoteJid,
            {
              text:
`🏓 *PONG!*

👑 MALIYA-X 🇱🇰
⚡ Bot Online & Ready

📅 ${date}
⏰ ${time}

🚀 Status: ONLINE`
            }
          );

          return;
        }

        // =================================================
        // 📋 MENU
        // =================================================

        if (
          cmd === ".menu" ||
          cmd === ".help"
        ) {
          const menu =
`╭━━━〔 👑 MALIYA-X 🇱🇰 〕━━━╮
┃
┃ 👋 Hello *${pushName}*
┃
┃ ⚡ *BOT COMMAND MENU*
┃
┣━━〔 📥 DOWNLOAD 〕━━
┃
┃ 🎵 .song <name>
┃ 🎬 .ytdl <name/link>
┃ 📱 .social <link>
┃ 🎨 .sticker
┃
┣━━〔 👥 GROUP 〕━━
┃
┃ 👥 .groupinfo
┃ 📢 .tagall <message>
┃ 🛡️ .admin
┃
┣━━〔 🤖 TOOLS 〕━━
┃
┃ 🏓 .ping
┃ 🕒 .time
┃ 🧮 .calc <math>
┃ 🤖 .ai <question>
┃
┣━━〔 🌱 LIFE & FUN 〕━━
┃
┃ 🌱 .life
┃ 💪 .motivate
┃ 📖 .quote
┃ 🧠 .fact
┃ 😂 .joke
┃ 🎯 .challenge
┃
┣━━〔 ❤️ FRIENDS 〕━━
┃
┃ 🌅 .morning
┃ 🌙 .night
┃ ❤️ .respect
┃ 🤝 .friend
┃
╰━━〔 🇱🇰 Sri Lankan Bot 〕━━

📅 ${date}
⏰ ${time}

👑 *MALIYA-X*`;

          await sock.sendMessage(
            remoteJid,
            { text: menu }
          );

          return;
        }

        // =================================================
        // 🕒 TIME
        // =================================================

        if (cmd === ".time") {
          await sock.sendMessage(
            remoteJid,
            {
              text:
`🕒 *MALIYA-X TIME*

📅 Date: ${date}
⏰ Time: ${time}

🇱🇰 Sri Lanka Time`
            }
          );

          return;
        }

        // =================================================
        // 🎵 SONG
        // =================================================

        if (
          cmd === ".song" ||
          cmd === ".audio"
        ) {
          if (!args) {
            await sock.sendMessage(
              remoteJid,
              {
                text:
`❌ Song name එකක් දෙන්න.

Example:
.song Manike Mage Hithe`
              }
            );

            return;
          }

          try {
            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "🔎 Song එක සොයමින්... 🎵"
              }
            );

            const search =
              await ytSearch(args);

            const video =
              search.videos?.[0];

            if (!video) {
              await sock.sendMessage(
                remoteJid,
                {
                  text:
                    "❌ Song එක හමු වුණේ නැහැ."
                }
              );

              return;
            }

            const api =
`https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(video.url)}`;

            const response =
              await axios.get(api);

            const downloadUrl =
              response.data?.result?.download_url;

            if (!downloadUrl) {
              await sock.sendMessage(
                remoteJid,
                {
                  text:
                    "❌ Audio download කරන්න බැරි වුණා."
                }
              );

              return;
            }

            await sock.sendMessage(
              remoteJid,
              {
                audio: {
                  url: downloadUrl
                },
                mimetype: "audio/mp4",
                ptt: false
              }
            );
          } catch (err) {
            console.log(
              "❌ Song error:",
              err?.message || err
            );

            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "❌ Song download error."
              }
            );
          }

          return;
        }

        // =================================================
        // 🎬 YOUTUBE VIDEO
        // =================================================

        if (
          cmd === ".ytdl" ||
          cmd === ".video"
        ) {
          if (!args) {
            await sock.sendMessage(
              remoteJid,
              {
                text:
`❌ YouTube name/link එකක් දෙන්න.

Example:
.ytdl Sri Lankan song`
              }
            );

            return;
          }

          try {
            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "🔎 YouTube video එක සොයමින්... 🎬"
              }
            );

            const search =
              await ytSearch(args);

            const video =
              search.videos?.[0];

            if (!video) {
              await sock.sendMessage(
                remoteJid,
                {
                  text:
                    "❌ Video එක හමු වුණේ නැහැ."
                }
              );

              return;
            }

            const api =
`https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(video.url)}`;

            const response =
              await axios.get(api);

            const downloadUrl =
              response.data?.result?.download_url;

            if (!downloadUrl) {
              await sock.sendMessage(
                remoteJid,
                {
                  text:
                    "❌ Video download කරන්න බැරි වුණා."
                }
              );

              return;
            }

            await sock.sendMessage(
              remoteJid,
              {
                video: {
                  url: downloadUrl
                },
                caption:
`🎬 *${video.title}*

👑 MALIYA-X 🇱🇰`
              }
            );
          } catch (err) {
            console.log(
              "❌ Video error:",
              err?.message || err
            );

            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "❌ Video download error."
              }
            );
          }

          return;
        }

        // =================================================
        // 📱 SOCIAL DOWNLOADER
        // =================================================

        if (
          cmd === ".social" ||
          cmd === ".dl"
        ) {
          if (!args) {
            await sock.sendMessage(
              remoteJid,
              {
                text:
`❌ Social media link එකක් දෙන්න.

Example:
.social https://...`
              }
            );

            return;
          }

          try {
            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "📥 Video එක download කරමින්... ⏳"
              }
            );

            const api =
`https://apis.davidcyriltech.my.id/download/all?url=${encodeURIComponent(args)}`;

            const response =
              await axios.get(api);

            const result =
              response.data?.result;

            const downloadUrl =
              result?.url ||
              result?.download_url ||
              result?.video;

            if (!downloadUrl) {
              await sock.sendMessage(
                remoteJid,
                {
                  text:
                    "❌ Download link එක හමු වුණේ නැහැ."
                }
              );

              return;
            }

            await sock.sendMessage(
              remoteJid,
              {
                video: {
                  url: downloadUrl
                },
                caption:
`📱 *Social Media Download*

👑 MALIYA-X 🇱🇰`
              }
            );
          } catch (err) {
            console.log(
              "❌ Social error:",
              err?.message || err
            );

            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "❌ Social download error."
              }
            );
          }

          return;
        }

        // =================================================
        // 🎨 STICKER
        // =================================================

        if (
          cmd === ".sticker" ||
          cmd === ".s"
        ) {
          try {
            const imageMessage =
              msg.message.imageMessage;

            const quoted =
              msg.message.extendedTextMessage
                ?.contextInfo
                ?.quotedMessage;

            const quotedImage =
              quoted?.imageMessage;

            if (!imageMessage && !quotedImage) {
              await sock.sendMessage(
                remoteJid,
                {
                  text:
`❌ Photo එකක් සමඟ .sticker යවන්න.

හෝ photo එකකට reply කරලා:
.sticker`
                }
              );

              return;
            }

            const target =
              imageMessage || quotedImage;

            const stream =
              await downloadContentFromMessage(
                target,
                "image"
              );

            const chunks = [];

            for await (const chunk of stream) {
              chunks.push(chunk);
            }

            const buffer =
              Buffer.concat(chunks);

            await sock.sendMessage(
              remoteJid,
              {
                sticker: buffer
              },
              {
                quoted: msg
              }
            );
          } catch (err) {
            console.log(
              "❌ Sticker error:",
              err?.message || err
            );

            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "❌ Sticker create error."
              }
            );
          }

          return;
        }

        // =================================================
        // 🤖 AI
        // =================================================

        if (cmd === ".ai") {
          if (!args) {
            await sock.sendMessage(
              remoteJid,
              {
                text:
`🤖 AI question එකක් දෙන්න.

Example:
.ai Sri Lanka ගැන කියන්න`
              }
            );

            return;
          }

          try {
            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "🤖 AI පිළිතුර සූදානම් කරමින්..."
              }
            );

            const response =
              await axios.get(
                `https://apis.davidcyriltech.my.id/ai/gemini?query=${encodeURIComponent(args)}`
              );

            const answer =
              response.data?.result ||
              response.data?.message ||
              "❌ AI response එකක් ලැබුණේ නැහැ.";

            await sock.sendMessage(
              remoteJid,
              {
                text:
`🤖 *MALIYA-X AI*

${answer}

👑 MALIYA-X 🇱🇰`
              }
            );
          } catch (err) {
            console.log(
              "❌ AI error:",
              err?.message || err
            );

            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "❌ AI service error."
              }
            );
          }

          return;
        }

        // =================================================
        // 👥 GROUP INFO
        // =================================================

        if (cmd === ".groupinfo") {
          if (!remoteJid.endsWith("@g.us")) {
            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "❌ මේ command එක Group එකක විතරයි."
              }
            );

            return;
          }

          try {
            const group =
              await sock.groupMetadata(
                remoteJid
              );

            await sock.sendMessage(
              remoteJid,
              {
                text:
`╭━━〔 👥 GROUP INFO 〕━━╮

📛 Name:
${group.subject}

👥 Members:
${group.participants.length}

👑 MALIYA-X 🇱🇰

╰━━━━━━━━━━━━━━━━╯`
              }
            );
          } catch (err) {
            console.log(
              "❌ Group info error:",
              err?.message || err
            );
          }

          return;
        }

        // =================================================
        // 📢 TAG ALL
        // =================================================

        if (cmd === ".tagall") {
          if (!remoteJid.endsWith("@g.us")) {
            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "❌ මේ command එක Group එකක විතරයි."
              }
            );

            return;
          }

          try {
            const group =
              await sock.groupMetadata(
                remoteJid
              );

            const members =
              group.participants || [];

            const mentions =
              members
                .map(p => getParticipantId(p))
                .filter(Boolean);

            const message =
              args ||
              "📢 හැමෝගෙම අවධානය පිණිසයි!";

            await sock.sendMessage(
              remoteJid,
              {
                text:
`📢 *GROUP ANNOUNCEMENT*

${message}

👑 MALIYA-X 🇱🇰`,
                mentions
              }
            );
          } catch (err) {
            console.log(
              "❌ Tagall error:",
              err?.message || err
            );
          }

          return;
        }

        // =================================================
        // 🛡️ ADMINS
        // =================================================

        if (cmd === ".admin") {
          if (!remoteJid.endsWith("@g.us")) {
            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "❌ මේ command එක Group එකක විතරයි."
              }
            );

            return;
          }

          try {
            const group =
              await sock.groupMetadata(
                remoteJid
              );

            const admins =
              (group.participants || [])
                .filter(
                  p =>
                    p.admin === "admin" ||
                    p.admin === "superadmin"
                );

            const mentions =
              admins
                .map(p => getParticipantId(p))
                .filter(Boolean);

            let adminText =
`🛡️ *GROUP ADMINS*

`;

            if (admins.length === 0) {
              adminText +=
                "❌ Admin කෙනෙක් හමු වුණේ නැහැ.";
            } else {
              for (const admin of admins) {
                const id =
                  getParticipantId(admin);

                if (!id) continue;

                adminText +=
                  `👑 @${String(id).split("@")[0]}\n`;
              }
            }

            adminText +=
              "\n👑 MALIYA-X 🇱🇰";

            await sock.sendMessage(
              remoteJid,
              {
                text: adminText,
                mentions
              }
            );
          } catch (err) {
            console.log(
              "❌ Admin error:",
              err?.message || err
            );
          }

          return;
        }

        // =================================================
        // 🧮 CALCULATOR
        // =================================================

        if (cmd === ".calc") {
          if (!args) {
            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "Example: .calc 25 + 25"
              }
            );

            return;
          }

          try {
            const safe =
              args.replace(
                /[^0-9+\-*/().% ]/g,
                ""
              );

            if (!safe.trim()) {
              throw new Error("Invalid");
            }

            const result =
              Function(
                `"use strict"; return (${safe})`
              )();

            await sock.sendMessage(
              remoteJid,
              {
                text:
`🧮 *CALCULATOR*

➤ ${args}
➤ Result: *${result}*

👑 MALIYA-X 🇱🇰`
              }
            );
          } catch {
            await sock.sendMessage(
              remoteJid,
              {
                text:
                  "❌ Invalid calculation."
              }
            );
          }

          return;
        }

        // =================================================
        // 😂 JOKE
        // =================================================

        if (cmd === ".joke") {
          const jokes = [
            "😂 ගුරුවරයා: ගෙදර වැඩ කළාද?\nළමයා: සර් Wi-Fi තිබ්බේ නැහැ! 😂",

            "🤣 යාළුවා: උඹට මොනවද ඕනේ?\nමම: සල්ලි.\nයාළුවා: වෙන දෙයක්?\nමම: සල්ලි කිව්වනේ! 😂",

            "😂 අම්මා: Phone එකෙන් එළියට එන්න!\nමම: අම්මේ මේක තමයි මගේ ලෝකය! 🌍😂"
          ];

          const joke =
            jokes[
              Math.floor(
                Math.random() * jokes.length
              )
            ];

          await sock.sendMessage(
            remoteJid,
            {
              text:
`😂 *MALIYA-X JOKE*

${joke}

👑 MALIYA-X 🇱🇰`
            }
          );

          return;
        }

        // =================================================
        // 🌱 LIFE
        // =================================================

        if (cmd === ".life") {
          const messages = [
            "🌱 අද කරන පොඩි උත්සාහයක් හෙට ලොකු ජයග්‍රහණයක් වෙන්න පුළුවන්. අත්හරින්න එපා.",

            "💎 ඔබේ වටිනාකම තීරණය කරන්නේ අනිත් අය නොව ඔබේ ක්‍රියාවන්.",

            "🌈 අඳුරු කාලය සදාකාලික නැහැ. හිරු නැවත පායනවා.",

            "🕊️ ජීවිතය කෙටි නිසා වෛරයට වඩා ආදරයට ඉඩ දෙන්න."
          ];

          const message =
            messages[
              Math.floor(
                Math.random() *
                messages.length
              )
            ];

          await sock.sendMessage(
            remoteJid,
            {
              text:
`🌱 *ජීවිතයට වටිනා පණිවිඩයක්*

${message}

👑 MALIYA-X 🇱🇰`
            }
          );

          return;
        }

        // =================================================
        // 💪 MOTIVATE
        // =================================================

        if (cmd === ".motivate") {
          const messages = [
            "🔥 වැටුණත් නැගිටින්න. ජයග්‍රහණය ලැබෙන්නේ අත් නොහරින අයටයි.",

            "💪 අද අමාරු වුණත් හෙට ඒ උත්සාහය ගැන ඔබ ආඩම්බර වේවි.",

            "⚡ ඔබට පුළුවන්. ඔබ ඔබව විශ්වාස කරන්න."
          ];

          const message =
            messages[
              Math.floor(
                Math.random() *
                messages.length
              )
            ];

          await sock.sendMessage(
            remoteJid,
            {
              text:
`💪 *MOTIVATION*

${message}

👑 MALIYA-X 🇱🇰`
            }
          );

          return;
        }

        // =================================================
        // 📖 QUOTE
        // =================================================

        if (cmd === ".quote") {
          const quotes = [
            "📖 ජීවිතය වෙනස් වෙන්නේ ඔබ ගන්නා තීරණ වලින්.",

            "📖 අඳුර තිබුණත් ආලෝකයක් සොයන්න.",

            "📖 ඔබේ ගමන අනිත් අයගේ ගමන සමඟ සසඳන්න එපා."
          ];

          const quote =
            quotes[
              Math.floor(
                Math.random() *
                quotes.length
              )
            ];

          await sock.sendMessage(
            remoteJid,
            {
              text:
`📖 *QUOTE*

${quote}

👑 MALIYA-X 🇱🇰`
            }
          );

          return;
        }

        // =================================================
        // 🧠 FACT
        // =================================================

        if (cmd === ".fact") {
          const facts = [
            "🧠 මිනිස් මොළය විදුලි සංඥා භාවිතා කරමින් ක්‍රියා කරයි.",

            "🌍 පෘථිවියේ මතුපිටින් විශාල කොටසක් සාගරයෙන් ආවරණය වී ඇත.",

            "🐙 Octopus සතුන්ට හදවත් තුනක් තිබේ."
          ];

          const fact =
            facts[
              Math.floor(
                Math.random() *
                facts.length
              )
            ];

          await sock.sendMessage(
            remoteJid,
            {
              text:
`🧠 *DID YOU KNOW?*

${fact}

👑 MALIYA-X 🇱🇰`
            }
          );

          return;
        }

        // =================================================
        // 🎯 CHALLENGE
        // =================================================

        if (cmd === ".challenge") {
          const challenges = [
            "🎯 අද කෙනෙක්ට හොඳ වචනයක් කියන්න.",

            "🎯 විනාඩි 20ක් අලුත් දෙයක් ඉගෙන ගන්න.",

            "🎯 අද කෙනෙක්ට උදව් කරන්න.",

            "🎯 Phone එකෙන් විනාඩි 30ක් ඉවත් වෙලා ඔබේ අරමුණක් ගැන වැඩ කරන්න."
          ];

          const challenge =
            challenges[
              Math.floor(
                Math.random() *
                challenges.length
              )
            ];

          await sock.sendMessage(
            remoteJid,
            {
              text:
`🎯 *TODAY'S CHALLENGE*

${challenge}

🔥 ඔබට පුළුවන්!

👑 MALIYA-X 🇱🇰`
            }
          );

          return;
        }

        // =================================================
        // 🌅 MORNING
        // =================================================

        if (cmd === ".morning") {
          await sock.sendMessage(
            remoteJid,
            {
              text:
`🌅 *සුභ උදෑසනක් වේවා!*

අද දවස ඔබේ ජීවිතයේ
ලස්සනම දවසක් වේවා! ❤️

✨ හොඳින් සිතන්න.
✨ හොඳින් කරන්න.
✨ සතුටින් ඉන්න.

👑 MALIYA-X 🇱🇰`
            }
          );

          return;
        }

        // =================================================
        // 🌙 NIGHT
        // =================================================

        if (cmd === ".night") {
          await sock.sendMessage(
            remoteJid,
            {
              text:
`🌙 *සුභ රාත්‍රියක් වේවා!*

අද දවසේ සියලුම වෙහෙස
අමතක කරලා සුව නින්දක් ලබන්න. ❤️

හෙට අලුත් දවසක්! ✨

👑 MALIYA-X 🇱🇰`
            }
          );

          return;
        }

        // =================================================
        // ❤️ RESPECT
        // =================================================

        if (cmd === ".respect") {
          await sock.sendMessage(
            remoteJid,
            {
              text:
`❤️ *RESPECT*

අනිත් අයට ගරු කිරීම
ඔබේ වටිනාකම පෙන්වන
ලස්සනම ගුණාංගයක්. 🤝

👑 MALIYA-X 🇱🇰`
            }
          );

          return;
        }

        // =================================================
        // 🤝 FRIEND
        // =================================================

        if (cmd === ".friend") {
          await sock.sendMessage(
            remoteJid,
            {
              text:
`🤝 *FRIENDSHIP*

සැබෑ මිතුරෙක් කියන්නේ
සතුටේදී පමණක් නොව,
දුකේදීත් ළඟ සිටින කෙනෙක්. ❤️

👑 MALIYA-X 🇱🇰`
            }
          );

          return;
        }

      } catch (err) {
        console.log(
          "❌ Message handler error:",
          err?.message || err
        );
      }
    }
  );
}

// =====================================================
// START BOT
// =====================================================

startMaliya().catch((err) => {
  console.log(
    "❌ Fatal bot error:",
    err?.message || err
  );
});

// =====================================================
// GLOBAL ERROR LOGGING
// =====================================================

process.on("uncaughtException", (err) => {
  console.log(
    "❌ Uncaught Exception:",
    err?.message || err
  );
});

process.on("unhandledRejection", (err) => {
  console.log(
    "❌ Unhandled Rejection:",
    err?.message || err
  );
});
