require('dotenv').config();
const fs   = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits, Events } = require("discord.js");

const getServerConfig = require("./utils/getServerConfig");
const handleCommand = require("./handlers/handleCommand");
const handleButton = require("./handlers/handleButton");
const handleModal = require("./handlers/handleModal");
const { handleNewMessage } = require("./services/interactionService");
const { checkForPastDueExtensions } = require("./services/interactionService");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
});

client.commands = new Collection();

// ─── Load Slash Commands ───────────────────────────────────────────────────────
const commandsPath = path.join(__dirname, "commands");
for (const category of fs.readdirSync(commandsPath)) {
  const categoryPath = path.join(commandsPath, category);
  for (const file of fs.readdirSync(categoryPath).filter(f=>f.endsWith(".js"))) {
    const cmd = require(path.join(categoryPath, file));
    if (cmd.data && cmd.execute) client.commands.set(cmd.data.name, cmd);
  }
}

// ─── Interaction Create ────────────────────────────────────────────────────────
client.on("interactionCreate", async interaction => {
  // Fetch server configuration
  const guildId = interaction.guildId;
  const config  = getServerConfig(guildId);
  if (!config) {
    return interaction.reply({ content: "❌ This server is not configured.", flags: 64 });
  }

  try {
    if (interaction.isCommand()) {
      await handleCommand(client, interaction, config);
    }
    else if (interaction.isButton()) {
      await handleButton(client, interaction, config);
    }
    else if (interaction.isModalSubmit()) {
      await handleModal(client, interaction, config);
    }
  } catch (err) {
    console.error("Error in interactionCreate:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "⚠️ An error occurred.", flags: 64 });
    }
  }
});

// ─── Ready & Scheduled Tasks ──────────────────────────────────────────────────
client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  setInterval(() => checkForPastDueExtensions(client), 60*60*1000);  // Run every 1 hour
});

// ─── Handle Webhook Embeds ─────────────────────────────────────────────────────
client.on("messageCreate", message => handleNewMessage(message));

client.login(process.env.TOKEN);