import { CommandoClient, CommandoMessage } from 'discord.js-commando';
import { Message } from 'discord.js';
import levenshtein from 'fast-levenshtein';
import moment from 'moment';
import { countCaps, countEmojis, countMentions, isNumberBetween } from './Utils';

export const badwords = (msg: CommandoMessage, words: string[], client: CommandoClient) => {
  if (msg.author!.bot || client.isOwner(msg.author!) || msg.member!.hasPermission('MANAGE_MESSAGES') || !words || !words.length) {
    return false;
  }

  return words.some((word: string) => msg.content.includes(word));
};

export const duptext = (
  msg: CommandoMessage, within: number, equals: number, distance: number, client: CommandoClient
) => {
  if (msg.author!.bot || client.isOwner(msg.author!) || msg.member!.hasPermission('MANAGE_MESSAGES')) {
    return false;
  }
  const authorMessages = msg.channel.messages.filter((message: Message) => {
    const diff = moment.duration(moment(message.createdTimestamp).diff(Date.now()));

    return (
      isNumberBetween(diff.asMinutes(), within * -1, 0, true) &&
      message.author!.id === msg.author!.id
    );
  });

  if (authorMessages.size <= equals) {
    return false;
  }

  const msgArray = authorMessages.array();

  msgArray.sort((prevMsg: Message, nextMsg: Message) => nextMsg.createdTimestamp - prevMsg.createdTimestamp);

  const levdist = levenshtein.get(msgArray[0].cleanContent,
    msgArray[1].cleanContent);

  return levdist <= distance;
};

export const caps = (msg: CommandoMessage, threshold: number, minlength: number, client: CommandoClient) => {
  if (msg.author!.bot || client.isOwner(msg.author!) || msg.member!.hasPermission('MANAGE_MESSAGES')) {
    return false;
  }
  if (msg.cleanContent.length >= minlength) {
    if (countCaps(msg.content, msg.cleanContent) >= threshold) {
      return true;
    }
  }

  return false;
};

export const emojis = (msg: CommandoMessage, threshold: number, minlength: number, client: CommandoClient) => {
  if (msg.author!.bot || client.isOwner(msg.author!) || msg.member!.hasPermission('MANAGE_MESSAGES')) {
    return false;
  }
  if (msg.cleanContent.length >= minlength) {
    if (countEmojis(msg.content) >= threshold) {
      return true;
    }
  }

  return false;
};

export const mentions = (msg: CommandoMessage, threshold: number, client: CommandoClient) => {
  if (msg.author!.bot || client.isOwner(msg.author!) || msg.member!.hasPermission('MANAGE_MESSAGES')) {
    return false;
  }

  return countMentions(msg.content) >= threshold;
};

export const links = (msg: CommandoMessage, client: CommandoClient) => {
  if (msg.author!.bot || client.isOwner(msg.author!) || msg.member!.hasPermission('MANAGE_MESSAGES')) {
    return false;
  }

  return /https?:\/\/(?!discordapp\.com|discord.gg)[^\s]+/gim.test(msg.content);
};

export const invites = (msg: CommandoMessage, client: CommandoClient) => {
  if (msg.author!.bot || client.isOwner(msg.author!) || msg.member!.hasPermission('MANAGE_MESSAGES')) {
    return false;
  }

  return /(?:discord\.gg|discordapp.com\/invite)/gim.test(msg.content);
};

export const slowmode = (msg: CommandoMessage, within: number, client: CommandoClient) => {
  if (msg.author!.bot || client.isOwner(msg.author!) || msg.member!.hasPermission('MANAGE_MESSAGES')) {
    return false;
  }
  const authorMessages = msg.channel.messages.filter((message: Message) => {
    const diff = moment.duration(moment(message.createdTimestamp).diff(Date.now()));

    return (
      isNumberBetween(diff.asSeconds(), within * -1, 0, true) &&
      message.author!.id === msg.author!.id
    );
  });

  const msgArray = authorMessages.array();

  if (msgArray.length) {
    const diff = moment.duration(moment(msgArray[0].createdAt).diff(Date.now()));

    if (diff.asSeconds() <= within) {
      return true;
    }
  }

  return false;
};