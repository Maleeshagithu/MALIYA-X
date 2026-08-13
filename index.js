const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  downloadMediaMessage
} = require("@whiskeysockets/baileys");

const { Boom } = require("@hapi/boom");
const P = require("pino");
const axios = require("axios");
const yts = require("yt-search");
const express = require("express");
const sharp = require("sharp");
const { XMLParser } = require("fast-xml-parser");
const fs = require("fs");
const path = require("path");

// ============================================================
// MALIYA-X V2 🇱🇰
// ============================================================

const CONFIG = {
  BOT_NAME: process.env.BOT_NAME || "MALIYA-X V2 🇱🇰",
  PREFIX: process.env.PREFIX || ".",

  PHONE_NUMBER: (process.env.PHONE_NUMBER || "").replace(/\D/g, ""),
  OWNER_NUMBER: (process.env.OWNER_NUMBER || "").replace(/\D/g, ""),

  PORT: Number(process.env.PORT || 3000),

  DOWNLOAD_API:
    process.env.DOWNLOAD_API ||
    "https://apis.davidcyriltech.my.id",

  OMDB_API_KEY: process.env.OMDB_API_KEY || "",

  MENU_IMAGE:
    process.env.MENU_IMAGE ||
    "https://i.ibb.co/6Pqj45q/file-000000001bac8208a30c54ead6b411f7.png",

  MORNING_TIME: process.env.MORNING_TIME || "07:00",
  NIGHT_TIME: process.env.NIGHT_TIME || "22:00",

  AUTO_NEWS: process.env.AUTO_NEWS === "true",
  NEWS_INTERVAL_MINUTES:
    Number(process.env.NEWS_INTERVAL_MINUTES || 60),

  NEWS_RSS:
    process.env.NEWS_RSS ||
    "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"
};

const logger = P({
  level: process.env.LOG_LEVEL || "silent"
});

// ============================================================
// EXPRESS SERVER
// ============================================================

const app = express();

app.get("/", (req, res) => {
  res.send(`${CONFIG.BOT_NAME} is running successfully! 🇱🇰🔥`);
});

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    bot: CONFIG.BOT_NAME,
    time: sriLankaTime()
  });
});

app.listen(CONFIG.PORT, () => {
  console.log(`🌐 Server running on port ${CONFIG.PORT}`);
});

// ============================================================
// DATA
// ============================================================

const DATA_DIR = path.join(__dirname, "data");
const SESSION_DIR = path.join(__dirname, "session");

fs.mkdirSync(DATA_DIR, { recursive: true });

const GROUPS_FILE = path.join(DATA_DIR, "groups.json");
const FUN_HISTORY_FILE = path.join(DATA_DIR, "fun-history.json");

let knownGroups = new Set();

try {
  if (fs.existsSync(GROUPS_FILE)) {
    knownGroups = new Set(
      JSON.parse(fs.readFileSync(GROUPS_FILE, "utf8"))
    );
  }
} catch {}

function saveGroups() {
  try {
    fs.writeFileSync(
      GROUPS_FILE,
      JSON.stringify([...knownGroups], null, 2)
    );
  } catch {}
}

function loadFunHistory() {
  try {
    if (fs.existsSync(FUN_HISTORY_FILE)) {
      return JSON.parse(
        fs.readFileSync(FUN_HISTORY_FILE, "utf8")
      );
    }
  } catch {}

  return {};
}

function saveFunHistory(data) {
  try {
    fs.writeFileSync(
      FUN_HISTORY_FILE,
      JSON.stringify(data, null, 2)
    );
  } catch {}
}

// ============================================================
// UTILS
// ============================================================

function sriLankaTime() {
  const now = new Date();

  return {
    date: now.toLocaleDateString("en-GB", {
      timeZone: "Asia/Colombo"
    }),

    time: now.toLocaleTimeString("en-US", {
      timeZone: "Asia/Colombo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })
  };
}

function jidNumber(jid = "") {
  return jid
    .split("@")[0]
    .replace(/\D/g, "");
}

function mention(jid) {
  return `@${jidNumber(jid)}`;
}

function isGroup(jid) {
  return jid?.endsWith("@g.us");
}

function unwrapMessage(message) {
  if (!message) return null;

  if (message.ephemeralMessage) {
    return message.ephemeralMessage.message;
  }

  if (message.viewOnceMessage) {
    return message.viewOnceMessage.message;
  }

  if (message.viewOnceMessageV2) {
    return message.viewOnceMessageV2.message;
  }

  return message;
}

function getMessageText(msg) {
  const m = unwrapMessage(msg.message);

  if (!m) return "";

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ""
  ).trim();
}

function getQuotedMessage(msg) {
  const m = unwrapMessage(msg.message);

  const quoted =
    m?.extendedTextMessage?.contextInfo?.quotedMessage;

  return quoted ? { message: quoted } : null;
}

function safeFileName(name) {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, "")
    .slice(0, 90);
}

async function apiGet(url, params = {}) {
  const response = await axios.get(url, {
    params,
    timeout: 60000,
    maxContentLength: 100 * 1024 * 1024,
    maxBodyLength: 100 * 1024 * 1024
  });

  return response.data;
}

async function sendFail(sock, jid, title) {
  await sock.sendMessage(jid, {
    text:
      `❌ *${title}*\n\n` +
      `⚠️ Server/API එකෙන් media එක ලබාගන්න බැරි වුණා.\n` +
      `🔁 ටිකකින් නැවත try කරන්න.\n\n` +
      `⚡ ${CONFIG.BOT_NAME}`
  });
}

async function getProfilePicture(sock, jid) {
  try {
    return await sock.profilePictureUrl(jid, "image");
  } catch {
    return null;
  }
}

