import { createZodDto } from "nestjs-zod";
import { productResponseSchema } from "../schemas/product-response.schema";

export class ProductResponseDto extends createZodDto(productResponseSchema) {}
