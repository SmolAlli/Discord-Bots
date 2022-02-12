const { Schema, model } = require('mongoose');

const VoiceChats = Schema({
	channelid: String,
	categoryid: String,
	guildid: String,
	type: String,
	owner: String,
});

module.exports = model('VoiceChats', VoiceChats);
