const express = require('express');
const { handleRequest } = require('../controllers/apiController');

const router = express.Router();

router.use(async (request, response) => {
  try {
    const event = {
      path: request.path,
      httpMethod: request.method,
      headers: request.headers,
      queryStringParameters: request.query,
      body: request.body && Object.keys(request.body).length ? (
        request.is('application/x-www-form-urlencoded') ? new URLSearchParams(request.body).toString() : JSON.stringify(request.body)
      ) : '',
    };
    const result = await handleRequest(event, { request, response });
    Object.entries(result.headers || {}).forEach(([name, value]) => response.setHeader(name, value));
    response.status(result.statusCode || 200).send(result.body || '');
  } catch (error) {
    console.error(error);
    response.status(500).json({ ok: false, message: 'Erro interno do servidor.' });
  }
});

module.exports = router;
