import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const cookies = request.cookies || {};
    const authHeader = request.headers.authorization;
    
    this.logger.debug(`[JwtAuthGuard] Checking authentication for ${request.method} ${request.url}`);
    this.logger.debug(`[JwtAuthGuard] Has cookie: ${!!cookies.playutsav_token}`);
    this.logger.debug(`[JwtAuthGuard] Has auth header: ${!!authHeader}`);
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    if (err || !user) {
      this.logger.error(`[JwtAuthGuard] Authentication failed for ${request.method} ${request.url}`);
      this.logger.error(`[JwtAuthGuard] Error:`, err);
      this.logger.error(`[JwtAuthGuard] Info:`, info);
      this.logger.error(`[JwtAuthGuard] User:`, user);
      throw err || new UnauthorizedException('Invalid or missing authentication token');
    }
    
    this.logger.debug(`[JwtAuthGuard] Authentication successful for user: ${user.userId}`);
    return user;
  }
}
