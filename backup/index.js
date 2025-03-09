require('dotenv').config({ path: 'kunci.env' });
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot berhasil login sebagai ${client.user.tag}`);
});

client.on('messageCreate', async msg => {
    if (msg.author.bot) return;  // Hindari bot merespons dirinya sendiri

    console.log(`Pesan terdeteksi dari: ${msg.channel.id} -> ${msg.channel.name}: ${msg.content}`);

    if (msg.channel.id === process.env.SOURCE_CHANNEL_ID) {
        console.log(`🔄 Mirroring ke ${process.env.TARGET_CHANNEL_ID}`);

        try {
            const targetChannel = await client.channels.fetch(process.env.TARGET_CHANNEL_ID);
            if (targetChannel) {
                console.log(`✅ Mengirim pesan ke ${targetChannel.name}`);
                await targetChannel.send(` ${msg.content}`);
            } else {
                console.error('❌ Gagal mendapatkan channel target.');
            }
        } catch (err) {
            console.error('⚠️ Error mengirim pesan:', err);
        }
    }
});

client.login(process.env.TOKEN);
