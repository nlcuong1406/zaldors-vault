import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stripBom } from "./text";

export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

/** Lấy 64 hex đầu tiên của dòng đầu, chữ thường; chịu BOM và CRLF. */
export function parseSha256File(text: string): string | null {
  const firstLine = stripBom(text).split(/\r?\n/, 1)[0] ?? "";
  const m = /(?<![0-9a-fA-F])[0-9a-fA-F]{64}(?![0-9a-fA-F])/.exec(firstLine);
  return m ? m[0].toLowerCase() : null;
}
