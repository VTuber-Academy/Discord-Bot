import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { DurationFormatter } from '@sapphire/time-utilities';
import { EmbedBuilder } from 'discord.js';
import { version } from '../../package.json';

@ApplyOptions<Command.Options>({
	description: 'Find out what the bot is about'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const embed = new EmbedBuilder()
			.setTitle('__About VTR Bot__')
			.setDescription(
				'VTR Bot is a bot that is designed to help the [VTR Discord Server](https://discord.gg/vtr) automate tasks and fun events for the community.'
			)
			.setTimestamp()
			.setColor('Random')
			.setTimestamp()
			.addFields([
				{ name: 'Developer(s) 🔧', value: '[Mieko Hikari](https://github.com/miekohikari)', inline: true },
				{ name: 'Uptime ⏰', value: new DurationFormatter().format(interaction.client.uptime), inline: true },
				{ name: 'Version 📈', value: version, inline: true }
			])

			.setThumbnail(interaction.client.user.displayAvatarURL());
		return interaction.reply({ embeds: [embed], ephemeral: true });
	}
}
