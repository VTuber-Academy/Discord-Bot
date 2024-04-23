import mongoose, { Schema } from 'mongoose';

// Define the interface for your document
export interface IStrike {
	reason: string;
	timestamp: Date;
	moderatorId: string;
	strikeId: string;
}

export interface IUser {
	userId: string;
	strikes: IStrike[];
}

// Define the schema for your document
const StrikeSchema: Schema = new Schema({
	userId: { type: String, required: true },
	strikes: [{ type: Schema.Types.ObjectId, ref: 'Strike', default: [] }]
});

// Define the model for your document
const StrikeModel = mongoose.model<IUser>('Strikes', StrikeSchema);

export default StrikeModel;
