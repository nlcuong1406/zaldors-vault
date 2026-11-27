import { stripBom } from "./text";

export function resolveReleaseInfo(input: {
  notesFileText: string | null;
  gameBuildFlag: string | null;
  rootTexts: Record<string, string>;
  today: string;
}): { notes: string; date: string; gameBuild: string } {
  const clean = (s: string | undefined | null): string =>
    s == null ? "" : stripBom(s).replace(/\r\n?/g, "\n").trim();

  const notes = clean(input.notesFileText) || clean(input.rootTexts["PHAT-HANH.txt"]);
  if (!notes) {
    throw new Error("Thiếu ghi chú phát hành: gói không có PHAT-HANH.txt, hãy truyền --notes <file>.");
  }

  let manifest: unknown = null;
  const rawManifest = input.rootTexts["manifest.json"];
  if (rawManifest !== undefined) {
    try {
      manifest = JSON.parse(stripBom(rawManifest));
    } catch {
      manifest = null;
    }
  }
  const m = manifest !== null && typeof manifest === "object" ? (manifest as Record<string, unknown>) : {};

  const date =
    typeof m.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(m.date) ? m.date : input.today;

  let manifestBuild = "";
  const game = m.game;
  if (game !== null && typeof game === "object") {
    const b = (game as Record<string, unknown>).build;
    if (typeof b === "string") manifestBuild = b.trim();
    else if (typeof b === "number" && Number.isFinite(b)) manifestBuild = String(b);
  }

  const gameBuild = (input.gameBuildFlag ?? "").trim() || manifestBuild;
  if (!gameBuild) {
    throw new Error("Không xác định được bản game: manifest.json thiếu game.build, hãy truyền --game-build <số>.");
  }

  return { notes, date, gameBuild };
}
