import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PdfService } from './pdf.service';

// Mock pdf-parse so we don't need pdfjs-dist's worker in Jest.
// We test our service's own logic (empty buffer, error wrapping,
// empty-text guard); the pdf-parse library itself is tested separately.
const mockGetText = jest.fn();
jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({ getText: mockGetText })),
}));

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    mockGetText.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();
    service = module.get(PdfService);
  });

  it('returns extracted text for a valid PDF', async () => {
    mockGetText.mockResolvedValueOnce({ text: '  Hello PDF  ' });
    const result = await service.extractText(Buffer.from('fake'));
    expect(result).toBe('Hello PDF');
  });

  it('throws BadRequestException when PDF has no text', async () => {
    mockGetText.mockResolvedValueOnce({ text: '   ' });
    await expect(service.extractText(Buffer.from('fake'))).rejects.toThrow(
      new BadRequestException('PDF contains no extractable text'),
    );
  });

  it('throws BadRequestException for an empty buffer', async () => {
    await expect(service.extractText(Buffer.alloc(0))).rejects.toThrow(
      new BadRequestException('PDF buffer is empty'),
    );
  });

  it('wraps unexpected pdf-parse errors as BadRequestException', async () => {
    mockGetText.mockRejectedValueOnce(new Error('corrupt stream'));
    await expect(service.extractText(Buffer.from('fake'))).rejects.toThrow(
      new BadRequestException('Failed to parse PDF'),
    );
  });
});
