// Limits shared by forms (in the browser) and server actions, so both always agree.

/** Longest build name we store. */
export const MAX_BUILD_NAME_LENGTH = 80;

/** Supabase rejects passwords shorter than this. */
export const MIN_PASSWORD_LENGTH = 6;
