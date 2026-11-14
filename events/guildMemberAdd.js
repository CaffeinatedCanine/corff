const { Events } = require("discord.js");

const WELCOME_CHANNEL_ID = "589053914175766528";
const GENERAL_CHANNEL_ID = "588775705794445324";
const WELCOME_PING_ROLE_ID = "759241039286108181";

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,

  async execute(member) {
    if (!process.env.WELCOME_GUILD_ID) {
      console.warn(
        "[guildMemberAdd] WELCOME_GUILD_ID is not set; skipping welcome messages.",
      );
      return;
    }
    if (member.guild.id !== process.env.WELCOME_GUILD_ID) return;
    if (member.user.bot) return;

    const username = member.user.username;

    const welcomeMessage =
      `# ${username}, welcome!\n\n` +
      `Your application has been accepted. You can check out <#675882498445672459> to add more roles for yourself, ` +
      `post an (optional) introduction in <#589053931704025098> (check out the pinned post for a template!) ` +
      `and say hello to everyone in <#588775705794445324>.`;

    const generalMessage =
      `<@&${WELCOME_PING_ROLE_ID}> **Hey everyone!** ${username} has joined us as a new member. Say hello! ` +
      `${username}, feel free to make yourself at home by adding <#675882498445672459>, ` +
      `introducing yourself in <#589053931704025098>, and checking out the rest of our channels. ` +
      `If you get lost, feel free to check out the <#617149628323987457>.`;

    const sends = [
      {
        id: WELCOME_CHANNEL_ID,
        content: welcomeMessage,
        allowedMentions: { parse: [] },
      },
      {
        id: GENERAL_CHANNEL_ID,
        content: generalMessage,
        allowedMentions: { roles: [WELCOME_PING_ROLE_ID] },
      },
    ];

    for (const { id, content, allowedMentions } of sends) {
      try {
        const channel =
          member.guild.channels.cache.get(id) ??
          (await member.guild.channels.fetch(id));

        if (!channel?.isTextBased()) {
          console.error(
            `[guildMemberAdd] Channel ${id} not found or not text-based.`,
          );
          continue;
        }

        await channel.send({ content, allowedMentions });
      } catch (err) {
        console.error(`[guildMemberAdd] Failed to send message in ${id}:`, err);
      }
    }
  },
};
