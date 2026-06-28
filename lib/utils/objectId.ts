import mongoose from 'mongoose'

export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && 
         /^[0-9a-fA-F]{24}$/.test(id)
}