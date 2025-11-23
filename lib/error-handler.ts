import { NextResponse } from 'next/server'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export const handleAsync = async <T>(
  promise: Promise<T>
): Promise<[T | null, any]> => {
  try {
    const data = await promise
    return [data, null]
  } catch (error) {
    return [null, error]
  }
}

export const errorResponse = (error: any) => {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  console.error('Unexpected error:', error)
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}