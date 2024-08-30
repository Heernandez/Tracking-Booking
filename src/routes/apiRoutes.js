const express = require('express');
const router = express.Router();
const axios = require('axios');
const { parseSoapResponseTracking , parseSoapResponseGetDestination, parseSoapResponseGetRateClass} = require('../tracking/track');
const { bookingSchema } = require('../validate/validate');
const PDFDocument = require('pdfkit');
const stream = require('stream');
const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const {authenticateToken,generateAccessToken,saveGenerateToken } = require('../auth/auth'); // Importar el middleware

// Ruta para consultar tracking
router.get('/search',async (req, res) => {
    const { trackId } = req.query;
    // Validar que trackId es numérico
    if (!trackId || isNaN(trackId)) {
        return res.status(400).send('El parámetro trackId debe ser un número válido.');
    }
    try {
        
        const soapApiUrl = process.env.EXTERNAL_API_URL; // URL de la api de consulta
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
        const response = await axios.post(soapApiUrl, soapRequest, {
            headers: {
                'Content-Type': 'text/xml; charset=utf-8'
            }
        });
        const parsedData = await parseSoapResponseTracking(response.data);
        res.json(parsedData);
    } catch (error) {
        console.error('Error en la solicitud SOAP:', error);
        res.status(500).json({ error: 'Your request could not be processed, please try again later.\nIf the error persists, contact Support.(GT01)' });
    }
});

// Ruta para autenticar al usuario y proporcionar un token JWT
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Se puede agregar una validacion basica de pass
    // para generar el JTW
    const token = generateAccessToken({ username });
    saveGenerateToken(token);
    res.json({ token });
});

// funcion para generar en excel la informacion del booking
async function generateExcel(data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Booking Data');
    // Agregar la información general del booking
    worksheet.columns = [
        { header: 'Airway Bill', key: 'airwaybill', width: 20 },
        { header: 'Origin', key: 'origin', width: 20 },
        { header: 'Destination', key: 'destination', width: 20 },
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Flight', key: 'flight', width: 20 },
        { header: 'Rate Class', key: 'rateClass', width: 20 },
        { header: 'Priority', key: 'priority', width: 20 },
        { header: 'Shipper', key: 'shipper', width: 20 },
        { header: 'Consignee', key: 'consignee', width: 20 },
        { header: 'Agent', key: 'agent', width: 20 }
    ];
    worksheet.addRow({
        airwaybill: data.airwaybill,
        origin: data.origin,
        destination: data.destination,
        date: data.date,
        flight: data.flight,
        rateClass: data.rateClass,
        priority: data.priority,
        shipper: data.shipper,
        consignee: data.consignee,
        agent: data.agent
    });
    // Añadir una fila en blanco para separar los datos
    worksheet.addRow(); 
// Se agregan los datos de cargo
    worksheet.addRow(['Pieces', 'Packing', 'Weight', 'Length', 'Width', 'Height', 'Volume', 'Reference', 'Note']); // Encabezado de la tabla de cargo
    // Se valida si hay datos de cargo para agregar
    if (data.cargo && data.cargo.length > 0) {
        data.cargo.forEach(item => {
            worksheet.addRow([
                item.pieces,
                item.packing,
                item.weight,
                item.length,
                item.width,
                item.height,
                item.volume,
                item.reference,
                item.note
            ]);
        });
    }
    // Añadir una fila en blanco para separar los datos
    worksheet.addRow(); 
    // Se agregan los encabezados de los ultimos datos del booking
    worksheet.addRow(['Total pieces', 'Total Weight', 'WeTotal Volume']);
    worksheet.addRow([data.totalPieces, data.totalWeight, data.totalVolume]);
    function applyBorders(worksheet) {
        worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
            row.eachCell({ includeEmpty: true }, function(cell, colNumber) {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });
    }
    applyBorders(worksheet);
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}
async function generatePDF(data) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const buffers = [];
        const writableStream = new stream.Writable({
            write(chunk, encoding, callback) {
                buffers.push(chunk);
                callback();
            }
        });
        doc.pipe(writableStream);
        // Se agregan los primeros datos del booking
        doc.fontSize(12).text('Booking Details', { align: 'center' });
        doc.fontSize(10).text(`Airway Bill: ${data.airwaybill}`);
        doc.text(`Origin: ${data.origin}`);
        doc.text(`Destination: ${data.destination}`);
        doc.text(`Date: ${data.date}`);
        doc.text(`Flight: ${data.flight}`);
        doc.text(`Rate Class: ${data.rateClass}`);
        doc.text(`Priority: ${data.priority}`);
        doc.text(`Shipper: ${data.shipper}`);
        doc.text(`Consignee: ${data.consignee}`);
        doc.text(`Agent: ${data.agent}`);
        doc.moveDown();

        // Se agrega la informacion del cargo
        doc.fontSize(12).text('Cargo Details', { underline: true });
        doc.moveDown();
        if (data.cargo && data.cargo.length > 0) {
            // Se define la posición y tamaño de las celdas
            const x = 50;
            // Se inicia desde la posición actual
            let y = doc.y;
            // Se incrementa el alto de la celda para evitar superposición 
            const cellHeight = 30; 
            const columnWidths = [50, 50, 50, 50, 50, 50, 50, 50, 50];
            const headers = ['Pieces', 'Packing', 'Weight', 'Length', 'Width', 'Height', 'Volume', 'Reference', 'Note'];
            const totalColumns = headers.length;

            // Se dibuja los encabezados de la tabla
            doc.fontSize(10);
            headers.forEach((header, index) => {
                doc.text(header, x + index * columnWidths[index], y, { width: columnWidths[index], align: 'center' });
            });

            // Dibujado de la linea inferior de los encabezados
            doc.moveTo(x, y + 10)
                .lineTo(x + columnWidths.reduce((a, b) => a + b, 0), y + 10)
                .stroke();

            // Corrimiento a la siguiente fila con una holgura adicional de 10
            y += cellHeight+10;
            // Se dibujan las líneas de separación entre filas
            data.cargo.forEach((item, rowIndex) => {
                headers.forEach((header, colIndex) => {
                    doc.text(item[header.toLowerCase()], x + colIndex * columnWidths[colIndex], y, { width: columnWidths[colIndex], align: 'center' });
                });

                // Dibujado de la línea inferior de la fila
                doc.moveTo(x, y + 10)
                    .lineTo(x + columnWidths.reduce((a, b) => a + b, 0), y + 10)
                    .stroke();
                // Salto de linea
                y += cellHeight+10;
            });
        }

        doc.moveDown();
        // Se agregan los totales
        doc.fontSize(12).text('Totals', { underline: true });
        doc.fontSize(10)
            .text(`Total Pieces: ${data.totalPieces}`);
        doc.text(`Total Weight: ${data.totalWeight}`);
        doc.text(`Total Volume: ${data.totalVolume}`);
        doc.end();

        writableStream.on('finish', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });

        writableStream.on('error', (error) => {
            reject(error);
        });
    });
}
// Función para enviar el archivo por correo electrónico
async function sendEmail(to, fileBuffer, filename) {
    console.log("try send to:",process.env.EMAIL_CONTACT_CENTER);
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_CONTACT_CENTER,
        subject: 'Your Booking Details',
        text: 'Please find your booking details attached.',
        attachments: [
            {
                filename: filename,
                content: fileBuffer,
            },
        ],
    };
    console.log("try send 3");
    await transporter.sendMail(mailOptions);
    console.log("try send 4");
}

