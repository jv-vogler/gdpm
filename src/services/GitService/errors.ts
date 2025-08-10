import { AppError } from '@/shared/errors';

type GitErrorDetails = {
  commands?: string[];
};

type Props = {
  options?: {
    cause?: unknown;
    details?: GitErrorDetails;
  };
};

class GitError extends AppError {
  public readonly details?: GitErrorDetails;

  constructor(message: string, { options }: Props = {}) {
    super(message, { options });
    this.details = options?.details;

    Error.captureStackTrace(this, GitError);
  }
}

export { GitError };
