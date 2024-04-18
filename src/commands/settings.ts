import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Duration } from '@sapphire/time-utilities';

@ApplyOptions<Command.Options>({
	description: 'View or Change functionality of the bot',
	cooldownDelay: new Duration('30s').offset
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) => option.setAutocomplete(true).setName('category').setDescription('The plugin to change'))
		);
	}

	public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		return interaction.reply({ content: 'Hello world!' });
	}
}
