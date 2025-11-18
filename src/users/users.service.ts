import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { 
  UserServiceClient, 
  CreateUserRequest, 
  GetUserRequest, 
  UpdateUserRequest, 
  DeleteUserRequest, 
  ListUsersRequest,
  CreateUserResponse,
  GetUserResponse,
  UpdateUserResponse,
  DeleteUserResponse,
  ListUsersResponse,
  USER_SERVICE_NAME 
} from '../protos/generated/demokratie';

//TODO: Add reflected types and remove DTO and any
//      Create a constants folder

@Injectable()
export class UsersService implements OnModuleInit {
  private userService: UserServiceClient;

  constructor(@Inject('UserService') private client: ClientGrpc) {}

  onModuleInit() {
    this.userService = this.client.getService<UserServiceClient>(USER_SERVICE_NAME);
  }

  create(createUserRequest: CreateUserRequest): Observable<CreateUserResponse> {
    return this.userService.createUser(createUserRequest);
  }

  findAll(): Observable<ListUsersResponse> {
    const request: ListUsersRequest = {};
    return this.userService.listUsers(request);
  }

  findOne(id: number): Observable<GetUserResponse> {
    const request: GetUserRequest = { id };
    return this.userService.getUser(request);
  }

  update(id: number, updateUserRequest: Partial<UpdateUserRequest>): Observable<UpdateUserResponse> {
    const request: UpdateUserRequest = {
      id,
      name: updateUserRequest.name || '',
      email: updateUserRequest.email || ''
    };
    return this.userService.updateUser(request);
  }

  delete(id: number): Observable<DeleteUserResponse> {
    const request: DeleteUserRequest = { id };
    return this.userService.deleteUser(request);
  }
}
