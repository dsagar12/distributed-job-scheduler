const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./openapi.json');

function setupSwagger(app) {
  const swaggerOptions = {
    customSiteTitle: 'Distributed Job Scheduler API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  };

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, swaggerOptions));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, swaggerOptions));

  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openapiSpec);
  });
  app.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openapiSpec);
  });
}

module.exports = setupSwagger;
