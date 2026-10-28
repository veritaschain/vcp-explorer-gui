/** Mock mode is the default, but an explicit false must enable the API. */
export function resolveUseMock(value: string | undefined): boolean {
  if (value === undefined || value === '' || value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('VITE_USE_MOCK must be either true or false.');
}
