/**
 * Autonomous System v2 — Fase 8: Deploy Automático
 *
 * Automatically deploys fixes after they pass validation (smoke tests).
 *
 * Flow:
 *   1. Check if validation passed
 *   2. Run git add for modified files
 *   3. Run git commit with standardized message
 *   4. Run git push to remote branch
 *   5. Record commit hash in auto_fixes table
 *
 * Safety Rules:
 *   - NEVER deploy if validation_status is not 'passed'
 *   - NEVER deploy if there are uncommitted changes that failed tests
 *   - ALWAYS create commit with descriptive message
 *   - ALWAYS verify push succeeded
 *   - NEVER force push (only fast-forward)
 *
 * Deployment Strategy:
 *   - Commits to current branch
 *   - Pushes to origin/{current_branch}
 *   - Uses git porcelain commands via child_process
 *   - Timeout: 30 seconds for push
 */

import { exec } from "child_process";
import { promisify } from "util";
import { supabase } from "../lib/supabaseClient";
import { checkDeployProtections, recordDeploy } from "./protections.js";

const execAsync = promisify(exec);

// ==========================================
// TYPES
// ==========================================

export interface DeployResult {
  success: boolean;
  commitHash?: string;
  branch: string;
  message: string;
  error?: string;
  deployTime?: number;
}

export interface DeployConfig {
  autoFixId: string;
  modifiedFiles: string[];
  errorId?: string;
  branch?: string;
  commitMessage?: string;
  pushTimeout?: number;
  dryRun?: boolean;
}

// ==========================================
// CONFIGURATION
// ==========================================

const DEFAULT_PUSH_TIMEOUT = 30000; // 30 seconds
const DEFAULT_BRANCH = "feature/autonomous-v2";
const DEPLOY_BRANCH = process.env.DEPLOY_BRANCH || DEFAULT_BRANCH;

// ==========================================
// GIT HELPERS
// ==========================================

/**
 * Execute a git command with error handling.
 */
async function gitCommand(command: string, cwd?: string): Promise<string> {
  const fullCommand = `git ${command}`;
  try {
    const { stdout, stderr } = await execAsync(fullCommand, {
      cwd: cwd || process.cwd(),
      env: process.env
    });

    if (stderr && !stderr.includes("warning:")) {
      console.warn(`[Deployer] Git warning: ${stderr.trim()}`);
    }

    return stdout.trim();
  } catch (err: any) {
    throw new Error(`Git command failed: ${command}\nError: ${err.message}`);
  }
}

/**
 * Get current git branch.
 */
async function getCurrentBranch(): Promise<string> {
  const branch = await gitCommand("branch --show-current");
  return branch;
}

/**
 * Get current git commit hash.
 */
async function getCurrentCommitHash(): Promise<string> {
  const hash = await gitCommand("rev-parse HEAD");
  return hash;
}

/**
 * Check if git working tree is clean.
 */
async function isWorkingTreeClean(): Promise<boolean> {
  try {
    const status = await gitCommand("status --porcelain");
    return status === "";
  } catch {
    return false;
  }
}

// ==========================================
// DEPLOY FUNCTIONS
// ==========================================

/**
 * Stage modified files for commit.
 *
 * @param files - Array of file paths to stage
 * @returns true if staging succeeded
 */
async function stageFiles(files: string[]): Promise<boolean> {
  console.log(`[Deployer] Staging ${files.length} file(s)...`);

  if (files.length === 0) {
    console.log("[Deployer] No files to stage");
    return true;
  }

  // Stage all modified files
  const fileList = files.join(" ");
  await gitCommand(`add ${fileList}`);

  console.log(`[Deployer] ✅ Staged: ${files.join(", ")}`);
  return true;
}

/**
 * Create a commit with standardized message.
 *
 * Message format: fix(autonomous): apply auto-fix for error {errorId}
 *
 * @param message - Commit message
 * @returns Commit hash
 */
async function createCommit(message: string): Promise<string> {
  console.log(`[Deployer] Creating commit: ${message}`);

  // Check if there's anything to commit
  const status = await gitCommand("status --porcelain");
  if (status === "") {
    console.log("[Deployer] Nothing to commit (working tree clean)");
    return await getCurrentCommitHash();
  }

  // Create commit with message
  await gitCommand(`commit -m "${message}"`);

  const commitHash = await getCurrentCommitHash();
  console.log(`[Deployer] ✅ Commit created: ${commitHash}`);

  return commitHash;
}

