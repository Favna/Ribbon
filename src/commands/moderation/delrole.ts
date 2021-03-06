/**
 * @file Moderation DeleteRoleCommand - Delete the role of a member
 *
 * **Aliases**: `deleterole`, `dr`, `remrole`, `removerole`
 * @module
 * @category moderation
 * @name delrole
 * @example delrole Favna Member
 * @param {GuildMemberResolvable} AnyMember The member to remove a role from
 * @param {RoleResolvable} AnyRole The role to remove
 */

import { deleteCommandMessages, logModMessage, shouldHavePermission } from '@components/Utils';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { GuildMember, MessageEmbed, Role, TextChannel } from 'discord.js';
import { oneLine, stripIndents } from 'common-tags';
import moment from 'moment';

interface DeleteRoleArgs {
  member: GuildMember;
  role: Role;
}

export default class DeleteRoleCommand extends Command {
  public constructor(client: CommandoClient) {
    super(client, {
      name: 'delrole',
      aliases: [ 'deleterole', 'dr', 'remrole', 'removerole' ],
      group: 'moderation',
      memberName: 'delrole',
      description: 'Deletes a role from a member',
      format: 'MemberID|MemberName(partial or full) RoleID|RoleName(partial or full)',
      examples: [ 'delrole favna tagrole1' ],
      guildOnly: true,
      throttling: {
        usages: 2,
        duration: 3,
      },
      args: [
        {
          key: 'member',
          prompt: 'Which member should I remove a role from?',
          type: 'member',
        },
        {
          key: 'role',
          prompt: 'What role should I remove from that member?',
          type: 'role',
        }
      ],
    });
  }

  @shouldHavePermission('MANAGE_ROLES', true)
  public async run(msg: CommandoMessage, { member, role }: DeleteRoleArgs) {
    try {
      if (!member.manageable) {
        return msg.reply(oneLine`looks like I do not have permission to edit the roles of ${member.displayName}.
                    Better go and fix your server's role permissions if you want to use this command!`);
      }

      const modlogChannel = msg.guild.settings.get('modlogchannel', null);
      const roleRemoveEmbed = new MessageEmbed();

      await member.roles.remove(role);

      roleRemoveEmbed
        .setColor('#4A9E93')
        .setAuthor(msg.author!.tag, msg.author!.displayAvatarURL())
        .setDescription(`**Action:** Removed ${role.name} from ${member.displayName}`)
        .setTimestamp();

      if (msg.guild.settings.get('modlogs', true)) {
        logModMessage(
          msg, msg.guild, modlogChannel, msg.guild.channels.get(modlogChannel) as TextChannel, roleRemoveEmbed
        );
      }

      deleteCommandMessages(msg, this.client);

      return msg.embed(roleRemoveEmbed);
    } catch (err) {
      deleteCommandMessages(msg, this.client);
      if (/(?:Missing Permissions)/i.test(err.toString())) {
        return msg.reply(stripIndents`
          an error occurred removing the role \`${role.name}\` from \`${member.displayName}\`.
          The server staff should check that I have \`Manage Roles\` permission and I have the proper hierarchy.`);
      }
      if (/(?:is not an array or collection of roles)/i.test(err.toString())) {
        return msg.reply(stripIndents`
          it looks like you supplied an invalid role to delete.
          If you are certain that the role is valid please feel free to open an issue on the GitHub.`);
      }
      const channel = this.client.channels.get(process.env.ISSUE_LOG_CHANNEL_ID!) as TextChannel;

      channel.send(stripIndents`
        <@${this.client.owners[0].id}> Error occurred in \`deleterole\` command!
        **Server:** ${msg.guild.name} (${msg.guild.id})
        **Author:** ${msg.author!.tag} (${msg.author!.id})
        **Time:** ${moment(msg.createdTimestamp).format('MMMM Do YYYY [at] HH:mm:ss [UTC]Z')}
        **Input:** \`${role.name} (${role.id})\` || \`${member.user.tag} (${member.id})\`
        **Error Message:** ${err}`);

      return msg.reply(oneLine`
        an unknown and unhandled error occurred but I notified ${this.client.owners[0].username}.
        Want to know more about the error?
        Join the support server by getting an invite by using the \`${msg.guild.commandPrefix}invite\` command`);
    }
  }
}