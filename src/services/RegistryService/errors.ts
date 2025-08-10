import { AppError } from '@/shared/errors';

type Props = {
  options?: {
    cause?: unknown;
  };
};

class RegistryError extends AppError {
  constructor(message: string, { options }: Props = {}) {
    super(message, { options });

    Error.captureStackTrace(this, RegistryError);
  }
}

export { RegistryError };
