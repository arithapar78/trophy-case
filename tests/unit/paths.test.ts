import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getUploadsDir, getBackupsDir, getDatabaseUrl } from "@/lib/paths";
import { saveUploadedFile } from "@/lib/uploads";

// Covers REQUIREMENTS-v3.md T3.13, T3.17 and T3.18.
//
// The live site and the personal copy run the same code with different
// environment variables. If a path were frozen when its module first loaded,
// they could end up sharing one folder — which would mix a stranger's uploads
// into the owner's personal timeline. These tests exist to stop that.

const originalUploads = process.env.UPLOADS_DIR;
const originalBackups = process.env.BACKUPS_DIR;
const originalDatabase = process.env.DATABASE_URL;

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "trophy-paths-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  // Restore whatever the test runner set up, so other test files are unaffected.
  if (originalUploads === undefined) delete process.env.UPLOADS_DIR;
  else process.env.UPLOADS_DIR = originalUploads;

  if (originalBackups === undefined) delete process.env.BACKUPS_DIR;
  else process.env.BACKUPS_DIR = originalBackups;

  if (originalDatabase === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabase;

  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("defaults keep npm run dev working (T3.13, criterion 1.9)", () => {
  it("falls back to the project's uploads folder", () => {
    delete process.env.UPLOADS_DIR;
    expect(getUploadsDir()).toBe(path.join(process.cwd(), "uploads"));
  });

  it("falls back to the project's backups folder", () => {
    delete process.env.BACKUPS_DIR;
    expect(getBackupsDir()).toBe(path.join(process.cwd(), "backups"));
  });

  it("falls back to the local development database", () => {
    delete process.env.DATABASE_URL;
    expect(getDatabaseUrl()).toBe("file:./prisma/dev.db");
  });

  it("treats a blank env var as unset rather than as an empty path", () => {
    process.env.UPLOADS_DIR = "   ";
    expect(getUploadsDir()).toBe(path.join(process.cwd(), "uploads"));

    process.env.DATABASE_URL = "";
    expect(getDatabaseUrl()).toBe("file:./prisma/dev.db");
  });
});

describe("environment variables are respected (T3.13)", () => {
  it("uses UPLOADS_DIR when set", () => {
    const dir = makeTempDir();
    process.env.UPLOADS_DIR = dir;

    expect(getUploadsDir()).toBe(path.resolve(dir));
  });

  it("uses BACKUPS_DIR when set", () => {
    const dir = makeTempDir();
    process.env.BACKUPS_DIR = dir;

    expect(getBackupsDir()).toBe(path.resolve(dir));
  });

  it("uses DATABASE_URL when set", () => {
    process.env.DATABASE_URL = "file:/tmp/somewhere-else.db";
    expect(getDatabaseUrl()).toBe("file:/tmp/somewhere-else.db");
  });

  it("turns a relative path into an absolute one", () => {
    process.env.UPLOADS_DIR = "./relative-uploads";
    expect(path.isAbsolute(getUploadsDir())).toBe(true);
  });
});

describe("the path is read at call time, not frozen (T3.18)", () => {
  it("changes as soon as the variable changes", () => {
    const first = makeTempDir();
    const second = makeTempDir();

    process.env.UPLOADS_DIR = first;
    expect(getUploadsDir()).toBe(path.resolve(first));

    // A module-level constant would still report the first folder here,
    // which is exactly the bug this test exists to catch.
    process.env.UPLOADS_DIR = second;
    expect(getUploadsDir()).toBe(path.resolve(second));
  });

  it("does the same for backups", () => {
    const first = makeTempDir();
    const second = makeTempDir();

    process.env.BACKUPS_DIR = first;
    expect(getBackupsDir()).toBe(path.resolve(first));

    process.env.BACKUPS_DIR = second;
    expect(getBackupsDir()).toBe(path.resolve(second));
  });
});

describe("uploads land in the configured folder (T3.17)", () => {
  it("writes to UPLOADS_DIR and not to the project folder", async () => {
    const liveDir = makeTempDir();
    process.env.UPLOADS_DIR = liveDir;

    const projectUploads = path.join(process.cwd(), "uploads");

    const saved = await saveUploadedFile(
      new File([new Uint8Array(64)], "live-photo.png", { type: "image/png" }),
    );

    // It went to the live folder.
    expect(existsSync(path.join(liveDir, saved.filePath))).toBe(true);

    // And THIS file is not in the project's own uploads folder. Checking for
    // the specific file rather than counting, because other test files write
    // there too and a count would swing for unrelated reasons.
    expect(existsSync(path.join(projectUploads, saved.filePath))).toBe(false);
  });

  it("keeps two configured folders completely separate", async () => {
    const dirA = makeTempDir();
    const dirB = makeTempDir();

    process.env.UPLOADS_DIR = dirA;
    const inA = await saveUploadedFile(
      new File([new Uint8Array(32)], "a.png", { type: "image/png" }),
    );

    process.env.UPLOADS_DIR = dirB;
    const inB = await saveUploadedFile(
      new File([new Uint8Array(32)], "b.png", { type: "image/png" }),
    );

    expect(existsSync(path.join(dirA, inA.filePath))).toBe(true);
    expect(existsSync(path.join(dirB, inB.filePath))).toBe(true);

    // Neither folder contains the other's file.
    expect(existsSync(path.join(dirA, inB.filePath))).toBe(false);
    expect(existsSync(path.join(dirB, inA.filePath))).toBe(false);
  });
});
