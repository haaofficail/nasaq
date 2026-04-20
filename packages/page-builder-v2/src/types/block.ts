// Shared block type — used by puck-config and individual blocks

export interface BlockConfig {
  /** Unique block identifier, e.g. "hero", "text_block" */
  type: string;
  /** Arabic display label shown in Puck sidebar */
  label: string;
}
