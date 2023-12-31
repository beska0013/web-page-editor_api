import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { TargetPageModel } from '../../models/targetPage.model';

@Module({
  imports: [SequelizeModule.forFeature([TargetPageModel])],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}
