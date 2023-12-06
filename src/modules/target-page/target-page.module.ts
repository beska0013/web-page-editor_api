import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TargetPageModel } from '../../models/targetPage.model';
@Module({
  imports: [SequelizeModule.forFeature([TargetPageModel])],
})
export class TargetPageModule {}
