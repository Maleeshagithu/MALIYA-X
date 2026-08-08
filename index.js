const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require("express");

// Render සඳහා අවශ්‍ය වෙබ් සර්වර් කොටස (Port Timeouts වළක්වා ගැනීමට)
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("MALIYA-X Bot is running successfully!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// WhatsApp Bot කොටස
async function startMaliya() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("╔══════════════════════════════╗");
      console.log("║        👑 MALIYA-X 🇱🇰        ║");
      console.log("║      WhatsApp Bot Online     ║");
      console.log("╚══════════════════════════════╝");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("🔄 Reconnecting MALIYA-X...");
        startMaliya();
      } else {
        console.log("❌ Logged out. Pair again.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg?.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (text.toLowerCase() === ".ping") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "🏓 Pong!\n\n👑 MALIYA-X 🇱🇰\n⚡ Bot Online"
      });
    }

    if (text.toLowerCase() === ".menu") {
      await sock.sendMessage(msg.key.remoteJid, {
        text:
`╭━━━〔 👑 MALIYA-X 🇱🇰 〕━━━╮
┃
┃ 🌱 .life
┃ 💪 .motivate
┃ 📖 .quote
┃ 🧠 .fact
┃ 🎯 .challenge
┃
┃ 🌅 .morning
┃ 🌙 .night
┃ ❤️ .respect
┃ 🤝 .friend
┃
┃ ⚡ .ping
┃ 📋 .menu
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
      });
    }

    if (text.toLowerCase() === ".life") {
      const messagesList = [
        "🌱 අද කරන කුඩා උත්සාහය හෙට ලොකු ජයග්‍රහණයක් වෙන්න පුළුවන්.",
        "🌈 අමාරු කාලය සදාකාලික නෑ. හොඳ දවස් නැවත එනවා.",
        "💎 ඔබේ වටිනාකම අන් අයගේ අදහස් වලින් තීරණය වෙන්නේ නෑ.",
        "🔥 වැටුණාට කමක් නෑ. නැවත නැගිටින්න අමතක කරන්න එපා.",
        "🌸 අන් අයට යහපත කරන්න. ඒක ඔබේ ජීවිතයත් ලස්සන කරනවා.",
        "🕊️ අතීතයෙන් පාඩම් ගන්න. නමුත් අතීතයේ ජීවත් වෙන්න එපා.",
        "💪 ඔබ ඊයේට වඩා අද ටිකක් හොඳ නම්, ඔබ දැනටමත් ඉදිරියට යනවා."
      ];

      const random =
        messagesList[Math.floor(Math.random() * messagesList.length)];

      await sock.sendMessage(msg.key.remoteJid, {
        text: `🌿 *MALIYA-X | අද ජීවිත පාඩම*\n\n${random}\n\n👑 MALIYA-X 🇱🇰`
      });
    }
  });
}

startMaliya();
