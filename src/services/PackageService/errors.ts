import { AppError } from '@/shared/errors';

type Props = {
  options?: {
    cause?: unknown;
  };
};

class PackageError extends AppError {
  constructor(message: string, { options }: Props = {}) {
    super(message, { options });

    Error.captureStackTrace(this, PackageError);
  }
}

export { PackageError };
