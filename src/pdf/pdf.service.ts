import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PdfService {
  async extractText(buffer: Buffer): Promise<string> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('PDF buffer is empty');
    }
    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      const text = result.text.trim();
      if (!text) {
        throw new BadRequestException('PDF contains no extractable text');
      }
      return text;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Failed to parse PDF');
    }
  }
}
