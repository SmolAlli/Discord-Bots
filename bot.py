'''
Bot for VC Joins - Creates a new VC and moves the user to it whenever someone joins a specific VC.
This VC will be "temporary" - it will only exist while there is at least 1 user in it.
The VC will be deleted whenever the last person joins.

I also decided to add role reaction for the shits and gigs of it.
'''

import os
import discord
from dotenv import load_dotenv

# Gets external variables for use
load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
OVERRIDE = os.getenv('DISCORD_OVERRIDE_ROLE')
PRIMARY_VC = os.getenv('DISCORD_VC')

from discord.ext import commands

# Important for being able to get messages and members.
intents = discord.Intents.default()
intents.members = True
intents.messages = True
bot = commands.Bot(command_prefix = commands.when_mentioned_or('bd!'), intents=intents, help_command=None, case_insensitive=True)

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')

# 
#   ROLE REACTIONS
# 

role_reactions = {}

# Main group for role reactions.
@bot.group(pass_context=True, invoke_without_command=True, aliases=["rr", "rroles"])
@commands.has_permissions(manage_messages=True)
async def reaction(ctx):
    if ctx.invoked_subcommand is None:
        await ctx.send('Reaction roles.\nPlease type bd!help rr for more information')

# Role reaction add command
@reaction.command(name="add")
@commands.has_permissions(manage_messages=True)
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

@reaction.command(name="massadd", aliases = ["addmany", "madd"])
@commands.has_permissions(manage_messages=True)
async def reaction_massadd(ctx, messageID: int, *bulk):
    try:
        # Fetches the message using its ID
        message = await ctx.fetch_message(messageID)

        for_embed = {}
        for emoji, role in zip(bulk[0::2], bulk[1::2]):
            # Adds the reaction to the message + reaction message
            await discord.Message.add_reaction(message, emoji)

            # Removes unnecessary parts from ID and changes it to a role object
            stripped_role = role.replace("<@&", "")
            stripped_role = stripped_role.replace(">", "")
            role_obj = ctx.guild.get_role(int(stripped_role))

            # Adds reaction info to dict
            role_reactions[f"{messageID}, {emoji}"] = role_obj
            for_embed[f"{emoji}"] = role_obj
        string = ""
        for emoji, role in for_embed.items():
            string += f"{emoji} {role}\n"
        help_embed_dict = {
            "title": "Mass Reaction Roles Added",
            "type": "rich",
            "color": 0x3F83E6,
            "description": string
        }
        help_embed = discord.Embed.from_dict(help_embed_dict)
        await ctx.send(embed=help_embed)
    except discord.HTTPException: # Error when emoji is not valid or message ID is not valid
        await ctx.send("There was an error adding the reaction. Please make sure that the Message's ID is valid, and that the emoji specified is global or from this server.\nFor help: bd!help rr")
    except Exception as e:
        print(f"Exception: {e}")

# Role reaction deletion command
@reaction.command(name="del")
@commands.has_permissions(manage_messages=True)
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
@commands.has_permissions(manage_messages=True)
async def reaction_clear(ctx, messageID):  
    try:
        # Fetches the message using its ID
        message = await ctx.fetch_message(messageID)

        # Removes all reactions from the message + reaction message
        await discord.Message.clear_reactions(message)
        await ctx.send(f"Removed all reactions from message {messageID}")

        # Looks through each reaction added to the dictionary and removes them if they match which message has been cleared.
        for key, value in role_reactions:
            if key.contains(f"{messageID}"):
                role_reactions.pop(key)

    except discord.HTTPException: # Error when emoji is not valid or message ID is not valid
        await ctx.send("There was an error removing the reactions. Please make sure that the Message's ID is valid.\nFor help: bd!help rrclear")
    except Exception as e:
        print(f"Exception: {e}")

# Event checks for role reactions

# Checks reaction add
@bot.event
async def on_raw_reaction_add(payload):
    if payload.user_id == bot.user.id:
        return # Reaction is performed by a reaction
    if payload.guild_id is None:
        return  # Reaction is on a private message
    guild = bot.get_guild(payload.guild_id)
    member = guild.get_member(payload.user_id)

    # Checks if reaction is a role reaction
    if f"{payload.message_id}, {payload.emoji.name}" in role_reactions:
        role = role_reactions[f"{payload.message_id}, {payload.emoji.name}"]
        await member.add_roles(role, reason="Role reaction add")
    else:
        pass

