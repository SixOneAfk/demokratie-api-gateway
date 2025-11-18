import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';

@Controller()
export class AppController {
  @Get('simple.html')
  serveSimpleFrontend(@Res() res: Response) {
    res.sendFile(join(__dirname, '..', 'public', 'simple.html'));
  }

  @Get('room.html')
  serveRoomFrontend(@Res() res: Response) {
    res.sendFile(join(__dirname, '..', 'public', 'room.html'));
  }
}
