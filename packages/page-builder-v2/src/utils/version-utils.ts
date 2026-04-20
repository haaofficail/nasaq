/**
 * version-utils — pure helpers for version history UI
 *
 * diffVersions          — block-level diff between two Puck data snapshots
 * summarizeVersionDiff  — count added/removed/modified/unchanged
 * formatRelativeTime    — Arabic relative time without date-fns
 * getChangeTypeLabel    — Arabic label for change_type enum
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type BlockDiffStatus = "added" | "removed" | "modified" | "unchanged";

export interface BlockDiff {
  blockId: string;
  blockType: string;
  status: BlockDiffStatus;
  oldProps?: Record<string, unknown>;
  newProps?: Record<string, unknown>;
}

export interface VersionDiffSummary {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

export type ChangeType = "auto_save" | "manual_save" | "publish" | "restored";

// ── diffVersions ───────────────────────────────────────────────────────────

interface PuckBlock {
  type: string;
  props: { id: string; [key: string]: unknown };
}

interface PuckData {
  content: PuckBlock[];
}

export function diffVersions(
  oldData: PuckData | null | undefined,
  newData: PuckData | null | undefined
): BlockDiff[] {
  const oldBlocks: PuckBlock[] = oldData?.content ?? [];
  const newBlocks: PuckBlock[] = newData?.content ?? [];

  // Build lookup maps by props.id
  const oldMap = new Map<string, PuckBlock>();
  for (const b of oldBlocks) {
    oldMap.set(b.props.id, b);
  }

  const newMap = new Map<string, PuckBlock>();
  for (const b of newBlocks) {
    newMap.set(b.props.id, b);
  }

  const diffs: BlockDiff[] = [];

  // Check all new blocks: added or unchanged/modified
  for (const nb of newBlocks) {
    const id = nb.props.id;
    const ob = oldMap.get(id);
    if (!ob) {
      diffs.push({ blockId: id, blockType: nb.type, status: "added", newProps: nb.props });
    } else {
      const { id: _nid, ...nProps } = nb.props;
      const { id: _oid, ...oProps } = ob.props;
      const changed = JSON.stringify(nProps) !== JSON.stringify(oProps) || ob.type !== nb.type;
      diffs.push({
        blockId: id,
        blockType: nb.type,
        status: changed ? "modified" : "unchanged",
        oldProps: ob.props,
        newProps: nb.props,
      });
    }
  }

  // Check old blocks not in new: removed
  for (const ob of oldBlocks) {
    const id = ob.props.id;
    if (!newMap.has(id)) {
      diffs.push({ blockId: id, blockType: ob.type, status: "removed", oldProps: ob.props });
    }
  }

  return diffs;
}

// ── summarizeVersionDiff ───────────────────────────────────────────────────

export function summarizeVersionDiff(diffs: BlockDiff[]): VersionDiffSummary {
  const summary: VersionDiffSummary = { added: 0, removed: 0, modified: 0, unchanged: 0 };
  for (const d of diffs) {
    summary[d.status]++;
  }
  return summary;
}

// ── formatRelativeTime ─────────────────────────────────────────────────────

export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "الآن";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `منذ ${diffHrs} ساعة`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `منذ ${diffDays} يوم`;

  const diffWeeks = Math.floor(diffDays / 7);
  return `منذ ${diffWeeks} أسبوع`;
}

// ── getChangeTypeLabel ─────────────────────────────────────────────────────

export function getChangeTypeLabel(changeType: ChangeType): string {
  const labels: Record<ChangeType, string> = {
    auto_save: "حفظ تلقائي",
    manual_save: "حفظ يدوي",
    publish: "نشر",
    restored: "استعادة",
  };
  return labels[changeType];
}
