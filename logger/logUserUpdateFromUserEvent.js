const { EmbedBuilder } = require('discord.js');
const getLogChannel = require('./getLogChannel');

function logUserUpdateFromUserEvent(oldUser, newUser) {
    // Loop through all guilds the bot is in
    newUser.client.guilds.cache.forEach(guild => {
        const member = guild.members.cache.get(newUser.id);
        if (!member) return;

        const logChannel = getLogChannel(guild, "userUpdate");
        if (!logChannel) return;

        // --- USERNAME CHANGE ---
        if (oldUser.username !== newUser.username) {
            const embed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle('Username Changed')
                .setAuthor({
                    name: newUser.username,
                    iconURL: newUser.displayAvatarURL()
                })
                .addFields(
                    { name: 'Before', value: oldUser.username },
                    { name: 'After', value: newUser.username }
                )
                .setFooter({ text: `User ID: ${newUser.id}` })
                .setTimestamp();

            logChannel.send({ embeds: [embed] });
        }

        // --- AVATAR CHANGE ---
        if (oldUser.displayAvatarURL() !== newUser.displayAvatarURL()) {
            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('Avatar Changed')
                .setAuthor({
                    name: newUser.username,
                    iconURL: newUser.displayAvatarURL()
                })
                .addFields(
                    { name: 'Before', value: oldUser.displayAvatarURL() },
                    { name: 'After', value: newUser.displayAvatarURL() }
                )
                .setImage(newUser.displayAvatarURL({ size: 1024 }))
                .setFooter({ text: `User ID: ${newUser.id}` })
                .setTimestamp();

            logChannel.send({ embeds: [embed] });
        }
    });
}

module.exports = logUserUpdateFromUserEvent;
