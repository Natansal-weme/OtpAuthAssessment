import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Validates (and normalizes) a request value with a zod schema.
 *
 *   @Body(new ZodValidationPipe(schema)) body: z.output<typeof schema>
 *
 * Unknown keys are stripped by `z.object`. Failures become a 400 whose `message` is a list of
 * human-readable issues.
 */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.issues.map((issue) => issue.message));
    }
    return result.data;
  }
}
