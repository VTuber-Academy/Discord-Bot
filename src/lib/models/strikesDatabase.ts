import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for your document
export interface IStrike {
	reason: string;
	timestamp: Date;
	moderatorId: string;
	strikeId: string;
}

export interface IUser extends Document {
	userId: string;
	strikes: IStrike[];
}

// Define the schema for your Strike
const StrikeSchema: Schema = new Schema({
	reason: { type: String, required: true },
	timestamp: { type: Date, required: true },
	moderatorId: { type: String, required: true },
	strikeId: { type: String, required: true }
});

// Define the schema for your User
const UserSchema: Schema = new Schema({
	userId: { type: String, required: true },
	strikes: { type: [StrikeSchema], default: [] }
});

// Define the model for your document
const UserModel = mongoose.model<IUser>('User', UserSchema);

export default UserModel;
