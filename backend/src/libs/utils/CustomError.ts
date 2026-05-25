export class CustomError extends Error {
  statusCode: number;
  data?: unknown;
  code?: string;

  constructor(
    message: string,
    statusCode = 400,
    data?: unknown,
    code?: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.code = code;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
