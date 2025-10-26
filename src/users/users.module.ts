import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'UserService',
        transport: Transport.GRPC,
        options: {
          package: 'demokratie',
          protoPath: '/home/nik/Desktop/demokratie/grpc-server/src/protos/demokratie.proto',
          url: 'localhost:50000',
        },
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
