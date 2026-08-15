const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("MALIYA-X VIDEO TEST is running"));
app.listen(PORT, () => console.log(`Web server: ${PORT}`));

const PHONE_NUMBER = process.env.PHONE_NUMBER;
const VIDEO_API_URL = process.env.VIDEO_API_URL;

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
      } catch (e) {
        console.error("Pairing error:", e.message);
      }
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
        text: "❌ Usage: .video <YouTube link or search query>"
      }, { quoted: mek });
    }

    if (!VIDEO_API_URL) {
      return sock.sendMessage(from, {
        text: "⚠️ VIDEO_API_URL is not configured in Render Environment Variables."
      }, { quoted: mek });
    }

    await sock.sendMessage(from, {
      text: "🎬 Video request received. Downloading, please wait..."
    }, { quoted: mek });

    try {
      const response = await axios.get(VIDEO_API_URL, {
        params: { url: query, query },
        timeout: 60000
      });

      const data = response.data;
      const url =
        data?.result?.download_url ||
        data?.result?.url ||
        data?.download_url ||
        data?.url;

      if (!url) throw new Error("No video URL returned by API.");

      await sock.sendMessage(from, {
        video: { url },
        mimetype: "video/mp4",
        caption: `🎬 ${data?.result?.title || data?.title || "MALIYA-X Video"}`
      }, { quoted: mek });

    } catch (e) {
      console.error("VIDEO ERROR:", e.response?.data || e.message);
      await sock.sendMessage(from, {
        text: "❌ Video download failed. The configured API did not return a valid video."
      }, { quoted: mek });
    }
  });
}

start().catch(console.error);
