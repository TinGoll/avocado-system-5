import { BadRequestException } from '@nestjs/common';
import { TemplateVariableRegistry } from '../../common/template-variables/template-variable-registry';
import { TemplateRendererService } from '../../common/template-variables/template-renderer.service';
import { ProductDisplayTemplateService } from './product-display-template.service';

describe('ProductDisplayTemplateService', () => {
  const registry = new TemplateVariableRegistry();
  const service = new ProductDisplayTemplateService(
    new TemplateRendererService(registry),
  );

  it('renders only the fixed product output context', () => {
    expect(
      service.render(
        '{{ item.name }} {{ item.height }}×{{ item.width }}, {{ material.name }}',
        { name: 'Фасад', width: 500, height: 860, quantity: 1 },
        { material: { name: 'Дуб', secret: 'ignored' } },
      ),
    ).toBe('Фасад 860×500, Дуб');
  });

  it('returns a field error for missing values', () => {
    expect(() =>
      service.render('{{ varnish.name }}', { name: 'Фасад', quantity: 1 }, {}),
    ).toThrow(BadRequestException);
  });

  it('normalizes blank templates', () => {
    expect(service.normalize('   ')).toBeNull();
  });
});
