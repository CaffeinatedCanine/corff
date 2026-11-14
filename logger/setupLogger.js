function setupLogger(client) {
  const channelId = process.env.LOG_CHANNEL;

  console.log("🟡 Logger starting...");

  if (!channelId) {
    console.warn("⚠️  LOG_CHANNEL is missing in .env");
    return;
  }

  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.warn(`⚠️  Logger could not find channel with ID ${channelId}`);
    return;
  }

  console.log(`🟢 Logger active. Logging to #${channel.name} (${channelId})`);
}

module.exports = setupLogger;
