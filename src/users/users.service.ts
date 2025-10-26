import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { 
  UserServiceClient, 
  CreateUserRequest, 
  GetUserRequest, 
  UpdateUserRequest, 
  DeleteUserRequest, 
  ListUsersRequest,
  USER_SERVICE_NAME 
} from '../protos/generated/demokratie';

@Injectable()
export class UsersService implements OnModuleInit {
  private userService: UserServiceClient;

  constructor(@Inject('UserService') private client: ClientGrpc) {}

  onModuleInit() {
    this.userService = this.client.getService<UserServiceClient>(USER_SERVICE_NAME);
  }

  create(createUserDto: CreateUserDto): Observable<any> {
    const request: CreateUserRequest = {
      name: createUserDto.name || createUserDto['name'] || ''
    };
    return this.userService.createUser(request);
  }

  findAll(): Observable<any> {
    const request: ListUsersRequest = {};
    return this.userService.listUsers(request);
  }

  findOne(id: number): Observable<any> {
    const request: GetUserRequest = { id };
    return this.userService.getUser(request);
  }

  update(id: number, updateUserDto: UpdateUserDto): Observable<any> {
    const request: UpdateUserRequest = {
      id,
      name: updateUserDto.name || updateUserDto['name'] || ''
    };
    return this.userService.updateUser(request);
  }

  remove(id: number): Observable<any> {
    const request: DeleteUserRequest = { id };
    return this.userService.deleteUser(request);
  }
}
