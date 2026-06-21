import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  MaxLength,
} from "class-validator";

export class RewriteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  cvText?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  jobDescription!: string;

  @IsOptional()
  @IsIn(["en", "sv"])
  language?: "en" | "sv";

  @IsOptional()
  @IsIn(["professional", "confident", "concise"])
  tone?: "professional" | "confident" | "concise";

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;
}
