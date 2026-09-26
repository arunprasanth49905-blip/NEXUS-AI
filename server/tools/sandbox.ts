/**
 * NEXUS-AI Phase 6: Filesystem Sandbox & Security Guard
 * Enforces allowed workspace boundaries, traversal prevention, and secret file protection.
 */

import path from 'path';
import fs from 'fs';

export class FilesystemSandbox {
  private static allowedWorkspaceRoots: string[] = [];
  private static maxFileSizeBytes: number = 25 * 1024 * 1024; // 25MB default

  // Sensitive paths & filenames that must NEVER be read, created, modified, or deleted by any tool
  private static readonly BLOCKED_PATTERNS = [
    /\.env(\..+)?$/i,
    /\.git(\/|\\|$)/i,
    /\.ssh(\/|\\|$)/i,
    /id_rsa/i,
    /id_ecdsa/i,
    /id_ed25519/i,
    /\.aws(\/|\\|$)/i,
    /\.npmrc$/i,
    /\.netrc$/i,
    /passwd$/i,
    /shadow$/i,
    /credentials(\.json|\.ini|\.txt)?$/i,
    /token(s)?(\.json|\.txt)?$/i,
    /\.secret(s)?$/i,
    /\.key$/i,
    /\.pem$/i,
    /node_modules(\/|\\|$)/i,
  ];

  public static initialize(workspaceRoot?: string, maxSizeBytes?: number): void {
    const root = workspaceRoot ? path.resolve(workspaceRoot) : process.cwd();
    this.allowedWorkspaceRoots = [root];
    if (maxSizeBytes) {
      this.maxFileSizeBytes = maxSizeBytes;
    }
  }

  public static getAllowedRoots(): string[] {
    if (this.allowedWorkspaceRoots.length === 0) {
      this.allowedWorkspaceRoots = [process.cwd()];
    }
    return [...this.allowedWorkspaceRoots];
  }

  public static addAllowedRoot(rootPath: string): void {
    const resolved = path.resolve(rootPath);
    if (!this.allowedWorkspaceRoots.includes(resolved)) {
      this.allowedWorkspaceRoots.push(resolved);
    }
  }

  /**
   * Validate that a target path resolves safely inside an allowed workspace root,
   * does not contain path traversal (e.g. ../../), and does not target protected files.
   */
  public static validatePath(targetPath: string): {
    allowed: boolean;
    resolvedPath: string;
    reason?: string;
  } {
    if (!targetPath || typeof targetPath !== 'string') {
      return { allowed: false, resolvedPath: '', reason: 'Invalid or empty path specified.' };
    }

    // Check for explicit raw traversal strings
    if (targetPath.includes('..') && (targetPath.includes('../') || targetPath.includes('..\\') || targetPath.endsWith('..'))) {
      // Note: we still resolve it, but if it tries to escape, we catch it
    }

    const roots = this.getAllowedRoots();
    let resolved = path.resolve(targetPath);

    // If relative, resolve against the primary allowed root
    if (!path.isAbsolute(targetPath)) {
      resolved = path.resolve(roots[0], targetPath);
    }

    // 1. Path Traversal & Root containment check
    const isContained = roots.some((root) => {
      const relative = path.relative(root, resolved);
      return !relative.startsWith('..') && !path.isAbsolute(relative);
    });

    if (!isContained) {
      return {
        allowed: false,
        resolvedPath: resolved,
        reason: `Path '${targetPath}' is outside the permitted workspace root(s).`,
      };
    }

    // 2. Secret & Protected File patterns check
    const basename = path.basename(resolved);
    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(resolved) || pattern.test(basename)) {
        return {
          allowed: false,
          resolvedPath: resolved,
          reason: `Access to protected secret resource '${basename}' is strictly forbidden by security policy.`,
        };
      }
    }

    return { allowed: true, resolvedPath: resolved };
  }

  /**
   * Validate file size does not exceed the configurable limit.
   */
  public static validateFileSize(filePath: string): { valid: boolean; reason?: string } {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > this.maxFileSizeBytes) {
          return {
            valid: false,
            reason: `File size (${(stats.size / (1024 * 1024)).toFixed(2)}MB) exceeds max limit of ${(this.maxFileSizeBytes / (1024 * 1024)).toFixed(2)}MB.`,
          };
        }
      }
      return { valid: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { valid: false, reason: `Failed to inspect file size: ${msg}` };
    }
  }

  public static getMaxFileSizeMB(): number {
    return this.maxFileSizeBytes / (1024 * 1024);
  }
}
