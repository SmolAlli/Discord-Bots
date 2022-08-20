const { SlashCommandBuilder } = require('discord.js');
const VoiceChats = require('../../mongoSchemas/VoiceChats');
const OverrideRoles = require('../../mongoSchemas/OverrideRoles');

module.exports = {
    data: new SlashCommandBuilder()
        // /vc commands
        .setName('vc')
        .setDescription('Temporary Voice Channels')

        // vc name
        // usage: /vc name <string> -> changes the name of the temporary vc
        .addSubcommand((subcommand) =>
            subcommand
                .setName('name')
                .setDescription('Edits the name of the current temporary channel')
                .addStringOption((option) =>
                    option.setName('name').setDescription('The new name of the VC').setRequired(true)
                )
        )

        // vc limit
        // usage: /vc limit <number> -> changes the limit of the temporary VC
        .addSubcommand((subcommand) =>
            subcommand
                .setName('limit')
                .setDescription('Changes the maximum amount of users allowed in the VC')
                .addIntegerOption((option) =>
                    option.setName('limit').setDescription('The new limit for the VC').setRequired(true)
                )
        )

        // vc edit
        // usage: /vc edit <string> <number> -> combines the 2 previous subcommands
        .addSubcommand((subcommand) =>
            subcommand
                .setName('edit')
                .setDescription('Changes the maximum amount of users allowed in the VC and the name of the VC')
                .addStringOption((option) =>
                    option.setName('name').setDescription('The new name of the VC').setRequired(true)
                )
                .addIntegerOption((option) =>
                    option.setName('limit').setDescription('The new limit for the VC').setRequired(true)
                )
        )

        // vc primary (admin)
        // usage: /vc primary <add|remove> <channel> -> adds/removes a vc which will act as a "hub" for people to create a temp vc
        .addSubcommand((subcommand) =>
            subcommand
                .setName('primary')
                .setDescription('Adds or removes a primary VC to join to create a temporary VC')
                .addStringOption((option) =>
                    option
                        .setName('addorremove')
                        .setDescription('Whether to add or remove the primary VC specified')
                        .setRequired(true)
                        .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' })
                )
                .addChannelOption((option) =>
                    option.setName('vc').setDescription('The primary VC to add').setRequired(true)
                )
        )

        // vc override (admin)
        // usage: /vc override <add|remove> <role> -> adds/removes role which can use the vc commands regardless of who made it
        .addSubcommand((subcommand) =>
            subcommand
                .setName('override')
                .setDescription('Changes the override role to the specified role')
                .addStringOption((option) =>
                    option
                        .setName('addorremove')
                        .setDescription('Whether to add or remove the override role')

                        .setRequired(true)
                        .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' })
                )
                .addRoleOption((option) =>
                    option.setName('role').setDescription('The role to be used for all VC commands').setRequired(true)
                )
        )

        // vc info (admin)
        // usage: /vc info -> prints out relevant info (primary channels, override roles)
        .addSubcommand((subcommand) => subcommand.setName('info').setDescription('VC info')),

    async execute(interaction) {
        /**
		 Commands to create:
		 * Edit commands (separate ones + together, name, channel limit and both)
		 * Edit the primary channel
		 * Edit the override role
		 */
        let replyMessage = '';
        switch (interaction.options.getSubcommand()) {
            case 'name':
                replyMessage = await setVCName(interaction);
                break;
            case 'limit':
                replyMessage = await setVCLimit(interaction);
                break;
            case 'edit':
                replyMessage = await editVC(interaction);
                break;
            case 'primary':
                replyMessage = await primaryVC(interaction);
                break;
            case 'override':
                replyMessage = await overrideRole(interaction);
                break;
            case 'info':
                replyMessage = await getInfo(interaction);
                break;
            default:
                replyMessage = 'No subcommand entered.';
                break;
        }
        await interaction.reply({ content: replyMessage, ephemeral: true });
    },
};

