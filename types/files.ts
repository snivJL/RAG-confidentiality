import { files } from "dropbox";

export type NodeFileDownloadResult = files.FileMetadataReference & {
  fileBinary: Buffer;
};
