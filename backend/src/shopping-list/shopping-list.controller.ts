import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ShoppingListService } from './shopping-list.service';
import {
  CreateShoppingItemDto,
  MarkBoughtDto,
  UpdateShoppingItemDto,
} from './dto';

@Controller('shopping-list')
export class ShoppingListController {
  constructor(private readonly shopping: ShoppingListService) {}

  @Get()
  listPending() {
    return this.shopping.listPending();
  }

  @Get('all')
  listAll() {
    return this.shopping.listAll();
  }

  @Post()
  create(@Body() dto: CreateShoppingItemDto) {
    return this.shopping.create(dto);
  }

  @Post('clear-bought')
  clearBought() {
    return this.shopping.clearBought();
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateShoppingItemDto,
  ) {
    return this.shopping.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.shopping.delete(id);
  }

  @Post(':id/bought')
  markBought(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: MarkBoughtDto,
  ) {
    return this.shopping.markBought(id, dto);
  }
}
