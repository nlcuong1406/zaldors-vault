import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import yazl from "yazl";

type Spec = Record<
  string,
  {
    projectJson?: object;
    zips?: Record<string, Record<string, string | Buffer>>;
    extraFiles?: Record<string, string>;
  }
>;

async function writeZip(path: string, files: Record<string, string | Buffer>): Promise<void> {
  const zip = new yazl.ZipFile();
  for (const [name, content] of Object.entries(files)) {
    zip.addBuffer(Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8"), name);
  }
  zip.end();
  await pipeline(zip.outputStream, createWriteStream(path));
}

/** Dựng thư mục VH giả trong thư mục tạm của hệ điều hành; trả về vhRoot. */
export async function makeFakeVh(spec: Spec): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "fake-vh-"));
  for (const [id, p] of Object.entries(spec)) {
    const dir = join(root, "projects", id);
    await mkdir(dir, { recursive: true });
    if (p.projectJson !== undefined) {
      await writeFile(join(dir, "project.json"), JSON.stringify(p.projectJson), "utf8");
    }
    if (p.zips) {
      const rel = join(dir, "release");
      await mkdir(rel, { recursive: true });
      for (const [name, files] of Object.entries(p.zips)) {
        await writeZip(join(rel, name), files);
      }
    }
    for (const [rel, text] of Object.entries(p.extraFiles ?? {})) {
      const target = join(dir, rel);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, text, "utf8");
    }
  }
  return root;
}
