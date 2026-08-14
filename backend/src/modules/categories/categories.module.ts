import { Module } from '@nestjs/common';

import { CategoriesAdminController, CategoryActionsController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesAdminController, CategoryActionsController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
