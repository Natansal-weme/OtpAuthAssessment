import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import type { TableRow, UserSchema } from '../database/database.schema';
import { DatabaseService } from '../database/database.service';

export type User = TableRow<'users'>;

/** Public representation of a user, as returned by the API. */
export interface UserDto {
  id: string;
  phone: string;
  name: string;
  email: string;
}

export function toUserDto({ id, phone, name, email }: User): UserDto {
  return { id, phone, name, email };
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  private get users() {
    return this.db.table('users');
  }

  findById(id: string): Promise<User | undefined> {
    return this.users.findById(id);
  }

  /** `phone` must be canonical (E.164). */
  findByPhone(phone: string): Promise<User | undefined> {
    return this.users.findOne({ phone });
  }

  /** Callers must ensure the phone is not registered yet (under the phone's lock). */
  create(user: z.input<typeof UserSchema>): Promise<User> {
    return this.users.insert(user);
  }
}
