import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ApiAuthErrors } from "../../common/swagger/decorators/api-auth-errors.decorator";
import type { AuthUser } from "../../common/types/auth-user.type";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@Roles("ADMIN")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: "List users" })
  @ApiOkResponse({ type: [UserResponseDto] })
  @ApiAuthErrors()
  @ZodSerializerDto([UserResponseDto])
  list() {
    return this.usersService.findAll();
  }

  @Get(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a user by id" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(UserResponseDto)
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a user" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(UserResponseDto)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a user (name, role, or isActive)" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(UserResponseDto)
  update(@CurrentUser() me: AuthUser, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(me.id, id, dto);
  }

  @Post(":id/reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Set a new password for a user (admin reset)" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(UserResponseDto)
  resetPassword(@Param("id") id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto);
  }
}
