import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getUploadsDir, getDatabaseUrl } from "@/lib/paths";
import { savePhoto } from "@/lib/uploads";

// Covers REQUIREMENTS.md T.10.
//
// Paths are read from the environment at call time, not frozen when the
// module first loaded. A frozen path would let two copies of the app end up
// sharing one uploads folder. These tests exist to stop that.

const originalUploads = process.env.UPLOADS_DIR;
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

  if (originalDatabase === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabase;

  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("defaults keep npm run dev working", () => {
  it("falls back to the project's uploads folder", () => {
    delete process.env.UPLOADS_DIR;
    expect(getUploadsDir()).toBe(path.join(process.cwd(), "uploads"));
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

describe("environment variables are respected", () => {
  it("uses UPLOADS_DIR when set", () => {
    const dir = makeTempDir();
    process.env.UPLOADS_DIR = dir;

    expect(getUploadsDir()).toBe(path.resolve(dir));
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

describe("the path is read at call time, not frozen", () => {
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
});

describe("photos land in the configured folder", () => {
  it("writes to UPLOADS_DIR and not to the project folder", async () => {
    const otherDir = makeTempDir();
    process.env.UPLOADS_DIR = otherDir;

    const projectUploads = path.join(process.cwd(), "uploads");

    const saved = await savePhoto(
      new File([new Uint8Array(64)], "photo.png", { type: "image/png" }),
    );

    expect(existsSync(path.join(otherDir, saved.photoPath))).toBe(true);

    // And THIS photo is not in the project's own uploads folder. Checking for
    // the specific file rather than counting, because other test files write
    // there too and a count would swing for unrelated reasons.
    expect(existsSync(path.join(projectUploads, saved.photoPath))).toBe(false);
  });
});
