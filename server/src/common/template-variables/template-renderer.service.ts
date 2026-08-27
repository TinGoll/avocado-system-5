import { Injectable } from '@nestjs/common';
import { TemplateVariableRegistry } from './template-variable-registry';
import {
  RenderTemplateOptions,
  RenderTemplateResult,
  TemplateRendererError,
} from './template-variables.types';

@Injectable()
export class TemplateRendererService {
  constructor(private readonly registry: TemplateVariableRegistry) {}

  render(options: RenderTemplateOptions): RenderTemplateResult {
    const variables = this.parse(options.template, options.scope);
    const usedVariables = [...new Set(variables)];
    const resolvedValues = new Map(
      usedVariables.map((variable) => {
        const definition = this.registry.getDefinition(variable, options.scope);
        return [
          variable,
          this.readValue(options.values, variable, definition!.valueType),
        ];
      }),
    );

    return {
      value: options.template.replace(
        /{{\s*([^{}]+?)\s*}}/g,
        (_placeholder, rawVariable: string) =>
          String(resolvedValues.get(rawVariable.trim())),
      ),
      usedVariables,
    };
  }

  private parse(
    template: string,
    scope: RenderTemplateOptions['scope'],
  ): string[] {
    const variables: string[] = [];
    let cursor = 0;
    const placeholder = /{{\s*([^{}]+?)\s*}}/g;

    for (const match of template.matchAll(placeholder)) {
      const start = match.index ?? 0;
      if (
        template.slice(cursor, start).includes('{{') ||
        template.slice(cursor, start).includes('}}')
      ) {
        throw new TemplateRendererError(
          'INVALID_SYNTAX',
          'Некорректный шаблон.',
        );
      }
      const variable = match[1].trim();
      if (!this.registry.isAvailable(variable, scope)) {
        throw new TemplateRendererError(
          'UNKNOWN_VARIABLE',
          `Неизвестная переменная: ${variable}.`,
          variable,
        );
      }
      variables.push(variable);
      cursor = start + match[0].length;
    }

    if (
      template.slice(cursor).includes('{{') ||
      template.slice(cursor).includes('}}')
    ) {
      throw new TemplateRendererError('INVALID_SYNTAX', 'Некорректный шаблон.');
    }
    return variables;
  }

  private readValue(
    values: unknown,
    path: string,
    valueType: 'string' | 'number' | 'boolean',
  ): string | number | boolean {
    let current = values;
    for (const segment of path.split('.')) {
      if (
        !this.isRecord(current) ||
        !Object.prototype.hasOwnProperty.call(current, segment)
      ) {
        throw this.missingValue(path);
      }
      current = current[segment];
    }

    if (
      typeof current !== valueType ||
      (typeof current === 'number' && !Number.isFinite(current))
    ) {
      throw this.missingValue(path);
    }
    return current as string | number | boolean;
  }

  private missingValue(variable: string): TemplateRendererError {
    return new TemplateRendererError(
      'MISSING_VALUE',
      `Отсутствует значение: ${variable}.`,
      variable,
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
