type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rowCount: number | null; rows: unknown[] }>;
};

export async function decrementFlowerBatchQuantity(
  db: Queryable,
  params: {
    orgId: string;
    batchId: string;
    quantity: number;
    requireSufficientStock?: boolean;
  },
): Promise<number> {
  const { orgId, batchId, quantity, requireSufficientStock = false } = params;
  const result = await db.query(
    `UPDATE flower_batches
     SET quantity_remaining = quantity_remaining - $1
     WHERE id = $2 AND org_id = $3
       ${requireSufficientStock ? "AND quantity_remaining >= $1" : ""}`,
    [quantity, batchId, orgId],
  );

  return result.rowCount ?? 0;
}
