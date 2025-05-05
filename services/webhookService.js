const axios = require('axios');

async function sendDiscordWebhook(webhookUrl, payload) {
  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (err) {
    console.error('Error sending webhook:', err.message);
    throw err;
  }
}

module.exports = { sendDiscordWebhook };