const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('vc')
		.setDescription('TBA'),
	async execute(interaction) {
		await interaction.reply('Not done yet.');
	},
};
