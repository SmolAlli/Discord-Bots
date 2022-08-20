const { Schema, model } = require('mongoose');

const OverrideRoles = Schema({
	guild: String,
	role: String,
});

module.exports = model('OverrideRoles', OverrideRoles);
