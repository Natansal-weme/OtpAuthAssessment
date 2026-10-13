import { ConflictException, Injectable } from '@nestjs/common';
import type { PublicUser, UserProfileData } from '../auth/auth.types';
import type { UserRecord } from '../database/database.schema';
import { DatabaseService } from '../database/database.service';
import type { Row } from '../database/in-memory-table';

export type User = Row<UserRecord>;

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  private get users() {
    return this.db.table('users');
  }

  findById(id: string): User | undefined {
    return this.users.findById(id);
  }

  findByPhone(phone: string): User | undefined {
    return this.users.findOne({ phone });
  }

  findByEmail(email: string): User | undefined {
    return this.users.findOne({ email });
  }

  /**
   * Creates a user, enforcing the uniqueness a real DB would enforce with unique indexes.
   * Expects already-normalized input (E.164 phone, trimmed name, lowercased email).
   */
  create(phone: string, profile: UserProfileData): User {
    if (this.findByPhone(phone)) {
      throw new ConflictException('An account with this phone number already exists');
    }
    if (this.findByEmail(profile.email)) {
      throw new ConflictException('An account with this email already exists');
    }
    return this.users.insert({ phone, name: profile.name, email: profile.email });
  }

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
