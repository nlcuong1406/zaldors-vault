export interface Release {
  version: string;
  date: string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  url: string;
  gameBuild: string;
  notes: string;
}

export interface VhProject {
  id: string;
  title: string;
  platform: string;
  edition: string;
  inputHashes: string[];
  releaseDir: string;
}

export interface ZipEntry {
  path: string;
  sizeBytes: number;
  sha256: string;
}
