import { TemplateVariableRegistry } from './template-variable-registry';
import { TemplateRendererService } from './template-renderer.service';
import {
  TEMPLATE_VARIABLE_SCOPE,
  TemplateRendererError,
} from './template-variables.types';

describe('TemplateRendererService', () => {
  const service = new TemplateRendererService(new TemplateVariableRegistry());
  const scope = TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_NAME;

  it('renders whitespace, repeated variables, numbers and strings', () => {
    expect(
      service.render({
        scope,
        template:
          '{{ item.name }}: {{ item.width }}x{{item.height}} / {{ item.width }}',
        values: {
          item: { name: 'Фасад', width: 500, height: 860 },
        },
      }),
    ).toEqual({
      value: 'Фасад: 500x860 / 500',
      usedVariables: ['item.name', 'item.width', 'item.height'],
    });
  });

  it('returns a template without variables unchanged', () => {
    expect(service.render({ scope, template: 'Работа', values: {} })).toEqual({
      value: 'Работа',
      usedVariables: [],
    });
  });

  it('validates without reading values and returns unique paths in order', () => {
    expect(
      service.validate({
        scope,
        template: '{{ item.width }} {{ item.name }} {{ item.width }}',
      }),
    ).toEqual({ usedVariables: ['item.width', 'item.name'] });
  });

  it('distinguishes unknown variables from missing values', () => {
    expectRendererError(
      () =>
        service.render({
          scope,
          template: '{{ unknown.path }}',
          values: {},
        }),
      'UNKNOWN_VARIABLE',
      'unknown.path',
    );
    expectRendererError(
      () =>
        service.render({
          scope,
          template: '{{ profile.name }}',
          values: {},
        }),
      'MISSING_VALUE',
      'profile.name',
    );
  });

  it.each(['{{ item.name', 'item.name }}', '{{ {{ item.name }} }}'])(
    'rejects malformed template %s',
    (template) => {
      expectRendererError(
        () => service.render({ scope, template, values: {} }),
        'INVALID_SYNTAX',
      );
    },
  );

  it.each(['__proto__', 'constructor', 'item.constructor', 'item.0'])(
    'rejects non-whitelisted or prototype path %s',
    (path) => {
      expectRendererError(
        () =>
          service.render({
            scope,
            template: `{{ ${path} }}`,
            values: { item: { name: 'Фасад' } },
          }),
        'UNKNOWN_VARIABLE',
        path,
      );
    },
  );

  it('does not read inherited values or array indices', () => {
    const inheritedItem = Object.create({ name: 'Унаследовано' }) as object;
    expectRendererError(
      () =>
        service.render({
          scope,
          template: '{{ item.name }}',
          values: { item: inheritedItem },
        }),
      'MISSING_VALUE',
      'item.name',
    );
    expectRendererError(
      () =>
        service.render({
          scope,
          template: '{{ item.name }}',
          values: { item: ['Фасад'] },
        }),
      'MISSING_VALUE',
      'item.name',
    );
  });
});

function expectRendererError(
  action: () => unknown,
  code: TemplateRendererError['code'],
  variable?: string,
): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(TemplateRendererError);
    expect(error).toMatchObject({ code, ...(variable ? { variable } : {}) });
    return;
  }
  throw new Error('Expected rendering to fail');
}
