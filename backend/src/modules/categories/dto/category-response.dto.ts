import { createZodDto } from "nestjs-zod";
import { categoryResponseSchema } from "../schemas/category-response.schema";

export class CategoryResponseDto extends createZodDto(categoryResponseSchema) {}
