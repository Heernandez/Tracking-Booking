const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./log/logger');
const apiRoutes = require('./routes/apiRoutes');
const cors = require('cors');

// Se configura dotenv para cargar variables de entorno
dotenv.config();

const app = express();
// Se habilita CORS para todas las rutas
//app.use(cors());

app.use(cors({
    origin: process.env.DOMAIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['*', 'Content-Type', 'Accept', 'Authorization'],
}));
app.use(helmet());

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(helmet());
app.use(morgan('combined'));

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache'); 
    res.setHeader('Expires', '0');
    next();
  });

app.use('/api/v1/', apiRoutes);

// Manejo de errores globalmente
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`);
    res.status(500).send('Your request could not be processed, please try again later.\nIf the error persists, contact Support.(EG01)');
});

app.listen(port, () => {
    logger.info(`Servidor escuchando en http://localhost:${port}`);
});