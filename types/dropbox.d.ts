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
  }
}
