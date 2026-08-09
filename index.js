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

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("MALIYA-X Bot is running successfully! 👑🇱🇰");
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

const AUTH_DIR = "./auth_info";
let reconnecting = false;

function getSriLankaDateTime() {
  const now = new Date();
  return {
    date: now.toLocaleDateString("en-GB", { timeZone: "Asia/Colombo" }),
    time: now.toLocaleTimeString("en-US", {
      timeZone: "Asia/Colombo",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    })
  };
}

function cleanPhoneNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

async function startMaliya() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      browser: Browsers.macOS("Chrome"),
      markOnlineOnConnect: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
      if (connection === "connecting") {
        console.log("🔄 MALIYA-X connecting...");
      }

      if (connection === "open") {
        reconnecting = false;
        console.log("╔══════════════════════════════╗");
        console.log("║        👑 MALIYA-X 🇱🇰       ║");
        console.log("║     WhatsApp Bot ONLINE      ║");
        console.log("╚══════════════════════════════╝");
      }

      if (connection === "close") {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode ??
          lastDisconnect?.error?.statusCode;

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`⚠️ Connection closed. Status: ${statusCode || "unknown"}`);

        if (shouldReconnect && !reconnecting) {
          reconnecting = true;
          console.log("🔄 Reconnecting MALIYA-X...");
          setTimeout(() => {
            reconnecting = false;
            startMaliya().catch(console.error);
          }, 5000);
        } else if (!shouldReconnect) {
          console.log("❌ WhatsApp logged out. Pair this account again.");
        }
      }
    });

    // Pair only when this auth state has never been registered.
    // PHONE_NUMBER must be set in Render Environment Variables.
    if (!state.creds.registered) {
      setTimeout(async () => {
        try {
          const phoneNumber = cleanPhoneNumber(process.env.PHONE_NUMBER);

          if (!phoneNumber) {
            console.log("❌ PHONE_NUMBER is missing in Render Environment Variables.");
            return;
          }

          console.log(`📱 Requesting pairing code for ${phoneNumber}...`);

          const code = await sock.requestPairingCode(phoneNumber);

          console.log("");
          console.log("========================================");
          console.log("👑 MALIYA-X 🇱🇰");
          console.log(`🔑 YOUR PAIRING CODE: ${code}`);
          console.log("========================================");
          console.log("");
        } catch (err) {
          console.error("❌ Pairing code error:", err?.message || err);
        }
      }, 5000);
    }

    // WELCOME / GOODBYE
    sock.ev.on("group-participants.update", async (anu) => {
      try {
        const metadata = await sock.groupMetadata(anu.id);
        const { date, time } = getSriLankaDateTime();

        for (const num of anu.participants) {
          const tag = `@${num.split("@")[0]}`;

          if (anu.action === "add") {
            const welcomeText = `🌟✨ *MALIYA-X | සාදරයෙන් පිළිගනිමු!* ✨🌟

ආයුබෝවන් ${tag}! 🙏💖
*${metadata.subject}* සමූහයට ඔයාව ආදරයෙන් පිළිගන්නවා. 🌸

📌 සමූහයේ නීති රකින්න
🤝 හැමෝටම ගරු කරන්න
✨ සතුටින් එකතු වෙලා ඉන්න

📅 ${date}
⏰ ${time}

👑 *Powered by MALIYA-X 🇱🇰*`;

            await sock.sendMessage(anu.id, {
              text: welcomeText,
              mentions: [num]
            });
          }

          if (anu.action === "remove") {
            const goodbyeText = `👋 *MALIYA-X | සුභ ගමන්!* 👋

${tag} සමූහයෙන් ඉවත් වී ඇත. ❌

ඔබ අප සමඟ සිටි කාලයට ස්තූතියි. 💙
ඔබගේ ඉදිරි කටයුතු සාර්ථක වේවා! 🍀

📅 ${date}
⏰ ${time}

👑 *Powered by MALIYA-X 🇱🇰*`;

            await sock.sendMessage(anu.id, {
              text: goodbyeText,
              mentions: [num]
            });
          }
        }
      } catch (err) {
        console.error("❌ Welcome/Goodbye error:", err?.message || err);
      }
    });

    // COMMAND HANDLER
    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        const msg = messages?.[0];
        if (!msg?.message) return;

        const remoteJid = msg.key.remoteJid;
        if (!remoteJid) return;

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          "";

        if (!text.trim()) return;

        const parts = text.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1).join(" ");
        const pushName = msg.pushName || "User";
        const { date, time } = getSriLankaDateTime();

        // .ping
        if (cmd === ".ping") {
          await sock.sendMessage(remoteJid, {
            text: `🏓 *PONG!*

👑 MALIYA-X 🇱🇰
⚡ Bot Online & Ready
📅 ${date}
⏰ ${time}`
          });
          return;
        }

        // .menu
        if (cmd === ".menu") {
          await sock.sendMessage(remoteJid, {
            text: `╭━━━〔 👑 *MALIYA-X 🇱🇰* 〕━━━╮
┃
┃ 👋 ආයුබෝවන් *${pushName}*!
┃ ⚡ *WhatsApp Bot Menu*
┃
┣━━〔 📥 DOWNLOADS 〕━━
┃ 🎵 .song <name>
┃ 🎬 .ytdl <name/link>
┃ 📱 .social <link>
┃ 🧩 .sticker
┃
┣━━〔 🤖 TOOLS 〕━━
┃ 🤖 .ai <question>
┃ 🧮 .calc <math>
┃ 🕒 .time
┃
┣━━〔 👥 GROUP 〕━━
┃ 👥 .groupinfo
┃ 📢 .tagall <message>
┃ 🛡️ .admin
┃
┣━━〔 🌱 LIFE & FUN 〕━━
┃ 🌱 .life
┃ 💪 .motivate
┃ 📖 .quote
┃ 🧠 .fact
┃ 😂 .joke
┃ 🎯 .challenge
┃ 🌅 .morning
┃ 🌙 .night
┃ ❤️ .respect
┃ 🤝 .friend
┃
╰━━━━━━━━━━━━━━━━━━╯
📅 ${date} | ⏰ ${time}

👑 *MALIYA-X — Sri Lankan WhatsApp Bot* 🇱🇰`
          });
          return;
        }

        // .time
        if (cmd === ".time") {
          await sock.sendMessage(remoteJid, {
            text: `🕒 *MALIYA-X TIME*

📅 දිනය: ${date}
⏰ වේලාව: ${time}
🌏 Timezone: Asia/Colombo

👑 MALIYA-X 🇱🇰`
          });
          return;
        }

        // .song
        if (cmd === ".song" || cmd === ".audio") {
          if (!args) {
            await sock.sendMessage(remoteJid, {
              text: "❌ සින්දුවේ නම දෙන්න.\n\nඋදා: `.song Manike Mage Hithe`"
            });
            return;
          }

          try {
            await sock.sendMessage(remoteJid, {
              text: "🔎 සින්දුව සොයමින්... ⏳"
            });

            const search = await ytSearch(args);
            const video = search.videos?.[0];

            if (!video) {
              await sock.sendMessage(remoteJid, {
                text: "❌ සින්දුව හමු වුණේ නැහැ."
              });
              return;
            }

            const api =
              `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(video.url)}`;

            const res = await axios.get(api, { timeout: 30000 });
            const url = res.data?.result?.download_url;

            if (!url) {
              await sock.sendMessage(remoteJid, {
                text: "❌ Audio download link එක ලැබුණේ නැහැ."
              });
              return;
            }

            await sock.sendMessage(remoteJid, {
              audio: { url },
              mimetype: "audio/mp4",
              ptt: false
            });
          } catch (err) {
            console.error("Song error:", err?.message || err);
            await sock.sendMessage(remoteJid, {
              text: "❌ Song download කිරීමේදී දෝෂයක් ඇති වුණා."
            });
          }
          return;
        }

        // .ytdl
        if (cmd === ".ytdl" || cmd === ".video") {
          if (!args) {
            await sock.sendMessage(remoteJid, {
              text: "❌ YouTube නමක් හෝ link එකක් දෙන්න.\n\nඋදා: `.ytdl Manike Mage Hithe`"
            });
            return;
          }

          try {
            await sock.sendMessage(remoteJid, {
              text: "📥 Video එක සූදානම් කරමින්... ⏳"
            });

            const search = await ytSearch(args);
            const video = search.videos?.[0];

            if (!video) {
              await sock.sendMessage(remoteJid, {
                text: "❌ Video එක හමු වුණේ නැහැ."
              });
              return;
            }

            const api =
              `https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(video.url)}`;

            const res = await axios.get(api, { timeout: 30000 });
            const url = res.data?.result?.download_url;

            if (!url) {
              await sock.sendMessage(remoteJid, {
                text: "❌ Video download link එක ලැබුණේ නැහැ."
              });
              return;
            }

            await sock.sendMessage(remoteJid, {
              video: { url },
              caption: `🎬 *${video.title}*\n\n👑 MALIYA-X 🇱🇰`
            });
          } catch (err) {
            console.error("Video error:", err?.message || err);
            await sock.sendMessage(remoteJid, {
              text: "❌ Video download කිරීමේදී දෝෂයක් ඇති වුණා."
            });
          }
          return;
        }

        // .social
        if (cmd === ".social" || cmd === ".dl") {
          if (!args) {
            await sock.sendMessage(remoteJid, {
              text: "❌ TikTok / Instagram / Facebook link එක දෙන්න.\n\nඋදා: `.social https://...`"
            });
            return;
          }

          try {
            await sock.sendMessage(remoteJid, {
              text: "📥 Social media video එක download කරමින්... ⏳"
            });

            const api =
              `https://apis.davidcyriltech.my.id/download/all?url=${encodeURIComponent(args)}`;

            const res = await axios.get(api, { timeout: 30000 });
            const result = res.data?.result;
            const url = result?.url || result?.download_url || result?.video;

            if (!url) {
              await sock.sendMessage(remoteJid, {
                text: "❌ Download link එක හමු වුණේ නැහැ."
              });
              return;
            }

            await sock.sendMessage(remoteJid, {
              video: { url },
              caption: "🎥 *MALIYA-X Social Downloader* 🇱🇰"
            });
          } catch (err) {
            console.error("Social error:", err?.message || err);
            await sock.sendMessage(remoteJid, {
              text: "❌ Social media download කිරීමේදී දෝෂයක් ඇති වුණා."
            });
          }
          return;
        }

        // .sticker
        if (cmd === ".sticker" || cmd === ".s") {
          try {
            const image = msg.message.imageMessage;
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedImage = quoted?.imageMessage;

            if (!image && !quotedImage) {
              await sock.sendMessage(remoteJid, {
                text: "❌ Image එකකට reply කරලා `.sticker` කියලා දාන්න."
              });
              return;
            }

            const imageMessage = image || quotedImage;
            const stream = await downloadContentFromMessage(imageMessage, "image");

            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);

            const buffer = Buffer.concat(chunks);

            await sock.sendMessage(
              remoteJid,
              { sticker: buffer },
              { quoted: msg }
            );
          } catch (err) {
            console.error("Sticker error:", err?.message || err);
            await sock.sendMessage(remoteJid, {
              text: "❌ Sticker එක හදන්න බැරි වුණා."
            });
          }
          return;
        }

        // .ai
        if (cmd === ".ai") {
          if (!args) {
            await sock.sendMessage(remoteJid, {
              text: "❌ AI question එක දෙන්න.\n\nඋදා: `.ai ශ්‍රී ලංකාව ගැන කියන්න`"
            });
            return;
          }

          try {
            await sock.sendMessage(remoteJid, {
              text: "🤖 AI පිළිතුර සූදානම් කරමින්... ⏳"
            });

            const api =
              `https://apis.davidcyriltech.my.id/ai/gemini?query=${encodeURIComponent(args)}`;

            const res = await axios.get(api, { timeout: 30000 });
            const answer =
              res.data?.result ||
              res.data?.message ||
              "සමාවන්න, පිළිතුරක් ලබාගන්න බැරි වුණා.";

            await sock.sendMessage(remoteJid, {
              text: `🤖 *MALIYA-X AI*

${answer}

👑 MALIYA-X 🇱🇰`
            });
          } catch (err) {
            console.error("AI error:", err?.message || err);
            await sock.sendMessage(remoteJid, {
              text: "❌ AI service එකට සම්බන්ධ වෙන්න බැරි වුණා."
            });
          }
          return;
        }

        // Group commands
        if (cmd === ".groupinfo") {
          if (!remoteJid.endsWith("@g.us")) {
            await sock.sendMessage(remoteJid, {
              text: "❌ මේ command එක Group එකකදී පමණයි."
            });
            return;
          }

          const group = await sock.groupMetadata(remoteJid);

          await sock.sendMessage(remoteJid, {
            text: `╭━━〔 👥 *GROUP INFO* 〕━━╮
┃ 📛 නම: ${group.subject}
┃ 👥 Members: ${group.participants.length}
╰━━━━━━━━━━━━━━━━╯

👑 MALIYA-X 🇱🇰`
          });
          return;
        }

        if (cmd === ".tagall") {
          if (!remoteJid.endsWith("@g.us")) {
            await sock.sendMessage(remoteJid, {
              text: "❌ මේ command එක Group එකකදී පමණයි."
            });
            return;
          }

          const group = await sock.groupMetadata(remoteJid);
          const mentions = group.participants.map(p => p.id);

          let textOut =
            `📢 *MALIYA-X | විශේෂ දැනුම්දීමක්!*\n\n${args || "සැමගේ අවධානය පිණිසයි!"}\n\n`;

          textOut += group.participants
            .map(p => `@${p.id.split("@")[0]}`)
            .join(" ");

          await sock.sendMessage(remoteJid, {
            text: textOut,
            mentions
          });
          return;
        }

        if (cmd === ".admin") {
          if (!remoteJid.endsWith("@g.us")) {
            await sock.sendMessage(remoteJid, {
              text: "❌ මේ command එක Group එකකදී පමණයි."
            });
            return;
          }

          const group = await sock.groupMetadata(remoteJid);
          const admins = group.participants
            .filter(p => p.admin)
            .map(p => p.id);

          if (!admins.length) {
            await sock.sendMessage(remoteJid, {
              text: "❌ Admins හමු වුණේ නැහැ."
            });
            return;
          }

          const adminText =
            "🛡️ *MALIYA-X | GROUP ADMINS*\n\n" +
            admins.map(id => `👑 @${id.split("@")[0]}`).join("\n");

          await sock.sendMessage(remoteJid, {
            text: adminText,
            mentions: admins
          });
          return;
        }

        // .calc
        if (cmd === ".calc") {
          if (!args) {
            await sock.sendMessage(remoteJid, {
              text: "❌ ගණිත expression එක දෙන්න.\nඋදා: `.calc 25 + 25`"
            });
            return;
          }

          try {
            const safe = args.replace(/[^0-9+\-*/().% ]/g, "").trim();

            if (!safe) throw new Error("Invalid");

            // Safe enough for the restricted character set above.
            const result = Function(`"use strict"; return (${safe})`)();

            await sock.sendMessage(remoteJid, {
              text: `🧮 *CALCULATOR*

❓ ${args}
✅ Result: *${result}*

👑 MALIYA-X 🇱🇰`
            });
          } catch {
            await sock.sendMessage(remoteJid, {
              text: "❌ වැරදි ගණිත expression එකක්."
            });
          }
          return;
        }

        const lists = {
          ".joke": [
            "😂 අදත් හිනාවෙලා ඉමු! ජීවිතේට password එකක් තිබුණා නම් 'happiness' දාමු.",
            "😂 යාළුවා: උඹට Wi-Fi තියෙනවද? මම: තියෙනවා. යාළුවා: Password? මම: මුලින් tea එකක් අරන් එන්න!"
          ],
          ".life": [
            "🌱 අද කරන කුඩා උත්සාහය හෙට ලොකු ජයග්‍රහණයක ආරම්භය වෙන්න පුළුවන්. අත්හරින්න එපා!",
            "🌈 අමාරු කාලය සදාකාලික නැහැ. වැස්සෙන් පස්සේ හිරු එළිය එනවා.",
            "💎 ඔබේ වටිනාකම තීරණය කරන්නේ අන් අයගේ අදහස් නොව ඔබේ ක්‍රියාවන්."
          ],
          ".motivate": [
            "🔥 හෙමින් ගියත් කමක් නැහැ. නවතින්න එපා!",
            "⚡ අද ඔබ කරන කැපවීම හෙට ඔබේ ජයග්‍රහණය වෙන්න පුළුවන්."
          ],
          ".quote": [
            "📖 ජීවිතයේ හොඳම දේවල් බොහෝවිට ලැබෙන්නේ අත් නොහැරපු මිනිසුන්ටයි.",
            "📖 ඔබේ අනාගතය වෙනස් කරන්න පුළුවන් හොඳම දවස අදයි."
          ],
          ".fact": [
            "🧠 මිනිස් මොළය ඉතා සංකීර්ණ ජීව විද්‍යාත්මක පද්ධතියක් වන අතර එහි නියුරෝන බිලියන ගණනක් ඇත.",
            "🌍 පෘථිවියේ සාගරවලින් විශාල කොටසක් තවමත් සම්පූර්ණයෙන් ගවේෂණය කර නැහැ."
          ],
          ".challenge": [
            "🎯 අද කෙනෙකුට ඔහු/ඇය බලාපොරොත්තු නොවූ හොඳ වචනයක් කියන්න.",
            "🎯 අද විනාඩි 20ක් අලුත් දෙයක් ඉගෙනගන්න."
          ]
        };

        if (lists[cmd]) {
          const list = lists[cmd];
          const random = list[Math.floor(Math.random() * list.length)];

          await sock.sendMessage(remoteJid, {
            text: `${random}

👑 *MALIYA-X 🇱🇰*`
          });
          return;
        }

        if (cmd === ".morning") {
          await sock.sendMessage(remoteJid, {
            text: `🌅 *සුභ උදෑසනක් වේවා!*

අද දවස ඔබට සතුට, සාර්ථකත්වය සහ හොඳ අවස්ථා ගෙන එන්නට වේවා. 💖✨

👑 MALIYA-X 🇱🇰`
          });
          return;
        }

        if (cmd === ".night") {
          await sock.sendMessage(remoteJid, {
            text: `🌙 *සුභ රාත්‍රියක් වේවා!*

අද දවසේ සියලුම වෙහෙස අමතක කරලා සුව නින්දක් ලබන්න. 💤✨

👑 MALIYA-X 🇱🇰`
          });
          return;
        }

        if (cmd === ".respect") {
          await sock.sendMessage(remoteJid, {
            text: `❤️ *Respect* කියන්නේ වචනයක් විතරක් නෙවෙයි.
අන් අයට ගරු කරන එක ඔබේ වටිනාකම පෙන්වන දෙයක්. 🤝

👑 MALIYA-X 🇱🇰`
          });
          return;
        }

        if (cmd === ".friend") {
          await sock.sendMessage(remoteJid, {
            text: `🤝 සැබෑ මිතුරෙක් කියන්නේ සතුටේදී විතරක් නොව, අමාරු වෙලාවේත් ළඟින් ඉන්න කෙනෙක්. 💙

👑 MALIYA-X 🇱🇰`
          });
          return;
        }

      } catch (err) {
        console.error("❌ Message handler error:", err?.message || err);
      }
    });

  } catch (err) {
    console.error("❌ Fatal start error:", err?.message || err);
    setTimeout(() => startMaliya().catch(console.error), 10000);
  }
}

startMaliya().catch(console.error);
