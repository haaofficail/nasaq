/**
 * PuckEditor — wraps @measured/puck with ترميز OS defaults
 *
 * - Passes puckConfig (all registered blocks)
 * - Calls onSave when user clicks the built-in "Publish" action
 * - Fully RTL-aware header direction is handled by Puck internally;
 *   block previews use dir="rtl" set per-block
 */

import React from "react";
import { Puck } from "@measured/puck";
import type { Data } from "@measured/puck";
import { puckConfig } from "../config/puck-config";

export interface PuckEditorProps {
  initialData?: Partial<Data>;
  onSave: (data: Data) => Promise<void> | void;
  /** Called whenever editor content changes — used for auto-save dirty tracking */
  onChange?: (data: Data) => void;
}

export function PuckEditor({ initialData, onSave, onChange }: PuckEditorProps) {
  const emptyData: Data = {
    content: [],
    root: { props: { title: "" } },
  };

  const data: Data = {
    content: initialData?.content ?? [],
    root: initialData?.root ?? emptyData.root,
  };

  return (
    <Puck
      config={puckConfig}
      data={data}
      onPublish={onSave}
      onChange={onChange}
    />
  );
}
