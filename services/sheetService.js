const axios = require('axios');
const getServerConfig = require('../utils/getServerConfig');

function fetchapiUrl(guildId) {
  const config = getServerConfig(guildId);
  return config?.apiUrl;
}

async function fetchExtensionData(guildId) {
  const apiUrl = fetchapiUrl(guildId);
  if (!apiUrl) throw new Error('Sheet URL not configured for this server.');
  const response = await axios.get(apiUrl);
  return response.data;
}

async function updateExtensionEntry(guildId, data) {
  const apiUrl = fetchapiUrl(guildId);
  if (!apiUrl) throw new Error('Sheet URL not configured for this server.');
  return await axios.post(apiUrl, data);
}

module.exports = { 
  fetchExtensionData, 
  updateExtensionEntry 
};