require("dotenv").config(); // Load .env file
const axios = require("axios");
const fs = require("fs");

// Token User API
const TOKEN = process.env.DISCORD_TOKEN;

// Array Channel ID dari Server A
const CHANNEL_IDS = [
    "1345844097486946388", // ID channel chatting lobby
    "1346085376745541704", // ID channel VIP chatting
    "1346085392276787230", // ID channel photo n vidio
    "1347258754369982596", // ID channel link
    "1347258781309866076" // ID channel req-song
];

// Array Webhook URL untuk Server B
const WEBHOOK_URLS = [
    "https://discord.com/api/webhooks/1346086946254094409/CBtongj7ObnBzgpXXFB7Sh__a72bl5X5vBvhmDvQQjT4MiSgZP8scIeZYLo3AzbexydE", // Webhook channel chatting lobby
    "https://discord.com/api/webhooks/1346087577094197330/kkwLClsJbQ-MCdgkSpCh60j5tB86sdVpmgiEZdVINsXdaLr5NtUByi_3oa4KkK8K2JsO", //Webhook channel VIP chatting
    "https://discord.com/api/webhooks/1347256602691899514/YFlgZSJ6QZ3ACQP1h7dSD6U6Iby12cGi8wHu5hppgFB8kgmp3FhsGTrOtMFaRzmHM1SD", //Webhook channel photo n vidio
    "https://discord.com/api/webhooks/1347248331604234291/jPajzg_q10_muqlPUai9Lc9gJ3BMpcmC7xAV0lM6JuJIkkg439Y1Jm4ckMP8BCzASaNC", //Webhook channel link
    "https://discord.com/api/webhooks/1347248506888388648/ulD8hoS_iOBSACU-kae9mTYtEcWBO-xybRtubr0j-QR6UbWdXBQxTwOpqtUeKlX86EKg" //Webhook channel req-song
];

// File penyimpanan pesan terakhir
const LAST_MESSAGES_FILE = "last_messages.json";

// Baca file untuk menyimpan pesan terakhir
let lastMessageIDs = {};
try {
    if (fs.existsSync(LAST_MESSAGES_FILE)) {
        lastMessageIDs = JSON.parse(fs.readFileSync(LAST_MESSAGES_FILE, "utf8"));
    }
} catch (error) {
    console.error("Gagal membaca file penyimpanan:", error);
}

// Fungsi menyimpan pesan terakhir ke file
function saveLastMessages() {
    fs.writeFileSync(LAST_MESSAGES_FILE, JSON.stringify(lastMessageIDs, null, 2));
}

// Fungsi mengambil banyak pesan terbaru dari channel
async function getMessages(channelID) {
    try {
        const response = await axios.get(
            `https://discord.com/api/v9/channels/${channelID}/messages?limit=50`, // Ambil 50 pesan terbaru
            {
                headers: {
                    "Authorization": TOKEN,
                    "Content-Type": "application/json"
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error(`Gagal mengambil pesan dari channel ${channelID}:`, 
            error.response ? error.response.data : error.message);
        return [];
    }
}

// Fungsi mendapatkan URL foto profil pengguna
function getAvatarURL(user) {
    return user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;
}

// Fungsi mengirim pesan ke webhook Server B
async function sendToWebhook(username, avatarURL, content, attachments, webhookURL) {
    try {
        const messageData = {
            username: username,
            avatar_url: avatarURL,
            content: content
        };

        // Jika ada gambar, tambahkan sebagai embed
        if (attachments.length > 0) {
            messageData.embeds = attachments.map(file => ({
                image: { url: file.url }
            }));
        }

        await axios.post(webhookURL, messageData);
        console.log(`Pesan dikirim ke Server B: ${content}`);
    } catch (error) {
        console.error("Gagal mengirim pesan:", error.response ? error.response.data : error.message);
    }
}

// Loop untuk cek pesan baru setiap 2 detik
async function startMirroring() {
    console.log("Memulai mirroring chat...");
    while (true) {
        for (let i = 0; i < CHANNEL_IDS.length; i++) {
            const channelID = CHANNEL_IDS[i];
            const webhookURL = WEBHOOK_URLS[i];

            const messages = await getMessages(channelID);
            if (messages.length === 0) continue;

            // Ambil semua pesan yang belum terkirim
            const lastSavedID = lastMessageIDs[channelID] || "0";
            const newMessages = messages
                .filter(msg => msg.id > lastSavedID) // Ambil pesan yang lebih baru dari yang tersimpan
                .reverse(); // Urutkan dari yang paling lama agar tidak terbalik

            for (const msg of newMessages) {
                const content = msg.content || console.log("Mengirim gambar");
                const attachments = msg.attachments || [];
                const avatarURL = getAvatarURL(msg.author);

                await sendToWebhook(msg.author.username, avatarURL, content, attachments, webhookURL);
                lastMessageIDs[channelID] = msg.id; // Simpan ID pesan terakhir
            }

            saveLastMessages(); // Simpan data terbaru
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Tunggu 2 detik sebelum loop berikutnya
    }
}

// Jalankan mirroring
startMirroring();
