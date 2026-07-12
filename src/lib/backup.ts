import fs from "fs";
import path from "path";
import type { Archiver } from "archiver";
import AdmZip from "adm-zip";
import { DATA_DIR, DB_PATH } from "./db";
import { UPLOADS_DIR } from "./storage";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const createArchiver = require("archiver") as (
  format: string,
  options?: { zlib?: { level: number } }
) => Archiver;

export async function createBackup(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = createArchiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    if (fs.existsSync(DB_PATH)) {
      archive.file(DB_PATH, { name: "vault.db" });
    }

    if (fs.existsSync(UPLOADS_DIR)) {
      archive.directory(UPLOADS_DIR, "uploads");
    }

    archive.finalize();
  });
}

export async function restoreBackup(buffer: Buffer): Promise<void> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const content = entry.getData();
    const filePath = entry.entryName;

    if (filePath === "vault.db") {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_PATH, content);
    } else if (filePath.startsWith("uploads/")) {
      const destPath = path.join(process.cwd(), filePath);
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(destPath, content);
    }
  }
}
