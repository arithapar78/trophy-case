import { describe, it, expect, afterEach } from "vitest";
import { readdir, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  saveUploadedFile,
  deleteStoredFile,
  FileValidationError,
  UPLOADS_DIR,
} from "@/lib/uploads";

// Covers saving and cleaning up attachments (REQUIREMENTS.md 1.11 to 1.14,
// 3.6, 3.7). These write into the real uploads folder, so each test cleans
// up after itself.

const written: string[] = [];

afterEach(async () => {
  for (const name of written.splice(0)) {
    await rm(path.join(UPLOADS_DIR, name), { force: true });
  }
});

function fakeFile(name: string, type: string, sizeBytes = 100): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("saveUploadedFile", () => {
  it("saves an image and reports where it went", async () => {
    const saved = await saveUploadedFile(fakeFile("certificate.png", "image/png"));
    written.push(saved.filePath);

    expect(saved.fileName).toBe("certificate.png");
    expect(saved.fileType).toBe("image/png");
    expect(saved.filePath).toMatch(/\.png$/);
    expect(existsSync(path.join(UPLOADS_DIR, saved.filePath))).toBe(true);
  });

  it("saves a PDF", async () => {
    const saved = await saveUploadedFile(fakeFile("award.pdf", "application/pdf"));
    written.push(saved.filePath);

    expect(saved.filePath).toMatch(/\.pdf$/);
    expect(existsSync(path.join(UPLOADS_DIR, saved.filePath))).toBe(true);
  });

  it("gives two files with the same name different stored names", async () => {
    const first = await saveUploadedFile(fakeFile("photo.jpg", "image/jpeg"));
    const second = await saveUploadedFile(fakeFile("photo.jpg", "image/jpeg"));
    written.push(first.filePath, second.filePath);

    expect(first.filePath).not.toBe(second.filePath);
    // Both keep the original name for display.
    expect(first.fileName).toBe("photo.jpg");
    expect(second.fileName).toBe("photo.jpg");
  });

  it("never lets a crafted filename escape the uploads folder", async () => {
    const saved = await saveUploadedFile(
      fakeFile("../../../etc/passwd.png", "image/png"),
    );
    written.push(saved.filePath);

    // The stored name is generated, and the display name is stripped of path parts.
    expect(saved.filePath).not.toContain("/");
    expect(saved.filePath).not.toContain("..");
    expect(saved.fileName).toBe("passwd.png");

    const entries = await readdir(UPLOADS_DIR);
    expect(entries).toContain(saved.filePath);
  });

  it("rejects a file type that isn't an image or PDF", async () => {
    await expect(
      saveUploadedFile(fakeFile("archive.zip", "application/zip")),
    ).rejects.toThrow(FileValidationError);
  });

  it("rejects a file over 10 MB", async () => {
    const tooBig = fakeFile("huge.png", "image/png", 11 * 1024 * 1024);
    await expect(saveUploadedFile(tooBig)).rejects.toThrow(FileValidationError);
  });

  it("writes nothing when the file is rejected", async () => {
    const before = await readdir(UPLOADS_DIR).catch(() => []);
    await expect(
      saveUploadedFile(fakeFile("bad.zip", "application/zip")),
    ).rejects.toThrow();
    const after = await readdir(UPLOADS_DIR).catch(() => []);

    expect(after.length).toBe(before.length);
  });
});

describe("deleteStoredFile", () => {
  it("removes the file from disk", async () => {
    const saved = await saveUploadedFile(fakeFile("gone.png", "image/png"));
    const fullPath = path.join(UPLOADS_DIR, saved.filePath);
    expect(existsSync(fullPath)).toBe(true);

    await deleteStoredFile(saved.filePath);

    expect(existsSync(fullPath)).toBe(false);
  });

  it("does nothing when there is no file", async () => {
    await expect(deleteStoredFile(null)).resolves.toBeUndefined();
  });

  it("stays quiet when the file is already gone", async () => {
    await expect(
      deleteStoredFile("never-existed-abc123.png"),
    ).resolves.toBeUndefined();
  });

  it("refuses to delete anything outside the uploads folder", async () => {
    // A canary file one level up that must survive a traversal attempt.
    await mkdir(UPLOADS_DIR, { recursive: true });
    const canary = path.join(UPLOADS_DIR, "..", "delete-canary.tmp");
    await writeFile(canary, "do not delete");

    await deleteStoredFile("../delete-canary.tmp");

    expect(existsSync(canary)).toBe(true);
    await rm(canary, { force: true });
  });
});
