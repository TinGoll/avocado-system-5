import { Module } from '@nestjs/common';
import { TemplateVariableRegistry } from './template-variable-registry';
import { TemplateRendererService } from './template-renderer.service';

@Module({
  providers: [TemplateVariableRegistry, TemplateRendererService],
  exports: [TemplateVariableRegistry, TemplateRendererService],
})
export class TemplateVariablesModule {}
