import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";

const PRODUCT_SELECT = {
  id: true,
  name: true,
  sku: true,
  cost: true,
  price: true,
  description: true,
  stock: true,
  categoryId: true,
  category: { select: { id: true, name: true } },
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  cost: Prisma.Decimal;
  price: Prisma.Decimal;
  description: string | null;
  stock: number;
  categoryId: string;
  category: { id: string; name: string };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** JSON numbers in → Prisma.Decimal rounded to 2dp; never floats in storage. */
function toMoney(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

function serialize(product: ProductRow) {
  return {
    ...product,
    cost: product.cost.toFixed(2),
    price: product.price.toFixed(2),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const products = await this.prisma.product.findMany({
      select: PRODUCT_SELECT,
      orderBy: { name: "asc" },
    });
    return products.map(serialize);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: PRODUCT_SELECT,
    });
    if (!product) throw new NotFoundException("Product not found");
    return serialize(product as unknown as ProductRow);
  }

  async create(dto: CreateProductDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      select: { id: true },
    });
    if (!category) throw new NotFoundException("Category not found");

    // P2002 (duplicate sku) bubbles to HttpExceptionFilter → 409.
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        sku: dto.sku,
        cost: toMoney(dto.cost),
        price: toMoney(dto.price),
        description: dto.description ?? null,
        stock: dto.stock,
        categoryId: dto.categoryId,
        isActive: dto.isActive,
      },
      select: PRODUCT_SELECT,
    });
    return serialize(product as unknown as ProductRow);
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Product not found");

    if (dto.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true },
      });
      if (!category) throw new NotFoundException("Category not found");
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        sku: dto.sku,
        cost: dto.cost === undefined ? undefined : toMoney(dto.cost),
        price: dto.price === undefined ? undefined : toMoney(dto.price),
        description: dto.description,
        stock: dto.stock,
        categoryId: dto.categoryId,
        isActive: dto.isActive,
      },
      select: PRODUCT_SELECT,
    });
    return serialize(product as unknown as ProductRow);
  }
}
