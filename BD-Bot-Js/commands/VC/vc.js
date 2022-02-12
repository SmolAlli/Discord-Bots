const { SlashCommandBuilder } = require('@discordjs/builders');
const VoiceChats = require('../../mongoSchemas/VoiceChats');
const OverrideRoles = require('../../mongoSchemas/OverrideRoles');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('vc')
		.setDescription('Temporary Voice Channels')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('name')
				.setDescription('Edits the name of the current temporary channel')
				.addStringOption((option) =>
					option
						.setName('name')
						.setDescription('The new name of the VC')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('limit')
				.setDescription('Changes the maximum amount of users allowed in the VC')
				.addIntegerOption((option) =>
					option
						.setName('limit')
						.setDescription('The new limit for the VC')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('edit')
				.setDescription(
					'Changes the maximum amount of users allowed in the VC and the name of the VC'
				)
				.addStringOption((option) =>
					option
						.setName('name')
						.setDescription('The new name of the VC')
						.setRequired(true)
				)
				.addIntegerOption((option) =>
					option
						.setName('limit')
						.setDescription('The new limit for the VC')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('primary')
				.setDescription(
					'Adds or removes a primary VC to join to create a temporary VC'
				)
				.addStringOption((option) =>
					option
						.setName('addorremove')
						.setDescription('Whether to add or remove the primary VC specified')
						.addChoice('add', 'add')
						.addChoice('remove', 'remove')
						.setRequired(true)
				)
				.addChannelOption((option) =>
					option
						.setName('vc')
						.setDescription('The primary VC to add')
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('override')
				.setDescription('Changes the override role to the specified role')
				.addStringOption((option) =>
					option
						.setName('addorremove')
						.setDescription('Whether to add or remove the override role')
						.addChoice('add', 'add')
						.addChoice('remove', 'remove')
						.setRequired(true)
				)
				.addRoleOption((option) =>
					option
						.setName('role')
						.setDescription('The role to be used for all VC commands')
						.setRequired(true)
				)
		),
	async execute(interaction) {
		/**
		 Commands to create:
		 * Edit commands (separate ones + together, name, channel limit and both)
		 * Edit the primary channel
		 * Edit the override role
		 */
		let replyMessage = '';
		if (interaction.options.getSubcommand() === 'name') {
			replyMessage = await setVCName(interaction);
		} else if (interaction.options.getSubcommand() === 'limit') {
			replyMessage = await setVCLimit(interaction);
		} else if (interaction.options.getSubcommand() === 'edit') {
			replyMessage = await editVC(interaction);
		} else if (interaction.options.getSubcommand() === 'primary') {
			replyMessage = await primaryVC(interaction);
		} else if (interaction.options.getSubcommand() === 'override') {
			replyMessage = await overrideRole(interaction);
		} else {
			replyMessage = 'No subcommand entered.';
		}
		await interaction.reply({ content: replyMessage, ephemeral: true });
	},
};

async function getChats(interaction, type) {
	return await VoiceChats.find({
		guildid: interaction.guildId,
		type: type,
	});
}

async function checkOverridePermissions(guild, user) {
	// check if user has any of the roles within the DB
	const overrideRoles = await OverrideRoles.find({
		guild: guild.id,
	});

	overrideRoles.some((el) => {
		if (el.role in user.roles) return true;
		return false;
	});
}

async function setVCName(interaction) {
	if (!interaction.member.voice) {
		return 'You are not in a voice channel.';
	}

	const secondaryChats = await getChats(interaction, 'Secondary');

	const secondaryCheck = secondaryChats.some((el) => {
		if (el.channelid === interaction.member.voice.channelId) return true;
		return false;
	});

	if (!secondaryCheck) {
		return 'You are not in a temporary voice channel';
	}

	if (
		!(
			interaction.member === secondaryChats.owner ||
			!interaction.memberPermissions.has('MANAGE_CHANNELS', true) ||
			(await checkOverridePermissions(interaction.guild, interaction.member))
		)
	) {
		return 'You do not have permission to perform this command.';
	}

	const newName = interaction.options.getString('name');
	const channel = interaction.member.voice.channel;
	const oldName = channel.name;

	await channel.edit({ name: newName });

	return `Changed VC's name from ${oldName} to ${newName}`;
}

async function setVCLimit(interaction) {
	if (!interaction.member.voice) {
		return 'You are not in a voice channel.';
	}

	const secondaryChats = await getChats(interaction, 'Secondary');

	const secondaryCheck = secondaryChats.some((el) => {
		if (el.channelid === interaction.member.voice.channelId) return true;
		return false;
	});

	if (!secondaryCheck) {
		return 'You are not in a temporary voice channel';
	}

	if (
		!(
			interaction.member === secondaryChats.owner ||
			!interaction.memberPermissions.has('MANAGE_CHANNELS', true) ||
			(await checkOverridePermissions(interaction.guild, interaction.member))
		)
	) {
		return 'You do not have permission to perform this command.';
	}

	const newLimit = interaction.options.getInteger('limit');
	const channel = interaction.member.voice.channel;
	const oldLimit = channel.userLimit;

	await channel.edit({ limit: newLimit });

	return `Changed the VC's user limit from ${
		oldLimit < 1 ? 'no limit' : oldLimit
	} to ${newLimit < 1 ? 'no limit' : newLimit}`;
}

async function editVC(interaction) {
	if (!interaction.member.voice) {
		return 'You are not in a voice channel.';
	}

	const secondaryChats = await getChats(interaction, 'Secondary');

	const secondaryCheck = secondaryChats.some((el) => {
		if (el.channelid === interaction.member.voice.channelId) return true;
		return false;
	});

	if (!secondaryCheck) {
		return 'You are not in a temporary voice channel';
	}

	if (
		!(
			interaction.member === secondaryChats.owner ||
			!interaction.memberPermissions.has('MANAGE_CHANNELS', true) ||
			(await checkOverridePermissions(interaction.guild, interaction.member))
		)
	) {
		return 'You do not have permission to perform this command.';
	}

	const newName = interaction.options.getString('name');
	const newLimit = interaction.options.getInteger('limit');
	const channel = interaction.member.voice.channel;
	const oldName = channel.name;
	const oldLimit = channel.userLimit;

	await channel.edit({ name: newName, limit: newLimit });

	return `Changed VC's name from ${oldName} to ${newName} and the user limit from ${
		oldLimit < 1 ? 'no limit' : oldLimit
	} to ${newLimit < 1 ? 'no limit' : newLimit}`;
}

async function primaryVC(interaction) {
	// Maybe for the future: add some choices that auto-generates from the voice channels that are in the server? maybe show the category that theyre in too
	if (!interaction.memberPermissions.has('MANAGE_CHANNELS', true)) {
		return 'No permission to perform this command.';
	}
	const channel = interaction.options.getChannel('vc');
	// Check if channel is a VC
	if (!(channel.type === 'GUILD_VOICE')) {
		return 'Channel given is not a Voice Channel.';
	}

	const addOrRemove = interaction.options.getString('addorremove');

	if (addOrRemove === 'add') {
		return await addPrimaryVC(interaction, channel);
	} else {
		return await removePrimaryVC(interaction, channel);
	}
}

async function addPrimaryVC(interaction, channel) {
	const inDatabase = await VoiceChats.find({
		guild: interaction.guildId,
		channelid: channel.id,
	});

	if (inDatabase.length ? true : false) {
		return 'This channel is either already a Primary channel, or is a temporary Voice Channel.';
	}

	const primaryChannel = new VoiceChats({
		channelid: channel.id,
		categoryid: channel.parentId,
		guildid: channel.guildId,
		type: 'Primary',
		owner: '',
	});
	await primaryChannel.save();
	const voice = await interaction.guild.channels.fetch(channel.id);
	return `${voice.name} added as a Primary VC.`;
}

async function removePrimaryVC(interaction, channel) {
	const primary = await VoiceChats.find({
		guild: interaction.guildId,
		channelid: channel.id,
		type: 'Primary',
	});

	const secondary = await VoiceChats.find({
		guild: interaction.guildId,
		channelid: channel.id,
		type: 'Secondary',
	});

	if (!primary.length ? true : false || !secondary.length ? false : true) {
		return 'This channel is not a Primary channel, or is a temporary Voice Channel.';
	}

	const req = await VoiceChats.deleteOne({
		channelid: channel.id,
		categoryid: channel.parentId,
		guildid: channel.guildId,
		type: 'Primary',
	});

	const voice = await interaction.guild.channels.fetch(channel.id);
	return `${voice.name} removed from Primary VC list.`;
}

async function overrideRole(interaction) {
	// Maybe for the future: add some choices that auto-generates from the voice channels that are in the server? maybe show the category that theyre in too
	if (!interaction.memberPermissions.has('MANAGE_CHANNELS', true)) {
		return 'No permission to perform this command.';
	}
	const role = interaction.options.getRole('role');

	// Check if role isn't already in the DB
	const inDatabase = await OverrideRoles.find({
		guild: interaction.guildId,
		role: role,
	});

	if (inDatabase.length ? true : false) {
		return 'This role is already an Override role.';
	}

	const addOrRemove = interaction.options.getString('addorremove');

	if (addOrRemove === 'add') {
		const overrideRole = new OverrideRoles({
			guild: interaction.guildId,
			role: role,
		});
		await overrideRole.save();
		return `Role ${role} added to the Override roles list.`;
	} else {
		const req = await OverrideRoles.deleteOne({
			guild: interaction.guildId,
			role: role,
		});
		return `Role ${role} removed from the Overide roles list.`;
	}
}
