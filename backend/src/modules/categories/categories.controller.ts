import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";
import { ApiAuthErrors } from "../../common/swagger/decorators/api-auth-errors.decorator";
import { CategoriesService } from "./categories.service";
import { CategoryResponseDto } from "./dto/category-response.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@ApiTags("categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: "List categories" })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  @ApiAuthErrors()
  @ZodSerializerDto([CategoryResponseDto])
  list() {
    return this.categoriesService.findAll();
  }

  @Get(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a category by id" })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(CategoryResponseDto)
  findOne(@Param("id") id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a category" })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(CategoryResponseDto)
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Rename a category" })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(CategoryResponseDto)
  update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a category with no products" })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(CategoryResponseDto)
  remove(@Param("id") id: string) {
    return this.categoriesService.remove(id);
  }
}
