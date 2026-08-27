import {
  TEMPLATE_VARIABLE_DEFINITIONS,
  TemplateVariableRegistry,
} from './template-variable-registry';
import {
  TEMPLATE_VARIABLE_SCOPE,
  TemplateVariableRegistryError,
  TemplateVariableScope,
} from './template-variables.types';

describe('TemplateVariableRegistry', () => {
  const registry = new TemplateVariableRegistry();

  it('returns the production-operation formula variables', () => {
    const definitions = registry.getByScope(
      TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_FORMULA,
    );

    expect(definitions.map(({ path }) => path)).toEqual([
      'item.width',
      'item.height',
      'item.thickness',
      'item.quantity',
      'profile.width',
      'profile.grooveDepth',
      'panelWidth',
      'panelHeight',
    ]);
    expect(definitions.every(({ valueType }) => valueType === 'number')).toBe(
      true,
    );
  });

  it('keeps name variables available only to the name template', () => {
    const namePaths = registry
      .getByScope(TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_NAME)
      .map(({ path }) => path);
    const formulaPaths = registry
      .getByScope(TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_FORMULA)
      .map(({ path }) => path);

    expect(namePaths).toEqual(
      expect.arrayContaining(['item.name', 'profile.name', 'panel.name']),
    );
    expect(formulaPaths).not.toEqual(
      expect.arrayContaining(['item.name', 'profile.name', 'panel.name']),
    );
  });

  it('finds definitions and reports unavailable paths', () => {
    expect(
      registry.getDefinition(
        'item.quantity',
        TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_FORMULA,
      ),
    ).toMatchObject({ path: 'item.quantity', valueType: 'number' });
    expect(
      registry.getDefinition(
        'item.name',
        TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_FORMULA,
      ),
    ).toBeUndefined();
    expect(
      registry.isAvailable(
        'unknown.path',
        TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_NAME,
      ),
    ).toBe(false);
  });

  it('has unique paths inside every scope', () => {
    for (const scope of Object.values(TEMPLATE_VARIABLE_SCOPE)) {
      const paths = registry.getByScope(scope).map(({ path }) => path);
      expect(new Set(paths).size).toBe(paths.length);
    }
  });

  it('rejects an unknown scope with a controlled error', () => {
    expect(() =>
      registry.getByScope('unknown' as TemplateVariableScope),
    ).toThrow(TemplateVariableRegistryError);
  });

  it('registers every definition in at least one scope', () => {
    expect(
      TEMPLATE_VARIABLE_DEFINITIONS.every(({ scopes }) => scopes.length),
    ).toBe(true);
  });
});
