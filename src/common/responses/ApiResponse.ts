export class ApiResponse<T> {
  public readonly success: boolean;
  public readonly message: string;
  public readonly data?: T;
  public readonly meta?: Record<string, any>;

  constructor(success: boolean, message: string, data?: T, meta?: Record<string, any>) {
    this.success = success;
    this.message = message;
    if (data !== undefined) this.data = data;
    if (meta !== undefined) this.meta = meta;
  }

  static success<T>(data: T, message: string = 'Success', meta?: Record<string, any>) {
    return new ApiResponse(true, message, data, meta);
  }

  static error(message: string, meta?: Record<string, any>) {
    return new ApiResponse(false, message, undefined, meta);
  }
}
