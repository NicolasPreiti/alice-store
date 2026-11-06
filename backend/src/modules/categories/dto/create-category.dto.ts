import { createZodDto } from "nestjs-zod";
import { createCategorySchema } from "../schemas/create-category.schema";

export class CreateCategoryDto extends createZodDto(createCategorySchema) {}