# Checks reaction remove
@bot.event
async def on_raw_reaction_remove(payload):
    if payload.user_id == bot.user.id:
        return # Reaction is performed by a reaction
    if payload.guild_id is None:
        return  # Reaction is on a private message
    guild = bot.get_guild(payload.guild_id)
    member = guild.get_member(payload.user_id)

    # Checks if reaction is a role reaction
    if f"{payload.message_id}, {payload.emoji.name}" in role_reactions:
        role = role_reactions[f"{payload.message_id}, {payload.emoji.name}"]
        await member.remove_roles(role, reason="Role reaction remove")
    else:
        pass

# 
#   TEMPORARY VOICE CHANNELS
# 

secondary_vcs = {}

@bot.group(pass_context=True, invoke_without_command=True, aliases=["voice", "tempvoice", "tvc"])
async def vc():
    pass

@vc.command(name="name")
async def vc_edit_name(ctx, *name):
    try:
        # Gets the current channel of the person who did the command
        channel = ctx.author.voice.channel

        # Gets the name to give the VC from the *args
        new_name = ""
        for i in name:
            new_name += i + " "
        
        channel_name = channel.name

        override_role = discord.utils.get(ctx.author.guild.roles, id=OVERRIDE)

    # Doesn't work if the person isn't in a VC currently
    except AttributeError:
        await ctx.send("You are not in a temporary voice channel. Please create one using the main channel.")
        return
    
    # Checks if the person is allowed to change the name of the VC
    if (channel.id in secondary_vcs.keys()) and (override_role in ctx.author.roles) or (channel.id in secondary_vcs.keys()) and (ctx.author.id in secondary_vcs.values()):
        await channel.edit(name=new_name)
        await ctx.send(f"Changed VC Channel '{channel_name}' to '{channel.name}'")
    else:
        await ctx.send("You do not have permission to use this command.")

@vc.command(name="limit")
async def vc_edit_limit(ctx, limit: int):
    try:
        # Gets the current channel and some information about the channel
        channel = ctx.author.voice.channel
        channel_limit = channel.limit
        override_role = discord.utils.get(ctx.author.guild.roles, id=OVERRIDE)
        lim = "No limit" if channel_limit == 0 else channel_limit

    # Doesn't work if the person isn't in a VC currently
    except AttributeError:
        await ctx.send("You are not in a temporary voice channel. Please create one using the main channel.")
        return
    
    # Checks if the person is allowed to change the limit of the VC
    if (channel.id in secondary_vcs.keys()) and (override_role in ctx.author.roles) or (channel.id in secondary_vcs.keys()) and (ctx.author.id in secondary_vcs.values()):
        await channel.edit(limit=limit)
        lim2 = "No limit" if channel.limit == 0 else channel.limit
        await ctx.send(f"Limit changed from {lim} to {lim2}")
    else:
        await ctx.send("You do not have permission to use this command.")

@vc.command(name="edit")
async def vc_edit(ctx, limit: int, *name):
    try:
        # Gets the name of the channel
        channel = ctx.author.voice.channel

        # Gets all the information needed to change the name and to change the limit
        new_name = ""
        for i in name:
            new_name += i + " "
        
        channel_name = channel.name
        channel_limit = channel.limit
        lim = "No limit" if channel_limit == 0 else channel_limit
        override_role = discord.utils.get(ctx.author.guild.roles, id=OVERRIDE)

    # Doesn't work if the person isn't in a VC currently
    except AttributeError as e:
        await ctx.send("You are not in a temporary voice channel. Please create one using the main channel.")
        return
    
    # Checks if the person has permission to use the command.
    if (channel.id in secondary_vcs.keys()) and (override_role in ctx.author.roles) or (channel.id in secondary_vcs.keys()) and (ctx.author.id in secondary_vcs.values()):
        await channel.edit(name=new_name, limit=limit)
        lim2 = "No limit" if channel.limit == 0 else channel.limit
        await ctx.send(f"Changed VC Channel '{channel_name}' to '{channel.name}' and Limit changed from {lim} to {lim2}")
    else:
        await ctx.send("You do not have permission to use this command.")

