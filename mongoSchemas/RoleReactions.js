const { Schema, model } = require('mongoose');

const RoleReactions = Schema({
	message: Object,
	emoji: String,
	role: Object,
});

module.exports = model('RoleReactions', RoleReactions);
