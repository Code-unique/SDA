import { NextResponse } from 'next/server';
export class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
export const handleAsync = async (promise) => {
    try {
        const data = await promise;
        return [data, null];
    }
    catch (error) {
        return [null, error];
    }
};
export const errorResponse = (error) => {
    if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
};
