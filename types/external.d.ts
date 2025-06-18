// types/external.d.ts

/**
 * pptx-parser
 *  - parses a PPTX file buffer into an array of slide objects
 */
declare module "pptx-parser" {
  /** One slide’s extracted text */
  export interface Slide {
    /** All the plain text content of this slide */
    text: string;
    /** Any additional fields the parser might include */
    [key: string]: unknown;
  }

  /**
   * Parse a PPTX file into slides.
   * @param buffer The raw file bytes (Node Buffer, ArrayBuffer, or Uint8Array).
   * @returns A promise resolving to an array of Slide objects.
   */
  export function parse(
    buffer: Buffer | ArrayBuffer | Uint8Array
  ): Promise<Slide[]>;

  export default parse;
}

/**
 * msgreader
 *  - reads Outlook .msg files (subject, body, attachments, etc.)
 */
declare module "msgreader" {
  /** The shape of an extracted .msg file */
  export interface MsgFileData {
    /** The email’s subject (if any) */
    subject?: string;
    /** The plain-text body (if any) */
    body?: string;
    /** Attachments, if any */
    attachments?: {
      /** filename reported in the .msg */
      filename: string;
      /** raw content bytes */
      data: Buffer;
    }[];
  }

  export class MSGReader {
    /**
     * Construct a reader for a .msg file.
     * @param fileData Raw file buffer (Buffer, ArrayBuffer, or Uint8Array)
     */
    constructor(fileData: Buffer | ArrayBuffer | Uint8Array);

    /**
     * Extracts all fields from the .msg.
     */
    getFileData(): MsgFileData;
  }
}
