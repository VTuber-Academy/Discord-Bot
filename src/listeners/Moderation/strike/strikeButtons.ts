import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Interaction } from 'discord.js';
import strikeManager from '../../../lib/managers/strikeManager';

@ApplyOptions<Listener.Options>({
	event: Events.InteractionCreate,
	name: 'Strike Button Handler'
})
export class UserEvent extends Listener {
	public override async run(interaction: Interaction) {
		if (!interaction.isButton()) return;

		const [command, subcommand, ...args] = interaction.customId.split(':');

		if (command === 'strike') {
			if (subcommand === 'ban') {
				const user = await interaction.guild?.members.fetch(args[0]);
				if (!user) return interaction.reply({ content: 'User not found', ephemeral: true });

				const strikes = await strikeManager.get(user.id);

				await interaction.guild?.bans.create(user, {
					reason: `Strike limit reached, ${interaction.user} approves of the ban.\n\n${strikes.strikes
						.map((strike) => {
							strike.timestamp.toLocaleDateString('en-US') + ' - ' + strike.reason;
						})
						.join(`\n`)}`
				});

				return interaction.message.edit({ content: 'User has been banned', components: [] });
			}
		}

		return;
	}
}
