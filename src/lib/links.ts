export function issueUrl(repo: string | null, game: { title: string }, version: string | null): string | null {
  if (!repo) return null;
  const url = new URL(`https://github.com/${repo}/issues/new`);
  url.searchParams.set("title", `[${game.title}] Lỗi dịch: `);
  url.searchParams.set("body", [`Game: ${game.title}`, `Phiên bản patch: ${version ?? "chưa phát hành"}`].join("\n"));
  return url.toString();
}
