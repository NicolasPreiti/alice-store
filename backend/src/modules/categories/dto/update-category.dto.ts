import { createZodDto } from "nestjs-zod";
import { updateCategorySchema } from "../schemas/update-category.schema";

export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}
