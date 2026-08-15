const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("MALIYA-X VIDEO TEST is running"));
app.listen(PORT, () => console.log(`Web server running on ${PORT}`));

const PHONE_NUMBER = process.env.PHONE_NUMBER;
process.env.PATH = path.join(__dirname, ".bin") + ":" + process.env.PATH;
const DOWNLOAD_DIR = path.join(__dirname, "downloads");
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function runYtDlp(query, output) {
  return new Promise((resolve, reject) => {
    const args = [
      "--no-playlist",
      "--max-filesize", "45M",
      "-f", "best[ext=mp4][height<=720]/best[ext=mp4]/best",
      "--merge-output-format", "mp4",
      "-o", output,
      query
    ];
    const p = spawn("yt-dlp", args);
    let stderr = "";
    p.stderr.on("data", d => stderr += d.toString());
    p.on("error", reject);
    p.on("close", code => code === 0 ? resolve() : reject(new Error(stderr || `yt-dlp exited ${code}`)));
  });
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Chrome")
  });

  sock.ev.on("creds.update", saveCreds);

  if (!state.creds.registered && PHONE_NUMBER) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER.replace(/\D/g, ""));
        console.log("PAIRING CODE:", code);
      } catch (e) { console.error("Pairing error:", e.message); }
    }, 5000);
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") console.log("✅ MALIYA-X VIDEO TEST CONNECTED");
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) setTimeout(start, 3000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const mek = messages?.[0];
    if (!mek?.message) return;

    const msg = mek.message;
    const type = Object.keys(msg)[0];
    const body =
      type === "conversation" ? msg.conversation :
      type === "extendedTextMessage" ? msg.extendedTextMessage?.text :
      type === "imageMessage" ? msg.imageMessage?.caption : "";

    if (!body?.toLowerCase().startsWith(".video")) return;

    const query = body.trim().split(/\s+/).slice(1).join(" ");
    const from = mek.key.remoteJid;

    if (!query) {
      return sock.sendMessage(from, {
        text: "❌ Usage: .video <YouTube link>"
      }, { quoted: mek });
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const output = path.join(DOWNLOAD_DIR, `${id}.mp4`);

    await sock.sendMessage(from, {
      text: "🎬 Video එක download කරනවා... ටිකක් ඉන්න."
    }, { quoted: mek });

    try {
      await runYtDlp(query, output);

      if (!fs.existsSync(output)) throw new Error("Output file was not created.");

      const size = fs.statSync(output).size;
      if (size > 45 * 1024 * 1024) throw new Error("Video is larger than WhatsApp test limit.");

      await sock.sendMessage(from, {
        video: fs.readFileSync(output),
        mimetype: "video/mp4",
        caption: "🎬 MALIYA-X Video"
      }, { quoted: mek });

    } catch (e) {
      console.error("VIDEO ERROR:", e.message);
      await sock.sendMessage(from, {
        text: "❌ Video download failed. Try another YouTube video/link."
      }, { quoted: mek });
    } finally {
      try { fs.unlinkSync(output); } catch {}
    }
  });
}

start().catch(console.error);
