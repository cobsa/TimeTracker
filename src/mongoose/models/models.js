import mongoose, { Schema } from 'mongoose'
import uniniqueValidator from 'mongoose-unique-validator'

const ObjectId = Schema.Types.ObjectId
// Define mongoose schemas
const userSchema = new Schema({
  id: ObjectId,
  name: String,
  email: { type: String, lowercase: true, trim: true, index: true, unique: true },
  password: String
})
userSchema.plugin(uniniqueValidator)
const User = mongoose.model('User', userSchema)

const recordSchema = new Schema({
  id: ObjectId,
  type: String,
  done: Boolean,
  start: Date,
  end: Date,
  uid: ObjectId
})
const Record = mongoose.model('Record', recordSchema)

export { Record, User }
