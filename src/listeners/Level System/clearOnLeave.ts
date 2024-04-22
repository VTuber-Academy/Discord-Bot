import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import levelDatabase from '../lib/levelDataBase';
import { GuildMember } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.GuildMemberRemove,
	name: 'clear member on leave'
})
export class UserEvent extends Listener {
	public override async run(member: GuildMember) {
		await levelDatabase.findOneAndDelete({ id: member.id }).catch(() => 0);
	}
}
