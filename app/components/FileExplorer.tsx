"use client";

import { useEffect, useRef, useState } from "react";
import {
  countFilesWithinFolder,
  FileTreeNode,
  findTypeaheadMatch,
  VisibleNode,
} from "../utils";

// Enhancement highlights: arrow-key navigation, Finder-style typeahead, live SSE reloads, and inline folder file counts.

const INDENT = 20;
const TYPEAHEAD_RESET_MS = 800; // Delay before clearing the type-ahead buffer

export function FileExplorer() {
  const [tree, setTree] = useState<FileTreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["root"])
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Cache button refs for focus management
  const nodeRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const typeaheadState = useRef<{ buffer: string; lastInputTime: number }>({
    buffer: "",
    lastInputTime: 0,
  });

  // Subscribe to server events so file mutations immediately refresh the tree.
  useEffect(() => {
    let cancelled = false;

    async function loadTree() {
      setLoading(true);
      try {
        const response = await fetch("/api/file-tree");
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const payload: FileTreeNode = await response.json();
        if (!cancelled) {
          setTree(payload);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTree();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/file-tree/stream");

    source.onmessage = (event) => {
      try {
        const payload: FileTreeNode = JSON.parse(event.data);
        if (cancelled) {
          return;
        }
        setTree(payload);
        setError(null);
        setLoading(false);
        setSelectedPath((previous) => {
          if (!previous) {
            return previous;
          }
          return findNodeByPath(payload, previous) ? previous : null;
        });
      } catch (error) {
        console.error("Failed to parse file tree SSE payload", error);
      }
    };

    source.onerror = () => {
      if (!cancelled) {
        setError("Live updates disconnected. Retrying…");
      }
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  const visibleNodes = tree ? flattenTree(tree, expanded) : [];

  const selectedNode = findNodeByPath(tree, selectedPath);
  const selectedFolderFileCount =
    selectedNode && selectedNode.type === "folder"
      ? countFilesWithinFolder(selectedNode)
      : null;

  // Keep the currently selected node focused and in view.
  useEffect(() => {
    if (!selectedPath) {
      return;
    }

    const target = nodeRefs.current.get(selectedPath);
    if (target) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "nearest" });
    }
  }, [selectedPath]);

  const onNodeClick = (item: VisibleNode) => {
    const target = item.node;

    // Fixed bug so that it uses set for paths.
    if (target.type === "folder") {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(target.path)) {
          next.delete(target.path);
        } else {
          next.add(target.path);
        }
        return next;
      });
    }

    setSelectedPath(target.path);
  };

  // Handle tree keyboard interactions: arrow navigation plus Finder-style type-ahead selection.
  const handleTreeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) {
      return;
    }

    const moveSelection = (delta: number) => {
      if (visibleNodes.length === 0) {
        return;
      }

      const currentIndex = selectedPath
        ? visibleNodes.findIndex((item) => item.node.path === selectedPath)
        : -1;

      if (currentIndex === -1) {
        const fallbackIndex = delta > 0 ? 0 : visibleNodes.length - 1;
        setSelectedPath(visibleNodes[fallbackIndex].node.path);
        return;
      }

      const nextIndex = Math.min(
        Math.max(currentIndex + delta, 0),
        visibleNodes.length - 1
      );
      if (nextIndex !== currentIndex) {
        setSelectedPath(visibleNodes[nextIndex].node.path);
      }
    };

    const collapseFolder = (path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    };

    const expandFolder = (path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(path);
        return next;
      });
    };

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveSelection(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        moveSelection(-1);
        return;
      case "ArrowRight":
        event.preventDefault();
        if (!selectedNode) {
          if (visibleNodes.length > 0) {
            setSelectedPath(visibleNodes[0].node.path);
          }
          return;
        }

        if (selectedNode.type === "folder") {
          if (!expanded.has(selectedNode.path)) {
            expandFolder(selectedNode.path);
            return;
          }

          const firstChild = Array.isArray(selectedNode.children)
            ? selectedNode.children[0]
            : null;
          if (firstChild) {
            setSelectedPath(firstChild.path);
          }
        }
        return;
      case "ArrowLeft":
        event.preventDefault();
        if (!selectedNode) {
          return;
        }

        if (selectedNode.type === "folder" && expanded.has(selectedNode.path)) {
          collapseFolder(selectedNode.path);
          return;
        }

        const parentPath = findParentPath(tree, selectedPath);
        if (parentPath) {
          setSelectedPath(parentPath);
        }
        return;
      default:
        break;
    }

    if (event.key === "Escape") {
      typeaheadState.current = { buffer: "", lastInputTime: 0 };
      return;
    }

    const now = Date.now();
    const shouldReset =
      now - typeaheadState.current.lastInputTime > TYPEAHEAD_RESET_MS;
    const nextBuffer = (
      shouldReset ? event.key : typeaheadState.current.buffer + event.key
    ).toLowerCase();
    typeaheadState.current = { buffer: nextBuffer, lastInputTime: now };

    const match = findTypeaheadMatch(nextBuffer, visibleNodes, selectedPath);
    if (match) {
      event.preventDefault();
      setSelectedPath(match.node.path);
    }
  };

  return (
    <div className="file-explorer">
      <div className="file-explorer__tree">
        <header className="file-explorer__toolbar">
          <p className="file-explorer__hint">
            Enhance this view with keyboard type-ahead support.
          </p>
        </header>

        <div
          className="file-explorer__body"
          role="tree"
          aria-label="Project files"
          tabIndex={0}
          onKeyDown={handleTreeKeyDown}
        >
          {loading && (
            <p className="file-explorer__status">Loading file tree…</p>
          )}
          {error && !loading && (
            <p className="file-explorer__status file-explorer__status--error">
              Failed to load files: {error}
            </p>
          )}

          {!loading && !error && visibleNodes.length === 0 && (
            <p className="file-explorer__status">No files to display.</p>
          )}

          {!loading &&
            !error &&
            visibleNodes.map((item) => {
              const { node, depth } = item;
              const isFolder = node.type === "folder";
              const isExpanded = expanded.has(node.path);
              const isSelected = node.path === selectedPath;
              const inlineCount =
                isFolder && isSelected && selectedFolderFileCount !== null
                  ? selectedFolderFileCount
                  : null;

              return (
                <button
                  key={node.path}
                  type="button"
                  role="treeitem"
                  aria-expanded={isFolder ? isExpanded : undefined}
                  aria-selected={isSelected}
                  className={[
                    "file-explorer__node",
                    isFolder
                      ? "file-explorer__node--folder"
                      : "file-explorer__node--file",
                    isSelected ? "file-explorer__node--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ paddingLeft: INDENT + depth * INDENT }}
                  onClick={() => onNodeClick(item)}
                  tabIndex={isSelected ? 0 : -1}
                  ref={(element) => {
                    if (!element) {
                      nodeRefs.current.delete(node.path);
                      return;
                    }
                    nodeRefs.current.set(node.path, element);
                  }}
                >
                  {isFolder ? (isExpanded ? "📂" : "📁") : "📄"} {node.name}
                  {inlineCount !== null && (
                    <span className="file-explorer__node-count">
                      ({inlineCount} {inlineCount === 1 ? "file" : "files"})
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      <aside
        className="file-explorer__details"
        aria-label="Selected item details"
      >
        {selectedNode ? (
          <div>
            <h2 className="file-explorer__details-title">
              {selectedNode.name}
            </h2>
            <dl className="file-explorer__details-grid">
              <dt>Path</dt>
              <dd>{selectedNode.path}</dd>
              {/* Surface aggregated child counts so folders have immediate context. */}
              {selectedFolderFileCount !== null && (
                <>
                  <dt>Total files</dt>
                  <dd>{selectedFolderFileCount}</dd>
                </>
              )}
            </dl>
            <p className="file-explorer__next-step">
              Flesh this panel out with richer insights derived from the data
              source.
            </p>
          </div>
        ) : (
          <div className="file-explorer__placeholder">
            <h2>Select an item</h2>
            <p>Choose a file or folder from the tree to inspect its details.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function flattenTree(root: FileTreeNode, expanded: Set<string>): VisibleNode[] {
  const result: VisibleNode[] = [];

  const visit = (node: FileTreeNode, depth: number) => {
    result.push({ node, depth });

    if (node.type === "folder" && expanded.has(node.path)) {
      const children = Array.isArray(node.children) ? node.children : [];
      children.forEach((child) => visit(child, depth + 1));
    }
  };

  visit(root, 0);

  return result;
}

function findNodeByPath(
  root: FileTreeNode | null,
  path: string | null
): FileTreeNode | null {
  if (!root || !path) {
    return null;
  }

  if (root.path === path) {
    return root;
  }

  const stack: FileTreeNode[] = Array.isArray(root.children)
    ? [...root.children]
    : [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    if (current.path === path) {
      return current;
    }
    if (current.type === "folder" && Array.isArray(current.children)) {
      stack.push(...current.children);
    }
  }

  return null;
}

function findParentPath(
  root: FileTreeNode | null,
  targetPath: string | null
): string | null {
  if (!root || !targetPath || root.path === targetPath) {
    return null;
  }

  const stack: Array<{ node: FileTreeNode; parentPath: string }> =
    Array.isArray(root.children)
      ? root.children.map((child) => ({ node: child, parentPath: root.path }))
      : [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    if (current.node.path === targetPath) {
      return current.parentPath;
    }

    if (
      current.node.type === "folder" &&
      Array.isArray(current.node.children)
    ) {
      current.node.children.forEach((child) =>
        stack.push({ node: child, parentPath: current.node.path })
      );
    }
  }

  return null;
}
