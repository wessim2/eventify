# Adding Swagger OpenAPI Documentation

We successfully added and integrated Swagger (OpenAPI) documentation to the NestJS API application, serving it on `/api/docs`.

## Evidence
- Installed `@nestjs/swagger` and `swagger-ui-express` inside the API module workspace.
- Bootstrapped `SwaggerModule` and `DocumentBuilder` in `main.ts` with global prefix and Bearer authentication settings.
- Verified that Webpack bundles these dependencies cleanly, outputting a valid unified bundle.