@bot.event
async def on_voice_state_update(member, before, after):
    if not bot.is_ready():
        return

    if before.channel == after.channel:
        # Ignore mute/unmute events
        return

    # On channel join
    try:
        if after.channel.id in PRIMARY_VC:
            # create vc and move person to it
            
            category = after.channel.category
            vc = await after.channel.guild.create_voice_channel(name=f"{member.display_name}'s VC", bitrate=64000, user_limit=0, category=category)
            await member.move_to(vc)

            secondary_vcs[vc.id] = member.id
    except AttributeError:
        pass

    # On channel leave
    try:
        if (before.channel.id in secondary_vcs) and (len(before.channel.members) < 1):
        # delete the channel that is before.channel.id
            secondary_vcs.pop(before.channel.id)

            vc = before.channel
            await vc.delete(reason="Empty Temporary VC")

            return
    except AttributeError:
        pass 

# 
#   HELP COMMAND
# 

@bot.group(name="help", pass_context=True, invoke_without_command=True)
async def help(ctx):
    help_embed_dict = {
        "title": "Help Commands",
        "type": "rich",
        "color": 0x3F83E6,
        "thumbnail": {"url": "https://cdn.discordapp.com/avatars/925239835130732566/e43c858a5cf0e33894fc742a31e222f7.png?size=4096"},
        "fields": [
            {"name": "Role Reactions (rr | rroles | reaction)", 
            "value": "Adds reactions to a message, so users can add self-roles."}, 
            {"name": "Temporary Voice Chats (vc | voice | tempvoice | tvc)", 
            "value": "Allows for temporary voice chats to be created, so that they can exist as is needed."}]
    }

    help_embed = discord.Embed.from_dict(help_embed_dict)
    await ctx.send(embed=help_embed)

@help.command(name="rr", aliases=["rroles", "reaction"])
async def help_rr(ctx):
    help_embed_dict = {
        "title": "Help Commands - Role Reactions (rr | rroles | reaction)",
        "type": "rich",
        "color": 0x3F83E6,
        "thumbnail": {"url": "https://cdn.discordapp.com/avatars/925239835130732566/e43c858a5cf0e33894fc742a31e222f7.png?size=4096"},
        "fields": 
            [{"name": "bd!rr add <message ID> <emoji> <role>", 
            "value": "Creates a reaction role.\nThe role must be either the @role or the ID."}, 
            {"name": "bd!rr massadd <message ID> <bulk>",
            "value": "Adds a mass of reactions.\nThe bulk must be <emoji> <role>, where the role is either the @role or the ID."},
            {"name": "bd!rr del <message ID> <emoji>", 
            "value": "Deletes a reaction role."}, 
            {"name": "bd!rr clear <message ID>", 
            "value": "Removes all reaction roles on a given message."}]
    }

    help_embed = discord.Embed.from_dict(help_embed_dict)
    await ctx.send(embed=help_embed)

@help.command(name="vc", aliases=["voice", "tempvoice", "tvc"])
async def help_vc(ctx):
    help_embed_dict = {
        "title": "Help Commands - Temporary Voice Chats (vc | voice | tempvoice | tvc)",
        "type": "rich",
        "color": 0x3F83E6,
        "thumbnail": {"url": "https://cdn.discordapp.com/avatars/925239835130732566/e43c858a5cf0e33894fc742a31e222f7.png?size=4096"},
        "fields": [
        {"name": "Join the main VC", 
        "value": "Join the main VC and the bot will create a temporary VC for you"},
        {"name": "bd!vc name <name>", 
        "value": "Changes the name to be whatever you choose. Only works if you created the VC\nCan have spaces."},
        {"name": "bd!vc limit <limit>", 
        "value": "Changes the vc's person limit to be whatever you choose. Only works if you created the VC\nMust be a number."},
        {"name": "bd!vc edit <limit> <name>", 
        "value": "Edits both the name and the person limit to be whatever you choose. Only works if you created the VC\nThe name can have spaces.\nThe limit must be a number."}
        ]
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

@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.MissingPermissions) or isinstance(error, commands.MissingRole):
        await ctx.send("You do not have permission to use that command.")
    else:
        raise error


bot.run(TOKEN)