// types/dropbox.d.ts
import "dropbox";

declare module "dropbox" {
  namespace files {
    /**
     * In Node.js, filesDownload() will populate *either*
     * fileBinary (a Buffer) or fileBlob (a Blob).
     */
    interface FileMetadataReference {
      /** Present when using Node fetch on Dropbox SDK */
      fileBinary?: Buffer;
      /** Present on all environments (polyfilled Blob) */
      fileBlob?: Blob;
    }

    /**
     * The shape of the result for filesGetTemporaryLink()
     */
    interface GetTemporaryLinkResult {
      /** Temporary URL for downloading or previewing the file */
      link: string;
      /** Metadata about the file (e.g., name, id, path_lower) */
      metadata: {
        name: string;
        id: string;
        path_lower: string;
        [key: string]: unknown;
      };
    }
  }
}
