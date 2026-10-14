declare const process: { env: { NODE_ENV?: string } };

/**
 * True unless the consumer's bundler replaced `process.env.NODE_ENV` with "production".
 * The expression must stay literal for bundler defines, and `process` is usually not defined in
 * the browser, so a missing `process` (unbundled ESM) throws and counts as development.
 * The library build leaves the expression unreplaced (tsup.base.ts `define`).
 */
export const isDev = (): boolean => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return true;
  }
};
