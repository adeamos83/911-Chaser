// Button looks shared by <button> and <Link>, so a link and a button can look identical.

/** Dark, filled button: the main action on a screen. */
export const PRIMARY_BUTTON =
  "inline-flex items-center justify-center rounded-button bg-ink font-semibold text-inverse no-underline transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

/** Outlined button: the secondary action next to a primary one. */
export const OUTLINE_BUTTON =
  "inline-flex items-center justify-center rounded-button border border-line bg-transparent font-semibold text-ink no-underline transition-colors hover:border-ink";
