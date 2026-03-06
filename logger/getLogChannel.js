const { loadLogConfig } = require('./logConfig');

function getLogChannel(guild, type) {
    const config = loadLogConfig();
    const channelId = config[type];
    if (!channelId) return null;
    return guild.channels.cache.get(channelId) || null;
}

module.exports = getLogChannel;