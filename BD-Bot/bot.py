'''
Bot for VC Joins - Creates a new VC and moves the user to it whenever someone joins a specific VC.
This VC will be "temporary" - it will only exist while there is at least 1 user in it.
The VC will be deleted whenever the last person joins.

- Watch for the join in a VC
- Creates a new VC
- Ask for the user to name the VC (and give a default w/ default message) - e.g. "type in "default" to keep current VC name"
- Watch for leave of VC, and when nobody is in there, yeet the VC

I also decided to add role reaction for the shits and gigs of it.
'''

import os

import discord
import random
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
GUILD = os.getenv('DISCORD_GUILD')

from discord.ext import commands
from discord.utils import get

# Important for being able to get the 
intents = discord.Intents.default()
intents.members = True
intents.messages = True
bot = commands.Bot(command_prefix = commands.when_mentioned_or('bd!'), intents=intents, help_command=None, case_insensitive=True)

role_reactions = {}

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')

    for guild in bot.guilds:
        if guild.name == GUILD:
            break

    print(
        f'{bot.user} is connected to the following guild:\n'
        f'{guild.name} (id: {guild.id})'
    )

    # Uncomment this and change the image.png to be whatever the new profile picture should be for the bot. Not necessary otherwise
    # with open('image.png', 'rb') as image:
    #     await bot.user.edit(avatar=image.read())

# 
#   ROLE REACTIONS
# 

@bot.group(pass_context=True, invoke_without_command=True, aliases=["rr", "rroles"])
async def reaction(ctx):
    if ctx.invoked_subcommand is None:
        await ctx.send('Reaction roles.\nPlease type bd!help rr for more information')

# Role reaction command
@reaction.command(name="add")
async def reaction_add(ctx, messageID: int, emoji, role):  
    try:
        # Fetches the message using its ID
        message = await ctx.fetch_message(messageID)

        # Adds the reaction to the message + reaction message
        await discord.Message.add_reaction(message, emoji)
        await ctx.send(f"Added reaction {emoji} to message {messageID}")

        # Removes unnecessary parts from ID and changes it to a role object
        stripped_role = role.replace("<@&", "")
        stripped_role = stripped_role.replace(">", "")
        role_obj = ctx.guild.get_role(int(stripped_role))

        # Adds reaction info to dict
        role_reactions[f"{messageID}, {emoji}"] = role_obj

    except discord.HTTPException: # Error when emoji is not valid or message ID is not valid
        await ctx.send("There was an error adding the reaction. Please make sure that the Message's ID is valid, and that the emoji specified is global or from this server.\nFor help: bd!help rr")
    except Exception as e:
        print(f"Exception: {e}")

# Role reaction deletion command
@reaction.command(name="del")
async def reaction_del(ctx, messageID: int, emoji):  
    try:
        # Fetches the message using its ID
        message = await ctx.fetch_message(messageID)

        # Removes the reactions to the message + reaction message
        await discord.Message.clear_reaction(message, emoji)
        await ctx.send(f"Removed reaction {emoji} from message {messageID}")

        # Removes reaction info from dict
        role_reactions.pop(f"{messageID}, {emoji}")

    except discord.HTTPException: # Error when emoji is not valid or message ID is not valid
        await ctx.send("There was an error removing the reaction. Please make sure that the Message's ID is valid, and that the emoji specified is global or from this server.\nFor help: bd!help rrdel")
    except Exception as e:
        print(f"Exception: {e}")

# Role reaction removal
@reaction.command(name="clear")
async def reaction_clear(ctx, messageID):  
    try:
        # Fetches the message using its ID
        message = await ctx.fetch_message(messageID)

        # Removes all reactions from the message + reaction message
        await discord.Message.clear_reactions(message)
        await ctx.send(f"Removed all reactions from message {messageID}")

        for key, value in role_reactions:
            if key.contains(f"{messageID}"):
                role_reactions.pop(key)

    except discord.HTTPException: # Error when emoji is not valid or message ID is not valid
        await ctx.send("There was an error removing the reactions. Please make sure that the Message's ID is valid.\nFor help: bd!help rrclear")
    except Exception as e:
        print(f"Exception: {e}")

