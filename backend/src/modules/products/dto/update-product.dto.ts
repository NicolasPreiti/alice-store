import { createZodDto } from "nestjs-zod";
import { updateProductSchema } from "../schemas/update-product.schema";

export class UpdateProductDto extends createZodDto(updateProductSchema) {}
