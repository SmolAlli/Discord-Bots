const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('embed').setDescription('embed'),
	async execute(interaction) {
		const vcEmbed = new MessageEmbed()
			.setColor('#3F83E6')
			.setTitle('Temporary Voice Chats')
			// .setURL('https://discord.js.org/')
			// .setAuthor({
			// 	name: 'Some name',
			// 	iconURL: 'https://i.imgur.com/AfFp7pu.png',
			// 	url: 'https://discord.js.org',
			// })
			.setDescription('Information for temporary VCs')
			// .setThumbnail('https://i.imgur.com/AfFp7pu.png')
			.addFields(
				{
					name: 'What is Temporary Voice Chats?',
					value:
						'It is a feature of this bot (BD Gaming) that creates a temporary Voice Chat whenever you join the <#943642759175213076>. This voice chat will only exist while at least 1 person is in the channel.',
				},
				// { name: '\u200B', value: '\u200B' },
				{
					name: 'Commands:',
					value:
						'/vc name <name> - Changes the name of the Voice Chat to whatever is given.\n/vc limit <limit> - Changes the amount of people who can join.\n/vc edit <name> <limit> - changes both of those simultaneously.\nKeep in mind that these commands can only be used by staff or the person who created the temporary VC.',
				}
				// { name: 'Inline field title', value: 'Some value here',}
			);
		// .setImage('https://i.imgur.com/AfFp7pu.png')
		// .setTimestamp()
		// .setFooter({
		// 	text: 'Some footer text here',
		// 	iconURL: 'https://i.imgur.com/AfFp7pu.png',
		// });

		await interaction.channel.send({ embeds: [vcEmbed] });
		await interaction.reply({
			content: 'Created the Temporary Voice Chat embed',
			ephemeral: true,
		});
	},
};
