const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reaction")
    .setDescription("Reaction roles")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Adds a role reaction to a specified message")
        .addMentionableOption((option) =>
          option
            .setName("message")
            .setDescription("The message to add the role reaction to")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("The emoji to have the role reaction be")
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("The role to use for the role reaction")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("del")
        .setDescription("Removes a role reaction from a specified message")
        .addMentionableOption((option) =>
          option
            .setName("message")
            .setDescription("The message to add the role reaction to")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("The emoji to have the role reaction be")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("clear")
        .setDescription("Clears all reactions from a specified message")
        .addMentionableOption((option) =>
          option
            .setName("message")
            .setDescription("The message to add the role reaction to")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    replyMessage = "UwU";
    /*if (interaction.options.getSubcommand() === "add") {
      replyMessage = addRoleReaction(interaction);
      console.log("Reaction added");
    } else if (interaction.options.getSubcommand() === "del") {
      replyMessage = removeRoleReaction(interaction);
      console.log("Reaction delete");
    } else if (interaction.options.getSubcommand() === "clear") {
      replyMessage = clearRoleReactions(interaction);
      console.log("Reactions cleared");
    } else {
      replyMessage =
        "Role reactions\nRole reactions are used to have users click on a reaction and get a role.\nPlease use a sub-command to use the command properly.";
    }*/
    await interaction.reply({ content: replyMessage, ephemeral: true });
  },
};

async function addRoleReaction(interaction) {
  const messageid = interaction.options.getMentionable("message");
  const emoji = interaction.options.getString("emoji");
  const role = interaction.options.getRole("role");
  let message;

  try {
    message = interaction.channel.messages.fetch(messageid);
  } catch (error) {
    return "Please make sure that the message ID given is valid.";
  }

  try {
    message.react(emoji);
    return `Reaction ${emoji} added to message ${messageid}`;
  } catch (error) {
    console.error(error);
    return "Could not add the reaction.";
  }
}

async function removeRoleReaction(interaction) {
  const messageid = interaction.options.getMentionable("message");
  const emoji = interaction.options.getString("emoji");
  let message;

  try {
    message = interaction.channel.messages.fetch(messageid);
  } catch (error) {
    return "Please make sure that the message ID given is valid.";
  }

  try {
    message.reactions.cache.get(emoji).remove();
    return `Reaction ${emoji} removed from ${messageid}`;
  } catch (error) {
    console.error(error);
    return "Could not remove the reaction.";
  }
}

async function clearRoleReactions(interaction) {
  const messageid = interaction.options.getMentionable("message");
  let message;
  try {
    message = interaction.channel.messages.fetch(messageid);
  } catch (error) {
    return "Please make sure that the message ID given is valid.";
  }

  try {
    message.reactions.removeAll();
    return `All reactions removed from ${messageid}`;
  } catch (error) {
    console.error(error);
    return "Could not remove the reactions.";
  }
}
