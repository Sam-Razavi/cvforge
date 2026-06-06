import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { RewriteService } from './rewrite.service';
import { PdfService } from '../pdf/pdf.service';
import { RewriteDto } from './dto/rewrite.dto';
import { PDF_MAX_SIZE_BYTES, PDF_MIME_TYPE } from '../pdf/pdf.constants';

@Controller()
@UseGuards(ApiKeyGuard)
export class RewriteController {
  constructor(
    private readonly rewriteService: RewriteService,
    private readonly pdfService: PdfService,
  ) {}

  @Post('rewrite')
  @UseInterceptors(
    FileInterceptor('cv', {
      storage: memoryStorage(),
      limits: { fileSize: PDF_MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== PDF_MIME_TYPE) {
          cb(new BadRequestException('Only PDF files are accepted'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async rewrite(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: RewriteDto,
    @Req() req: Request & { apiKeyId?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let cvText: string;

    if (file) {
      cvText = await this.pdfService.extractText(file.buffer);
    } else if (dto.cvText) {
      cvText = dto.cvText;
    } else {
      throw new BadRequestException('Provide either a cv PDF file or cvText in the request body');
    }

    return this.rewriteService.enqueue(dto, cvText, req.apiKeyId);
  }

  @Get('jobs/:id')
  getStatus(@Param('id') id: string) {
    return this.rewriteService.getStatus(id);
  }

  @Get('jobs/:id/result')
  getResult(@Param('id') id: string) {
    return this.rewriteService.getResult(id);
  }
}
