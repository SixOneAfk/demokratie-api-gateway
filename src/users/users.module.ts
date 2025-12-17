import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { demokratieProtoPath } from '../common/grpc.constants';
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
          protoPath: process.env.GRPC_USER_PROTO_PATH ?? demokratieProtoPath,
          url: 'localhost:50000',
        },
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
