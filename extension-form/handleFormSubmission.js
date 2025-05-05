require('dotenv').config();
const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

const { logInfo, logError } = require('../utils/logger');
const { safeReply } = require('../utils/safeReply');
const formatDate = require('../utils/formatDate');
const getServerConfig = require('../utils/getServerConfig');

async function handleFormSubmission(interaction) {
	try {
		const guildId = interaction.guildId;
		const config = getServerConfig(guildId);

		if (!config?.apiUrl) {
			logError(`Missing apiUrl config for guild ${guildId}`);
			await safeReply(interaction, 'Server configuration is incomplete. Please contact a moderator.', true);
			return;
		}

		const discordName = interaction.user.username;
		const ao3Handle = interaction.fields.getTextInputValue('ao3Handle');
		const email = interaction.fields.getTextInputValue('email');
		const extensionDateRaw = interaction.fields.getTextInputValue('extensionDate');
		const extensionDate = formatDate(extensionDateRaw);
		const preference = interaction.fields.getTextInputValue('preference');

		logInfo(`Form data from ${discordName}: ${JSON.stringify({ ao3Handle, email, extensionDate, preference })}`);

		await safeReply(interaction, 'Form data received. Processing...', true);

		const data = {
			fromWhere: 'discord',
			discord: discordName,
			ao3: ao3Handle,
			email,
			extensionDate,
			preference,
			status: 'Not Contacted',
		};

		const response = await axios.post(config.apiUrl, data);
		const result = response.data;

		if (response.status === 200) {
			const embed = new EmbedBuilder()
				.setTitle('Extension Request Submitted')
				.addFields(
					{ name: 'Discord', value: discordName, inline: true },
					{ name: 'AO3 Handle', value: ao3Handle, inline: true },
					{ name: 'Email', value: email, inline: true },
					{ name: 'Extension To', value: extensionDate, inline: true },
					{ name: 'Preference', value: preference, inline: true }
				)
				.setColor('#00FF00');

			await interaction.editReply({ embeds: [embed], content: 'Request submitted successfully!', flags: 64 });
			logInfo(`Form submission successful for ${discordName}`);
		} else {
			logError(`Submission error response: ${JSON.stringify(result)}`);
			await interaction.editReply({ content: 'There was an error submitting your request. Please try again later.', flags: 64 });
		}
	} catch (error) {
		logError(`Error during form submission: ${error.message}`);
		try {
			await interaction.editReply({ content: 'There was an error processing your request. Please try again later.', flags: 64 });
		} catch (editError) {
			logError(`Edit reply failed: ${editError.message}`);
		}
	}
}

module.exports = { handleFormSubmission };