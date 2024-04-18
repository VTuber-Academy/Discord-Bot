import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Client } from 'discord.js';
import guildSettings from '../lib/models/guildSettings';
import { version } from '../../package.json';

@ApplyOptions<Listener.Options>({
	event: Events.ClientReady,
	name: 'Verifies if guild settings are up to date!'
})
export class UserEvent extends Listener {
	public override run(client: Client) {
		this.container.logger.info('Checking if guild settings are up to date!');

		client.guilds.cache.forEach(async (guild) => {
			this.container.logger.debug(`Checking guild settings for ${guild.name} (${guild.id})...`);

			const settings = await guildSettings.findOne({ guildId: guild.id });

			if (!settings) {
				this.container.logger.debug('Guild settings not found, creating new settings...');

				await guildSettings.create({
					guildId: guild.id,
					version
				});

				this.container.logger.debug('Guild settings created!');
			} else if (settings.version !== version) {
				this.container.logger.debug('Guild settings outdated, updating settings...');

				try {
					settings.version = version;
					await guildSettings.create(settings);
				} catch (error) {
					this.container.logger.error(`An error occurred while updating guild settings: ${error}`);
				} finally {
					await settings.deleteOne();
				}

				this.container.logger.debug('Guild settings updated!');
			}

			this.container.logger.info(`Guild settings for ${guild.name} (${guild.id}) are up to date!`);
		});
	}
}
