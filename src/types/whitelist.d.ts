import { ObjectId } from 'mongodb';

export declare interface Whitelist {
  _id: ObjectId;
  robloxUser: string;
  discordUserId: string;
  personal: object;
  questions: Array;
  asnwers: Array;
  approved: boolean;
}
