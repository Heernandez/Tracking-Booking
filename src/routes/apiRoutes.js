const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../log/logger'); // Importar el logger
const { parseSoapResponse } = require('../tracking/track');

const {authenticateToken,generateAccessToken,saveGenerateToken } = require('../auth/auth'); // Importar el middleware

// Endpoint de ejemplo para manejar una solicitud
router.get('/search', authenticateToken,async (req, res) => {
    console.log("ejecuta")
    const { trackId } = req.query;
    // Validar que trackId es numérico
    if (!trackId || isNaN(trackId)) {
        return res.status(400).send('El parámetro trackId debe ser un número válido.');
    }
    console.log("consultara para :",trackId);
    try {
        // Envía la solicitud SOAP
        const soapApiUrl = process.env.EXTERNAL_API_URL; // Asegúrate de tener esto en tu .env
        const soapRequest = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
                <soapenv:Header/>
                <soapenv:Body>
                    <tem:getTracking>
                        <tem:pAwbno>${trackId}</tem:pAwbno>
                    </tem:getTracking>
                </soapenv:Body>
            </soapenv:Envelope>
        `;

        // Hacer la solicitud SOAP
        const response = await axios.post(soapApiUrl, soapRequest, {
            headers: {
                'Content-Type': 'text/xml; charset=utf-8'
            }
        });

        const parsedData = await parseSoapResponse(response.data);
        res.json(parsedData);
    } catch (error) {
        console.error('Error en la solicitud SOAP:', error);
        res.status(500).json({ error: 'Error en la solicitud SOAP' });
    }
});

// Ruta para autenticar al usuario y proporcionar un token JWT
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    console.log("lucho :",username,password);
    // Aquí deberías verificar las credenciales del usuario (esto es solo un ejemplo simple)
   // if (username === 'tu_usuario' && password === 'tu_contraseña') {
        // Generar un token JWT
    const token = generateAccessToken({ username });

    saveGenerateToken(token);
    res.json({ token });
  //  } else {
     //   res.status(401).send('Credenciales inválidas');
   // }
});

module.exports = router;