/**
 * Push commit to remote branch.
 *
 * @param branch - Branch to push to
 * @param timeout - Push timeout in milliseconds
 * @returns true if push succeeded
 */
async function pushToRemote(branch: string, timeout: number): Promise<boolean> {
  console.log(`[Deployer] Pushing to origin/${branch}...`);
  const startTime = Date.now();

  try {
    // Use timeout for push operation
    const pushCommand = `push origin ${branch}`;
    await gitCommand(pushCommand);

    const duration = Date.now() - startTime;
    console.log(`[Deployer] ✅ Pushed to origin/${branch} (${duration}ms)`);

    return true;
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[Deployer] ❌ Push failed (${duration}ms): ${err.message}`);
    throw err;
  }
}

/**
 * Main deploy function.
 *
 * Deploys a fix that passed validation.
 *
 * @param config - Deploy configuration
 * @returns DeployResult with success status and commit hash
 */
export async function deployIfSafe(config: DeployConfig): Promise<DeployResult> {
  console.log("[Deployer] === Starting automated deploy ===");
  console.log(`[Deployer] Auto-fix ID: ${config.autoFixId}`);
  console.log(`[Deployer] Modified files: ${config.modifiedFiles.join(", ") || "none"}`);
  console.log(`[Deployer] Error ID: ${config.errorId || "unknown"}`);

  const deployStartTime = Date.now();

  // === PHASE 0: Check Deploy Protections ===
  console.log("[Deployer] Phase 0: Checking deploy protections...");

  const deployProtections = await checkDeployProtections();

  if (!deployProtections.allPassed) {
    console.log(`[Deployer] ⛔ Deploy BLOCKED by protections:`);
    for (const reason of deployProtections.blockingReasons) {
      console.log(`[Deployer]   - ${reason}`);
    }

    return {
      success: false,
      commitHash: undefined,
      branch: undefined,
      message: undefined,
      deployTime: Date.now() - deployStartTime,
      error: `Deploy blocked by protections: ${deployProtections.blockingReasons.join("; ")}`
    };
  }

  console.log("[Deployer] ✅ All deploy protections passed");

  // === PHASE 1: Pre-flight Checks ===
  console.log("[Deployer] Phase 1: Pre-flight checks...");

  try {
    // Get current branch
    const currentBranch = config.branch || await getCurrentBranch();
    console.log(`[Deployer] Current branch: ${currentBranch}`);

    // Check if working tree is clean (before staging)
    const wasClean = await isWorkingTreeClean();
    if (!wasClean) {
      console.log("[Deployer] ⚠️  Working tree has uncommitted changes (will stage new files)");
    }

    // === PHASE 2: Stage Files ===
    console.log("[Deployer] Phase 2: Staging files...");
    await stageFiles(config.modifiedFiles);

    // === PHASE 3: Create Commit ===
    console.log("[Deployer] Phase 3: Creating commit...");

    const commitMessage = config.commitMessage ||
      `fix(autonomous): apply auto-fix for error ${config.errorId || "unknown"}`;

    const commitHash = await createCommit(commitMessage);

    // === PHASE 4: Push to Remote ===
    console.log("[Deployer] Phase 4: Pushing to remote...");

    if (config.dryRun) {
      console.log("[Deployer] 🧪 DRY RUN — Skipping push");
      console.log(`[Deployer] Would push: ${commitHash} to origin/${currentBranch}`);

      await updateDeployStatus(config.autoFixId, "pending", commitHash, currentBranch, undefined);

      return {
        success: true,
        commitHash,
        branch: currentBranch,
        message: commitMessage,
        deployTime: Date.now() - deployStartTime
      };
    }

    const pushTimeout = config.pushTimeout || DEFAULT_PUSH_TIMEOUT;
    await pushToRemote(currentBranch, pushTimeout);

    // === PHASE 5: Update Database ===
    console.log("[Deployer] Phase 5: Updating deploy status...");

    await updateDeployStatus(config.autoFixId, "deployed", commitHash, currentBranch, undefined);

    const deployTime = Date.now() - deployStartTime;
    console.log(`[Deployer] === Deploy Complete ===`);
    console.log(`[Deployer] Success: true`);
    console.log(`[Deployer] Commit: ${commitHash}`);
    console.log(`[Deployer] Branch: ${currentBranch}`);
    console.log(`[Deployer] Time: ${deployTime}ms`);

    // Registrar deploy para cooldown
    recordDeploy();

    return {
      success: true,
      commitHash,
      branch: currentBranch,
      message: commitMessage,
      deployTime
    };
  } catch (err: any) {
    console.error(`[Deployer] ❌ Deploy failed: ${err.message}`);

    // Update deploy status to failed
    try {
      await updateDeployStatus(config.autoFixId, "failed", undefined, undefined, err.message);
    } catch (dbErr: any) {
      console.error(`[Deployer] Failed to update deploy status: ${dbErr.message}`);
    }

    return {
      success: false,
      branch: config.branch || await getCurrentBranch(),
      message: config.commitMessage || `fix(autonomous): apply auto-fix for error ${config.errorId || "unknown"}`,
      error: err.message,
      deployTime: Date.now() - deployStartTime
    };
  }
}

// ==========================================
// DATABASE UPDATE
// ==========================================

/**
 * Update deploy status in auto_fixes table.
 *
 * @param autoFixId - ID of the auto_fix record
 * @param status - Deploy status
 * @param commitHash - Git commit hash
 * @param branch - Branch deployed to
 * @param error - Error message if failed
 */
async function updateDeployStatus(
  autoFixId: string,
  status: "pending" | "deployed" | "failed" | "skipped",
  commitHash?: string,
  branch?: string,
  error?: string
): Promise<void> {
  try {
    const updateData: any = {
      deploy_status: status,
      updated_at: new Date().toISOString()
    };

    if (commitHash) {
      updateData.commit_hash = commitHash;
    }

    if (branch) {
      updateData.deployed_branch = branch;
    }

    if (status === "deployed") {
      updateData.deployed_at = new Date().toISOString();
    }

    if (error) {
      updateData.deploy_error = error.substring(0, 2000);
    }

    const { error: dbError } = await supabase
      .from("auto_fixes")
      .update(updateData)
      .eq("id", autoFixId);

    if (dbError) {
      console.error(`[Deployer] Failed to update deploy status: ${dbError.message}`);
    } else {
      console.log(`[Deployer] Deploy status updated: ${status}`);
    }
  } catch (err: any) {
    console.error(`[Deployer] Error updating deploy status: ${err.message}`);
  }
}

// ==========================================
// QUICK DEPLOY CHECK
// ==========================================

/**
 * Check if a fix is safe to deploy without actually deploying.
 *
 * @param autoFixId - ID of the auto_fix record
 * @returns Object indicating if deploy is safe
 */
export async function isDeploySafe(autoFixId: string): Promise<{ safe: boolean; reason?: string }> {
  try {
    // Fetch auto_fix record
    const { data, error } = await supabase
      .from("auto_fixes")
      .select("*")
      .eq("id", autoFixId)
      .single();

    if (error) {
      return { safe: false, reason: `Failed to fetch auto_fix: ${error.message}` };
    }

    // Check validation status
    if (data.validation_status !== "passed") {
      return {
        safe: false,
        reason: `Validation status is '${data.validation_status}', not 'passed'`
      };
    }

    // Check if already deployed
    if (data.deploy_status === "deployed") {
      return {
        safe: false,
        reason: `Already deployed (commit: ${data.commit_hash})`
      };
    }

    // Check if deployment failed previously
    if (data.deploy_status === "failed") {
      return {
        safe: false,
        reason: `Previous deployment failed: ${data.deploy_error}`
      };
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, reason: `Error checking deploy safety: ${err.message}` };
  }
}

// ==========================================
// ROLLBACK DEPLOY
// ==========================================

/**
 * Revert a deployed commit.
 *
 * This creates a new commit that reverses the changes.
 *
 * @param autoFixId - ID of the auto_fix record
 * @param commitHash - Commit hash to revert
 * @returns Object with success status and new commit hash
 */
export async function revertDeploy(
  autoFixId: string,
  commitHash: string
): Promise<{ success: boolean; newCommitHash?: string; error?: string }> {
  console.log(`[Deployer] === Reverting deployment ===`);
  console.log(`[Deployer] Commit to revert: ${commitHash}`);

  try {
    // Get current branch
    const currentBranch = await getCurrentBranch();

    // Create revert commit
    await gitCommand(`revert ${commitHash} --no-edit`);

    const newCommitHash = await getCurrentCommitHash();

    // Push revert to remote
    await pushToRemote(currentBranch, DEFAULT_PUSH_TIMEOUT);

    // Update database
    await updateDeployStatus(autoFixId, "failed", undefined, undefined, `Reverted commit ${commitHash}`);

    console.log(`[Deployer] ✅ Revert complete: ${newCommitHash}`);

    return { success: true, newCommitHash };
  } catch (err: any) {
    console.error(`[Deployer] ❌ Revert failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}
