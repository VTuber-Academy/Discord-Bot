import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Duration } from '@sapphire/time-utilities';
import guildSettings from '../lib/models/guildSettings';
import { version } from '../../package.json';

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

	public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
		if (!interaction.member) return;

		const settings =
			(await guildSettings.findOne({ guildId: interaction.guildId })) ?? new guildSettings({ guildId: interaction.guildId, version: version });

		const modifiableSettings: string[] = [];
		const member = await interaction.guild?.members.fetch(interaction.member.user.id);

		Object.entries((settings as Record<string, any>).toObject()).forEach(([key, _value]) => {
			if (key === 'guildId' || key === 'version') return;

			if (member?.roles.cache.some((role) => settings.botMaster.includes(role.id))) {
				modifiableSettings.push(key);
			} else if (member?.roles.cache.some((role) => (settings as Record<string, any>)[key].botMaster.includes(role.id))) {
				modifiableSettings.push(key);
			} else if (member?.permissions.has('Administrator')) {
				modifiableSettings.push(key);
			}
		});

		const focusedFilter = modifiableSettings.filter((input) => input.startsWith(interaction.options.getFocused()));

		if (modifiableSettings.length === 0) {
			return interaction.respond([{ name: 'No settings available', value: 'You do not have permission to modify any settings' }]);
		} else {
			return interaction.respond(focusedFilter.map((setting) => ({ name: setting, value: (settings as Record<string, any>)[setting] })));
		}
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		return interaction.reply({ content: 'Hello world!' });
	}
}
