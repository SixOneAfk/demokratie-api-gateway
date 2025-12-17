import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { demokratieProtoPath } from '../common/grpc.constants';
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
          protoPath: process.env.GRPC_VIDEO_PROTO_PATH ?? demokratieProtoPath,
          url: 'localhost:50000',
        },
      },
    ]),
  ],
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule {}
