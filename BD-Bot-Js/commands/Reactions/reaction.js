const { SlashCommandBuilder } = require('@discordjs/builders');
const RoleReactions = require('../../mongoSchemas/RoleReactions');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reaction')
		.setDescription('Reaction roles')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('add')
				.setDescription('Adds a role reaction to a specified message')
				.addStringOption((option) =>
					option
						.setName('message')
						.setDescription('The message to add the role reaction to')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('emoji')
						.setDescription('The emoji to have the role reaction be')
						.setRequired(true)
				)
				.addRoleOption((option) =>
					option
						.setName('role')
						.setDescription('The role to use for the role reaction')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('del')
				.setDescription('Removes a role reaction from a specified message')
				.addStringOption((option) =>
					option
						.setName('message')
						.setDescription('The message to add the role reaction to')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('emoji')
						.setDescription('The emoji to have the role reaction be')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('clear')
				.setDescription('Clears all reactions from a specified message')
				.addStringOption((option) =>
					option
						.setName('message')
						.setDescription('The message to add the role reaction to')
						.setRequired(true)
				)
		),
	async execute(interaction) {
		let replyMessage = '';
		if (interaction.options.getSubcommand() === 'add') {
			replyMessage = await addRoleReaction(interaction);
			console.log('Reaction added');
		} else if (interaction.options.getSubcommand() === 'del') {
			replyMessage = await removeRoleReaction(interaction);
			console.log('Reaction deleted');
		} else if (interaction.options.getSubcommand() === 'clear') {
			replyMessage = await clearRoleReactions(interaction);
			console.log('Reactions cleared');
		} else {
			replyMessage = 'No subcommand entered.';
		}
		await interaction.reply({ content: replyMessage, ephemeral: true });
	},
};

async function addRoleReaction(interaction) {
	const messageid = interaction.options.getString('message');
	const emoji = interaction.options.getString('emoji');
	const role = interaction.options.getRole('role');
	let message;

	try {
		message = await interaction.channel.messages.fetch(messageid);
	} catch (error) {
		return 'Please make sure that the message ID given is valid.';
	}

	try {
		const roleReact = new RoleReactions({
			message: message,
			emoji: emoji,
			role: role,
		});
		await roleReact.save();
		await message.react(emoji);
		return `Reaction ${emoji} added to message ${messageid}`;
	} catch (error) {
		console.error(error);
		return 'Could not add the reaction.';
	}
}

async function removeRoleReaction(interaction) {
	const messageid = interaction.options.getString('message');
	const emoji = interaction.options.getString('emoji');
	let message;

	try {
		message = await interaction.channel.messages.fetch(messageid);
	} catch (error) {
		return 'Please make sure that the message ID given is valid.';
	}

	try {
		const req = await RoleReactions.deleteOne({
			message: messageid,
			emoji: emoji,
		});
		if (!req) return 'Could not find that role reaction.';
		await message.reactions.cache.get(emoji).remove();
		return `Reaction ${emoji} removed from ${messageid}`;
	} catch (error) {
		console.error(error);
		return 'Could not remove the reaction.';
	}
}

async function clearRoleReactions(interaction) {
	const messageid = interaction.options.getString('message');
	let message;
	try {
		message = await interaction.channel.messages.fetch(messageid);
	} catch (error) {
		return 'Please make sure that the message ID given is valid.';
	}

	try {
		const req = await RoleReactions.deleteMany({ message: messageid });
		if (!req) return 'Could not find any role reactions to remove.';
		await message.reactions.removeAll();
		return `All reactions removed from ${messageid}`;
	} catch (error) {
		console.error(error);
		return 'Could not remove the reactions.';
	}
}
