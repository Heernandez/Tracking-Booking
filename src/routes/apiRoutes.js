const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../log/logger'); // Importar el logger
const { parseSoapResponse } = require('../tracking/track');
// Endpoint de ejemplo para manejar una solicitud
router.get('/search', async (req, res) => {
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

router.get('/another-route', (req, res) => {
    res.send('Otra ruta');
});

router.post('/fetch-data', async (req, res) => {
    const requestData = req.body.data;
    try {
        // Hacer una solicitud a otra API usando axios
        const response = await axios.post(process.env.EXTERNAL_API_URL, { data: requestData }, {
            headers: { 'Authorization': `Bearer ${process.env.API_KEY}` }
        });

        // Enviar la respuesta de la API externa al cliente
        res.json(response.data);
    } catch (error) {
        console.error('Error en la solicitud a la API externa:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
});

module.exports = router;
