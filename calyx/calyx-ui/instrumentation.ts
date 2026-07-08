// @ts-nocheck

export async function register() {
  // Sentry has been completely disabled in standalone Calyx.
  return;
}

// We need NextJS 15 to use this
export const onRequestError = () => {};
