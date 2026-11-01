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
import { FavoritesService } from './favorites.service';
import {
  BulkInsertDto,
  CreateFavoriteDto,
  ImportTextDto,
  UpdateFavoriteDto,
} from './dto';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list() {
    return this.favorites.list();
  }

  @Post()
  create(@Body() dto: CreateFavoriteDto) {
    return this.favorites.create(dto);
  }

  @Get('due')
  due() {
    return this.favorites.due();
  }

  @Post('add-due-to-shopping')
  addDue() {
    return this.favorites.addDueToShoppingList();
  }

  @Post('bulk')
  bulkInsert(@Body() dto: BulkInsertDto) {
    return this.favorites.bulkInsert(dto);
  }

  @Post('import-text')
  importText(@Body() dto: ImportTextDto) {
    return this.favorites.importText(dto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateFavoriteDto,
  ) {
    return this.favorites.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.favorites.delete(id);
  }

  @Post(':id/add-to-shopping')
  addToShopping(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('quantity') quantity?: string,
  ) {
    return this.favorites.addToShoppingList(id, quantity ? Number(quantity) : 1);
  }
}
