const serverConfigs = require('../serverConfig');

function getServerConfig(guildId) {
  const config = serverConfigs[guildId];

  if (!config) {
    console.warn(`⚠️ No server config found for guild ID: ${guildId}`);
    return null;
  }

  const requiredFields = ['apiUrl', 'webhookUrl', 'channelId', 'modRoleId'];
  for (const field of requiredFields) {
    if (!config[field]) {
      console.warn(`⚠️ Missing "${field}" in config for guild ID: ${guildId}`);
    }
  }

  return config;
}

module.exports = getServerConfig;