// ============================================================
// SINHALA FUN DATABASE
// Random + Repeat Protection
// ============================================================

const FUN = {
  joke: [
    "😂 Teacher: Homework කොහෙද? Student: Sir, මගේ brain එකේ තිබුණා... දැන් brain එකත් search කරනවා.",
    "🤣 අම්මා: Phone එක තියලා පාඩම් කරන්න. පුතා: Phone එකෙන් තමයි පාඩම් කරන්නේ. අම්මා: එහෙනම් TikTok එකේ syllabus එකත් තියෙනවද?",
    "😂 යාළුවා: උඹට සල්ලි තියෙනවද? මම: තියෙනවා. යාළුවා: කොහෙද? මම: හීන වල.",
    "🤣 Alarm එක 5ට තිබ්බා. මම 5ට නැගිට්ටා... alarm එක off කරන්න.",
    "😂 Wi-Fi එක slow වුණාම තමයි ගෙදර හැමෝම එකිනෙකාගේ මුහුණ බලන්නේ.",
    "🤣 Exam එකට කලින් මට සියල්ල මතකයි. Exam paper එක දැක්කාම සියල්ලටම මාව අමතකයි.",
    "😂 Friend: උඹ ඇයි single? Me: මම premium version එකක්, free trial එකක් නෑ.",
    "🤣 Phone battery 1% වෙද්දී අපි NASA scientist කෙනෙක් වගේ charger එක හොයනවා."
  ],

  fact: [
    "💡 Octopus සතුන්ට හදවත් තුනක් තියෙනවා.",
    "💡 මිනිස් හදවත දවසකට ලක්ෂ ගණනක් වාර ගැහෙනවා.",
    "💡 මී මැස්සන්ට නැටුම් ආකාරයකින් ආහාර තියෙන ස්ථානය ගැන අනෙක් මී මැස්සන්ට තොරතුරු දෙන්න පුළුවන්.",
    "💡 පෘථිවිය සම්පූර්ණ ගෝලයක් නොවෙයි; poles අසලින් ටිකක් flatten වෙලා තියෙනවා.",
    "💡 මිනිස් සිරුරේ ඇට 206ක් පමණ තියෙනවා.",
    "💡 සාමාන්‍යයෙන් මිනිසාට නින්දේදී සිහින කිහිපයක් ඇති විය හැක.",
    "💡 වතුර උණු වෙන උෂ්ණත්වය මුහුදු මට්ටමේදී සාමාන්‍යයෙන් 100°C පමණයි."
  ],

  quote: [
    "💬 “අද කරන පොඩි උත්සාහය හෙට ලොකු වෙනසක් කරන්න පුළුවන්.”",
    "💬 “ඔයාගේ වේගය වැදගත් නෑ. ඉදිරියට යන එකයි වැදගත්.”",
    "💬 “වැටීම අවසානයක් නෙවෙයි. නැගිටීමේ ආරම්භයයි.”",
    "💬 “අනිත් අය එක්ක compare වෙනවට වඩා ඊයේ හිටපු ඔයා එක්ක compare වෙන්න.”",
    "💬 “නිහඬව වැඩ කරන්න. ප්‍රතිඵල වලට කතා කරන්න දෙන්න.”",
    "💬 “හැම දවසක්ම perfect වෙන්නේ නැහැ. ඒත් හැම දවසකම chance එකක් තියෙනවා.”"
  ],

  motivate: [
    "🔥 අද අමාරු වුණත් නවතින්න එපා. ඔයාගේ future self එක ඔයාට ස්තූති කරයි.",
    "💪 පොඩි progress එකක් වුණත් progress එකක්. අද එක step එකක් ඉදිරියට යන්න.",
    "🚀 ඔයාට බැරි කියලා හිතෙන තැනින් තමයි සමහර වෙලාවට real growth එක පටන් ගන්නේ.",
    "🔥 Motivation එනකම් බලන් ඉන්න එපා. Start කරන්න. Motivation එක පස්සේ එයි.",
    "💪 වැරදුණා නම් lesson එක ගන්න. ආපහු try කරන්න. ඒක තමයි game එක.",
    "🌟 ඔයාගේ dream එක වෙනුවෙන් අද කරන්න පුළුවන් එක පොඩි වැඩක් කරන්න."
  ],

  life: [
    "❤️ ජීවිතේ හැම දෙයක්ම අපේ plan එකට යන්නේ නැහැ. ඒක සාමාන්‍ය දෙයක්.",
    "🌱 මන්දගාමී වුණත් ඉදිරියට යනවා නම් ඒක growth එකක්.",
    "❤️ සමහර මිනිස්සු අපේ ජීවිතයට එන්නේ lesson එකක් දෙන්න.",
    "🌿 සතුට කියන්නේ හැම දෙයක්ම perfect වෙන එක නෙවෙයි; තියෙන දේ appreciate කරන එක.",
    "✨ Peace එක නැති success එකක් හැම වෙලාවෙම worth නැහැ.",
    "❤️ ජීවිතේ වෙනස් කරන්න මුලින්ම වෙනස් කරන්න ඕනේ අපේ daily habits."
  ],

  challenge: [
    "🎯 අද පැයක් phone එක side එකට දාලා වැදගත් වැඩක් කරන්න.",
    "🔥 අද කෙනෙක්ට genuine compliment එකක් දෙන්න.",
    "💪 අද postpone කරපු එක වැඩක් complete කරන්න.",
    "🎯 අද social media එකෙන් පැය 2ක් break එකක් ගන්න.",
    "🔥 අද අලුත් දෙයක් ඉගෙන ගන්න.",
    "💪 අද උදේට හෝ සවසට විනාඩි 20ක් exercise කරන්න.",
    "🎯 අද unnecessary argument එකකට enter නොවී බලන්න."
  ]
};

