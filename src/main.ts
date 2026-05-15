import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle("MeshFlow Expenses App")
    .setDescription("Minimal Expenses remote app backend for MeshFlow installation lifecycle validation.")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("docs", app, document);
  app.getHttpAdapter().get("/openapi.json", (_request, response) => response.json(document));

  const port = Number(process.env.PORT ?? 4010);
  await app.listen(port);
}

void bootstrap();
