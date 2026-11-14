module.exports = {
  name: "clientReady",
  once: true,
  execute(client) {
    const { PresenceUpdateStatus } = require("discord.js");

    client.user.setPresence({
      activities: [{ name: "Can I get you a drink?" }],
      status: PresenceUpdateStatus.Online,
    });
  },
};
