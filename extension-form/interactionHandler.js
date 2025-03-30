require('dotenv').config();
const axios = require('axios');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { createEditEmbedModal } = require('./editEmbedModal'); // Import Edit Modal creation function
const { createExtensionFormModal } = require('./modalBuilder'); // Import Form Modal creation function

const apiURL = process.env.API_URL;
const modsRoleId = process.env.MODS_ROLE_ID;
const channelId = process.env.CHANNEL_ID;

// Fetch extension data from the external API
async function fetchExtensionData() {
    try {
        const response = await axios.get(apiURL);
        if (response.headers['content-type'].includes('application/json')) {
            console.log('Fetched extension data:', response.data);
            return response.data;
        } else {
            console.error('Invalid response format:', response.data);
            return [];
        }
    } catch (error) {
        console.error(`Error fetching extension data: ${error.message}`);
        return [];
    }
}

// Check for past-due extensions and update embeds
async function checkForPastDueExtensions(client) {
    try {
        const extensionData = await fetchExtensionData();
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            console.error('Channel not found');
            return;
        }

        const messages = await channel.messages.fetch({ limit: 100 });

        messages.forEach(async (message) => {
            if (
                message.embeds.length > 0 &&
                message.embeds[0].footer &&
                message.embeds[0].footer.text.includes('ExtensionHook')
            ) {
                const embed = message.embeds[0];
                const uniqueId = embed.footer.text.match(/ID: (\d+)/)?.[1];
                if (!uniqueId) {
                    console.error('Unique ID not found in embed footer.');
                    return;
                }

                const extensionEntry = extensionData.find(entry => entry.uniqueId.toString() === uniqueId);
                if (extensionEntry) {
                    const extensionDate = new Date(extensionEntry.extensionDate);
                    const now = new Date();

                    if (!isNaN(extensionDate.getTime()) && now > extensionDate && extensionEntry.status !== 'Fulfilled') {
                        const newEmbedFields = [
                            { name: 'Extension To', value: extensionDate.toISOString().split('T')[0], inline: true },
                            { name: 'Status', value: 'Past Due', inline: true },
                            { name: 'Contact through', value: extensionEntry.preference, inline: true },
                            { name: 'AO3 Handle', value: extensionEntry.ao3, inline: true },
                            { name: 'Discord', value: extensionEntry.discord, inline: true },
                            { name: 'Email', value: extensionEntry.email, inline: false },
                        ];

                        const newEmbed = new EmbedBuilder()
                            .setTitle('💀 Extension Request - Past Due 💀')
                            .setColor('#FF0000')
                            .setDescription('This extension request is past due.\nPlease take appropriate action.')
                            .setFields(newEmbedFields)
                            .setFooter({ text: embed.footer.text });

                        if (message.author.id === client.user.id) {
                            await message.edit({ embeds: [newEmbed] });

                            await channel.send({
                                content: `<@&${modsRoleId}> This extension request (ID: ${uniqueId}) is now past due.`,
                                reply: { messageReference: message.id },
                            });
                        }

                        const data = { discord: 'system', status: 'Past Due', uniqueId };
                        await axios.post(apiURL, data);
                    }
                }
            }
        });
    } catch (error) {
        console.error(`Error checking for past-due extensions: ${error.message}`);
    }
}

// Helper function to create the button row dynamically
function createButtonRow(footerText, action) {
    const uniqueId = footerText.match(/ID:\s*(\d+)/)?.[1];
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`status_Approved_${uniqueId}`) // Ensure proper format
            .setLabel('Approved')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(action === 'Approved' || action === 'Fulfilled' || action === 'Rejected'),
        new ButtonBuilder()
            .setCustomId(`status_WaitingForUpdate_${uniqueId}`)
            .setLabel('Waiting for Update')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(action === 'Fulfilled' || action === 'Rejected'),
        new ButtonBuilder()
            .setCustomId(`status_Fulfilled_${uniqueId}`)
            .setLabel('Fulfilled')
            .setStyle(ButtonStyle.Success)
            .setDisabled(action === 'Fulfilled' || action === 'Rejected'),
        new ButtonBuilder()
            .setCustomId(`status_Rejected_${uniqueId}`)
            .setLabel('Rejected')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(action === 'Rejected'),
        new ButtonBuilder()
            .setCustomId(`edit_${uniqueId}`) // Ensure proper format
            .setLabel('Edit')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(false)
    );
}

// Handle webhook embeds and attach buttons
async function handleNewMessage(message) {
    if (
        message.embeds.length > 0 &&
        message.embeds[0].footer &&
        message.embeds[0].footer.text.includes('ExtensionHook') &&
        message.author.id !== message.client.user.id
    ) {
        const embed = message.embeds[0];
        const row = createButtonRow(embed.footer.text, null);

        try {
            await message.delete();
            await message.channel.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error(`Error processing message: ${error.message}`);
        }
    }
}

