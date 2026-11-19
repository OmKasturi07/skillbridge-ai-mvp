declare module 'pdf-parse' {
  export interface PDFParseTextResult {
    text: string;
    total?: number;
  }

  export class PDFParse {
    constructor(options: { data: Uint8Array | Buffer });
    getText(): Promise<PDFParseTextResult>;
    destroy(): Promise<void>;
  }
}
