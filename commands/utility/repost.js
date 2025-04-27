// commands/utility/repost.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fetchExtensionData, createButtonRow } = require('../../extension-form/interactionHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('repost')
    .setDescription('Repost an extension embed.')
    .addStringOption(opt =>
      opt.setName('id')
         .setDescription('The unique ID of the extension request.')
         .setRequired(true)
    ),

  async execute(interaction) {
    const uniqueId = interaction.options.getString('id');
    const channel = interaction.channel;
    await interaction.deferReply({ flags: 64 });

    const extensionData = await fetchExtensionData();
    const entry = extensionData.find(e => e.uniqueId.toString() === uniqueId);
    if (!entry) {
      return interaction.editReply(`❌ No extension request found with ID: ${uniqueId}.`);
    }
    
    const rawStatus = entry.status ?? '';
    const status = rawStatus.trim().toLowerCase();
    console.log(`Reposting ID ${uniqueId} with status: "${status}"`);

    // Map status → adds title, color, and description depending on status of the ID
    let title, color, description;
    if (status === 'not contacted') {
        title = "❗ New Extension Request ❗"
        color = '#FF4500';
        description = 'A new extension request has been submitted.\nPlease review the details below:';
    }
    else if (status === 'approved') {
      title = '👍 Extension Request - Approved 👍';
      color = '#800080';
      description = 'This extension request has been approved.\nThe participant has been contacted.';
    }
    else if (status === 'waiting for update') {
      title = '🕰️ Extension Request - Waiting for Update 🕰️';
      color = '#FFFF00';
      description = 'The request is waiting for additional updates.\nSee notes below.';
    }
    else if (status === 'fulfilled') {
      title = '✅ Extension Request - Fulfilled ✅';
      color = '#008000';
      description = 'The assignment has been fulfilled. 🎉';
    }
    else if (status === 'rejected') {
      title = '❌ Extension Request - Rejected ❌';
      color = '#FF0000';
      description = 'This extension request has been rejected.';
    }
    else if (status === 'past due') {
      title = '💀 Extension Request - Past Due 💀';
      color = '#FF4500';
      description = 'This extension request is past due.\nPlease take immediate action.';
    }
    else {
      title = `Extension Request - ID: ${uniqueId}`;
      color = '#0099FF';
      description = 'Reposted extension request embed.';
    }

    // Builds the embed fields
    const formattedDate = new Date(entry.extensionDate).toISOString().split('T')[0];
    const fields = [
      { name: 'Extension To', value: formattedDate, inline: true },
      { name: 'Contact Through', value: entry.preference, inline: true },
      { name: '', value: '', inline: true },
      { name: 'AO3 Handle', value: entry.ao3, inline: true },
    ];
    if (entry.discord && entry.discord !== 'system') {
      fields.push({ name: 'Discord', value: entry.discord, inline: true });
    }
    fields.push({ name: '', value: '', inline: true });
    fields.push({ name: 'Email', value: entry.email, inline: false });
    if (entry.note) {
      fields.push({ name: 'Note', value: entry.note, inline: false });
    }

    // Creates the embed
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .setDescription(description)
      .setFields(fields)                  
      .setFooter({ text: `ID: ${uniqueId} | Submitted through ${entry.fromWhere} | ExtensionHook` });

    // Creates buttons
    const components = createButtonRow(`ID: ${uniqueId}`, entry.status, true);

    // Sends the instructions with the embed and buttons
    await channel.send({
      content: 'Go to the [Extension gSheet](https://docs.google.com/spreadsheets/d/1wWfLCTJdnj9pJmZ2sYac8y34uZM6f0kvTRx6eH2sUso/edit?gid=0) to make changes.',
      embeds: [embed],
      components
    });
  }
};