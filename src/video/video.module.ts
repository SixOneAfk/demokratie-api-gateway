import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'VideoService',
        transport: Transport.GRPC,
        options: {
          package: 'demokratie',
          protoPath: '/home/nik/Desktop/demokratie/grpc-server/src/protos/demokratie.proto',
          url: 'localhost:50000',
        },
      },
    ]),
  ],
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule {}
