require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
  Partials,
  Options,
} = require("discord.js");
const {
  logMessageEdit,
  logMessageDelete,
  logUserUpdate,
  logUserJoin,
  logUserLeave,
  logUserUpdateFromUserEvent,
  cacheInvites,
  setupLogger,
} = require("./logger/index.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites, // Required for invite tracking
  ],
  makeCache: Options.cacheWithLimits({
    MessageManager: 10000,
  }),
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();

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
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      flags: 64,
    });
  }
});

// Cache invites when bot joins a new guild
client.on("guildCreate", async (guild) => {
  await cacheInvites(guild);
});

// Cache invites when bot starts up
client.on(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  setupLogger(client);

  // Cache invites for all guilds
  for (const guild of client.guilds.cache.values()) {
    await cacheInvites(guild);
  }
});

client.on("guildMemberAdd", (member) => {
  logUserJoin(member);
});

client.on("guildMemberRemove", (member) => {
  logUserLeave(member);
});

client.on("guildMemberUpdate", (oldMember, newMember) => {
  logUserUpdate(oldMember, newMember);
});

client.on("userUpdate", (oldUser, newUser) => {
  logUserUpdateFromUserEvent(oldUser, newUser);
});

client.on("messageUpdate", (oldMessage, newMessage) => {
  logMessageEdit(oldMessage, newMessage);
});

client.on("messageDelete", (message) => {
  logMessageDelete(message);
});

client.login(process.env.TOKEN);
