export function countFilesWithinFolder(node: FileTreeNode): number {
  if (node.type !== "folder") {
    return 0;
  }

  const children = Array.isArray(node.children) ? node.children : [];
  let total = 0;

  for (const child of children) {
    if (child.type === "file") {
      total += 1;
      continue;
    }
    total += countFilesWithinFolder(child);
  }

  return total;
}

// Locate the next visible node whose name matches the buffered query.
export function findTypeaheadMatch(
  query: string,
  nodes: VisibleNode[],
  selectedPath: string | null
): VisibleNode | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized || nodes.length === 0) {
    return null;
  }

  const startIndex = selectedPath
    ? nodes.findIndex((item) => item.node.path === selectedPath)
    : -1;
  const total = nodes.length;

  for (let offset = 1; offset <= total; offset++) {
    const index = (startIndex + offset + total) % total;
    const candidate = nodes[index];
    if (candidate.node.name.toLowerCase().startsWith(normalized)) {
      return candidate;
    }
  }

  return null;
}

export type FileTreeNode = {
  type: "file" | "folder";
  name: string;
  path: string;
  children?: FileTreeNode[];
  extension?: string;
  sizeInBytes?: number;
  modifiedAt?: string;
};

// NOTE: This type is intentionally loose. Refine it during the exercise to avoid
// optional property checks sprinkled throughout the tree-handling logic.

export type VisibleNode = {
  node: FileTreeNode;
  depth: number;
};
