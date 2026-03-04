import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  JwtPayload,
  UnlinkedPayload,
} from '../common/interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';
import { ConnectCodeDto } from './dto/connect-code.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { MentorLoginDto } from './dto/mentor-login.dto';
import { MentorRegisterDto } from './dto/mentor-register.dto';
import { SocialLoginDto } from './dto/social-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('mentor/register')
  mentorRegister(@Body() dto: MentorRegisterDto) {
    return this.authService.mentorRegister(dto);
  }

  @Post('mentor/login')
  mentorLogin(@Body() dto: MentorLoginDto) {
    return this.authService.mentorLogin(dto);
  }

  @Post('mentor/google')
  mentorGoogleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.mentorGoogleLogin(dto.accessToken);
  }

  @Post('mentee/social')
  menteeSocialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.menteeSocialLogin(dto);
  }

  @Post('mentee/connect')
  @UseGuards(JwtAuthGuard)
  menteeConnect(@CurrentUser() user: JwtPayload, @Body() dto: ConnectCodeDto) {
    if (user.role !== 'unlinked') {
      throw new UnauthorizedException('Token must be an unlinked token');
    }

    return this.authService.menteeConnect(user as UnlinkedPayload, dto.code);
  }
}
