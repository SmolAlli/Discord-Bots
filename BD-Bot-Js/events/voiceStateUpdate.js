const VoiceChats = require('../mongoSchemas/VoiceChats');

module.exports = {
	name: 'voiceStateUpdate',
	async execute(before, after, client) {
		if (!client.isReady()) return;

		// Ignore mute/unmute events
		if (before.channel === after.channel) return;

		let primaryChats, secondaryChats;
		if (before.channel) {
			primaryChats = await VoiceChats.find({
				guildid: before.guild.id,
				type: 'Primary',
			});

			secondaryChats = await VoiceChats.find({
				guildid: before.guild.id,
				type: 'Secondary',
			});
		}

		if (after.channel) {
			primaryChats = await VoiceChats.find({
				guildid: after.guild.id,
				type: 'Primary',
			});

			secondaryChats = await VoiceChats.find({
				guildid: after.guild.id,
				type: 'Secondary',
			});
		}

		// On channel join
		try {
			if (after.channel) {
				let checkIfPrimary = primaryChats.some((el) => {
					if (el.channelid === after.channel.id) return true;
					return false;
				});
				if (checkIfPrimary) {
					const category = after.channel.parent;
					const vc = await category.createChannel(
						`${after.member.displayName}'s VC`,
						{ type: 'GUILD_VOICE' }
					);
					await after.member.edit({ channel: vc });
					const secondaryVC = new VoiceChats({
						channelid: vc.id,
						categoryid: category,
						guildid: category.guildId,
						type: 'Secondary',
						owner: after.member,
					});
					await secondaryVC.save();
				}
			}
		} catch (err) {
			console.error(err);
		}

		// On channel leave
		try {
			if (before.channel) {
				let checkIfSecondary = secondaryChats.some((el) => {
					if (el.channelid === before.channel.id) return true;
					return false;
				});
				if (checkIfSecondary && before.channel.members.size < 1) {
					const deleted = await VoiceChats.deleteOne({
						guildid: before.guild.id,
						channelid: before.channel.id,
						type: 'Secondary',
					});

					const vc = before.channel;
					await vc.delete();
				}
			}
		} catch (err) {
			console.error(err);
		}
	},
};
