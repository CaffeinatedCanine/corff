require('dotenv').config();

module.exports = {
    '649433337370378240': { // Skyhold
        apiUrl: process.env.API_URL_A,
        sheetUrl: process.env.EXTENSION_SHEET_A,
        webhookUrl: process.env.EXTENSION_FORM_WEBHOOK_A,
        channelId: process.env.CHANNEL_ID_A,
        modRoleId: process.env.MOD_ROLE_ID_A,
        postFormDescription: 'Submit your extension request for Server A.',
        botName: 'Testing Request Form',
        botAvatar: 'https://static.wikia.nocookie.net/dragonage/images/3/31/Dav_solas_hair.png',
    },
    '946087296829124639': { // Arlathan
        apiUrl: process.env.API_URL_B,
        sheetUrl: process.env.EXTENSION_SHEET_B,
        webhookUrl: process.env.EXTENSION_FORM_WEBHOOK_B,
        channelId: process.env.CHANNEL_ID_B,
        modRoleId: process.env.MOD_ROLE_ID_B,
        postFormDescription: `If you need an extension for your Arlathan eXchange Assignment, please click the button below and complete the form that appears, or access the form directly on our website at [this address](https://arlathanxchange.neocities.org/extensionrequest/). Make sure to submit your request before the initial due date of the exchange.

        	**__Please note:__** All assignments are due by **<t:1748206800:t>** on the __assigned extension date__. If an assignment misses the initial due date or the extension deadline, and we have not received any communication from the participant, the mods may assign it to a pinch hitter.

        	We will only use the method of communication you provide below to contact you about this request and follow-up if necessary. Your email or Discord handle will not be used for any other purpose and will be deleted from our records once the exchange is completed.

        	**__Important:__** Your extension is not official until you receive confirmation from us!`,
        botName: 'Extension Request Form',
        botAvatar: 'https://static.wikia.nocookie.net/dragonage/images/3/31/Dav_solas_hair.png',
      },
  };
  