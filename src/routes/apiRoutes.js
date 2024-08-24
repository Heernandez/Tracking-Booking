const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../log/logger'); // Importar el logger
const { parseSoapResponse } = require('../tracking/track');
const { bookingSchema } = require('../validate/validate');
//const { generatePDF, generateExcel, sendEmail } = require('./tools')
const PDFDocument = require('pdfkit');
const stream = require('stream');

const {authenticateToken,generateAccessToken,saveGenerateToken } = require('../auth/auth'); // Importar el middleware

// funciones

const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');



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


async function generateExcel(data) {
    console.log("datos para generar :", data);
    
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

    // Agregar los datos de cargo
    worksheet.addRow(); // Añadir una fila en blanco para separar los datos

    worksheet.addRow(['Pieces', 'Packing', 'Weight', 'Length', 'Width', 'Height', 'Volume', 'Reference', 'Note']); // Encabezado de la tabla de cargo

    // Si hay datos de cargo
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

     // Agregar los datos de cargo
     worksheet.addRow(); // Añadir una fila en blanco para separar los datos

     worksheet.addRow(['Total pieces', 'Total Weight', 'WeTotal Volume']); // Encabezado de la tabla de cargo
     worksheet.addRow([data.totalPieces, data.totalWeight, data.totalVolume]); // Encabezado de la tabla de cargo
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
// Función para generar el archivo PDF
async function generatePDF2(data) {
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

        // Agregar información general
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

        // Agregar tabla de cargo
        doc.fontSize(12).text('Cargo Details', { underline: true });
        doc.moveDown();

        if (data.cargo && data.cargo.length > 0) {
            // Agregar encabezados de la tabla
            doc.fontSize(10)
                .text('Pieces   Packing   Weight   Length   Width   Height   Volume   Reference   Note');

            data.cargo.forEach(item => {
                doc.text(`${item.pieces}   ${item.packing}   ${item.weight}   ${item.length}   ${item.width}   ${item.height}   ${item.volume}   ${item.reference}   ${item.note}`);
            });
        }

        doc.moveDown();
        
        // Agregar totales
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

async function generatePDF3(data) {
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

        // Agregar información general
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

        // Agregar tabla de cargo
        doc.fontSize(12).text('Cargo Details', { underline: true });
        doc.moveDown();

        if (data.cargo && data.cargo.length > 0) {
            // Definir la posición y tamaño de las celdas
            const x = 50;
            const y = doc.y;
            const cellHeight = 20;
            const columnWidths = [50, 50, 50, 50, 50, 50, 50, 50, 50];
            const headers = ['Pieces', 'Packing', 'Weight', 'Length', 'Width', 'Height', 'Volume', 'Reference', 'Note'];
            const totalColumns = headers.length;

            // Dibujar encabezados de la tabla
            doc.fontSize(10);
            headers.forEach((header, index) => {
                doc.text(header, x + index * columnWidths[index], y, { width: columnWidths[index], align: 'center' });
            });
            doc.moveDown();

            // Dibujar líneas de encabezado
            doc.moveTo(x, y + cellHeight)
                .lineTo(x + columnWidths.reduce((a, b) => a + b, 0), y + cellHeight)
                .stroke();

            // Dibujar líneas de separación entre filas
            data.cargo.forEach((item, rowIndex) => {
                console.log("index : ");
                let rowY = y + cellHeight * (2 + rowIndex);
                headers.forEach((header, colIndex) => {
                    doc.text(item[header.toLowerCase()], x + colIndex * columnWidths[colIndex], rowY, { width: columnWidths[colIndex], align: 'center' });
                });

                // Línea inferior de la fila
                doc.moveTo(x, rowY + cellHeight)
                    .lineTo(x + columnWidths.reduce((a, b) => a + b, 0), rowY + cellHeight)
                    .stroke();
                console.log("index : ",rowIndex,"\n","x : ",x,"\n","rowY : ",rowY,"\n","cellHeight : ",cellHeight);
            });

            // Línea final de la tabla
            doc.moveTo(x, y + cellHeight * (2 + data.cargo.length))
                .lineTo(x + columnWidths.reduce((a, b) => a + b, 0), y + cellHeight * (2 + data.cargo.length))
                .stroke();
        }

        doc.moveDown();
        
        // Agregar totales
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

        // Agregar información general
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

        // Agregar tabla de cargo
        doc.fontSize(12).text('Cargo Details', { underline: true });
        doc.moveDown();

        if (data.cargo && data.cargo.length > 0) {
            // Definir la posición y tamaño de las celdas
            const x = 50;
            let y = doc.y; // Iniciar desde la posición actual
            const cellHeight = 30; // Incrementar el alto de la celda para evitar superposición
            const columnWidths = [50, 50, 50, 50, 50, 50, 50, 50, 50];
            const headers = ['Pieces', 'Packing', 'Weight', 'Length', 'Width', 'Height', 'Volume', 'Reference', 'Note'];
            const totalColumns = headers.length;

            // Dibujar encabezados de la tabla
            doc.fontSize(10);
            headers.forEach((header, index) => {
                doc.text(header, x + index * columnWidths[index], y, { width: columnWidths[index], align: 'center' });
            });

            // Línea inferior del encabezado
            doc.moveTo(x, y + 10)
                .lineTo(x + columnWidths.reduce((a, b) => a + b, 0), y + 10)
                .stroke();

            y += cellHeight+10; // Mover a la siguiente fila

            // Dibujar líneas de separación entre filas
            data.cargo.forEach((item, rowIndex) => {
                headers.forEach((header, colIndex) => {
                    doc.text(item[header.toLowerCase()], x + colIndex * columnWidths[colIndex], y, { width: columnWidths[colIndex], align: 'center' });
                });

                // Línea inferior de la fila
                doc.moveTo(x, y + 10)
                    .lineTo(x + columnWidths.reduce((a, b) => a + b, 0), y + 10)
                    .stroke();

                y += cellHeight+10; // Mover a la siguiente fila
            });
            
            // Línea final de la tabla
            /*
            doc.moveTo(x, y)
                .lineTo(x + columnWidths.reduce((a, b) => a + b, 0), y)
                .stroke();
            */
        }

        doc.moveDown();
        
        // Agregar totales
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
async function sendEmail(to="luishernandez@utp.edu.co", fileBuffer, filename) {
    console.log("try send");
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
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

// Endpoint para manejar la solicitud de booking
router.post('/booking', async (req, res) => {
    try {
        // Validar los datos recibidos
        const { error, value } = bookingSchema.validate(req.body);
        if (error) {
            console.log(error,"\n",error.details[0].message );
            return res.status(400).json({ error: error.details[0].message });
        }
        console.log("datos correctos");
        // Determinar el formato y generar el archivo
        const format = 'pdf'; // Puedes cambiar a 'excel' según sea necesario
        let fileBuffer;
        let filename;

        if (format === 'pdf') {
            fileBuffer = await generatePDF(value);
            filename = 'booking.pdf';
        } else if (format === 'excel') {
            fileBuffer = await generateExcel(value);
            filename = 'booking.xlsx';
        }

        // Enviar el archivo por correo
        console.log("filename: ",filename,"\nfilebuffer:",fileBuffer);
        await sendEmail(value.email, fileBuffer, filename);

        res.status(200).json({ message: 'Booking received and file sent via email.' });
    } catch (err) {
        console.error('Error processing booking:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;
