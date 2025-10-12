import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockJwt = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jwt = module.get(JwtService) as jest.Mocked<JwtService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should create a new host user successfully', async () => {
      const signupData = {
        email: 'host@example.com',
        password: 'Password@123',
        displayName: 'Test Host',
        organization: 'Test Org',
        contactEmail: 'contact@example.com',
      };

      const hashedPassword = 'hashed_password';
      const createdUser = {
        id: 'user-123',
        email: signupData.email,
        role: 'HOST',
        displayName: signupData.displayName,
        hostProfile: {
          id: 'profile-123',
          organization: signupData.organization,
          contactEmail: signupData.contactEmail,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.signup(signupData);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: signupData.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(signupData.password, 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: signupData.email,
          passwordHash: hashedPassword,
          role: 'HOST',
          displayName: signupData.displayName,
          hostProfile: {
            create: {
              organization: signupData.organization,
              contactEmail: signupData.contactEmail,
            },
          },
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
      expect(result).toEqual(createdUser);
    });

    it('should create user without host profile if no organization/contactEmail provided', async () => {
      const signupData = {
        email: 'user@example.com',
        password: 'Password@123',
        displayName: 'Test User',
      };

      const hashedPassword = 'hashed_password';
      const createdUser = {
        id: 'user-123',
        email: signupData.email,
        role: 'HOST',
        displayName: signupData.displayName,
        hostProfile: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.signup(signupData);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: signupData.email,
          passwordHash: hashedPassword,
          role: 'HOST',
          displayName: signupData.displayName,
          hostProfile: undefined,
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
      expect(result).toEqual(createdUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      const signupData = {
        email: 'existing@example.com',
        password: 'Password@123',
      };

      prisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: signupData.email,
        passwordHash: 'some-hash',
        role: 'HOST',
        displayName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.signup(signupData)).rejects.toThrow(ConflictException);
      await expect(service.signup(signupData)).rejects.toThrow('Email already registered');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      const email = 'user@example.com';
      const password = 'Password@123';
      const user = {
        id: 'user-123',
        email,
        passwordHash: 'hashed_password',
        role: 'HOST',
        displayName: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, user.passwordHash);
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('nonexistent@example.com', 'password')).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.validateUser('nonexistent@example.com', 'password')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        passwordHash: 'hashed_password',
        role: 'HOST',
        displayName: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('user@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('signToken', () => {
    it('should generate JWT token with correct payload', () => {
      const user = { id: 'user-123', role: 'HOST' };
      const token = 'jwt_token_string';

      jwt.sign.mockReturnValue(token);

      const result = service.signToken(user);

      expect(jwt.sign).toHaveBeenCalledWith({ sub: user.id, role: user.role });
      expect(result).toBe(token);
    });
  });

  describe('profile', () => {
    it('should return user profile with hostProfile', async () => {
      const userId = 'user-123';
      const userProfile = {
        id: userId,
        email: 'user@example.com',
        role: 'HOST',
        displayName: 'Test User',
        hostProfile: {
          id: 'profile-123',
          organization: 'Test Org',
          contactEmail: 'contact@example.com',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(userProfile);

      const result = await service.profile(userId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
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
      expect(result).toEqual(userProfile);
    });

    it('should return null if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.profile('nonexistent-user');

      expect(result).toBeNull();
    });
  });
});