// Handle button interactions (e.g., Edit, Approve, Fulfill, Reject)
async function handleButtonInteraction(interaction) {
    if (!interaction.isButton()) return; // Ensure only button interactions are processed

    try {
        const customId = interaction.customId; // Extract the button's custom ID

        // **Handle "Submit Extension Request" Button**
        if (customId === 'start_form') {
            console.log('Submit Extension Request button clicked.');
            const modal = createExtensionFormModal(); // Dynamically create the submission modal
            await interaction.showModal(modal);
            return; // Exit after handling the submit form
        }

        // **Check if Button is an "Edit" Request**
        if (customId.startsWith('edit_')) {
            const uniqueId = customId.split('_')[1]; // Extract the unique ID
            if (!uniqueId || isNaN(uniqueId)) {
                console.error(`Invalid or missing unique ID in edit custom ID: ${customId}`);
                await interaction.reply({
                    content: 'Unique ID is missing or invalid for the edit action. Please contact support.',
                    ephemeral: true,
                });
                return;
            }

            console.log(`Edit button clicked for uniqueId: ${uniqueId}`);
            try {
                const modal = await createEditEmbedModal(uniqueId); // Dynamically create the edit modal
                await interaction.showModal(modal); // Show the modal
            } catch (error) {
                console.error(`Error handling Edit button: ${error.message}`);
                if (!interaction.replied) {
                    await interaction.reply({
                        content: 'Failed to open the edit modal. Please try again later.',
                        ephemeral: true,
                    });
                }
            }
            return; // Exit after handling the edit action
        }

        // **Check if Button is a "Status" Update**
        if (customId.startsWith('status_')) {
            const parts = customId.split('_'); // Format expected: status_<Action>_<UniqueID>
            const action = parts[1]; // Extract the action (e.g., Approved, WaitingForUpdate, etc.)
            const uniqueId = parts[2]; // Extract the unique ID

            // **Validate Action and Unique ID**
            if (!action || !uniqueId || isNaN(uniqueId)) {
                console.error(`Invalid or missing unique ID in status custom ID: ${customId}`);
                await interaction.reply({
                    content: 'Unique ID or action is missing or invalid for the status update. Please contact support.',
                    ephemeral: true,
                });
                return;
            }

            console.log(`Status button clicked for uniqueId: ${uniqueId}, action: ${action}`);

            const statusMap = {
                Approved: {
                    status: 'Approved',
                    color: '#800080',
                    title: '👍 Extension Request - Approved 👍',
                    description: 'This extension request has been approved. \nThe participant has been contacted.',
                },
                WaitingForUpdate: {
                    status: 'Waiting for Update',
                    color: '#FFFF00',
                    title: '🕰️ Extension Request - Waiting for Update 🕰️',
                    description: 'The request is waiting for additional updates. \nSee eventual notes.',
                },
                Fulfilled: {
                    status: 'Fulfilled',
                    color: '#008000',
                    title: '✅ Extension Request - Fulfilled ✅',
                    description: 'The assignment has been fulfilled. 🎉 \nThe request is now closed.',
                },
                Rejected: {
                    status: 'Rejected',
                    color: '#FF0000',
                    title: '❌ Extension Request - Rejected ❌',
                    description: 'This extension has been rejected.\nThe request is now closed.',
                },
            };

            const statusUpdate = statusMap[action]; // Get the status update object
            if (!statusUpdate) {
                console.error(`Invalid action triggered: ${action}`);
                await interaction.reply({
                    content: `Unknown action: ${action}. Please contact support if this persists.`,
                    ephemeral: true,
                });
                return; // Exit on invalid action
            }

            // **Defer Interaction Response**
            await interaction.deferReply({ ephemeral: true }); // Prevent timeouts during processing

            // **Prepare Data for API Request**
            const data = {
                discord: interaction.user.username,
                status: statusUpdate.status,
                uniqueId, // Ensure this is the clean numeric ID
                date: new Date().toISOString(), // Optional: Timestamp for the API
            };

            console.log(`Processing status update: ${JSON.stringify(data, null, 2)}`);

            // **Send Data to the API**
            try {
                const response = await axios.post(apiURL, data); // Send data to the API
                console.log('API Response:', response.data);

                if (response.status !== 200 || !response.data?.message) {
                    console.error('API Error Response:', response.data);
                    throw new Error(`API error: ${response.data?.message || 'Unknown error'}`);
                }

                // **Update the Embed with New Status**
                const updatedEmbed = new EmbedBuilder()
                    .setTitle(statusUpdate.title)
                    .setColor(statusUpdate.color)
                    .setDescription(statusUpdate.description)
                    .setFields(
                        interaction.message.embeds[0].fields.map(field =>
                            field.name === 'Status' ? { name: 'Status', value: statusUpdate.status, inline: true } : field
                        )
                    )
                    .setFooter(interaction.message.embeds[0]?.footer);

                // Update the message on Discord
                await interaction.message.edit({ embeds: [updatedEmbed] });
                await interaction.editReply({ content: `Status updated to: ${statusUpdate.status}` });
            } catch (apiError) {
                console.error(`API Error while processing status update: ${apiError.message}`);
                await interaction.followUp({
                    content: 'Failed to update the status in the system. Please try again later.',
                    ephemeral: true,
                });
            }
            return; // Exit after handling the status update
        }

        // If the customId doesn't match known patterns
        console.error(`Unknown button interaction custom ID: ${customId}`);
        await interaction.reply({
            content: 'Unknown button action. Please contact support.',
            ephemeral: true,
        });
    } catch (error) {
        console.error(`Error handling button interaction: ${error.message}`);
        if (!interaction.replied) {
            await interaction.reply({
                content: 'An unexpected error occurred while processing your request. Please try again.',
                ephemeral: true,
            });
        }
    }
}

module.exports = {
    fetchExtensionData,
    checkForPastDueExtensions,
    handleNewMessage,
    handleButtonInteraction,
};