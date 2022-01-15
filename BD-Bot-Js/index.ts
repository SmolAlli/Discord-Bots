import DiscordJS, { Intents } from 'discord.js'
import dotenv from 'dotenv'
dotenv.config()

const client = new DiscordJS.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_VOICE_STATES
    ],
})

client.on("ready", () => {
    console.log("The bot is ready.")
    client.user?.setActivity("chat", {
        type: "WATCHING",
    });

    let handler = require('./command-handler')
    if (handler.default) handler = handler.default

    handler(client)

    const guildId = "614075292918480896"
    const guild = client.guilds.cache.get(guildId)
    let commands

    if (guild) {
        commands = guild.commands
    } else {
        commands = client.application?.commands
    }

    commands?.create({
        name: 'ping',
        description: 'Replies with pong.',
    })
})

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) {
        return 
    }

    const { commandName, options } = interaction

    if (commandName === 'ping') {
        interaction.reply({
            content: 'pong',
            ephemeral: true,
        })
    }

})

let secondary_vcs = {}
client.on('voiceStateUpdate', async (before, after) => {
    if (!client.isReady) {
        return
    }
    
    if (before.channel == after.channel) {
        return
    }

    try {
        if (after.channel && after.channel.id === process.env.DISCORD_VC) {
            const category = after.channel.parent
            const member = after.member
            const vc = await category?.createChannel(`${member?.nickname}'s VC`, {
                type: 'GUILD_VOICE',
                reason: "Temporary VCs.",
                })
            await member!.edit({channel: vc,})

            secondary_vcs[vc!.id] = member!.id
        }
    } catch (error) {}    
        
    try {
        if (before.channel!.members.size < 1 && before.channel && before.channel!.id in secondary_vcs) {
            const member = before.member
            const vc = before.channel
            await vc.delete("Empty Temporary VC")

            delete secondary_vcs[vc!.id]
            return
        }
    } catch (error) {}  
})

client.login(process.env.DISCORD_TOKEN)