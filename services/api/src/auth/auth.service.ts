import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';

const BCRYPT_ROUNDS = 12;

type JwtPayload = {
  sub: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async signup(data: {
    email: string;
    password: string;
    displayName?: string;
    organization?: string;
    contactEmail?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: 'HOST',
        displayName: data.displayName,
        hostProfile: data.organization || data.contactEmail ? {
          create: {
            organization: data.organization,
            contactEmail: data.contactEmail ?? data.email,
          },
        } : undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        hostProfile: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  signToken(user: { id: string; role: string }) {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return this.jwt.sign(payload);
  }

  async profile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        hostProfile: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
