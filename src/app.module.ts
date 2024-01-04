import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScraperModule } from './modules/scraper/scraper.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { FacetModule } from './modules/facet/facet.module';
import * as process from 'process';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      useFactory: () => {
        return {
          dialect: 'postgres',
          host: process.env.POSTGRES_HOST,
          port: Number(process.env.POSTGRES_PORT),
          username: process.env.POSTGRES_USER,
          password: process.env.POSTGRES_PASSWORD,
          database: process.env.POSTGRES_DB,
          autoLoadModels: true,
          synchronize: true,
        };
      },
    }),
    ScraperModule,
    FacetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