function randomUnique(category) {
  const list = FUN[category];

  if (!list?.length) return null;

  const history = loadFunHistory();

  if (!history[category]) {
    history[category] = [];
  }

  const available = list.filter(
    item => !history[category].includes(item)
  );

  const pool = available.length ? available : list;

  const selected =
    pool[Math.floor(Math.random() * pool.length)];

  history[category].push(selected);

  if (history[category].length > 5) {
    history[category].shift();
  }

  saveFunHistory(history);

  return selected;
}

// ============================================================
// YOUTUBE
// ============================================================

async function searchYouTube(query) {
  const result = await yts(query);

  if (!result.videos?.length) {
    throw new Error("YouTube result not found");
  }

  return result.videos[0];
}

async function downloadYouTube(
  sock,
  jid,
  query,
  type,
  quality = "720"
) {
  const video = await searchYouTube(query);

  const title = video.title || "YouTube Media";

  const preview =
    `╭━━〔 ${type === "audio" ? "🎵 SONG" : "🎬 VIDEO"} 〕━━╮\n` +
    `┃ 🎼 *${title}*\n` +
    `┃ 👤 ${video.author?.name || "Unknown"}\n` +
    `┃ ⏱️ ${video.timestamp || "N/A"}\n` +
    `┃ 🎚️ Quality: ${type === "video" ? quality + "p" : "Audio"}\n` +
    `╰━━━━━━━━━━━━━━━━╯\n\n` +
    `⚡ ${CONFIG.BOT_NAME}`;

  try {
    await sock.sendMessage(jid, {
      image: { url: video.thumbnail },
      caption: preview
    });
  } catch {
    await sock.sendMessage(jid, {
      text: preview
    });
  }

  const endpoint =
    type === "audio"
      ? `${CONFIG.DOWNLOAD_API}/download/ytmp3`
      : `${CONFIG.DOWNLOAD_API}/download/ytmp4`;

  const data = await apiGet(endpoint, {
    url: video.url,
    quality
  });

  const result =
    data?.result ||
    data?.data ||
    data;

  const downloadUrl =
    result?.download_url ||
    result?.downloadUrl ||
    result?.url ||
    result?.link;

  if (!downloadUrl) {
    throw new Error("Downloader returned no URL");
  }

  const safe = safeFileName(title);

  if (type === "audio") {
    await sock.sendMessage(jid, {
      audio: { url: downloadUrl },
      mimetype: "audio/mpeg",
      fileName: `${safe}.mp3`
    });
  } else {
    await sock.sendMessage(jid, {
      video: { url: downloadUrl },
      mimetype: "video/mp4",
      fileName: `${safe}-${quality}p.mp4`,
      caption:
        `🎬 *${title}*\n` +
        `🎚️ Quality: ${quality}p\n\n` +
        `⚡ ${CONFIG.BOT_NAME}`
    });
  }
}

// ============================================================
// STICKER
// ============================================================

async function createSticker(sock, msg, jid) {
  const own = unwrapMessage(msg.message);

  const quoted = getQuotedMessage(msg);
  const quotedContent = unwrapMessage(
    quoted?.message
  );

  let target = null;

  if (own?.imageMessage) {
    target = msg;
  } else if (quotedContent?.imageMessage) {
    target = quoted;
  }

  if (!target) {
    await sock.sendMessage(jid, {
      text:
        "🖼️ Image එකක් send කරලා `.sticker` දාන්න.\n" +
        "හෝ image එකකට reply කරලා `.sticker` දාන්න."
    });
    return;
  }

  const buffer = await downloadMediaMessage(
    target,
    "buffer",
    {},
    {
      logger,
      reuploadRequest: sock.updateMediaMessage
    }
  );

  // Convert image to WhatsApp-compatible WebP sticker.
  const webp = await sharp(buffer)
    .resize(512, 512, {
      fit: "contain",
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0
      }
    })
    .webp({
      quality: 85
    })
    .toBuffer();

  await sock.sendMessage(jid, {
    sticker: webp
  });
}

// ============================================================
// MOVIE SEARCH
// ============================================================

async function movieSearch(sock, jid, query) {
  if (!CONFIG.OMDB_API_KEY) {
    await sock.sendMessage(jid, {
      text:
        "🎞️ Movie feature එක use කරන්න `OMDB_API_KEY` environment variable එක set කරන්න."
    });
    return;
  }

  const data = await apiGet(
    "https://www.omdbapi.com/",
    {
      apikey: CONFIG.OMDB_API_KEY,
      t: query,
      plot: "full"
    }
  );

  if (data.Response !== "True") {
    await sock.sendMessage(jid, {
      text:
        `❌ Movie එක හොයාගන්න බැරි වුණා.\n\n` +
        `🔎 Search: ${query}`
    });
    return;
  }

  const caption =
    `╭━━〔 🎞️ MOVIE INFO 〕━━╮\n` +
    `┃ 🎬 *${data.Title}*\n` +
    `┃ 📅 ${data.Year}\n` +
    `┃ ⭐ ${data.imdbRating || "N/A"}\n` +
    `┃ 🎭 ${data.Genre || "N/A"}\n` +
    `┃ ⏱️ ${data.Runtime || "N/A"}\n` +
    `┃ 🎥 ${data.Director || "N/A"}\n` +
    `╰━━━━━━━━━━━━━━━━╯\n\n` +
    `📝 ${data.Plot || "No plot available."}\n\n` +
    `⚡ ${CONFIG.BOT_NAME}`;

  if (data.Poster && data.Poster !== "N/A") {
    await sock.sendMessage(jid, {
      image: {
        url: data.Poster
      },
      caption
    });
  } else {
    await sock.sendMessage(jid, {
      text: caption
    });
  }
}

