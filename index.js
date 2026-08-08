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

  // --- WELCOME & GOODBYE ---
  sock.ev.on("group-participants.update", async (anu) => {
    try {
      const metadata = await sock.groupMetadata(anu.id);
      const participants = anu.participants;
      
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB");
      const timeStr = now.toLocaleTimeString("en-US", { timeZone: "Asia/Colombo" });

      for (let num of participants) {
        if (anu.action === "add") {
          const welcomeText = 
`🌟✨ *සමූහය වෙත සාදරයෙන් පිළිගනිමු!* ✨🌟

ආයුබෝවන් මිත්‍රයා @${num.split("@")[0]}! 🙏
ඔබ **${metadata.subject}** සමූහය වෙත ඉතා ආදරයෙන් සහ ගෞරවයෙන් පිළිගනිමු. 🌸

අපගේ සමූහයේ නීති රීති රකිමින්, හැමෝම සමඟ එකතු වී සතුටින් කාලය ගත කරන්න අපි ඔබට ආරාධනා කරන්නෙමු. ඔබේ පැමිණීම අපට මහත් සතුටකි! 💫

📅 දිනය: ${dateStr}
⏱️ වේලාව: ${timeStr}

👑 *Powered by MALIYA-X Bot 🇱🇰*`;
          
          await sock.sendMessage(anu.id, { text: welcomeText, mentions: [num] });
        }

        if (anu.action === "remove") {
          const byeText = 
`👋 *සුභ පැතුම් සහ සමුගැනීම!* 👋

සමූහයෙන් ඉවත් විය: @${num.split("@")[0]} ❌

ඔබ අප සමඟ ගත කළ කාලයට ස්තූතියි! ඔබේ අනාගත කටයුතු සියල්ල සාර්ථක වේවා කියා අප හදවතින්ම ප්‍රාර්ථනා කරමු. නැවත හමුවෙන තුරු ඔබට සුභ දවසක්! 🍀

📅 දිනය: ${dateStr}
⏱️ වේලාව: ${timeStr}

👑 *Powered by MALIYA-X Bot 🇱🇰*`;

          await sock.sendMessage(anu.id, { text: byeText, mentions: [num] });
        }
      }
    } catch (err) {
      console.log("Error in welcome/goodbye:", err);
    }
  });

  // --- MESSAGES HANDLER ---
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const cmd = text.toLowerCase().split(" ")[0];
    const args = text.split(" ").slice(1).join(" ");
    const remoteJid = msg.key.remoteJid;

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB");
    const timeStr = now.toLocaleTimeString("en-US", { timeZone: "Asia/Colombo" });

    // 1. .ping
    if (cmd === ".ping") {
      await sock.sendMessage(remoteJid, {
        text: `🏓 Pong!\n\n👑 MALIYA-X 🇱🇰\n⚡ Bot Online & Ready\n📅 ${dateStr} | ⏱️ ${timeStr}`
      });
    }

    // 2. .menu (නව කමාන්ඩ් සමඟ යාවත්කාලීන කළ මෙනුව)
    if (cmd === ".menu") {
      const menuLogoUrl = "https://raw.githubusercontent.com/Maleeshagithu/MALIYA-X/main/image_10.png";

      await sock.sendMessage(remoteJid, {
        image: { url: menuLogoUrl },
        caption: 
`┏━━━ 👑 *MALIYA-X ULTIMATE* 👑 ━━━┓
┃ ✨ *BEYOND LIMITS. DOMINATE.*
┗━━━━━━━━━━━━━━━━━━━━━━┛

📅 *දිනය:* ${dateStr}
⏱️ *වේලාව:* ${timeStr}

📌 *[ GROUPS COMMANDS ]*
  🔹 \`.groupinfo\` - ගෘප් විස්තර බැලීමට
  🔹 \`.tagall\` - හැමෝම එකවර ටැග් කිරීමට
  🔹 \`.admin\` - ඇඩ්මින්වරුන් ඇමතීමට

👤 *[ ME & TOOLS ]*
  🔹 \`.ping\` - බොට් ක්‍රියාකාරීත්වය පරීක්ෂා කිරීමට
  🔹 \`.time\` - වත්මන් දිනය සහ වේලාව
  🔹 \`.calc <ගණිතය>\` - ගණන් හැදීමට (උදා: .calc 5+5)

🤝 *[ FRIENDS & WISHES ]*
  🔹 \`.morning\` - සුභ උදෑසනක්
  🔹 \`.night\` - සුභ රාත්‍රියක්
  🔹 \`.respect\` - ගෞරවය දැක්වීම
  🔹 \`.friend\` - මිත්‍රත්වයේ අගය

🌱 *[ දවසේ සිතුවිලි & විනෝදය ]*
  🔹 \`.life\` - ජීවිත පාඩමක්
  🔹 \`.motivate\` - අභිප්‍රේරණ වදන්
  🔹 \`.quote\` - විශේෂ උපුටා දැක්වීමක්
  🔹 \`.fact\` - විද්‍යාත්මක සත්‍යයක්
  🔹 \`.joke\` - විහිළු කතාවක් බැලීමට
  🔹 \`.challenge\` - අද දින අභියෝගය

┏━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🚀 *Powered by MALIYA-X* 🇱🇰
┗━━━━━━━━━━━━━━━━━━━━━━┛`
      });
    }

    // 3. .time
    if (cmd === ".time") {
      await sock.sendMessage(remoteJid, {
        text: `🕒 *වත්මන් දිනය සහ වේලාව:* \n\n📅 දිනය: ${dateStr}\n⏱️ වේලාව: ${timeStr}\n\n👑 MALIYA-X Bot 🇱🇰`
      });
    }

    // 4. .groupinfo
    if (cmd === ".groupinfo") {
      if (!remoteJid.endsWith("@g.us")) {
        await sock.sendMessage(remoteJid, { text: "❌ මෙම කමාන්ඩ් එක භාවිතා කළ හැක්කේ ගෘප් එකක් තුළ පමණි!" });
        return;
      }
      const groupMetadata = await sock.groupMetadata(remoteJid);
      await sock.sendMessage(remoteJid, {
        text: 
`╭━━━〔 👥 *සමූහයේ තොරතුරු* 〕━━━╮
┃
┃ 📛 නම: ${groupMetadata.subject}
┃ 🆔 ID: ${groupMetadata.id}
┃ 👥 සාමාජිකයන් ගණන: ${groupMetadata.participants.length}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━╯`
      });
    }

    // 5. .tagall
    if (cmd === ".tagall") {
      if (!remoteJid.endsWith("@g.us")) {
        await sock.sendMessage(remoteJid, { text: "❌ මෙම කමාන්ඩ් එක ගෘප් එකක පමණක් ක්‍රියාත්මක වේ!" });
        return;
      }
      const groupMetadata = await sock.groupMetadata(remoteJid);
      const participants = groupMetadata.participants;
      const mentions = participants.map(p => p.id);

      await sock.sendMessage(remoteJid, { 
        text: `📢 *සැමටයි විශේෂ දැනුම්දීමයි!*\n\n📝 පණිවිඩය: ${args || "සැමගේ අවධානය පිණිසයි!"}\n\n⚡ MALIYA-X Bot`, 
        mentions: mentions 
      });
    }

    // 6. .admin (ඇඩ්මින්වරුන් ටැග් කිරීමට)
    if (cmd === ".admin") {
      if (!remoteJid.endsWith("@g.us")) {
        await sock.sendMessage(remoteJid, { text: "❌ මෙම කමාන්ඩ් එක ගෘප් එකක පමණක් ක්‍රියාත්මක වේ!" });
        return;
      }
      const groupMetadata = await sock.groupMetadata(remoteJid);
      const admins = groupMetadata.participants.filter(v => v.admin !== null).map(v => v.id);
      
      let adminText = "🛡️ *සමූහයේ ඇඩ්මින්වරුන් කැඳවීමක්!* 🛡️\n\n";
      for (let adm of admins) {
        adminText += `👑 @${adm.split("@")[0]}\n`;
      }

      await sock.sendMessage(remoteJid, { text: adminText, mentions: admins });
    }

    // 7. .calc (ගණනය කිරීම් සඳහා - උදා: .calc 50+50)
    if (cmd === ".calc") {
      if (!args) {
        await sock.sendMessage(remoteJid, { text: "❌ කරුණාකර ගණිත ගැටළුවක් ලබා දෙන්න!\nඋදාහරණයක් ලෙස: `.calc 25 + 25`" });
        return;
      }
      try {
        // ආරක්ෂිතව ගණිතමය සමීකරණ විසඳීම
        let sanitized = args.replace(/[^0-9+\-*/().]/g, '');
        let result = eval(sanitized);
        await sock.sendMessage(remoteJid, { text: `🧮 *ගණනය කිරීමේ ප්‍රතිඵලය*\n\nپرسමණය: ${args}\nउत्तर / Result: *${result}*\n\n👑 MALIYA-X 🇱🇰` });
      } catch (e) {
        await sock.sendMessage(remoteJid, { text: "❌ අයෝග්‍ය ගණිතමය ප්‍රකාශනයකි! කරුණාකර නිවැරදිව ලබා දෙන්න." });
      }
    }

    // 8. .joke (විහිළු කතා)
    if (cmd === ".joke") {
      const jokesList = [
        "😂 ගුරුවරුන් ඇහුවාම 'ගෙදර වැඩ කළේ නැද්ද?' කියලා, ළමයා කිව්වා 'සර්, ඒක පෞද්ගලික ප්‍රශ්නයක්' කියලා!",
        "😂 මගියා: 'කොන්දොස්තර මහත්තයා, මට මරදානට ටිකට් එකක් දෙන්න.' කොන්දොස්තර: 'අපි යන්නේ මහරගම බස් එකක!'",
        "😂 යාළුවෙක් කිව්වා 'මම ලෝකයේ දක්ෂම මෝඩයා' කියලා. මම කිව්වා 'ඒක බොරු, මමයි ඒකේ චූම්පියන්' කියලා!"
      ];
      const randomJoke = jokesList[Math.floor(Math.random() * jokesList.length)];
      await sock.sendMessage(remoteJid, { text: `🎭 *MALIYA-X | විහිළු තහළු*\n\n${randomJoke}\n\n👑 MALIYA-X 🇱🇰` });
    }

    // 9. .life
    if (cmd === ".life") {
      const list = [
        "🌱 අද කරන කුඩා උත්සාහය හෙට දවසේ ලොකුම ජයග්‍රහණයේ පදනම වැටෙන්න පුළුවන්. උත්සාහය අත්හරින්න එපා!",
        "🌈 කොතරම් අමාරු කාලයක් ආවත් එය සදාකාලික නැත. අඳුරු වැහි කුණාටුවෙන් පසු හිරු එළිය නැවතත් පෑදෙයි.",
        "💎 ඔබේ සැබෑ වටිනාකම තීරණය වන්නේ අන් අයගේ අදහස් මත නොව, ඔබේ ක්‍රියාවන් සහ ආත්ම විශ්වාසය මතය.",
        "🔥 ජීවිතයේ වැටීම් ස්වභාවිකය; වැදගත් වන්නේ වැටුණු වාරයක් පාසා වඩාත් ශක්තිමත්ව නැගී සිටීමයි."
      ];
      const random = list[Math.floor(Math.random() * list.length)];
      await sock.sendMessage(remoteJid, { text: `🌿 *MALIYA-X | දවසේ ජීවිත පාඩම*\n\n${random}\n\n👑 MALIYA-X 🇱🇰` });
    }

    // 10. .motivate
    if (cmd === ".motivate") {
      const list = [
        "🔥 සාර්ථකත්වයට කෙටිමං නැත; ඇත්තේ දැඩි කැපවීම, නොපසුබස්නා උත්සාහය සහ නොසැලෙන අරමුණකි.",
        "⚡ ඔබ ඔබටම සම්පූර්ණයෙන්ම විශ්වාසය තබන තාක් කල්, ඔබට ජයග්‍රහණය කළ නොහැකි කිසිදු බාධකයක් නොමැත.",
        "🚀 ජීවිතයේ ඔබට හමුවන අභියෝග යනු ඔබව දුර්වල කිරීමට නොව, ඔබේ සැබෑ හැකියාව ඔප්නංවා ගැනීමට ලැබෙන අවස්ථා වේ."
      ];
      const random = list[Math.floor(Math.random() * list.length)];
      await sock.sendMessage(remoteJid, { text: `💪 *MALIYA-X | සිතට එළියක් (අභිප්‍රේරණය)*\n\n${random}\n\n👑 MALIYA-X 🇱🇰` });
    }

    // 11. .quote
    if (cmd === ".quote") {
      const list = [
        "📖 'ජීවිතය යනු අනන්ත වූ තෝරාගැනීම් මාලාවකි. ඔබ අද කරන නිවැරදි තෝරාගැනීම ඔබේ අනාගතය හැඩගස්වනු ඇත.'",
        "📖 'අන් අයට ආලෝකයක් වීමට අවශ්‍ය නම්, ඔබ පළමුව බාධක මැද දැල්වීමට පුරුදු විය යුතුය.'"
      ];
      const random = list[Math.floor(Math.random() * list.length)];
      await sock.sendMessage(remoteJid, { text: `📖 *MALIYA-X | විශේෂ උපුටා දැක්වීම*\n\n${random}\n\n👑 MALIYA-X 🇱🇰` });
    }

    // 12. .fact
    if (cmd === ".fact") {
      const list = [
        "🧠 මිනිස් මොළය මඟින් නිපදවන විදුලි බලය (විදුලි බල්බයක් දැල්වීමට තරම් ප්‍රමාණවත් වේ) අපූරු ස්වභාවික නිර්මාණයකි.",
        "🧠 පෘථිවියේ සාගර පතුලේ තවමත් මිනිසා සොයා නොගත් අපූරු රහස් සහ ජීවී විශේෂ අනන්තවත් ඇත."
      ];
      const random = list[Math.floor(Math.random() * list.length)];
      await sock.sendMessage(remoteJid, { text: `🧠 *MALIYA-X | අපූරු විද්‍යාත්මක සත්‍යයක්*\n\n${random}\n\n👑 MALIYA-X 🇱🇰` });
    }

    // 13. .challenge
    if (cmd === ".challenge") {
      const list = [
        "🎯 අද දින කිසිදු ප්‍රතිඋපකාරයක් බලාපොරොත්තු නොවී, අමාරුකම් ඇති කෙනෙකුට නිහඬව උදව් කර බලන්න.",
        "🎯 අද දින ඔබේ කාර්යබහුල ජීවිතයෙන් විනාඩි 20ක් වෙන් කර අලුත් දැනුමක් දෙන ප්‍රයෝජනවත් පොතක් කියවන්න."
      ];
      const random = list[Math.floor(Math.random() * list.length)];
      await sock.sendMessage(remoteJid, { text: `🎯 *MALIYA-X | අද දින අභියෝගය*\n\n${random}\n\n👑 MALIYA-X 🇱🇰` });
    }

    // 14. .morning
    if (cmd === ".morning") {
      await sock.sendMessage(remoteJid, { text: "🌅 සුභ උදෑසනක් වේවා! අද උදෑසන උදාවූ අලුත් ඉර එළියත් සමඟ ඔබේ සියලු බලාපොරොත්තු ඉටු වන, සතුටින් හා සාර්ථකත්වයෙන් පිරි අපූරු දවසක් වේවා! ✨💖\n\n👑 MALIYA-X 🇱🇰" });
    }

    // 15. .night
    if (cmd === ".night") {
      await sock.sendMessage(remoteJid, { text: "🌙 සුභ රාත්‍රියක් වේවා! දවස පුරා වෙහෙස මහන්සි වී වැඩ කළ ඔබට සුවදායී, සන්සුන් නින්දක් ලැබේවා! හෙට දවස ඔබට ජයග්‍රහණයේ මාවත විවර කරයි! 💤✨\n\n👑 MALIYA-X 🇱🇰" });
    }

    // 16. .respect
    if (cmd === ".respect") {
      await sock.sendMessage(remoteJid, { text: "❤️ අන් අයට ගරු කිරීම සහ ආදරය කිරීම යනු ඔබේ උතුම් පෞරුෂයේ සහ සංස්කෘතියේ සැබෑ පිළිබිඹුවකි! සෑම විටම එකිනෙකට ගරු කරමු. 🤝✨\n\n👑 MALIYA-X 🇱🇰" });
    }

    // 17. .friend
    if (cmd === ".friend") {
      await sock.sendMessage(remoteJid, { text: "🤝 සැබෑ මිතුරෙකු යනු දුකේදී මෙන්ම සැපේදී සෙවණැල්ලක් මෙන් ළඟින් සිටින ජීවිතයේ ලැබෙන ඉතාම වටිනාම සහ දුර්ලභ ත්‍යාගයකි! 🌟💖\n\n👑 MALIYA-X 🇱🇰" });
    }
  });
}

startMaliya();
