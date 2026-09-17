import { describe, it, expect, afterEach } from "vitest";
import { readdir, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  savePhoto,
  deleteStoredPhoto,
  PhotoValidationError,
  getUploadsDir,
} from "@/lib/uploads";

// Covers saving and cleaning up photos (REQUIREMENTS.md T.6 to T.9).
// These write into the real uploads folder, so each test cleans up after itself.

const written: string[] = [];

afterEach(async () => {
  for (const name of written.splice(0)) {
    await rm(path.join(getUploadsDir(), name), { force: true });
  }
});

function fakePhoto(name: string, type: string, sizeBytes = 100): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("savePhoto", () => {
  it("saves a photo and reports where it went", async () => {
    const saved = await savePhoto(fakePhoto("certificate.png", "image/png"));
    written.push(saved.photoPath);

    expect(saved.photoType).toBe("image/png");
    expect(saved.photoPath).toMatch(/\.png$/);
    expect(existsSync(path.join(getUploadsDir(), saved.photoPath))).toBe(true);
  });

  it("saves a JPEG from a phone camera", async () => {
    const saved = await savePhoto(fakePhoto("IMG_0001.jpg", "image/jpeg"));
    written.push(saved.photoPath);

    expect(saved.photoPath).toMatch(/\.jpg$/);
    expect(existsSync(path.join(getUploadsDir(), saved.photoPath))).toBe(true);
  });

  it("saves a HEIC photo from an iPhone", async () => {
    const saved = await savePhoto(fakePhoto("IMG_0002.heic", "image/heic"));
    written.push(saved.photoPath);

    expect(saved.photoPath).toMatch(/\.heic$/);
    expect(existsSync(path.join(getUploadsDir(), saved.photoPath))).toBe(true);
  });

  it("gives two photos with the same name different stored names", async () => {
    const first = await savePhoto(fakePhoto("photo.jpg", "image/jpeg"));
    const second = await savePhoto(fakePhoto("photo.jpg", "image/jpeg"));
    written.push(first.photoPath, second.photoPath);

    expect(first.photoPath).not.toBe(second.photoPath);
  });

  it("never lets a crafted filename escape the uploads folder", async () => {
    const saved = await savePhoto(
      fakePhoto("../../../etc/passwd.png", "image/png"),
    );
    written.push(saved.photoPath);

    // The stored name is generated, so the supplied name can't steer it.
    expect(saved.photoPath).not.toContain("/");
    expect(saved.photoPath).not.toContain("..");

    const entries = await readdir(getUploadsDir());
    expect(entries).toContain(saved.photoPath);
  });

  it("rejects a file that isn't a photo", async () => {
    await expect(
      savePhoto(fakePhoto("archive.zip", "application/zip")),
    ).rejects.toThrow(PhotoValidationError);
  });

  it("rejects a PDF, which is no longer supported", async () => {
    await expect(
      savePhoto(fakePhoto("award.pdf", "application/pdf")),
    ).rejects.toThrow(PhotoValidationError);
  });

  it("rejects a photo over 10 MB", async () => {
    const tooBig = fakePhoto("huge.png", "image/png", 11 * 1024 * 1024);
    await expect(savePhoto(tooBig)).rejects.toThrow(PhotoValidationError);
  });

  it("writes nothing when the photo is rejected", async () => {
    const before = await readdir(getUploadsDir()).catch(() => []);
    await expect(
      savePhoto(fakePhoto("bad.zip", "application/zip")),
    ).rejects.toThrow();
    const after = await readdir(getUploadsDir()).catch(() => []);

    expect(after.length).toBe(before.length);
  });
});

describe("deleteStoredPhoto", () => {
  it("removes the photo from disk", async () => {
    const saved = await savePhoto(fakePhoto("gone.png", "image/png"));
    const fullPath = path.join(getUploadsDir(), saved.photoPath);
    expect(existsSync(fullPath)).toBe(true);

    await deleteStoredPhoto(saved.photoPath);

    expect(existsSync(fullPath)).toBe(false);
  });

  it("does nothing when there is no photo", async () => {
    await expect(deleteStoredPhoto(null)).resolves.toBeUndefined();
  });

  it("stays quiet when the photo is already gone", async () => {
    await expect(
      deleteStoredPhoto("never-existed-abc123.png"),
    ).resolves.toBeUndefined();
  });

  it("refuses to delete anything outside the uploads folder", async () => {
    // A canary file one level up that must survive a traversal attempt.
    await mkdir(getUploadsDir(), { recursive: true });
    const canary = path.join(getUploadsDir(), "..", "delete-canary.tmp");
    await writeFile(canary, "do not delete");

    await deleteStoredPhoto("../delete-canary.tmp");

    expect(existsSync(canary)).toBe(true);
    await rm(canary, { force: true });
  });
});
