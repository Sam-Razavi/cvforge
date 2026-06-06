import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  check(): { status: string; version: string } {
    return {
      status: 'ok',
      version: this.config.get<string>('version') ?? '0.0.1',
    };
  }
}
