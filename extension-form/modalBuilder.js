const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const formatDate = require('../utils/formatDate');
const { logInfo } = require('../utils/logger');

function getTomorrowDate() {
	const today = new Date();
	today.setDate(today.getDate() + 1);
	return formatDate(today.toISOString());
}

function createExtensionFormModal() {
	logInfo('Creating extension request modal');

	const modal = new ModalBuilder()
		.setCustomId('extensionForm')
		.setTitle('Extension Request Form');

	modal.addComponents(
		new ActionRowBuilder().addComponents(
			new TextInputBuilder()
				.setCustomId('ao3Handle')
				.setLabel('Your AO3 Handle')
				.setStyle(TextInputStyle.Short)
				.setRequired(true)
		),
		new ActionRowBuilder().addComponents(
			new TextInputBuilder()
				.setCustomId('email')
				.setLabel('Your Email')
				.setStyle(TextInputStyle.Short)
				.setRequired(true)
		),
		new ActionRowBuilder().addComponents(
			new TextInputBuilder()
				.setCustomId('extensionDate')
				.setLabel('Extension Date (YYYY-MM-DD)')
				.setPlaceholder(getTomorrowDate())
				.setStyle(TextInputStyle.Short)
				.setRequired(true)
		),
		new ActionRowBuilder().addComponents(
			new TextInputBuilder()
				.setCustomId('preference')
				.setLabel('Contact Preference (Email or Discord)')
				.setPlaceholder('Email | Discord')
				.setStyle(TextInputStyle.Short)
				.setRequired(true)
		)
	);

	return modal;
}

module.exports = { createExtensionFormModal };