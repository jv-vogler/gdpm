type Props = {
  options?: {
    cause?: unknown;
  };
};

class AppError extends Error {
  constructor(message: string, { options }: Props = {}) {
    super(message, options);
    Error.captureStackTrace(this, AppError);
  }
}

export { AppError };
