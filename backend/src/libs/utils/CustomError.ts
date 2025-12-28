export class CustomError extends Error {
  statusCode: number;
  data?: unknown;

  constructor(message: string, statusCode = 400, data?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
