import { BadRequestException, Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { JWT_COOKIE_NAME } from './jwt.strategy';
import { JwtAuthGuard } from './jwtAuth.guard';
import { Roles } from './roles.decorator';
import { CurrentUser } from './current-user.decorator';

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).optional(),
  organization: z.string().min(2).optional(),
  contactEmail: z.string().email().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 1000 * 60 * 60 * 12, // 12 hours
};

const clearCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  async signup(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const user = await this.auth.signup(parsed.data);
    const token = this.auth.signToken({ id: user.id, role: user.role });
    
    // Clear any existing cookie first to avoid conflicts
    res.clearCookie(JWT_COOKIE_NAME, clearCookieOptions);
    // Set new cookie
    res.cookie(JWT_COOKIE_NAME, token, cookieOptions);
    return user;
  }

  @Post('login')
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const user = await this.auth.validateUser(parsed.data.email, parsed.data.password);
    const token = this.auth.signToken({ id: user.id, role: user.role });
    
    // Clear any existing cookie first to avoid conflicts
    res.clearCookie(JWT_COOKIE_NAME, clearCookieOptions);
    // Set new cookie
    res.cookie(JWT_COOKIE_NAME, token, cookieOptions);
    return this.auth.profile(user.id);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(JWT_COOKIE_NAME, clearCookieOptions);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'HOST')
  async me(@CurrentUser() user: { userId: string }) {
    if (!user) return null;
    return this.auth.profile(user.userId);
  }
}
