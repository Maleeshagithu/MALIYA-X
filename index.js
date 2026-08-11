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
const fs = require("fs");
const path = require("path");

// ===============================
// MALIYA-X 🇱🇰
// Sri Lankan WhatsApp MD Bot
// ===============================

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("🇱🇰 MALIYA-X Bot is running successfully!");
});

app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

const AUTH_FOLDER = "./auth_info";

const logger = pino({
    level: "silent"
});

// ===============================
// TIME
// ===============================

function sriLankaTime() {
    const now = new Date();

    const date = now.toLocaleDateString("en-GB", {
        timeZone: "Asia/Colombo"
    });

    const time = now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Colombo",
        hour12: true
    });

    return {
        date,
        time
    };
}

// ===============================
// UPTIME
// ===============================

function formatUptime(seconds) {
    seconds = Math.floor(seconds);

    const days = Math.floor(seconds / 86400);
    seconds %= 86400;

    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;

    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    let result = "";

    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;

    result += `${seconds}s`;

    return result;
}

// ===============================
// START BOT
// ===============================

async function startMaliya() {

    console.log("====================================");
    console.log("🇱🇰 MALIYA-X");
    console.log("WhatsApp Bot Starting...");
    console.log("====================================");

    const { state, saveCreds } =
        await useMultiFileAuthState(AUTH_FOLDER);

    const sock = makeWASocket({
        auth: state,

        logger,

        browser: Browsers.macOS("Chrome"),

        printQRInTerminal: false,

        generateHighQualityLinkPreview: false,

        syncFullHistory: false
    });

    // ===============================
    // SAVE CREDENTIALS
    // ===============================

    sock.ev.on("creds.update", saveCreds);

    // ===============================
    // PAIRING CODE
    // ===============================

    if (!state.creds.registered) {

        const phoneNumber =
            process.env.PHONE_NUMBER ||
            "94770678992";

        setTimeout(async () => {

            try {

                console.log("📱 Requesting pairing code...");

                const code =
                    await sock.requestPairingCode(
                        phoneNumber.replace(/[^0-9]/g, "")
                    );

                console.log("");
                console.log("====================================");
                console.log("🔐 YOUR PAIRING CODE");
                console.log(`👉 ${code}`);
                console.log("====================================");
                console.log("");

            } catch (error) {

                console.log(
                    "❌ Pairing code error:",
                    error.message
                );

            }

        }, 5000);
    }

    // ===============================
    // CONNECTION UPDATE
    // ===============================

    sock.ev.on(
        "connection.update",
        async ({
            connection,
            lastDisconnect
        }) => {

            if (connection === "connecting") {

                console.log("🔄 MALIYA-X connecting...");

            }

            if (connection === "open") {

                console.log("");
                console.log("====================================");
                console.log("👑 MALIYA-X 🇱🇰");
                console.log("WhatsApp Bot ONLINE");
                console.log("====================================");
                console.log("");

            }

            if (connection === "close") {

                const statusCode =
                    lastDisconnect?.error?.output?.statusCode;

                console.log(
                    "❌ WhatsApp connection closed."
                );

                console.log(
                    "Disconnect reason:",
                    statusCode
                );

                // ===========================
                // LOGGED OUT
                // ===========================

                if (
                    statusCode ===
                    DisconnectReason.loggedOut
                ) {

                    console.log(
                        "🚪 WhatsApp logged out."
                    );

                    console.log(
                        "🧹 Removing old authentication..."
                    );

                    try {

                        if (
                            fs.existsSync(AUTH_FOLDER)
                        ) {

                            fs.rmSync(
                                AUTH_FOLDER,
                                {
                                    recursive: true,
                                    force: true
                                }
                            );
                        }

                    } catch (err) {

                        console.log(
                            "Auth delete error:",
                            err.message
                        );
                    }

                    console.log(
                        "🔁 Restarting for new pairing..."
                    );

                    setTimeout(() => {
                        startMaliya();
                    }, 3000);

                    return;
                }

                // ===========================
                // OTHER DISCONNECT
                // ===========================

                console.log(
                    "🔄 Reconnecting MALIYA-X..."
                );

                setTimeout(() => {
                    startMaliya();
                }, 3000);
            }
        }
    );

    // ===============================
    // GROUP PARTICIPANTS
    // ===============================

    sock.ev.on(
        "group-participants.update",
        async (anu) => {

            try {

                const metadata =
                    await sock.groupMetadata(anu.id);

                const groupName =
                    metadata.subject;

                const { date, time } =
                    sriLankaTime();

                for (const participant of anu.participants) {

                    const number =
                        participant.split("@")[0];

                    // ===========================
                    // WELCOME
                    // ===========================

                    if (anu.action === "add") {

                        const welcome = `
╭━━━〔 👑 MALIYA-X 🇱🇰 〕━━━╮

🎉 *WELCOME TO THE GROUP!*

👤 Hello @${number}

👥 *Group:* ${groupName}

📅 Date: ${date}
⏰ Time: ${time}

🤖 Welcome to our family!
💙 Enjoy your stay here.

╰━━━━━━━━━━━━━━━━━━━━╯

🇱🇰 *Powered by MALIYA-X Bot*
`;

                        await sock.sendMessage(
                            anu.id,
                            {
                                text: welcome,
                                mentions: [participant]
                            }
                        );
                    }

                    // ===========================
                    // GOODBYE
                    // ===========================

                    if (anu.action === "remove") {

                        const goodbye = `
╭━━━〔 👑 MALIYA-X 🇱🇰 〕━━━╮

👋 *GOODBYE!*

@${number} has left the group.

👥 Group: ${groupName}

📅 Date: ${date}
⏰ Time: ${time}

💔 We will miss you!

╰━━━━━━━━━━━━━━━━━━━━╯

🇱🇰 *Powered by MALIYA-X Bot*
`;

                        await sock.sendMessage(
                            anu.id,
                            {
                                text: goodbye,
                                mentions: [participant]
                            }
                        );
                    }
                }

            } catch (error) {

                console.log(
                    "Group update error:",
                    error.message
                );
            }
        }
    );

    // ===============================
    // MESSAGE HANDLER
    // ===============================

    sock.ev.on(
        "messages.upsert",
        async ({ messages }) => {

            try {

                const msg = messages[0];

                if (!msg.message) return;

                if (
                    msg.key &&
                    msg.key.remoteJid === "status@broadcast"
                ) {
                    return;
                }

                const remoteJid =
                    msg.key.remoteJid;

                // ===========================
                // GET MESSAGE TEXT
                // ===========================

                let text = "";

                if (msg.message.conversation) {

                    text =
                        msg.message.conversation;

                } else if (
                    msg.message.extendedTextMessage
                ) {

                    text =
                        msg.message.extendedTextMessage.text;

                } else if (
                    msg.message.imageMessage?.caption
                ) {

                    text =
                        msg.message.imageMessage.caption;

                } else if (
                    msg.message.videoMessage?.caption
                ) {

                    text =
                        msg.message.videoMessage.caption;
                }

                if (!text) return;

                text = text.trim();

                // ===========================
                // COMMAND
                // ===========================

                if (!text.startsWith(".")) {
                    return;
                }

                const parts =
                    text.split(/\s+/);

                const cmd =
                    parts[0].toLowerCase();

                const args =
                    parts.slice(1).join(" ");

                // ===============================
                // .PING
                // ===============================

                if (cmd === ".ping") {

                    const start =
                        Date.now();

                    const { date, time } =
                        sriLankaTime();

                    const reply =
                        await sock.sendMessage(
                            remoteJid,
                            {
                                text: `
╭━━〔 👑 MALIYA-X SPEED 〕━━╮

⚡ *Response Speed:* Calculating...

⏳ *Uptime:* ${formatUptime(
                                    process.uptime()
                                )}

📅 *Date:* ${date}

🕐 *Time:* ${time}

╰━━━━━━━━━━━━━━━━━━━━╯

🇱🇰 *Powered by MALIYA-X Bot*
`
                            },
                            {
                                quoted: msg
                            }
                        );

                    const ping =
                        Date.now() - start;

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text: `
╭━━〔 👑 MALIYA-X SPEED 〕━━╮

⚡ *Response Speed:* ${ping} ms

⏳ *Uptime:* ${formatUptime(
                                process.uptime()
                            )}

📅 *Date:* ${date}

🕐 *Time:* ${time}

╰━━━━━━━━━━━━━━━━━━━━╯

🇱🇰 *Powered by MALIYA-X Bot*
`
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

                // ===============================
                // .MENU
                // ===============================

                if (cmd === ".menu") {

                    const { date, time } =
                        sriLankaTime();

                    const menu = `
╭━━━〔 👑 MALIYA-X 🇱🇰 〕━━━╮

       *MALIYA-X MENU*

╰━━━━━━━━━━━━━━━━━━━━╯

📊 *STATUS DETAILS*

│ ⚡ .ping
│ 🕐 .time
│ 🤖 .ai

📥 *DOWNLOADS & MEDIA*

│ 🎵 .song <name>
│ 🎧 .audio <name>
│ 🎬 .video <name>
│ 📹 .ytdl <name>
│ 🌐 .social <url>
│ 📥 .dl <url>

🎨 *STICKER*

│ 🖼️ .sticker
│ 🖼️ .s

👥 *GROUP COMMANDS*

│ ℹ️ .groupinfo
│ 📢 .tagall

😂 *FUN*

│ 😂 .joke
│ 💡 .quote
│ 🧠 .fact
│ 💪 .motivate
│ ❤️ .respect
│ 🤝 .friend
│ 🌱 .life
│ 🎯 .challenge

🌅 *WISHES*

│ 🌅 .morning
│ 🌙 .night

╭━━━━━━━━━━━━━━━━━━━━╮

📅 ${date}
⏰ ${time}

👑 *MALIYA-X — Sri Lankan WhatsApp Bot* 🇱🇰

╰━━━━━━━━━━━━━━━━━━━━╯
`;

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text: menu
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

                // ===============================
                // .TIME
                // ===============================

                if (cmd === ".time") {

                    const { date, time } =
                        sriLankaTime();

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text: `
📅 *Date:* ${date}
🕐 *Time:* ${time}

🇱🇰 *Sri Lanka Time*
👑 *MALIYA-X*
`
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

                // ===============================
                // .AI
                // ===============================

                if (cmd === ".ai") {

                    if (!args) {

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "❌ AI question එකක් දෙන්න.\n\nExample: *.ai Sri Lanka ගැන කියන්න*"
                            },
                            {
                                quoted: msg
                            }
                        );

                        return;
                    }

                    try {

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "🤖 AI answer එක හොයනවා..."
                            },
                            {
                                quoted: msg
                            }
                        );

                        const api =
                            `https://apis.davidcyriltech.my.id/ai/gemini?query=${encodeURIComponent(args)}`;

                        const response =
                            await axios.get(api);

                        const answer =
                            response.data?.result ||
                            response.data?.response ||
                            response.data?.answer ||
                            "AI response එකක් ලැබුණේ නැහැ.";

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    `🤖 *MALIYA-X AI*\n\n${answer}\n\n🇱🇰 Powered by MALIYA-X`
                            },
                            {
                                quoted: msg
                            }
                        );

                    } catch (error) {

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "❌ AI service එකේ error එකක්. පසුව try කරන්න."
                            },
                            {
                                quoted: msg
                            }
                        );
                    }

                    return;
                }

                // ===============================
                // .SONG / .AUDIO
                // ===============================

                if (
                    cmd === ".song" ||
                    cmd === ".audio"
                ) {

                    if (!args) {

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "🎵 Song name එක දෙන්න.\n\nExample: *.song Shape of You*"
                            },
                            {
                                quoted: msg
                            }
                        );

                        return;
                    }

                    try {

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "🔎 Song එක හොයනවා..."
                            },
                            {
                                quoted: msg
                            }
                        );

                        const search =
                            await ytSearch(args);

                        if (
                            !search.videos ||
                            !search.videos.length
                        ) {

                            throw new Error(
                                "Song not found"
                            );
                        }

                        const video =
                            search.videos[0];

                        const api =
                            `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(video.url)}`;

                        const response =
                            await axios.get(api);

                        const audioUrl =
                            response.data?.result?.download_url;

                        if (!audioUrl) {
                            throw new Error(
                                "Audio URL unavailable"
                            );
                        }

                        await sock.sendMessage(
                            remoteJid,
                            {
                                audio: {
                                    url: audioUrl
                                },
                                mimetype:
                                    "audio/mp4",
                                fileName:
                                    `${video.title}.mp3`
                            },
                            {
                                quoted: msg
                            }
                        );

                    } catch (error) {

                        console.log(
                            "Song error:",
                            error.message
                        );

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "❌ Song download කරන්න බැරි වුණා."
                            },
                            {
                                quoted: msg
                            }
                        );
                    }

                    return;
                }

                // ===============================
                // .VIDEO / .YTDL
                // ===============================

                if (
                    cmd === ".video" ||
                    cmd === ".ytdl"
                ) {

                    if (!args) {

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "🎬 Video name එක දෙන්න."
                            },
                            {
                                quoted: msg
                            }
                        );

                        return;
                    }

                    try {

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "🔎 YouTube video එක හොයනවා..."
                            },
                            {
                                quoted: msg
                            }
                        );

                        const search =
                            await ytSearch(args);

                        if (
                            !search.videos ||
                            !search.videos.length
                        ) {
                            throw new Error(
                                "Video not found"
                            );
                        }

                        const video =
                            search.videos[0];

                        const api =
                            `https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(video.url)}`;

                        const response =
                            await axios.get(api);

                        const videoUrl =
                            response.data?.result?.download_url;

                        if (!videoUrl) {
                            throw new Error(
                                "Video URL unavailable"
                            );
                        }

                        await sock.sendMessage(
                            remoteJid,
                            {
                                video: {
                                    url: videoUrl
                                },
                                caption:
                                    `🎬 *${video.title}*\n\n🇱🇰 MALIYA-X`
                            },
                            {
                                quoted: msg
                            }
                        );

                    } catch (error) {

                        console.log(
                            "Video error:",
                            error.message
                        );

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "❌ Video download කරන්න බැරි වුණා."
                            },
                            {
                                quoted: msg
                            }
                        );
                    }

                    return;
                }

                // ===============================
                // .SOCIAL / .DL
                // ===============================

                if (
                    cmd === ".social" ||
                    cmd === ".dl"
                ) {

                    if (!args) {

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "🌐 Social media URL එක දෙන්න."
                            },
                            {
                                quoted: msg
                            }
                        );

                        return;
                    }

                    try {

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "📥 Downloading..."
                            },
                            {
                                quoted: msg
                            }
                        );

                        const api =
                            `https://apis.davidcyriltech.my.id/download/all?url=${encodeURIComponent(args)}`;

                        const response =
                            await axios.get(api);

                        const result =
                            response.data?.result;

                        const videoUrl =
                            result?.download_url ||
                            result?.url ||
                            result?.video;

                        if (!videoUrl) {
                            throw new Error(
                                "Video URL unavailable"
                            );
                        }

                        await sock.sendMessage(
                            remoteJid,
                            {
                                video: {
                                    url: videoUrl
                                },
                                caption:
                                    "📥 Downloaded by MALIYA-X 🇱🇰"
                            },
                            {
                                quoted: msg
                            }
                        );

                    } catch (error) {

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "❌ Download failed. URL එක check කරන්න."
                            },
                            {
                                quoted: msg
                            }
                        );
                    }

                    return;
                }

                // ===============================
                // STICKER
                // ===============================

                if (
                    cmd === ".sticker" ||
                    cmd === ".s"
                ) {

                    try {

                        let imageMessage = null;

                        if (
                            msg.message.imageMessage
                        ) {

                            imageMessage =
                                msg.message.imageMessage;

                        } else if (
                            msg.message.extendedTextMessage
                                ?.contextInfo
                                ?.quotedMessage
                                ?.imageMessage
                        ) {

                            imageMessage =
                                msg.message
                                    .extendedTextMessage
                                    .contextInfo
                                    .quotedMessage
                                    .imageMessage;
                        }

                        if (!imageMessage) {

                            await sock.sendMessage(
                                remoteJid,
                                {
                                    text:
                                        "🖼️ Image එකක් send/quote කරලා `.sticker` දාන්න."
                                },
                                {
                                    quoted: msg
                                }
                            );

                            return;
                        }

                        const stream =
                            await downloadContentFromMessage(
                                imageMessage,
                                "image"
                            );

                        const chunks = [];

                        for await (
                            const chunk of stream
                        ) {
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

                    } catch (error) {

                        console.log(
                            "Sticker error:",
                            error.message
                        );

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "❌ Sticker හදන්න බැරි වුණා."
                            },
                            {
                                quoted: msg
                            }
                        );
                    }

                    return;
                }

                // ===============================
                // GROUP INFO
                // ===============================

                if (cmd === ".groupinfo") {

                    if (!remoteJid.endsWith("@g.us")) {

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "❌ මේ command එක group එකක විතරයි."
                            },
                            {
                                quoted: msg
                            }
                        );

                        return;
                    }

                    try {

                        const metadata =
                            await sock.groupMetadata(
                                remoteJid
                            );

                        const admins =
                            metadata.participants.filter(
                                p => p.admin
                            ).length;

                        const { date, time } =
                            sriLankaTime();

                        const info = `
╭━━〔 👥 GROUP INFO 〕━━╮

👥 *Group:* ${metadata.subject}

🆔 *ID:* ${metadata.id}

👤 *Members:* ${metadata.participants.length}

👑 *Admins:* ${admins}

📅 *Date:* ${date}

🕐 *Time:* ${time}

╰━━━━━━━━━━━━━━━━━━━━╯

🇱🇰 *MALIYA-X*
`;

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text: info
                            },
                            {
                                quoted: msg
                            }
                        );

                    } catch (error) {

                        console.log(
                            "Group info error:",
                            error.message
                        );
                    }

                    return;
                }

                // ===============================
                // TAG ALL
                // ===============================

                if (cmd === ".tagall") {

                    if (!remoteJid.endsWith("@g.us")) {

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text:
                                    "❌ Group එකක විතරයි."
                            },
                            {
                                quoted: msg
                            }
                        );

                        return;
                    }

                    try {

                        const metadata =
                            await sock.groupMetadata(
                                remoteJid
                            );

                        const participants =
                            metadata.participants;

                        let message =
                            "📢 *MALIYA-X TAG ALL* 🇱🇰\n\n";

                        const mentions = [];

                        for (
                            const participant
                            of participants
                        ) {

                            const number =
                                participant.id.split("@")[0];

                            message +=
                                `👤 @${number}\n`;

                            mentions.push(
                                participant.id
                            );
                        }

                        await sock.sendMessage(
                            remoteJid,
                            {
                                text: message,
                                mentions
                            },
                            {
                                quoted: msg
                            }
                        );

                    } catch (error) {

                        console.log(
                            "Tagall error:",
                            error.message
                        );
                    }

                    return;
                }

                // ===============================
                // FUN COMMANDS
                // ===============================

                if (cmd === ".joke") {

                    const jokes = [
                        "😂 Teacher: Why are you late? Student: Because of the sign. Teacher: What sign? Student: School ahead, go slow! 😂",
                        "🤣 WiFi went down for 5 minutes. I had to talk to my family. They seem like nice people.",
                        "😂 My phone battery and I have something in common... We both get tired quickly."
                    ];

                    const joke =
                        jokes[
                            Math.floor(
                                Math.random() *
                                jokes.length
                            )
                        ];

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text:
                                `😂 *JOKE*\n\n${joke}`
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

                if (cmd === ".quote") {

                    const quotes = [
                        "✨ Believe in yourself.",
                        "🔥 Never give up.",
                        "🌱 Small steps every day.",
                        "💪 Your future needs you."
                    ];

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text:
                                `💡 *QUOTE*\n\n${
                                    quotes[
                                        Math.floor(
                                            Math.random() *
                                            quotes.length
                                        )
                                    ]
                                }`
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

                if (cmd === ".fact") {

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text:
                                "🧠 *FACT*\n\nOctopuses have three hearts! 🐙❤️"
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

                if (cmd === ".motivate") {

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text:
                                "💪 *MOTIVATION*\n\nඔයාට බැරි කියලා හිතන තැනින් තමයි ඔයාගේ real power එක පටන් ගන්නේ. 🔥\n\nNever give up! ❤️"
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

                if (cmd === ".morning") {

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text:
                                "🌅 *GOOD MORNING!*\n\nඔයාට ලස්සනම දවසක් වේවා! ❤️🇱🇰\n\n👑 MALIYA-X"
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

                if (cmd === ".night") {

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text:
                                "🌙 *GOOD NIGHT!*\n\nහොඳින් නිදාගන්න. හෙට අලුත් දවසක්! ❤️✨\n\n👑 MALIYA-X"
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

                if (cmd === ".respect") {

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text:
                                "❤️ *RESPECT*\n\nRespect everyone, especially those who respect you. 🤝"
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

                if (cmd === ".friend") {

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text:
                                "🤝 *FRIEND*\n\nහොඳ යාළුවෙක් කියන්නේ අමාරු වෙලාවකත් ළඟ ඉන්න කෙනෙක්. ❤️"
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

                if (cmd === ".life") {

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text:
                                "🌱 *LIFE*\n\nLife is short. Smile more, worry less and enjoy every moment. ❤️"
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

                if (cmd === ".challenge") {

                    await sock.sendMessage(
                        remoteJid,
                        {
                            text:
                                "🎯 *CHALLENGE*\n\nඅද පැය 1ක් phone එක පැත්තක තියලා තමන්ගේ future එක වෙනුවෙන් වැඩක් කරන්න! 🔥"
                        },
                        {
                            quoted: msg
                        }
                    );

                    return;
                }

            } catch (error) {

                console.log(
                    "Message handler error:",
                    error.message
                );
            }
        }
    );
}

// ===============================
// START
// ===============================

startMaliya().catch(error => {

    console.log(
        "❌ Fatal error:",
        error
    );

    setTimeout(() => {
        startMaliya();
    }, 5000);
});