# Checkers for role reactions
# Check reaction add
@bot.event
async def on_raw_reaction_add(payload):
    print("reaction added")
    if payload.user_id == bot.user.id:
        return # Reaction is performed by a reaction
    if payload.guild_id is None:
        return  # Reaction is on a private message
    guild = bot.get_guild(payload.guild_id)
    member = guild.get_member(payload.user_id)
    if f"{payload.message_id}, {payload.emoji.name}" in role_reactions:
        role = role_reactions[f"{payload.message_id}, {payload.emoji.name}"]
        await member.add_roles(role, reason="Role reaction add")
        print("role addded!")
    else:
        print("did not pass check.")

# Checks reaction remove
@bot.event
async def on_raw_reaction_remove(payload):
    if payload.user_id == bot.user.id:
        return # Reaction is performed by a reaction
    if payload.guild_id is None:
        return  # Reaction is on a private message
    guild = bot.get_guild(payload.guild_id)
    member = guild.get_member(payload.user_id)
    if f"{payload.message_id}, {payload.emoji.name}" in role_reactions:
        role = role_reactions[f"{payload.message_id}, {payload.emoji.name}"]
        await member.remove_roles(role, reason="Role reaction remove")
        print("role removed!")
    else:
        print("did not pass check.")

# 
#   Temporary Voice Chats
# 

primary_chats = [842990290788155423, 925940962658750494]
secondary_chats = []
bot_channel = 838943565887045672

@bot.group(pass_context=True, invoke_without_command=True, aliases=["voice", "tempvoice", "tvc"])
async def vc():
    pass

@vc.command(name="editname")
async def vc_edit_name(ctx, *name):
    new_name = ""
    for i in name:
        new_name += i + " "
    channel = ctx.author.voice.channel
    channel_name = channel.name
    await channel.edit(name=new_name)
    await ctx.send(f"Changed VC Channel '{channel_name}' to '{channel.name}'")

@bot.event
async def on_voice_state_update(member, before, after):
    if not bot.is_ready():
        return

    if before.channel == after.channel:
        # Ignore mute/unmute events
        return

    print(member, before, after)

    # On channel join
    try:
        if after.channel.id in primary_chats:
            # create vc and move person to it
            
            category = after.channel.category
            vc = await after.channel.guild.create_voice_channel(name=f"{member.display_name}'s VC", bitrate=64000, user_limit=0, category=category)
            await member.move_to(vc)

            channel = bot.get_channel(bot_channel)
            await channel.send(f"{member.mention}, to change your VC's name, type bd!vc editname <new name>\nIt is recommended that you rename the channel to the game you're going to host/play.")
            secondary_chats.append(vc.id)
            return
    except AttributeError as e:
        print(e)

    # On channel leave
    try:
        if (before.channel.id in secondary_chats) and (len(before.channel.members) < 1):
        # delete the channel that is before.channel.id
            secondary_chats.remove(before.channel.id)

            vc = before.channel
            await vc.delete(reason="Empty Temporary VC")

            channel = bot.get_channel(bot_channel)
            await channel.send("Session ended.")
            return
    except AttributeError as e:
        print(e)

# 
#   Help command
# 

@bot.command(name="help")
async def help(ctx):
    help_embed_dict = {
        "title": "Help Commands",
        "type": "rich",
        "description": "help embed",
        "color": 0x3F83E6,
        "footer": {"text": "help"},
        "thumbnail": {"url": "https://cdn.discordapp.com/avatars/925239835130732566/e43c858a5cf0e33894fc742a31e222f7.png?size=4096"},
        "fields": [
        {"name": "Role Reactions (rr | rroles | reaction)", 
        "value": 
            "**Add** - bd!rr add <message ID> <emoji> <role>\nCreates a reaction role.\n" +
            "**Remove** - bd!rr del <message ID> <emoji>\nDeletes a reaction role.\n" +
            "**Clear** - bd!rr clear <message ID>\nRemoves all reaction roles on a given message."}, 
        {"name": "Temp Voice Chats", 
        "value": "TBD"}]
    }

    help_embed = discord.Embed.from_dict(help_embed_dict)
    await ctx.send(embed=help_embed)

# Shits and gigs
@bot.event
async def on_error(event, *args, **kwargs):
    with open('err.log', 'a') as f:
        if event == 'on_message':
            f.write(f'Unhandled message: {args[0]}\n')
        else:
            raise

bot.run(TOKEN)