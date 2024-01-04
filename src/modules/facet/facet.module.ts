import { Module } from '@nestjs/common';
import { FacetService } from './facet.service';
import { FacetModel } from '../../models/facet.model';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [SequelizeModule.forFeature([FacetModel])],
  providers: [FacetService],
  exports: [FacetService],
})
export class FacetModule {}
