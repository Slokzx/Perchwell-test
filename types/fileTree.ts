export type BaseNode = {
  name: string;
  path: string;
};

export type FileNode = BaseNode & {
  type: 'file';
  extension: string | null;
  sizeInBytes: number;
  modifiedAt: string;
};

export type FolderNode = BaseNode & {
  type: 'folder';
  children: TreeNode[];
};

export type TreeNode = FileNode | FolderNode;
