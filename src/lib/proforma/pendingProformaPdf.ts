/**
 * In-memory PDF handoff across create→edit navigation / soft refresh.
 * Never persisted; cleared after share or when form data changes.
 */
type PendingProformaPdf = {
  invoiceId: string;
  invoiceNumber: string;
  file: File;
  contentSignature: string;
};

let pending: PendingProformaPdf | null = null;

export function stashPendingProformaPdf(next: PendingProformaPdf): void {
  pending = next;
}

export function takePendingProformaPdf(
  invoiceId: string
): PendingProformaPdf | null {
  if (!pending || pending.invoiceId !== invoiceId) return null;
  const value = pending;
  pending = null;
  return value;
}

export function clearPendingProformaPdf(): void {
  pending = null;
}
