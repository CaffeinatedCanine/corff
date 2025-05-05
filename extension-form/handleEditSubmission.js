require('dotenv').config();
const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const getServerConfig = require('../utils/getServerConfig');
const { logInfo, logError } = require('../utils/logger');
const { safeReply } = require('../utils/safeReply');
const formatDate = require('../utils/formatDate');

async function handleEditSubmission(interaction) {
	if (interaction.customId !== 'edit_form') return;

	await interaction.deferReply({ flags: 64 });

	try {
    	const guildId = interaction.guildId;
    	const config = getServerConfig(guildId);
    	if (!config || !config.apiUrl) throw new Error(`Missing config or apiUrl for guild ID: ${guildId}`);

    	const footerText = interaction.message.embeds[0]?.footer?.text;
    	if (!footerText) throw new Error('Footer text is missing from the embed.');
    	const uniqueIdMatch = footerText.match(/ID:\s*(\d+)/);
    	if (!uniqueIdMatch) throw new Error('Unique ID not found in embed footer.');
    	const uniqueId = uniqueIdMatch[1];

    	const response = await axios.get(config.apiUrl);
    	const entryArray = response.data;
    	const entry = entryArray.find(row => row.uniqueId.toString() === uniqueId);
    	if (!entry) throw new Error(`No data found for uniqueId: ${uniqueId}`);
    	logInfo(`Fetched Data: ${JSON.stringify(entry)}`);

    	const discord = interaction.fields.getTextInputValue('discord') || entry.discord || '';
    	const ao3 = interaction.fields.getTextInputValue('ao3') || entry.ao3 || 'Not provided';
    	const email = interaction.fields.getTextInputValue('email') || entry.email || 'Not provided';
        const rawExtensionDate = interaction.fields.getTextInputValue('extensionDate') || entry.extensionDate || '';
        const extensionDate = formatDate(rawExtensionDate);
        const note = interaction.fields.getTextInputValue('note') || entry.note || '';
    	const status = entry.status || 'Not Contacted';
    	const preference = entry.preference || 'Discord';

    	const data = {
        	uniqueId,
        	discord,
        	ao3,
        	email,
        	extensionDate,
        	note,
        	status,
        	preference,
    	};

        logInfo(`Sending data to Google Sheets API: ${JSON.stringify(data, null, 2)}`);    	const updateResponse = await axios.post(config.apiUrl, data);
        logInfo(`Google Sheet API Response: ${JSON.stringify(updateResponse.data)}`);

    	if (updateResponse.status !== 200) {
        	throw new Error(`Google Sheet API error: ${updateResponse.data.message}`);
    	}

    	const embedFields = [
        	{ name: 'Extension To', value: extensionDate, inline: true },
        	{ name: 'Status', value: status, inline: true },
        	{ name: 'Contact Through', value: preference, inline: true },
        	{ name: 'AO3 Handle', value: ao3, inline: true },
    	];

    	if (discord) {
        	embedFields.push({ name: 'Discord', value: discord, inline: true });
    	}

    	embedFields.push({ name: 'Email', value: email, inline: false });
    	if (note) {
        	embedFields.push({ name: 'Note', value: note, inline: false });
    	}

    	const updatedEmbed = new EmbedBuilder()
        	.setTitle(interaction.message.embeds[0]?.title || 'Updated Extension Request')
        	.setColor(interaction.message.embeds[0]?.color || '#00FF00')
        	.setDescription(interaction.message.embeds[0]?.description || 'Updated information has been provided.')
        	.setFields(embedFields)
        	.setFooter({ text: footerText });

    	await interaction.message.edit({ embeds: [updatedEmbed] });
        await safeReply(interaction, 'Embed successfully updated!', true);
	} catch (error) {
    	logError(`Error handling modal submission: ${error.message}`);
        await safeReply(interaction, 'There was an error updating the embed. Please try again later.', true);
	}
}

module.exports = { handleEditSubmission };