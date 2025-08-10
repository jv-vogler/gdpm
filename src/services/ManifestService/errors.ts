import { AppError } from '@/shared/errors';

type Props = {
  options?: {
    cause?: unknown;
  };
};

class ManifestError extends AppError {
  constructor(message: string, { options }: Props = {}) {
    super(message, { options });

    Error.captureStackTrace(this, ManifestError);
  }
}

export { ManifestError };