// ============================================================
// NEWS
// ============================================================

async function getNews() {
  const response = await axios.get(
    CONFIG.NEWS_RSS,
    {
      timeout: 30000
    }
  );

  const parser = new XMLParser({
    ignoreAttributes: false
  });

  const parsed = parser.parse(response.data);

  const items =
    parsed?.rss?.channel?.item || [];

  const list = Array.isArray(items)
    ? items
    : [items];

  return list
    .filter(x => x?.title && x?.link)
    .slice(0, 8)
    .map(x => ({
      title: String(x.title),
      link: String(x.link),
      pubDate: x.pubDate
        ? String(x.pubDate)
        : ""
    }));
}

async function sendNews(sock, jid) {
  try {
    const news = await getNews();

    if (!news.length) {
      throw new Error("No news");
    }

    let text =
      `╭━━〔 📰 LATEST NEWS 〕━━╮\n` +
      `┃ 🇱🇰 MALIYA-X NEWS\n` +
      `╰━━━━━━━━━━━━━━━━╯\n\n`;

    news.slice(0, 5).forEach((item, index) => {
      text +=
        `${index + 1}. *${item.title}*\n` +
        `🔗 ${item.link}\n\n`;
    });

    text += `⚡ ${CONFIG.BOT_NAME}`;

    await sock.sendMessage(jid, {
      text
    });
  } catch (err) {
    console.log("News error:", err.message);

    await sock.sendMessage(jid, {
      text:
        "❌ News ලබාගන්න බැරි වුණා. News source එක temporarily unavailable."
    });
  }
}

// ============================================================
// MENU
// ============================================================

function menuText() {
  return (
    `╭━━━〔 🇱🇰 ${CONFIG.BOT_NAME} 〕━━━╮\n` +
    `┃ 🤖 *MALIYA-X V2*\n` +
    `┃ ⚡ Fast • Smart • Fun\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +

    `╭━━〔 🎵 DOWNLOADS 〕━━╮\n` +
    `│ .song <name/link>\n` +
    `│ .audio <name/link>\n` +
    `│ .video <name/link> [360/480/720/1080]\n` +
    `│ .ytdl <name/link> [quality]\n` +
    `│ .dl <social-url>\n` +
    `╰━━━━━━━━━━━━━━━━━━╯\n\n` +

    `╭━━〔 🖼️ MEDIA 〕━━╮\n` +
    `│ .sticker / .s\n` +
    `│ .ai <question>\n` +
    `╰━━━━━━━━━━━━━━╯\n\n` +

    `╭━━〔 😂 FUN 🇱🇰 〕━━╮\n` +
    `│ .joke\n` +
    `│ .fact\n` +
    `│ .quote\n` +
    `│ .motivate\n` +
    `│ .life\n` +
    `│ .challenge\n` +
    `╰━━━━━━━━━━━━━━━━╯\n\n` +

    `╭━━〔 ❤️ ROMANCE FUN 〕━━╮\n` +
    `│ .love\n` +
    `│ .flirt\n` +
    `│ .romantic\n` +
    `│ .couple\n` +
    `│ .truth\n` +
    `│ .dare\n` +
    `╰━━━━━━━━━━━━━━━━━━╯\n\n` +

    `╭━━〔 🎞️ MOVIES 〕━━╮\n` +
    `│ .movie <movie name>\n` +
    `╰━━━━━━━━━━━━━━━━╯\n\n` +

    `╭━━〔 📰 NEWS 〕━━╮\n` +
    `│ .news\n` +
    `│ .technews\n` +
    `│ .lknews\n` +
    `╰━━━━━━━━━━━━━━╯\n\n` +

    `╭━━〔 👥 GROUP 〕━━╮\n` +
    `│ .groupinfo\n` +
    `│ .tagall\n` +
    `│ .admins\n` +
    `│ .link\n` +
    `╰━━━━━━━━━━━━━━╯\n\n` +

    `╭━━〔 ℹ️ INFO 〕━━╮\n` +
    `│ .ping\n` +
    `│ .time\n` +
    `│ .owner\n` +
    `│ .bot\n` +
    `│ .menu\n` +
    `╰━━━━━━━━━━━━━━╯\n\n` +

    `📱 *Private + Groups + Self Chat*\n` +
    `🔞 Explicit NSFW commands are not included.\n\n` +
    `⚡ Powered by ${CONFIG.BOT_NAME}`
  );
}

async function sendMenu(sock, jid) {
  try {
    await sock.sendMessage(jid, {
      image: {
        url: CONFIG.MENU_IMAGE
      },
      caption: menuText()
    });
  } catch {
    await sock.sendMessage(jid, {
      text: menuText()
    });
  }
}

// ============================================================
// WELCOME / GOODBYE
// ============================================================

async function sendWelcome(sock, jid, participant, action) {
  try {
    const metadata =
      await sock.groupMetadata(jid);

    const dp =
      await getProfilePicture(
        sock,
        participant
      );

    const t = sriLankaTime();

    const name =
      `@${jidNumber(participant)}`;

    let caption;

    if (action === "add") {
      caption =
        `╭━━〔 👋 WELCOME 〕━━╮\n` +
        `┃ 🌟 Welcome ${name}!\n` +
        `┃ 👥 Group: *${metadata.subject}*\n` +
        `┃ 📅 ${t.date}\n` +
        `┃ ⏰ ${t.time}\n` +
        `┃ 💙 Have a great time here!\n` +
        `╰━━━━━━━━━━━━━━━━╯\n\n` +
        `⚡ ${CONFIG.BOT_NAME}`;
    } else {
      caption =
        `╭━━〔 👋 GOODBYE 〕━━╮\n` +
        `┃ ${name} left the group.\n` +
        `┃ 👥 *${metadata.subject}*\n` +
        `┃ 📅 ${t.date}\n` +
        `┃ ⏰ ${t.time}\n` +
        `╰━━━━━━━━━━━━━━━━╯\n\n` +
        `⚡ ${CONFIG.BOT_NAME}`;
    }

    if (dp) {
      await sock.sendMessage(jid, {
        image: {
          url: dp
        },
        caption,
        mentions: [participant]
      });
    } else {
      await sock.sendMessage(jid, {
        text: caption,
        mentions: [participant]
      });
    }
  } catch (err) {
    console.log(
      "Welcome/Goodbye error:",
      err.message
    );
  }
}

// ============================================================
// GROUP COMMANDS
// ============================================================

async function groupInfo(sock, jid) {
  const metadata =
    await sock.groupMetadata(jid);

  const admins =
    metadata.participants.filter(
      p => p.admin
    ).length;

  await sock.sendMessage(jid, {
    text:
      `╭━━〔 👥 GROUP INFO 〕━━╮\n` +
      `┃ 🏷️ ${metadata.subject}\n` +
      `┃ 👤 Members: ${metadata.participants.length}\n` +
      `┃ 👑 Admins: ${admins}\n` +
      `╰━━━━━━━━━━━━━━━━╯`
  });
}

async function tagAll(sock, jid) {
  const metadata =
    await sock.groupMetadata(jid);

  const mentions =
    metadata.participants.map(
      p => p.id
    );

  const text =
    `📢 *TAG ALL*\n\n` +
    metadata.participants
      .map(
        p => `• ${mention(p.id)}`
      )
      .join("\n");

  await sock.sendMessage(jid, {
    text,
    mentions
  });
}

async function adminList(sock, jid) {
  const metadata =
    await sock.groupMetadata(jid);

  const admins =
    metadata.participants.filter(
      p => p.admin
    );

  await sock.sendMessage(jid, {
    text:
      `👑 *GROUP ADMINS*\n\n` +
      admins
        .map(
          p => `• ${mention(p.id)}`
        )
        .join("\n"),
    mentions:
      admins.map(p => p.id)
  });
}

async function groupLink(sock, jid) {
  try {
    const code =
      await sock.groupInviteCode(jid);

    await sock.sendMessage(jid, {
      text:
        `🔗 *GROUP INVITE LINK*\n\n` +
        `https://chat.whatsapp.com/${code}`
    });
  } catch {
    await sock.sendMessage(jid, {
      text:
        "❌ Group link ගන්න බැරි වුණා. Bot admin ද කියලා බලන්න."
    });
  }
}