// Ruta para manejar la solicitud de booking
router.post('/booking', async (req, res) => {
    try {
        // Se validan los datos recibidos
        console.log("data:\n",req.body)
        const { error, value } = bookingSchema.validate(req.body);
        if (error) {
            console.log(error,"\n",error.details[0].message );
            return res.status(400).json({ error: error.details[0].message });
        }
        // Determinar el formato y generar el archivo
        // Puedes cambiar a 'excel' según sea necesario
        // Se debe definir la forma en la que se debe elegir la opcion
        const format = 'pdf'; 
        let fileBuffer;
        let filename;

        if (format === 'pdf') {
            fileBuffer = await generatePDF(value);
            filename = 'booking.pdf';
        } else if (format === 'excel') {
            fileBuffer = await generateExcel(value);
            filename = 'booking.xlsx';
        }
        // Se valida si se marcó el check para enviar el correo
        if(value.sendEmail){
            await sendEmail(process.env.EMAIL_CONTACT_CENTER, fileBuffer, filename);
            res.status(200).json({ message: 'Booking received and file sent via email.' });
        }else{
            console.log("no se envía correo");
            res.status(200).json({ message: 'Booking received but file wasnt send via email.' });
        }
    } catch (err) {
        console.error('Error processing booking:', err);
        res.status(500).json({ error: 'Your request could not be processed, please try again later.\nIf the error persists, contact Support.(SE01)' });
    }
});

// Ruta para obtener lista de origen y destino

router.get('/getDestination', async (req, res) => {
    try {
        
        const soapApiUrl = process.env.EXTERNAL_API_URL; // URL de la api de consulta
        const soapRequest = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
                <soapenv:Header/>
                <soapenv:Body>
                    <tem:getDestination/>
                </soapenv:Body>
            </soapenv:Envelope>
        `;
        const response = await axios.post(soapApiUrl, soapRequest, {
            headers: {
                'Content-Type': 'text/xml; charset=utf-8'
            }
        });
        const parsedData = await parseSoapResponseGetDestination(response.data);
        res.json(parsedData);
    } catch (error) {
        console.error('Error en la solicitud SOAP:', error);
        res.status(500).json({ error: 'Your request could not be processed, please try again later.\nIf the error persists, contact Support.(GT01)' });
    }

});

// Ruta para obtener lista de rate class

router.get('/getRateClass', async (req, res) => {
    try {
        
        const soapApiUrl = process.env.EXTERNAL_API_URL; // URL de la api de consulta
        const soapRequest = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
                <soapenv:Header/>
                <soapenv:Body>
                    <tem:getCommodity/>
                </soapenv:Body>
            </soapenv:Envelope>
        `;
        const response = await axios.post(soapApiUrl, soapRequest, {
            headers: {
                'Content-Type': 'text/xml; charset=utf-8'
            }
        });
        const parsedData = await parseSoapResponseGetRateClass(response.data);
        res.json(parsedData);
    } catch (error) {
        console.error('Error en la solicitud SOAP:', error);
        res.status(500).json({ error: 'Your request could not be processed, please try again later.\nIf the error persists, contact Support.(GT01)' });
    }

});
module.exports = router;
