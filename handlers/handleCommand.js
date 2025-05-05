module.exports = async function handleCommand(client, interaction, config) {
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    if (command.requiresDefer) {
      await interaction.deferReply({ flags: 64 });
    }
    // pass config into the individual commands
    await command.execute(interaction, config);
  } catch (error) {
    console.error('Error executing command:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: 'Error executing command.', flags: 64 });
    }
  }
};