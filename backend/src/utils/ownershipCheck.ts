import { Model, Types } from 'mongoose';

export class AppError extends Error {
  statusCode: number;
  code: string;
  fields?: Record<string, string[]>;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', fields?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Asserts that a document with resourceId exists and belongs to userId.
 * Throws 404 NOT_FOUND (never 403) to prevent IDOR and resource enumeration attacks.
 */
export async function assertOwnership<T>(
  ModelClass: Model<T>,
  resourceId: string | Types.ObjectId,
  userId: string | Types.ObjectId,
  additionalQuery: Record<string, any> = { isDeleted: false }
): Promise<T> {
  if (!Types.ObjectId.isValid(resourceId.toString())) {
    throw new AppError('Resource not found', 404, 'NOT_FOUND');
  }

  const query: Record<string, any> = {
    _id: new Types.ObjectId(resourceId.toString()),
    userId: new Types.ObjectId(userId.toString()),
    ...additionalQuery,
  };

  const doc = await ModelClass.findOne(query);

  if (!doc) {
    throw new AppError('Resource not found', 404, 'NOT_FOUND');
  }

  return doc;
}
