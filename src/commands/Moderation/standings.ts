import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import strikeManager from '../../lib/managers/strikeManager';

@ApplyOptions<Command.Options>({
	description: "See a member's moral standings"
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addUserOption((option) => option.setName('target').setDescription('Member to see the standings of'))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const user = interaction.options.getUser('target') ?? interaction.user;

		const standings = await strikeManager.generateStandings(user);

		return interaction.reply({ embeds: [standings], ephemeral: true });
	}
}
