import { NextResponse } from 'next/server';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { FolderNode, TreeNode } from '../../../types/fileTree';

const execFileAsync = promisify(execFile);

const ROOT_KEY = 'root';
const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'create-file-tree.sh');
const TREE_ROOT_DIRECTORY = path.join(process.cwd(), 'tmp', 'runtime-file-tree');

export async function GET() {
  try {
    await ensureTreeOnDisk();
    const tree = await readTree();
    return NextResponse.json(tree);
  } catch (error) {
    console.error('Failed to build file tree', error);
    return NextResponse.json(
      { message: 'Failed to build file tree. See server logs for details.' },
      { status: 500 },
    );
  }
}

async function ensureTreeOnDisk() {
  await fs.mkdir(path.dirname(TREE_ROOT_DIRECTORY), { recursive: true });
  await execFileAsync(SCRIPT_PATH, [TREE_ROOT_DIRECTORY]);
}

async function readTree(): Promise<FolderNode> {
  const stats = await fs.stat(TREE_ROOT_DIRECTORY);
  if (!stats.isDirectory()) {
    throw new Error(`Expected ${TREE_ROOT_DIRECTORY} to be a directory.`);
  }

  return {
    type: 'folder',
    name: 'generated-tree',
    path: ROOT_KEY,
    children: await readDirectoryContents(TREE_ROOT_DIRECTORY, ''),
  };
}

async function readDirectoryContents(absolutePath: string, relativePath: string): Promise<TreeNode[]> {
  const entries = await fs.readdir(absolutePath, { withFileTypes: true });

  const sortedEntries = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const nodes: TreeNode[] = [];

  for (const entry of sortedEntries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const entryAbsolute = path.join(absolutePath, entry.name);
    const entryRelative = relativePath ? path.join(relativePath, entry.name) : entry.name;

    if (entry.isDirectory()) {
      nodes.push({
        type: 'folder',
        name: entry.name,
        path: toTreePath(entryRelative),
        children: await readDirectoryContents(entryAbsolute, entryRelative),
      });
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const stats = await fs.stat(entryAbsolute);

    nodes.push({
      type: 'file',
      name: entry.name,
      path: toTreePath(entryRelative),
      extension: extractExtension(entry.name),
      sizeInBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    });
  }

  return nodes;
}

function toTreePath(relativePath: string): string {
  if (!relativePath) {
    return ROOT_KEY;
  }

  const normalized = relativePath.split(path.sep).join('/');
  return `${ROOT_KEY}/${normalized}`;
}

function extractExtension(filename: string): string | null {
  const ext = path.extname(filename).replace('.', '');
  return ext ? ext : null;
}
