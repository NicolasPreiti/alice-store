import { createZodDto } from "nestjs-zod";
import { createProductSchema } from "../schemas/create-product.schema";

export class CreateProductDto extends createZodDto(createProductSchema) {}
