import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { StoreProductsService } from './store-products.service';
import { CreateStoreProductDto, UpdateStoreProductDto } from './dto';

@Controller('store-products')
export class StoreProductsController {
  constructor(private readonly products: StoreProductsService) {}

  @Get()
  list(@Query('store') store?: string, @Query('ingredient_id') ingredient_id?: string) {
    return this.products.list({ store, ingredient_id });
  }

  @Post()
  create(@Body() dto: CreateStoreProductDto) {
    return this.products.create(dto);
  }

  @Get('by-ingredient/:id')
  byIngredient(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.products.listByIngredient(id);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateStoreProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.products.delete(id);
  }
}
