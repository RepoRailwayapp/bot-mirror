require("dotenv").config(); // Load .env file
const axios = require("axios");
const fs = require("fs");

// Token User API
const TOKEN = process.env.DISCORD_TOKEN;

// Array Channel ID dari Server A
const CHANNEL_IDS = [
    "1346007591570112556", // channel general
    "1346066694723993700" // channel umum
    // "1228962492076785785", // Pojok - Ncek
    // "1258709288994607250", // Pojok - AVS
    // "1184295348466876437", // Act - Bitcoin
    // "1153033344804733029", // Act - Alts
    // "1250988860624736278", // Market - Updates
    // "1186482371596398593", // Rahasia - Market
    // "1241256779564711938", // Smart - Money
    // "1319121612750061608" // Web - Corner
];

// Array Webhook URL untuk Server B
const WEBHOOK_URLS = [
    "https://discord.com/api/webhooks/1346008467592314911/ZKGl-6hU2RIdIONtl76icOQtqBNJE9XDEbBsxVSn_VBBcvvcnfUjUxLMQI-Z-Q4UgMOm", // Webhook channel general
    "https://discord.com/api/webhooks/1346067198913024010/JRolTzCR1hJd-msOKtRPq7YkAtmkwPQV5GS74LSo_TnfxrPAmgFHtw8rFMLwx2YKE_ts" // Webhook channel umum
    //"https://discord.com/api/webhooks/1345110057318350899/amNWqRvNS0aimy2P5Opo_ZZKOI39QidNuX6Rq-ZMA6Q8O-f3XEY__Ogrrt__7YvQ87Rq", // Pojok - Ncek
    // "https://discord.com/api/webhooks/1346449650000990239/lZbU42fk8gQYWsM605L2sAZSumMybRsGa3fWKzQaRRg6lQsDp0aXcPYXfGS6vLm0fCQP", // Pojok - AVS
    // "https://discord.com/api/webhooks/1346449858264825897/anA0PkHEvhcWSXGsg_vu0RqE6HhUFQ6F0tlGTFE08o561ga5Uz37HCqsGxuh6IvD6le0", // Act - Bitcoin
    // "https://discord.com/api/webhooks/1346450008798527580/zkRTeXsmlehxItNe5ddWxIwU9kIODBSbNcW95rDjSbMWJW8bZpOIZuP491sCXlTE8wJf", // Act - Alts
    // "https://discord.com/api/webhooks/1346450112431390831/nifdNqfed58NrKuxwMzvP63D_p-6XoiN4CLic_CxGvsMlDboJTNCRN-kGSbs1v-Ayd95", // Market - Updates
    // "https://discord.com/api/webhooks/1346450198850699314/Sd7D727xWO3A4H5YNtdUpkJfetETt0ANVB0i41bFi2z3N0la2sxy1bsPh9XgFH1N14u1", // Rahasia - Market
    // "https://discord.com/api/webhooks/1346450285895352371/jVEp3URQGYefaxvkY_d3xelMo4lm0HxviEZTM75lA5fcNz7m5_5-PGSfUKrcGcqKMrFA", // Smart - Money
    // "https://discord.com/api/webhooks/1346450375057608785/wMaukb_8jcZ_m6GuWkBgEh-9ItrtAkYQsIu2AOHeQf2-d63_YHtiqXuartsiBUWi4epg" // Web - Corner
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
