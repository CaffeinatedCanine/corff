module.exports = {
  name: "clientReady",
  once: true,
  execute(client) {
    const { PresenceUpdateStatus } = require("discord.js");

    client.user.setPresence({
      activities: [{ name: "Dragon Age" }],
      status: PresenceUpdateStatus.Online,
    });
  },
};
