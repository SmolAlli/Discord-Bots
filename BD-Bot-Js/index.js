const { Client, Intents, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		Intents.FLAGS.GUILD_MEMBERS,
		Intents.FLAGS.GUILD_VOICE_STATES,
	],
	partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

client.commands = new Collection();

const functions = fs
	.readdirSync('./functions')
	.filter((file) => file.endsWith('.js'));
const commandFolders = fs.readdirSync('./commands');
const eventFiles = fs
	.readdirSync('./events')
	.filter((file) => file.endsWith('.js'));

(async () => {
	for (file of functions) {
		require(`./functions/${file}`)(client);
	}

	client.handleEvents(eventFiles, './events');
	client.handleCommands(commandFolders, './commands');
	client.login(process.env.token);
	client.dbLogin();
})();
