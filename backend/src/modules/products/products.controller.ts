import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";
import { ApiAuthErrors } from "../../common/swagger/decorators/api-auth-errors.decorator";
import { CreateProductDto } from "./dto/create-product.dto";
import { ProductResponseDto } from "./dto/product-response.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsService } from "./products.service";

@ApiTags("products")
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: "List products" })
  @ApiOkResponse({ type: [ProductResponseDto] })
  @ApiAuthErrors()
  @ZodSerializerDto([ProductResponseDto])
  list() {
    return this.productsService.findAll();
  }

  @Get(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a product by id" })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(ProductResponseDto)
  findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a product" })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(ProductResponseDto)
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a product" })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(ProductResponseDto)
  update(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }
}
