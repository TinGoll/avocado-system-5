import { Module } from '@nestjs/common';
import { TemplateVariableRegistry } from './template-variable-registry';
import { TemplateRendererService } from './template-renderer.service';
import { TemplateVariablesController } from './template-variables.controller';

@Module({
  controllers: [TemplateVariablesController],
  providers: [TemplateVariableRegistry, TemplateRendererService],
  exports: [TemplateVariableRegistry, TemplateRendererService],
})
export class TemplateVariablesModule {}
