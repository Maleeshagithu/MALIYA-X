const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require("express");

// Render සඳහා අවශ්‍ය වෙබ් සර්වර් කොටස
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
    browser: Browsers.macOS("Chrome")
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
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

  // Pairing Code එක ලබාගැනීම
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const phoneNumber = "94770678992";
        let code = await sock.requestPairingCode(phoneNumber);
        console.log(`\n========================================`);
        console.log(`🔑 YOUR PAIRING CODE IS: ${code}`);
        console.log(`========================================\n`);
      } catch (err) {
        console.log("Error getting pairing code:", err);
      }
    }, 4000);
  }

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    // මෙහි තිබූ 'msg.key.fromMe' පරීක්ෂාව ඉවත් කර ඇත, 
    // දැන් ඔබට ඔබේම අංකයෙන්ද (Message yourself) බොට් පරීක්ෂා කරගත හැක.
    if (!msg?.message) return;

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
