"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error('Please define MONGODB_URI environment variable');
}
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}
async function connectToDatabase() {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10, // Increased pool size
            minPoolSize: 5,
            socketTimeoutMS: 45000, // Give up initial connection after 45 seconds
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        };
        cached.promise = mongoose_1.default.connect(MONGODB_URI, opts)
            .then((mongoose) => {
            console.log('✅ MongoDB connected successfully');
            return mongoose;
        })
            .catch((error) => {
            console.error('❌ MongoDB connection error:', error);
            cached.promise = null; // Reset on error
            throw error;
        });
    }
    try {
        cached.conn = await cached.promise;
    }
    catch (e) {
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}
