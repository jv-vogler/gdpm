import { AppError } from '@/shared/errors';

type Props = {
  options?: {
    cause?: unknown;
  };
};

class FileSystemError extends AppError {
  constructor(message: string, { options }: Props = {}) {
    super(message, { options });

    Error.captureStackTrace(this, FileSystemError);
  }
}

export { FileSystemError };
