module.exports = {
  name: "clientReady",
  once: true,
  execute(client) {
    const { PresenceUpdateStatus } = require("discord.js");

    console.log(`Ready! Logged in as ${client.user.tag}`);

    client.user.setPresence({
      activities: [{ name: "Dragon Age" }],
      status: PresenceUpdateStatus.Online,
    });
  },
};
