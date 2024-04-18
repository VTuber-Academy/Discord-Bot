import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for the document
interface GuildSettings extends Document {
	guildId: string;
	botMaster: string[];
	'custom-role': {
		enabled: boolean;
		noHigherThan: string;
		roleMasters: string[];
		botMaster: string[];
	};
	version: number;
}

// Define the schema for the model
const GuildSettingsSchema: Schema = new Schema({
	guildId: { type: String, required: true },
	botMaster: { type: [String], default: [] },
	'custom-role': {
		enabled: { type: Boolean, default: false },
		noHigherThan: { type: String, default: '' },
		roleMasters: { type: [String], default: [] },
		botMaster: { type: [String], default: [] }
	},
	version: { type: Number, required: true }
});

// Create and export the model
export default mongoose.model<GuildSettings>('Guild Settings', GuildSettingsSchema);
