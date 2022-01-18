module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    console.log("Interaction created.");
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      console.log("Awaiting command execution");
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