// Gets the admin information using the /vc info command
const getInfo = async (interaction) => {
    // Only allow for admins to do the command
    if (!interaction.memberPermissions.has('MANAGE_CHANNELS', true))
        return 'You do not have permission to use this command.';

    // Gets the primary channels and grabs all of the names of them from the id
    let primaryChannels = Promise.all(
        (await getChats(interaction, 'Primary')).map(async (e) => {
            return await interaction.guild.channels.cache.find((r) => r.id === e.channelid).name;
        })
    ).then((e) => {
        primaryChannels = e;
    });

    // Gets the override roles and grabs all of the names of them from the id
    let overrideRoles = Promise.all(
        (
            await OverrideRoles.find({
                guild: interaction.guildId,
            })
        ).map(async (e) => {
            return await interaction.guild.roles.cache.find((r) => r.id === e.role.replace(/\W/g, '')).name;
        })
    ).then((e) => {
        overrideRoles = e;
    });

    // Return string
    return `Information for guild ${interaction.guild.name}:\t
    ${
        (await primaryChannels.length) > 0
            ? `Primary channel${(await primaryChannels.length) === 1 ? '' : 's'}: "${await primaryChannels.join(
                  '", "'
              )}"`
            : 'No primary channels found.'
    }\t
    ${
        (await overrideRoles.length) > 0
            ? `Override role${(await overrideRoles.length) === 1 ? '' : 's'}: "${await overrideRoles.join('", "')}"`
            : 'No override roles found.'
    }`;
};

/* Gets all of the primary or secondary VCs from the database for the current guild*/
const getChats = async (interaction, type) => {
    return await VoiceChats.find({
        guildid: interaction.guildId,
        type: type,
    });
};

const checkOverridePermissions = async (guild, user) => {
    // check if user has any of the roles within the DB
    const overrideRoles = await OverrideRoles.find({
        guild: guild.id,
    });

    overrideRoles.some((el) => {
        if (el.role in user.roles) return true;
        return false;
    });
};

const setVCName = async (interaction) => {
    if (!interaction.member.voice) return 'You are not in a voice channel.';

    const secondaryChats = await getChats(interaction, 'Secondary');

    const secondaryCheck = secondaryChats.some((el) => {
        if (el.channelid === interaction.member.voice.channelId) return true;
        return false;
    });

    if (!secondaryCheck) return 'You are not in a temporary voice channel';

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
};

const setVCLimit = async (interaction) => {
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

    return `Changed the VC's user limit from ${oldLimit < 1 ? 'no limit' : oldLimit} to ${
        newLimit < 1 ? 'no limit' : newLimit
    }`;
};

const editVC = async (interaction) => {
    // Makes sure the user is in a voice channel
    if (!interaction.member.voice) {
        return 'You are not in a voice channel.';
    }

    // Makes sure that the channel the user is in is actually a secondary channel
    const secondaryCheck = (await getChats(interaction, 'Secondary')).some((el) => {
        if (el.channelid === interaction.member.voice.channelId) return true;
        return false;
    });

    if (!secondaryCheck) return 'You are not in a temporary voice channel';

    // Makes sure that the user has permission
    if (
        !(
            interaction.member === secondaryChats.owner ||
            !interaction.memberPermissions.has('MANAGE_CHANNELS', true) ||
            (await checkOverridePermissions(interaction.guild, interaction.member))
        )
    ) {
        return 'You do not have permission to perform this command.';
    }
    // Current channel
    const channel = interaction.member.voice.channel;

    // Old information
    const oldName = channel.name;
    const oldLimit = channel.userLimit;

    // New information from the commands
    const newName = interaction.options.getString('name');
    const newLimit = interaction.options.getInteger('limit');

    await channel.edit({ name: newName, limit: newLimit });

    return `Changed VC's name from ${oldName} to ${newName} and the user limit from ${
        oldLimit < 1 ? 'no limit' : oldLimit
    } to ${newLimit < 1 ? 'no limit' : newLimit}`;
};

const primaryVC = async (interaction) => {
    // Maybe for the future: add some choices that auto-generates from the voice channels that are in the server? maybe show the category that theyre in too
    if (!interaction.memberPermissions.has('MANAGE_CHANNELS', true)) {
        return 'No permission to perform this command.';
    }
    const channel = interaction.options.getChannel('vc');
    // Check if channel is a VC
    if (!(channel.type === 'GUILD_VOICE')) {
        return 'Channel given is not a Voice Channel.';
    }

    // Checks if the command is going to add or remove
    const addOrRemove = interaction.options.getString('addorremove');

    if (addOrRemove === 'add') {
        return await addPrimaryVC(interaction, channel);
    } else {
        return await removePrimaryVC(interaction, channel);
    }
};

const addPrimaryVC = async (interaction, channel) => {
    // Finds the channel in the database
    const inDatabase = await VoiceChats.find({
        guild: interaction.guildId,
        channelid: channel.id,
    });

    // Makes sure that the channel is in the database
    if (inDatabase.length > 0) {
        return 'This channel is already in the database. It is either already a primary vc, or is a temporary vc.';
    }

    // Adds the channel to the database
    const primaryChannel = new VoiceChats({
        channelid: channel.id,
        categoryid: channel.parentId,
        guildid: channel.guildId,
        type: 'Primary',
        owner: '',
    });
    await primaryChannel.save();

    // Gets the channel name to show which channel has been deleted
    return `${await interaction.guild.channels.fetch(channel.id).name} added as a Primary VC.`;
};

const removePrimaryVC = async (interaction, channel) => {
    // Find if the channel is in the database
    const primary = await VoiceChats.find({
        guild: interaction.guildId,
        channelid: channel.id,
        type: 'Primary',
    });

    // Makes sure the channel is in the database
    if (!primary.length > 0) return 'This channel is not a Primary channel.';

    // Removes the channel from the database
    await VoiceChats.deleteOne({
        channelid: channel.id,
        categoryid: channel.parentId,
        guildid: channel.guildId,
        type: 'Primary',
    });

    // Gets the channel name to show which channel has been deleted
    return `${await interaction.guild.channels.fetch(channel.id).name} removed from Primary VC list.`;
};

const overrideRole = async (interaction) => {
    // Maybe for the future: add some choices that auto-generates from the voice channels that are in the server? maybe show the category that theyre in too
    if (!interaction.memberPermissions.has('MANAGE_CHANNELS', true)) {
        return 'No permission to perform this command.';
    }

    // Gets the role from the command options
    const role = interaction.options.getRole('role');

    // Find role in the database
    const inDatabase = await OverrideRoles.find({
        guild: interaction.guildId,
        role: role,
    });

    // Check if the option given was for adding or removing
    const addOrRemove = interaction.options.getString('addorremove');

    if (addOrRemove === 'add') {
        // Makes sure the role isn't in the database
        if (inDatabase.length > 0) {
            return 'This role is already an override role.';
        }

        // Adds role to the database
        const overrideRole = new OverrideRoles({
            guild: interaction.guildId,
            role: role,
        });
        await overrideRole.save();
        return `Role ${role} added to the Override roles list.`;
    } else {
        // Makes sure that the role is in the database
        if (!inDatabase.length > 0) {
            return 'This role does not exist in the database.';
        }

        await OverrideRoles.deleteOne({
            guild: interaction.guildId,
            role: role,
        });
        return `Role ${role} removed from the Override roles list.`;
    }
};
