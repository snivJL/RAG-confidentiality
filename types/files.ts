import { files } from "dropbox";

export type NodeFileDownloadResult = files.FileMetadataReference & {
  fileBinary: Buffer;
};

export interface SlideTextContent extends ParsedSlide {
  text: string[];
}
export interface ParsedSlide {
  id: string;
  path: string;
  xml: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsed: any;
}
