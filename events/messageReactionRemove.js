const RoleReactions = require('../mongoSchemas/RoleReactions');

module.exports = {
	name: 'messageReactionRemove',
	async execute(reaction, user, client) {
		// If the user is a bot, do not do anything
		if (user.bot === true) return;

		// Finds the role with the message and the emoji used
		const req = await RoleReactions.findOne({
			message: reaction.message.id,
			emoji: reaction.emoji.toString(),
		});

		// If there isn't a role reaction, then there's no need to do anything else
		if (!req) return;

		if (reaction.partial) {
			// If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
			try {
				await reaction.fetch();
			} catch (error) {
				console.error('Something went wrong when fetching the message:', error);
				// Return as `reaction.message.author` may be undefined/null
				return;
			}
		}

		// Gets the role and the member information
		const role = await reaction.message.guild.roles.fetch(req.role);
		const member = await reaction.message.guild.members.fetch(user);

		// Removes the role from the role reaction to the member
		await member.roles.remove(role);
	},
};
