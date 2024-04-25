import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable, EmbedBuilder, MessageActionRowComponentBuilder, User } from 'discord.js';
import StrikeModel, { IStrike } from '../models/strikesDatabase';
import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';
import { container } from '@sapphire/framework';
import config from '../../../config.json';

const emojis = {
	positive: '<:heart:1232346608742436865> ',
	negative: '<a:break:1232346606851063929> '
};

const strikeColors: Record<number, ColorResolvable> = {
	4: '#5861bb',
	3: '#4e41a2',
	2: '#2c1668',
	1: '#180f29',
	0: '#000000'
};

class strikesManagement {
	async add(user: User, reason: string, count: number, moderator: User) {
		container.logger.debug(`add function called with user: ${user}, reason: ${reason}, count: ${count}, moderator: ${moderator}`);
		let strikeUser = await this.get(user.id);

		const strikeID = uuidv4();

		try {
			for (let i = 0; i < count; i++) {
				const strike: IStrike = { reason, timestamp: new Date(), moderatorId: moderator.id, strikeId: strikeID };

				strikeUser.strikes.push(strike);
			}
		} catch (error) {
			container.logger.error(`Error in add function: ${error}`);
		}

		await strikeUser.save();
		container.logger.debug(`Saved ${strikeUser}!`);

		if (this.activeStrikes(strikeUser.strikes).length >= 4) {
			await this.staffAlert(user);
		}

		this.log(
			new EmbedBuilder()
				.setTitle('Strike Added')
				.setDescription(`User: ${user.username} has been given ${count} strike(s) by ${moderator.username} for: ${reason}`)
				.setColor('Red')
				.setTimestamp()
		);

		return strikeUser;
	}

	// TODO: Remove tranquilizer role incase of recovery from the 4th strike.
	async remove(user: User, strikeId: string) {
		const strikeUser = await this.get(user.id);

		const removedStrikes = strikeUser.strikes.filter((strike) => strike.strikeId === strikeId);

		if (removedStrikes.length === 0) {
			return undefined;
		}

		strikeUser.strikes = strikeUser.strikes.filter((strike) => strike.strikeId !== strikeId);

		await strikeUser.save();

		this.log(
			new EmbedBuilder()
				.setTitle('Strike(s) Removed')
				.setDescription(`User: ${user.username}'s strike(s) with ID: ${strikeId} have been removed!`)
				.setColor('Green')
				.setTimestamp()
		);

		return removedStrikes;
	}

	async generateStandings(user: User) {
		const strikeUser = await this.get(user.id);

		const activeStrikes = this.activeStrikes(strikeUser.strikes);
		const moralPoints = 4 - activeStrikes.length > 0 ? 4 - activeStrikes.length : 0;

		const embed = new EmbedBuilder()
			.setColor(strikeColors[moralPoints])
			.setTitle(`${emojis.positive.repeat(moralPoints)}${emojis.negative.repeat(4 - moralPoints)}`)
			.setAuthor({ name: 'Moral Standings', iconURL: container.client.user?.displayAvatarURL() })
			.setThumbnail(user.displayAvatarURL())
			.setTimestamp();

		if (activeStrikes.length > 0) {
			const embedFields = activeStrikes.map((strike) => ({ name: `ID: \`${strike.strikeId}\``, value: strike.reason, inline: false }));
			embed.addFields(embedFields);
		} else {
			embed.setDescription('No active strikes! Great Job! <:ColaLove:860148150936797184>');
		}

		return embed;
	}

	async staffAlert(user: User) {
		const embed = new EmbedBuilder()
			.setTitle('User has reached 4 strikes!')
			.setDescription(`User ${user.username} has reached 4 strikes!`)
			.setThumbnail(user.displayAvatarURL())
			.setColor('Red')
			.setTimestamp();

		const server = await container.client.guilds.fetch(config.mainServer);
		const staffChannel = server.channels.cache.get(config.scanner.staffNotificationChannel);

		const messageRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
			new ButtonBuilder().setCustomId(`strike:ban:${user.id}`).setLabel('Ban User').setStyle(ButtonStyle.Danger).setEmoji('🔨')
		);

		const member = await server.members.fetch(user);

		if (!member) return;
		await member.roles.add(config.scanner.tranquilizerRole, 'User has reached 4 strikes!');

		if (staffChannel && staffChannel.isTextBased()) {
			await staffChannel.send({ embeds: [embed], components: [messageRow] });
		}

		return;
	}

	activeStrikes(strikes: IStrike[]) {
		return strikes.filter((strike) => {
			const strikeTimestamp = DateTime.fromJSDate(strike.timestamp);
			const oneMonthAgo = DateTime.now().minus({ months: 1 });
			return strikeTimestamp > oneMonthAgo;
		});
	}

	async get(user: string) {
		let strikeUser = await StrikeModel.findOne({ userId: user });

		if (!strikeUser) {
			strikeUser = new StrikeModel({ userId: user });
		}

		return strikeUser;
	}

	async log(embed: EmbedBuilder) {
		const server = await container.client.guilds.fetch(config.mainServer);
		const logChannel = server.channels.cache.get(config.strike.logChannel);

		if (logChannel && logChannel.isTextBased()) {
			await logChannel.send({ embeds: [embed] });
		}
	}
}

const strikeManager = new strikesManagement();
export default strikeManager;
