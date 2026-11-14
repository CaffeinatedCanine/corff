const buildUserUpdateEmbeds = require('./embeds/userUpdateEmbed');
const getLogChannel = require('./getLogChannel');

async function logUserUpdate(oldMember, newMember) {
    const logChannel = getLogChannel(newMember.guild, "userUpdate");
    if (!logChannel) return;

    const embeds = buildUserUpdateEmbeds(oldMember, newMember);

    for (const embed of embeds) {
        logChannel.send({ embeds: [embed] });
    }
}

module.exports = logUserUpdate;