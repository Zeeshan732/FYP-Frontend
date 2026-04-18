/**
 * Returns true when a table/list row click should not run the row-level action
 * (checkboxes, explicit action columns, buttons/links).
 */
export function shouldIgnoreDataRowClick(
  ev: MouseEvent,
  options: { actionsCellSelector?: string } = {}
): boolean {
  const actionsSelector = options.actionsCellSelector ?? '.col-actions';
  const t = ev.target as HTMLElement | null;
  if (!t) {
    return true;
  }
  if (t.closest('input[type="checkbox"]')) {
    return true;
  }
  if (t.closest(actionsSelector)) {
    return true;
  }
  if (t.closest('button, .p-button, a')) {
    return true;
  }
  return false;
}

/** Mobile data cards: ignore selection control and action toolbar. */
export function shouldIgnoreDataCardClick(ev: MouseEvent): boolean {
  const t = ev.target as HTMLElement | null;
  if (!t) {
    return true;
  }
  if (t.closest('input[type="checkbox"]')) {
    return true;
  }
  if (t.closest('.ns-data-card__actions')) {
    return true;
  }
  if (t.closest('button, .p-button, a')) {
    return true;
  }
  return false;
}
