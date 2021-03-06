/**
 * @file Searches UrbanCommand - Define a word using UrbanDictionary
 *
 * **Aliases**: `ub`, `ud`
 * @module
 * @category searches
 * @name urban
 * @example urban Everclear
 * @param {string} PhraseQuery Phrase that you want to define
 */

import { CollectorTimeout, DEFAULT_EMBED_COLOR } from '@components/Constants';
import { clientHasManageMessages, deleteCommandMessages, injectNavigationEmotes, navigationReactionFilter, sentencecase } from '@components/Utils';
import { stringify } from '@favware/querystring';
import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando';
import { MessageEmbed, MessageReaction, ReactionCollector, User } from 'discord.js';
import fetch from 'node-fetch';
import { UrbanDefinition, UrbanDefinitionResults } from 'RibbonTypes';

interface UrbanArgs {
  term: string;
  hasManageMessages: boolean;
  position: number;
}

export default class UrbanCommand extends Command {
  public constructor(client: CommandoClient) {
    super(client, {
      name: 'urban',
      aliases: [ 'ub', 'ud' ],
      group: 'searches',
      memberName: 'urban',
      description: 'Find definitions on urban dictionary',
      format: 'Term',
      examples: [ 'urban ugt' ],
      guildOnly: false,
      throttling: {
        usages: 2,
        duration: 3,
      },
      args: [
        {
          key: 'term',
          prompt: 'What term do you want to define?',
          type: 'string',
        }
      ],
    });
  }

  @clientHasManageMessages()
  public async run(msg: CommandoMessage, { term, hasManageMessages, position = 0 }: UrbanArgs) {
    try {
      const urbanSearch = await fetch(`https://api.urbandictionary.com/v0/define?${stringify({ term })}`);
      const urbanDefinitions: UrbanDefinitionResults = await urbanSearch.json();
      const amountOfDefinitions = urbanDefinitions.list.length;
      const color = msg.guild ? msg.guild.me!.displayHexColor : DEFAULT_EMBED_COLOR;

      urbanDefinitions.list.sort((a, b) => b.thumbs_up - b.thumbs_down - (a.thumbs_up - a.thumbs_down));

      let currentDefinition = urbanDefinitions.list[position];
      let urbanEmbed = this.prepMessage(
        color, currentDefinition, amountOfDefinitions, position, hasManageMessages
      );

      deleteCommandMessages(msg, this.client);

      const message = await msg.embed(urbanEmbed) as CommandoMessage;

      if (amountOfDefinitions > 1 && hasManageMessages) {
        injectNavigationEmotes(message);
        new ReactionCollector(message, navigationReactionFilter, { time: CollectorTimeout.five })
          .on('collect', (reaction: MessageReaction, user: User) => {
            if (!this.client.botIds.includes(user.id)) {
              if (reaction.emoji.name === '➡') position++;
              else position--;
              if (position >= amountOfDefinitions) position = 0;
              if (position < 0) position = amountOfDefinitions - 1;
              currentDefinition = urbanDefinitions.list[position];
              urbanEmbed = this.prepMessage(
                color, currentDefinition, amountOfDefinitions, position, hasManageMessages
              );
              message.edit(urbanEmbed);
              message.reactions.get(reaction.emoji.name)!.users.remove(user);
            }
          });
      }

      return null;
    } catch (err) {
      deleteCommandMessages(msg, this.client);

      return msg.reply(`no definitions found for \`${term}\``);
    }
  }

  private prepMessage(
    color: string, definition: UrbanDefinition, definitionsLength: number,
    position: number, hasManageMessages: boolean
  ): MessageEmbed {
    return new MessageEmbed()
      .setTitle(`Urban Search - ${definition.word}`)
      .setURL(definition.permalink)
      .setColor(color)
      .setDescription(sentencecase(definition.definition.replace(/[[\]]/gim, '')))
      .setFooter(hasManageMessages ? `Result ${position + 1} of ${definitionsLength}` : '')
      .addField('Example',
        definition.example
          ? `${definition.example.slice(0, 1020)}${
            definition.example.length >= 1024
              ? '...'
              : ''
          }`
          : 'None');
  }
}