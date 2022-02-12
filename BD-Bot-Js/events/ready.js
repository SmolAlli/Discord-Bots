const VoiceChats = require('../mongoSchemas/VoiceChats');

module.exports = {
	name: 'ready',
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		await removeEmptyVoiceChats(client);
	},
};

async function removeEmptyVoiceChats(client) {
	const guilds = client.guilds.cache.map((guild) => guild.id);
	let vcs = [];
	for (const element of guilds) {
		let currentVCs = await VoiceChats.find({
			guildid: element,
			type: 'Secondary',
		});
		vcs.push(currentVCs);
	}

	if (!vcs[0].length) return;

	let count = 0;
	for (const i of vcs) {
		for (const guild of i) {
			channel = await client.channels.fetch(guild.channelid);
			if (!channel.members.size) {
				count += 1;
				await channel.delete();
				await VoiceChats.deleteOne({
					guildid: guild.guildid,
					channelid: channel.id,
				});
			}
		}
	}

	if (count) console.log(`Deleted ${count} empty temporary VCs`);
}
