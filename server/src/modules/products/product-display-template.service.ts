import { BadRequestException, Injectable } from '@nestjs/common';
import { TemplateRendererService } from '../../common/template-variables/template-renderer.service';
import {
  TEMPLATE_VARIABLE_SCOPE,
  TemplateRendererError,
} from '../../common/template-variables/template-variables.types';

export type ProductDisplayItemContext = {
  name: string;
  width?: number;
  height?: number;
  thickness?: number;
  quantity: number;
};

@Injectable()
export class ProductDisplayTemplateService {
  constructor(private readonly renderer: TemplateRendererService) {}

  normalize(template?: string | null): string | null {
    return template?.trim() || null;
  }

  validate(template: string): void {
    try {
      this.renderer.validate({
        scope: TEMPLATE_VARIABLE_SCOPE.PRODUCT_OUTPUT,
        template,
      });
    } catch (error) {
      this.fail(error);
    }
  }

  render(
    template: string,
    item: ProductDisplayItemContext,
    characteristics: unknown,
  ): string {
    try {
      return this.renderer.render({
        scope: TEMPLATE_VARIABLE_SCOPE.PRODUCT_OUTPUT,
        template,
        values: { item, ...this.readCharacteristics(characteristics) },
      }).value;
    } catch (error) {
      this.fail(error);
    }
  }

  private readCharacteristics(
    value: unknown,
  ): Record<string, { name: string }> {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return {};
    return Object.fromEntries(
      ['material', 'color', 'patina', 'profile', 'panel', 'varnish'].flatMap(
        (key) => {
          const entry = (value as Record<string, unknown>)[key];
          return typeof entry === 'object' &&
            entry !== null &&
            !Array.isArray(entry) &&
            typeof (entry as Record<string, unknown>).name === 'string'
            ? [[key, { name: (entry as Record<string, string>).name }]]
            : [];
        },
      ),
    );
  }

  private fail(error: unknown): never {
    if (!(error instanceof TemplateRendererError)) throw error;
    throw new BadRequestException({
      code: error.code,
      field: 'displayTemplate',
      message: error.message,
      ...(error.variable ? { variable: error.variable } : {}),
    });
  }
}
