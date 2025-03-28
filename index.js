require('dotenv').config();
const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits, Events, InteractionType } = require("discord.js");

const { handleFormSubmission } = require('./extension-form/handleFormSubmission');
const { handleNewMessage, handleButtonInteraction, checkForPastDueExtensions } = require('./extension-form/interactionHandler');

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

// Load commands dynamically
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Main interaction handlers
async function handleCommand(interaction) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);
        await interaction.reply({ content: 'An error occurred while executing the command.', flags: 64 });
    }
}

async function handleButton(interaction) {
    try {
        console.log(`[${new Date().toISOString()}] Button interaction: ${interaction.customId}`);
        await handleButtonInteraction(interaction);
    } catch (error) {
        console.error('Error handling button interaction:', error);
        await interaction.reply({ content: 'An error occurred while processing the button interaction.', flags: 64 });
    }
}

async function handleModal(interaction) {
    try {
        console.log(`[${new Date().toISOString()}] Modal interaction: ${interaction.customId}`);
        if (interaction.customId === 'extensionForm') {
            await handleFormSubmission(interaction);
        } else {
            console.error('Unknown modal interaction:', interaction.customId);
            await interaction.reply({ content: 'Unknown modal interaction. Please contact support.', flags: 64 });
        }
    } catch (error) {
        console.error('Error handling modal interaction:', error);
        await interaction.reply({ content: 'An error occurred while processing the modal interaction.', flags: 64 });
    }
}

client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isCommand()) {
            await handleCommand(interaction);
        } else if (interaction.isButton()) {
            await handleButton(interaction);
        } else if (interaction.type === InteractionType.ModalSubmit) {
            await handleModal(interaction);
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred while processing your request.', flags: 64 });
        }
    }
});

// Run periodic tasks
client.once(Events.ClientReady, async () => {
    console.log('Bot is ready!');

    setInterval(() => {
        checkForPastDueExtensions(client);
    }, 60 * 60 * 1000); // 1 hour interval
});

// Handle new messages
client.on('messageCreate', handleNewMessage);

client.login(process.env.TOKEN);
