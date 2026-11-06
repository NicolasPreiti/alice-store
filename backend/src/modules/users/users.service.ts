import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { hash } from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

/** Must match the cost factor used by auth and seed. */
const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: "asc" },
    });
    return users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException("User not found");
    return { ...user, createdAt: user.createdAt.toISOString() };
  }

  async create(dto: CreateUserDto) {
    // P2002 (duplicate email) bubbles to HttpExceptionFilter → 409.
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: await hash(dto.password, PASSWORD_SALT_ROUNDS),
        role: dto.role,
      },
      select: USER_SELECT,
    });
    return { ...user, createdAt: user.createdAt.toISOString() };
  }

  async update(selfId: string, id: string, dto: UpdateUserDto) {
    if (id === selfId && dto.isActive === false) {
      throw new BadRequestException("Cannot deactivate your own account");
    }

    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) throw new NotFoundException("User not found");

    if (target.role === "ADMIN" && target.isActive) {
      const losesAdmin =
        dto.isActive === false || dto.role === "EMPLOYEE";
      if (losesAdmin) {
        // Count-then-update is not atomic; acceptable for a
        // single-instance store admin API (see slice-1-users.md).
        const otherActiveAdmins = await this.prisma.user.count({
          where: { role: "ADMIN", isActive: true, id: { not: id } },
        });
        if (otherActiveAdmins === 0) {
          throw new BadRequestException(
            "Cannot remove the last active admin",
          );
        }
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        isActive: dto.isActive,
      },
      select: USER_SELECT,
    });
    return { ...user, createdAt: user.createdAt.toISOString() };
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("User not found");

    const user = await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await hash(dto.password, PASSWORD_SALT_ROUNDS) },
      select: USER_SELECT,
    });
    return { ...user, createdAt: user.createdAt.toISOString() };
  }
}
