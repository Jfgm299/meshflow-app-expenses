import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { createOpenApiConfig } from "./openapi";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = createOpenApiConfig();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("docs", app, document);
  app.getHttpAdapter().get("/openapi.json", (_request, response) => response.json(document));

  const port = Number(process.env.PORT ?? 4010);
  await app.listen(port);
}

void bootstrap();
