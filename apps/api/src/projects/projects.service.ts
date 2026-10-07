import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(name: string, description?: string) {
    return this.prisma.project.create({
      data: { name, description },
    });
  }

  findAll() {
    return this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { datasets: true } } },
    });
  }

  findOne(id: string) {
    return this.prisma.project.findUniqueOrThrow({
      where: { id },
      include: { datasets: true },
    });
  }
}
