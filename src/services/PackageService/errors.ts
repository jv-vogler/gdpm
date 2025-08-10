import { AppError } from '@/shared/errors';

type Props = {
  options?: {
    cause?: unknown;
  };
};

class PackageServiceError extends AppError {
  constructor(message: string, { options }: Props = {}) {
    super(message, { options });

    Error.captureStackTrace(this, PackageServiceError);
  }
}

export { PackageServiceError };
