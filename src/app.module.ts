import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScraperModule } from './modules/scraper/scraper.module';
import {PuppeteerModule} from "nest-puppeteer";


@Module({
  imports: [
      ScraperModule,
    PuppeteerModule.forRoot({
          isGlobal: true,
        },

    )
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
