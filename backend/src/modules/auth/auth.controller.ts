import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ApiAuthErrors } from '../../common/swagger/decorators/api-auth-errors.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { AuthService } from './auth.service';
import { CreateLoginDto } from './dto/create-login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { MeResponseDto } from './dto/me-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in',
    description: 'Returns a JWT access token.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(LoginResponseDto)
  login(@Body() dto: CreateLoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Current user',
    description: 'Returns the authenticated user.',
  })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiAuthErrors()
  @ZodSerializerDto(MeResponseDto)
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }
}
