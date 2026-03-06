const { EmbedBuilder } = require("discord.js");

function buildUserUpdateEmbeds(oldMember, newMember) {
  const embeds = [];

  // BOOSTING / UNBOOSTING
  if (!oldMember.premiumSince && newMember.premiumSince) {
    embeds.push(
      new EmbedBuilder()
        .setColor("Fuchsia")
        .setTitle("Server Boosted")
        .setAuthor({
          name: newMember.user.username,
          iconURL: newMember.user.displayAvatarURL(),
        })
        .setDescription(`${newMember} has boosted the server!`)
        .setFooter({ text: `User ID: ${newMember.id}` })
        .setTimestamp()
    );
  }

  if (oldMember.premiumSince && !newMember.premiumSince) {
    embeds.push(
      new EmbedBuilder()
        .setColor("Grey")
        .setTitle("Boost Removed")
        .setAuthor({
          name: newMember.user.username,
          iconURL: newMember.user.displayAvatarURL(),
        })
        .setDescription(`${newMember} has stopped boosting the server.`)
        .setFooter({ text: `User ID: ${newMember.id}` })
        .setTimestamp()
    );
  }

  // USERNAME CHANGE
  if (oldMember.user.username !== newMember.user.username) {
    embeds.push(
      new EmbedBuilder()
        .setColor("Blue")
        .setTitle("Username Changed")
        .setAuthor({
          name: newMember.user.username,
          iconURL: newMember.user.displayAvatarURL(),
        })
        .addFields(
          { name: "Before", value: oldMember.user.username },
          { name: "After", value: newMember.user.username }
        )
        .setFooter({ text: `User ID: ${newMember.id}` })
        .setTimestamp()
    );
  }

  // AVATAR CHANGE
  if (oldMember.user.displayAvatarURL() !== newMember.user.displayAvatarURL()) {
    embeds.push(
      new EmbedBuilder()
        .setColor("Green")
        .setTitle("Avatar Changed")
        .setAuthor({
          name: newMember.user.username,
          iconURL: newMember.user.displayAvatarURL(),
        })
        .addFields(
          { name: "Before", value: oldMember.user.displayAvatarURL() },
          { name: "After", value: newMember.user.displayAvatarURL() }
        )
        .setImage(newMember.user.displayAvatarURL({ size: 1024 }))
        .setFooter({ text: `User ID: ${newMember.id}` })
        .setTimestamp()
    );
  }

  // ROLE CHANGES
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  const addedRoles = newRoles.filter((r) => !oldRoles.has(r.id));
  const removedRoles = oldRoles.filter((r) => !newRoles.has(r.id));

  if (addedRoles.size > 0) {
    embeds.push(
      new EmbedBuilder()
        .setColor("Gold")
        .setTitle("Roles Added")
        .setAuthor({
          name: newMember.user.username,
          iconURL: newMember.user.displayAvatarURL(),
        })
        .addFields({
          name: "Added",
          value: addedRoles.map((r) => r.toString()).join(", "),
        })
        .setFooter({ text: `User ID: ${newMember.id}` })
        .setTimestamp()
    );
  }

  if (removedRoles.size > 0) {
    embeds.push(
      new EmbedBuilder()
        .setColor("DarkRed")
        .setTitle("Roles Removed")
        .setAuthor({
          name: newMember.user.username,
          iconURL: newMember.user.displayAvatarURL(),
        })
        .addFields({
          name: "Removed",
          value: removedRoles.map((r) => r.toString()).join(", "),
        })
        .setFooter({ text: `User ID: ${newMember.id}` })
        .setTimestamp()
    );
  }

  return embeds;
}

module.exports = buildUserUpdateEmbeds;
