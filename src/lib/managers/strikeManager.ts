import { EmbedBuilder, User } from 'discord.js';
import StrikeModel, { IStrike } from '../models/strikesDatabase';
import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';
import { container } from '@sapphire/framework';
import config from '../../../config.json';

const emojis = {
	positive: '<:heart:1232346608742436865> ',
	negative: '<a:break:1232346606851063929> '
};

class strikesManagement {
	async add(user: User, reason: string, count: number, moderator: User) {
		let strikeUser = await this.get(user.id);
		container.logger.debug(`Got ${strikeManager}!`);

		for (let i = 0; i < count; i++) {
			const strike = { reason, timestamp: new Date(), moderatorId: moderator.id, strikeId: uuidv4() };

			strikeUser.strikes.push(strike);
			container.logger.debug(`Added strike ${strike.strikeId} to ${strikeUser.id}!`);
		}

		await strikeUser.save();
		container.logger.debug(`Saved ${strikeUser}!`);

		if (this.activeStrikes(strikeUser.strikes).length >= 4) {
			await this.staffAlert(user);
		}

		return strikeUser;
	}

	async remove(user: User, strikeId: string) {
		const strikeUser = await this.get(user.id);

		const strikeIndex = strikeUser.strikes.findIndex((strike) => strike.strikeId === strikeId);

		if (strikeIndex === -1) {
			return undefined;
		}

		const removedStrike = strikeUser.strikes.splice(strikeIndex, 1);

		await strikeUser.save();

		return removedStrike[0];
	}

	async generateStandings(user: User) {
		const strikeUser = await this.get(user.id);

		const activeStrikes = this.activeStrikes(strikeUser.strikes);
		const moralPoints = 4 - activeStrikes.length;

		const embed = new EmbedBuilder()
			.setDescription(`${emojis.positive.repeat(moralPoints)}${emojis.negative.repeat(4 - moralPoints)}`)
			.setColor(moralPoints > 2 ? 'Green' : 'Red')
			.setTitle('Moral Standings')
			.setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
			.setThumbnail(user.displayAvatarURL())
			.setTimestamp();

		if (activeStrikes.length > 0) {
			const embedFields = activeStrikes.map((strike) => ({ name: strike.strikeId, value: strike.reason }));
			embed.addFields(embedFields);
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

		if (staffChannel && staffChannel.isTextBased()) {
			await staffChannel.send({ embeds: [embed] });
		}

		return embed;
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
}

const strikeManager = new strikesManagement();
export default strikeManager;
