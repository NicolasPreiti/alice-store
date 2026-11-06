import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateCategoryDto } from "./dto/create-category.dto";
import type { UpdateCategoryDto } from "./dto/update-category.dto";

const CATEGORY_SELECT = { id: true, name: true } as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      select: CATEGORY_SELECT,
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async create(dto: CreateCategoryDto) {
    // P2002 (duplicate name) bubbles to HttpExceptionFilter → 409.
    return this.prisma.category.create({
      data: { name: dto.name },
      select: CATEGORY_SELECT,
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Category not found");

    // P2002 (rename to an existing name) → 409 via the filter.
    return this.prisma.category.update({
      where: { id },
      data: { name: dto.name },
      select: CATEGORY_SELECT,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });
    if (!existing) throw new NotFoundException("Category not found");

    // Count-then-delete is not atomic; acceptable for a
    // single-instance store API (same caveat as the last-admin guard).
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (productCount > 0) {
      throw new BadRequestException("Category has products");
    }

    await this.prisma.category.delete({ where: { id } });
    return existing;
  }
}
