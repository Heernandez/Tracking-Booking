const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./log/logger'); // Importar el logger
const apiRoutes = require('./routes/apiRoutes'); // Importar las rutas API
//const cors = require('cors');

// Configurar dotenv para cargar variables de entorno
dotenv.config();

const app = express();
// Habilita CORS para todas las rutas
//app.use(cors());
app.use(helmet());

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(helmet());
app.use(morgan('combined')); // Puedes seguir usando morgan para logging de solicitudes HTTP

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // HTTP 1.1.
    res.setHeader('Pragma', 'no-cache'); // HTTP 1.0.
    res.setHeader('Expires', '0'); // Proxies.
    next();
  });


// Usar el logger en una ruta de ejemplo
app.use('/api/v1/', apiRoutes);

// Manejar errores globalmente
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`);
    res.status(500).send('Algo salió mal');
});

app.listen(port, () => {
    logger.info(`Servidor escuchando en http://localhost:${port}`);
});