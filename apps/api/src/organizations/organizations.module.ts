import { Module } from '@nestjs/common';
import { UserRepository } from '@scheduler/database';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';

@Module({
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    {
      provide: UserRepository,
      useFactory: () => new UserRepository(),
    },
  ],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
