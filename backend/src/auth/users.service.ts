import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['role'],
    });
  }

  async findOne(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  async create(
    email: string,
    password: string,
    name: string,
    roleName: string = 'user',
  ): Promise<User> {
    const key = email.toLowerCase().trim();
    const existing = await this.userRepo.findOne({ where: { email: key } });
    if (existing) throw new ConflictException('User already exists');
    const role = await this.roleRepo.findOne({ where: { name: roleName } });
    if (!role) throw new ConflictException('Role not found');
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = this.userRepo.create({
      email: key,
      password: hashed,
      name: name.trim(),
      roleId: role.id,
    });
    await this.userRepo.save(user);
    return this.userRepo.findOne({
      where: { id: user.id },
      relations: ['role'],
    }) as Promise<User>;
  }

  async findAll(opts?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    items: (Omit<User, 'password' | 'role'> & { role: string })[];
    total: number;
  }> {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(2000, Math.max(1, opts?.limit ?? 500));
    const skip = (page - 1) * limit;
    const search = opts?.search?.trim();

    let users: User[];
    let total: number;

    if (search) {
      const qb = this.userRepo
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .orderBy('user.created_at', 'DESC')
        .where('user.email ILIKE :s OR user.name ILIKE :s', {
          s: `%${search}%`,
        });
      [users, total] = await qb.skip(skip).take(limit).getManyAndCount();
    } else {
      [users, total] = await this.userRepo.findAndCount({
        relations: ['role'],
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });
    }

    const items = users.map(({ password: _, ...u }) => ({
      ...u,
      role: u.role?.name ?? 'user',
    }));

    return { items, total };
  }

  async count(): Promise<number> {
    return this.userRepo.count();
  }

  async updateProfile(
    userId: string,
    data: { name?: string; email?: string },
  ): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (data.email !== undefined) {
      const key = data.email.toLowerCase().trim();
      const existing = await this.userRepo.findOne({
        where: { email: key },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Email already in use');
      }
      user.email = key;
    }
    if (data.name !== undefined) user.name = data.name.trim();
    await this.userRepo.save(user);
    return this.userRepo.findOne({
      where: { id: userId },
      relations: ['role'],
    }) as Promise<User>;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new BadRequestException('Current password is incorrect');
    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.userRepo.save(user);
  }
}
