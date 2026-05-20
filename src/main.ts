import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { APP_VERSION, OPENAPI_DESCRIPTION, OPENAPI_TITLE } from "./app.identity";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle(OPENAPI_TITLE)
    .setDescription(OPENAPI_DESCRIPTION)
    .setVersion(APP_VERSION)
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("docs", app, document);
  app.getHttpAdapter().get("/openapi.json", (_request, response) => response.json(document));

  const port = Number(process.env.PORT ?? 4010);
  await app.listen(port);
}

void bootstrap();
