import { isAxiosError } from 'axios';

/** A known absence in the selected data source, never a transport failure. */
export class ResourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}

export function isResourceNotFound(error: unknown): boolean {
  return error instanceof ResourceNotFoundError ||
    (isAxiosError(error) && error.response?.status === 404);
}