// ============================================================
// DAILY MORNING / NIGHT
// ============================================================

const dailySent = new Set();

async function dailyMessages(sock) {
  const t = sriLankaTime();

  const normalized =
    t.time
      .replace(/\u202f/g, " ")
      .trim();

  const match =
    normalized.match(
      /(\d{1,2}):(\d{2})\s*(AM|PM)/i
    );

  if (!match) return;

  let hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  const ampm =
    match[3].toUpperCase();

  if (
    ampm === "PM" &&
    hour !== 12
  ) {
    hour += 12;
  }

  if (
    ampm === "AM" &&
    hour === 12
  ) {
    hour = 0;
  }

  const current =
    `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  let message = null;

  if (
    current ===
    CONFIG.MORNING_TIME
  ) {
    message =
      `🌅 *GOOD MORNING!*\n\n` +
      `සුභ උදෑසනක් හැමෝටම! ☀️\n` +
      `අද දවස ලස්සන දවසක් කරගන්න. 💙\n\n` +
      `⚡ ${CONFIG.BOT_NAME}`;
  }

  if (
    current ===
    CONFIG.NIGHT_TIME
  ) {
    message =
      `🌙 *GOOD NIGHT!*\n\n` +
      `සුභ රාත්‍රියක් හැමෝටම! 😴✨\n` +
      `හොඳට rest වෙලා හෙට fresh එකේ එන්න.\n\n` +
      `⚡ ${CONFIG.BOT_NAME}`;
  }

  if (!message) return;

  const day =
    new Date().toLocaleDateString(
      "en-CA",
      {
        timeZone: "Asia/Colombo"
      }
    );

  const key =
    `${day}-${current}`;

  if (dailySent.has(key)) {
    return;
  }

  for (const jid of knownGroups) {
    try {
      await sock.sendMessage(jid, {
        text: message
      });
    } catch {}
  }

  dailySent.add(key);

  // Keep memory small.
  if (dailySent.size > 10) {
    dailySent.clear();
  }
}

// ============================================================
// AUTO NEWS
// ============================================================

let lastAutoNews = 0;

async function autoNews(sock) {
  if (!CONFIG.AUTO_NEWS) return;

  const now =
    Date.now();

  const interval =
    CONFIG.NEWS_INTERVAL_MINUTES *
    60 *
    1000;

  if (
    now - lastAutoNews <
    interval
  ) {
    return;
  }

  lastAutoNews = now;

  try {
    const news =
      await getNews();

    if (!news.length) return;

    const first =
      news[0];

    const text =
      `📰 *AUTO NEWS*\n\n` +
      `🔴 ${first.title}\n\n` +
      `🔗 ${first.link}\n\n` +
      `⚡ ${CONFIG.BOT_NAME}`;

    for (const jid of knownGroups) {
      try {
        await sock.sendMessage(jid, {
          text
        });
      } catch {}
    }
  } catch {}
}

// ============================================================
// MAIN BOT
// ============================================================

async function startMaliyaX() {
  const {
    state,
    saveCreds
  } = await useMultiFileAuthState(
    SESSION_DIR
  );

  const sock =
    makeWASocket({
      auth: state,
      logger,
      browser:
        Browsers.macOS("Chrome"),
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: true,
      printQRInTerminal: false
    });

  // ----------------------------------------------------------
  // CREDENTIALS
  // ----------------------------------------------------------

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  // ----------------------------------------------------------
  // CONNECTION
  // ----------------------------------------------------------

  sock.ev.on(
    "connection.update",
    async update => {
      const {
        connection,
        lastDisconnect
      } = update;

      if (
        connection === "open"
      ) {
        console.log(`
╔══════════════════════════════════════╗
║       🇱🇰 MALIYA-X V2 🇱🇰
║       CONNECTED SUCCESSFULLY ✅
╚══════════════════════════════════════╝
        `);

        if (
          CONFIG.OWNER_NUMBER
        ) {
          try {
            await sock.sendMessage(
              `${CONFIG.OWNER_NUMBER}@s.whatsapp.net`,
              {
                text:
                  `🚀 *${CONFIG.BOT_NAME} CONNECTED!*\n\n` +
                  `✅ Status: Online\n` +
                  `⚡ Version: V2\n` +
                  `🕐 ${sriLankaTime().date} • ${sriLankaTime().time}\n\n` +
                  `Type *.menu* to view commands.`
              }
            );
          } catch (err) {
            console.log(
              "Owner notification failed:",
              err.message
            );
          }
        }
      }

      if (
        connection === "close"
      ) {
        const statusCode =
          new Boom(
            lastDisconnect?.error
          )?.output?.statusCode;

        const shouldReconnect =
          statusCode !==
          DisconnectReason.loggedOut;

        console.log(
          "Connection closed:",
          statusCode,
          "Reconnect:",
          shouldReconnect
        );

        if (shouldReconnect) {
          setTimeout(
            startMaliyaX,
            3000
          );
        } else {
          console.log(
            "❌ Logged out. Delete session folder and pair again."
          );
        }
      }
    }
  );

  // ----------------------------------------------------------
  // PAIRING CODE
  // ----------------------------------------------------------

  if (
    CONFIG.PHONE_NUMBER &&
    !state.creds.registered
  ) {
    setTimeout(
      async () => {
        try {
          const code =
            await sock.requestPairingCode(
              CONFIG.PHONE_NUMBER
            );

          const formatted =
            code
              ?.match(/.{1,4}/g)
              ?.join("-") ||
            code;

          console.log(
            "\n🔐 =================================="
          );
          console.log(
            `🔐 PAIRING CODE: ${formatted}`
          );
          console.log(
            "🔐 ==================================\n"
          );
        } catch (err) {
          console.log(
            "Pairing error:",
            err.message
          );
        }
      },
      4000
    );
  }

  // ----------------------------------------------------------
  // GROUP PARTICIPANTS
  // ----------------------------------------------------------

  sock.ev.on(
    "group-participants.update",
    async event => {
      try {
        knownGroups.add(
          event.id
        );

        saveGroups();

        if (
          event.action === "add" ||
          event.action === "remove"
        ) {
          for (
            const participant
            of event.participants
          ) {
            await sendWelcome(
              sock,
              event.id,
              participant,
              event.action
            );
          }
        }
      } catch (err) {
        console.log(
          "Group event error:",
          err.message
        );
      }
    }
  );

  // ----------------------------------------------------------
  // MESSAGES
  // ----------------------------------------------------------

  sock.ev.on(
    "messages.upsert",
    async ({
      messages
    }) => {
      for (
        const msg of messages
      ) {
        try {
          if (
            !msg.message
          ) {
            continue;
          }

          const jid =
            msg.key.remoteJid;

          if (!jid) {
            continue;
          }

          /*
           * IMPORTANT:
           * fromMe is intentionally NOT ignored.
           * This allows self-chat commands.
           */

          if (
            isGroup(jid)
          ) {
            knownGroups.add(jid);
            saveGroups();
          }

          const body =
            getMessageText(msg);

          if (!body) {
            continue;
          }

          if (
            !body.startsWith(
              CONFIG.PREFIX
            )
          ) {
            continue;
          }

          const parts =
            body
              .trim()
              .split(/\s+/);

          const command =
            parts[0]
              .slice(
                CONFIG.PREFIX.length
              )
              .toLowerCase();

          const args =
            parts.slice(1);

          const query =
            args.join(" ");

          // ==================================================
          // MENU
          // ==================================================

          if (
            command === "menu" ||
            command === "help"
          ) {
            await sendMenu(
              sock,
              jid
            );

            continue;
          }

          // ==================================================
          // PING
          // ==================================================

          if (
            command === "ping"
          ) {
            const start =
              Date.now();

            await sock.sendMessage(
              jid,
              {
                text:
                  "🏓 Checking..."
              }
            );

            const latency =
              Date.now() -
              start;

            await sock.sendMessage(
              jid,
              {
                text:
                  `🚀 *PONG!*\n\n` +
                  `⚡ Speed: ${latency}ms\n` +
                  `🤖 ${CONFIG.BOT_NAME}`
              }
            );

            continue;
          }

          // ==================================================
          // TIME
          // ==================================================

          if (
            command === "time"
          ) {
            const t =
              sriLankaTime();

            await sock.sendMessage(
              jid,
              {
                text:
                  `🕐 *SRI LANKA TIME*\n\n` +
                  `📅 ${t.date}\n` +
                  `⏰ ${t.time}`
              }
            );

            continue;
          }

          // ==================================================
          // YOUTUBE AUDIO
          // ==================================================

          if (
            command === "song" ||
            command === "audio"
          ) {
            if (!query) {
              await sock.sendMessage(
                jid,
                {
                  text:
                    "🎵 `.song <song name or YouTube link>`"
                }
              );

              continue;
            }

            try {
              await downloadYouTube(
                sock,
                jid,
                query,
                "audio"
              );
            } catch (err) {
              console.log(
                "YouTube audio:",
                err.message
              );

              await sendFail(
                sock,
                jid,
                "Song download failed"
              );
            }

            continue;
          }

          // ==================================================
          // YOUTUBE VIDEO
          // ==================================================

          if (
            command === "video" ||
            command === "ytdl"
          ) {
            if (!query) {
              await sock.sendMessage(
                jid,
                {
                  text:
                    `🎬 Usage:\n` +
                    `.${command} <name/link> [360/480/720/1080]\n\n` +
                    `Example:\n` +
                    `.video Avengers 720`
                }
              );

              continue;
            }

            const qualityArg =
              args[args.length - 1];

            const allowedQuality = [
              "360",
              "480",
              "720",
              "1080"
            ];

            const quality =
              allowedQuality.includes(
                qualityArg
              )
                ? qualityArg
                : "720";

            const realQuery =
              allowedQuality.includes(
                qualityArg
              )
                ? args
                    .slice(0, -1)
                    .join(" ")
                : query;

            try {
              await downloadYouTube(
                sock,
                jid,
                realQuery,
                "video",
                quality
              );
            } catch (err) {
              console.log(
                "YouTube video:",
                err.message
              );

              await sendFail(
                sock,
                jid,
                "Video download failed"
              );
            }

            continue;
          }

          // ==================================================
          // SOCIAL DOWNLOADER
          // ==================================================

          if (
            command === "dl" ||
            command === "social"
          ) {
            if (!query) {
              await sock.sendMessage(
                jid,
                {
                  text:
                    "📥 `.dl <TikTok / Instagram / Facebook URL>`"
                }
              );

              continue;
            }

            try {
              const data =
                await apiGet(
                  `${CONFIG.DOWNLOAD_API}/download/all`,
                  {
                    url: query
                  }
                );

              const result =
                data?.result ||
                data?.data ||
                data;

              const media =
                result?.download_url ||
                result?.downloadUrl ||
                result?.url ||
                result?.link ||
                result?.media;

              if (!media) {
                throw new Error(
                  "No media URL"
                );
              }

              await sock.sendMessage(
                jid,
                {
                  video: {
                    url: media
                  },
                  mimetype:
                    "video/mp4",
                  caption:
                    `📥 *Downloaded successfully!*\n\n` +
                    `⚡ ${CONFIG.BOT_NAME}`
                }
              );
            } catch (err) {
              console.log(
                "Social download:",
                err.message
              );

              await sendFail(
                sock,
                jid,
                "Media download failed"
              );
            }

            continue;
          }

          // ==================================================
          // STICKER
          // ==================================================

          if (
            command === "sticker" ||
            command === "s"
          ) {
            try {
              await createSticker(
                sock,
                msg,
                jid
              );
            } catch (err) {
              console.log(
                "Sticker error:",
                err.message
              );

              await sock.sendMessage(
                jid,
                {
                  text:
                    "❌ Sticker create කරන්න බැරි වුණා.\n" +
                    "Clear image එකක් send/reply කරලා නැවත try කරන්න."
                }
              );
            }

            continue;
          }

          // ==================================================
          // AI
          // ==================================================

          if (
            command === "ai"
          ) {
            if (!query) {
              await sock.sendMessage(
                jid,
                {
                  text:
                    "🤖 `.ai <question>`"
                }
              );

              continue;
            }

            try {
              const data =
                await apiGet(
                  `${CONFIG.DOWNLOAD_API}/ai/gemini`,
                  {
                    query
                  }
                );

              const result =
                data?.result ||
                data?.data ||
                data;

              const answer =
                typeof result ===
                "string"
                  ? result
                  : result?.response ||
                    result?.answer ||
                    result?.text ||
                    "No response";

              await sock.sendMessage(
                jid,
                {
                  text:
                    `🤖 *MALIYA-X AI*\n\n${answer}`
                }
              );
            } catch {
              await sock.sendMessage(
                jid,
                {
                  text:
                    "❌ AI service එක temporarily unavailable."
                }
              );
            }

            continue;
          }

          // ==================================================
          // FUN
          // ==================================================

          if (
            FUN[command]
          ) {
            const text =
              randomUnique(
                command
              );

            await sock.sendMessage(
              jid,
              {
                text:
                  `${text}\n\n⚡ ${CONFIG.BOT_NAME}`
              }
            );

            continue;
          }

          // ==================================================
          // MOVIE
          // ==================================================

          if (
            command === "movie"
          ) {
            if (!query) {
              await sock.sendMessage(
                jid,
                {
                  text:
                    "🎞️ `.movie <movie name>`"
                }
              );

              continue;
            }

            try {
              await movieSearch(
                sock,
                jid,
                query
              );
            } catch (err) {
              console.log(
                "Movie error:",
                err.message
              );

              await sock.sendMessage(
                jid,
                {
                  text:
                    "❌ Movie information ලබාගන්න බැරි වුණා."
                }
              );
            }

            continue;
          }

          // ==================================================
          // NEWS
          // ==================================================

          if (
            command === "news" ||
            command === "lknews" ||
            command === "technews"
          ) {
            await sendNews(
              sock,
              jid
            );

            continue;
          }

          // ==================================================
          // ROMANCE FUN
          // ==================================================

          const romance = {
            love: [
              "❤️ අද කෙනෙක්ට හොඳ වචනයක් කියන්න.",
              "❤️ ඇත්ත ආදරේ තියෙන්නේ respect + trust + care වල.",
              "💖 කෙනෙක්ගේ දවස ලස්සන කරන්න පොඩි message එකක් යවන්න."
            ],

            flirt: [
              "😉 ඔයාට smile එකක් දුන්නාම ඒක ආපහු දෙන්න.",
              "😉 අද conversation එකක් nice compliment එකකින් පටන් ගන්න.",
              "😄 Flirting එකේ golden rule එක: respect first."
            ],

            romantic: [
              "🌹 ආදරේ කියන්නේ expensive gifts නෙවෙයි; time සහ care.",
              "💖 හොඳ relationship එකකට communication ගොඩක් වැදගත්.",
              "🌹 පොඩි surprise එකක් කෙනෙක්ගේ දවස වෙනස් කරන්න පුළුවන්."
            ],

            couple: [
              "💑 Couple challenge: එකිනෙකා ගැන කැමති දෙයක් 3ක් කියන්න.",
              "💑 Couple challenge: phones side එකට දාලා විනාඩි 30ක් කතා කරන්න.",
              "💑 Couple challenge: එකිනෙකාට genuine compliment එකක් දෙන්න."
            ],

            truth: [
              "🎭 Truth: ඔයාට අමතක කරන්න අමාරුම කෙනා කවුද?",
              "🎭 Truth: ඔයාගේ biggest dream එක මොකක්ද?",
              "🎭 Truth: ඔයාට හොඳම advice එක දුන්නේ කවුද?"
            ],

            dare: [
              "🔥 Dare: group එකේ කෙනෙක්ට genuine compliment එකක් දෙන්න.",
              "🔥 Dare: අද selfie එකක් ගන්න.",
              "🔥 Dare: විනාඩි 10ක් phone එක side එකට දාලා relax වෙන්න."
            ]
          };

          if (
            romance[command]
          ) {
            await sock.sendMessage(
              jid,
              {
                text:
                  `${randomUniqueRomance(
                    romance[command]
                  )}\n\n⚡ ${CONFIG.BOT_NAME}`
              }
            );

            continue;
          }

          // ==================================================
          // GROUP COMMANDS
          // ==================================================

          if (
            [
              "groupinfo",
              "tagall",
              "admins",
              "link"
            ].includes(command)
          ) {
            if (!isGroup(jid)) {
              await sock.sendMessage(
                jid,
                {
                  text:
                    "❌ මේ command එක WhatsApp group එකක use කරන්න."
                }
              );

              continue;
            }

            try {
              if (
                command ===
                "groupinfo"
              ) {
                await groupInfo(
                  sock,
                  jid
                );
              }

              if (
                command ===
                "tagall"
              ) {
                await tagAll(
                  sock,
                  jid
                );
              }

              if (
                command ===
                "admins"
              ) {
                await adminList(
                  sock,
                  jid
                );
              }

              if (
                command ===
                "link"
              ) {
                await groupLink(
                  sock,
                  jid
                );
              }
            } catch (err) {
              console.log(
                "Group command:",
                err.message
              );
            }

            continue;
          }

          // ==================================================
          // OWNER
          // ==================================================

          if (
            command === "owner"
          ) {
            if (
              !CONFIG.OWNER_NUMBER
            ) {
              await sock.sendMessage(
                jid,
                {
                  text:
                    "❌ OWNER_NUMBER environment variable එක set කරලා නැහැ."
                }
              );
            } else {
              await sock.sendMessage(
                jid,
                {
                  text:
                    `👑 *OWNER*\n\n` +
                    `📱 https://wa.me/${CONFIG.OWNER_NUMBER}`
                }
              );
            }

            continue;
          }

          // ==================================================
          // BOT INFO
          // ==================================================

          if (
            command === "bot"
          ) {
            await sock.sendMessage(
              jid,
              {
                text:
                  `🤖 *${CONFIG.BOT_NAME}*\n\n` +
                  `🇱🇰 Sri Lankan WhatsApp MD Bot\n` +
                  `🎵 YouTube Downloader\n` +
                  `🖼️ Sticker Maker\n` +
                  `🎞️ Movie Search\n` +
                  `😂 Sinhala Fun\n` +
                  `📰 News\n` +
                  `👥 Group Tools\n` +
                  `📱 Private + Group + Self Chat`
              }
            );

            continue;
          }

        } catch (err) {
          console.log(
            "Message handler error:",
            err.message
          );
        }
      }
    }
  );

  // ==========================================================
  // BACKGROUND TASKS
  // ==========================================================

  setInterval(() => {
    dailyMessages(sock).catch(
      () => {}
    );
  }, 60 * 1000);

  setInterval(() => {
    autoNews(sock).catch(
      () => {}
    );
  }, 60 * 1000);
}

// ============================================================
// ROMANCE RANDOMIZER
// ============================================================

function randomUniqueRomance(list) {
  return list[
    Math.floor(
      Math.random() *
      list.length
    )
  ];
}

// ============================================================
// START
// ============================================================

startMaliyaX().catch(err => {
  console.error(
    "Fatal bot error:",
    err
  );

  setTimeout(
    startMaliyaX,
    5000
  );
});
