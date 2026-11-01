import { Module } from '@nestjs/common';
import { StoreProductsController } from './store-products.controller';
import { StoreProductsService } from './store-products.service';

@Module({
  controllers: [StoreProductsController],
  providers: [StoreProductsService],
  exports: [StoreProductsService],
})
export class StoreProductsModule {}
