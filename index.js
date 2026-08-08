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

// WhatsApp Bot කොටස (Pairing Code සමඟ)
async function startMaliya() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Chrome") // Desktop බ්‍රව්සර් එකක් ලෙස සටහන් වේ
  });

  // ඔබගේ දුරකථන අංකයෙන් Pairing Code එක ලබාගැනීමට අවශ්‍ය නම් මෙහි ඔබේ අංකය දෙන්න (රටේ කේතය සමඟ, උදා: 9477xxxxxxx)
  // නැතහොත් ස්වයංක්‍රීයව කෝඩ් එක ඉල්ලීමට පල්ලිය පහත කෝඩ් එක පාවිච්චි කළ හැක:
  if (!sock.authState.creds.registered) {
    const phoneNumber = "94770678992"; // මෙහි ඔබේ WhatsApp අංකය ලියන්න (අත්‍යවශ්‍ය නම් පමණි, නැතහොත් ලොග්ස් වලින් බලාගත හැක)
    // සටහන: අංකය දීමට අවශ්‍ය නැත, ලොග්ස් හරහා හෝ ස්වයංක්‍රීයව කෝඩ් එක ජෙනරේට් වීමට සැලැස්විය හැක.
  }

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

  // Pairing Code එක ලබාගැනීම සඳහා විශේෂ ක්‍රමයක්
  setTimeout(async () => {
    if (!sock.authState.creds.registered) {
      const phoneNumber = "94770678992"; // මෙහි ඔබේ WhatsApp අංකය දමන්න (උදා: 94712345678)
      if (phoneNumber && phoneNumber.length > 5) {
        try {
          let code = await sock.requestPairingCode(phoneNumber);
          console.log(`\n========================================`);
          console.log(`🔑 YOUR PAIRING CODE IS: ${code}`);
          console.log(`========================================\n`);
        } catch (err) {
          console.log("Error getting pairing code:", err);
        }
      }
    }
  }, 3000);

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
