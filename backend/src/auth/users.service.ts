import { ConflictException, Injectable } from '@nestjs/common';
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

  async findAll(): Promise<
    (Omit<User, 'password' | 'role'> & { role: string })[]
  > {
    const users = await this.userRepo.find({
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
    return users.map(({ password: _, ...u }) => ({ ...u, role: u.role.name }));
  }
}
