const express = require('express');
const router = express.Router();
const axios = require('axios');
const { parseSoapResponseAwbno, parseSoapResponseTracking , parseSoapResponseGetDestination, parseSoapResponseGetRateClass} = require('../tracking/track');
const { bookingSchema } = require('../validate/validate');
const PDFDocument = require('pdfkit');
const stream = require('stream');
const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const {authenticateToken,generateAccessToken,saveGenerateToken } = require('../auth/auth'); // Importar el middleware
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
// Ruta para consultar tracking
router.get('/search',async (req, res) => {
    console.log("eyy");
    const { trackId } = req.query;
    // Validar que trackId es numérico
    if (!trackId || isNaN(trackId)) {
        return res.status(400).send('El parámetro trackId debe ser un número válido.');
    }
    try {
        const soapApiUrl = process.env.EXTERNAL_API_URL; // URL de la api de consulta
        // Consultar la informacion principal
        const soapRequestAwbno = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tem="http://tempuri.org/">
            <soap:Header/>
            <soap:Body>
                <tem:getFlightAwb>
                    <!--Optional:-->
                    <tem:pAwbno>${trackId}</tem:pAwbno>
                </tem:getFlightAwb>
            </soap:Body>
        `;
        console.log(soapRequestAwbno)
        const responseAwbno = await axios.post(soapApiUrl, soapRequestAwbno, {
            headers: {
                'Content-Type': ': application/soap+xml; charset=utf-8'
            }
        });
        console.log("lucho resp: \n", responseAwbno.data);
        const parsedDataAwbno = await parseSoapResponseAwbno(responseAwbno.data);
        
        // Consultar los detalles del tracking
        const soapRequestTracking = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
                <soapenv:Header/>
                <soapenv:Body>
                    <tem:getTracking>
                        <tem:pAwbno>${trackId}</tem:pAwbno>
                    </tem:getTracking>
                </soapenv:Body>
            </soapenv:Envelope>
        `;
        const responseTracking = await axios.post(soapApiUrl, soapRequestTracking, {
            headers: {
                'Content-Type': 'text/xml; charset=utf-8'
            }
        });
        const parsedData = await parseSoapResponseTracking(responseTracking.data);
        res.json({"header": parsedDataAwbno,"body":parsedData});
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
        { header: 'Shipper', key: 'shipper', width: 20 },
        { header: 'Consignee', key: 'consignee', width: 20 },
        { header: 'Agent', key: 'agent', width: 20 }
    ];
    let fullDate = data.date + "-" + data.hourSelect;
    worksheet.addRow({
        airwaybill: data.airwaybill,
        origin: data.origin,
        destination: data.destination,
        date: fullDate,
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
        // Se agregan los primeros datos del booking
        doc.fontSize(12).text('Booking Details', { align: 'center' });
        doc.fontSize(10).text(`Airway Bill: ${data.airwaybill}`);
        doc.text(`Origin: ${data.origin}`);
        doc.text(`Destination: ${data.destination}`);
        doc.text(`Date: ${data.date} - ${data.hourSelect}`);
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
async function generatePDF2(data) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Cargar HTML desde el archivo
    const templatePath = path.join(__dirname, 'template.html');
    const html = fs.readFileSync(templatePath, 'utf8');

    // Rellenar el HTML con los datos
    const filledHtml = html
        .replace('{{airwaybill}}', data.airwaybill)
        .replace('{{origin}}', data.origin)
        .replace('{{destination}}', data.destination)
        .replace('{{date}}', data.date)
        .replace('{{hourSelect}}', data.hourSelect)
        .replace('{{shipper}}', data.shipper)
        .replace('{{consignee}}', data.consignee)
        .replace('{{agent}}', data.agent)
        .replace('{{totalPieces}}', data.totalPieces)
        .replace('{{totalWeight}}', data.totalWeight)
        .replace('{{totalVolume}}', data.totalVolume)
        .replace('{{#each cargo}}', data.cargo.map(item => `
            <tr>
                <td>${item.pieces}</td>
                <td>${item.packing}</td>
                <td>${item.weight}</td>
                <td>${item.length}</td>
                <td>${item.width}</td>
                <td>${item.height}</td>
                <td>${item.volume}</td>
                <td>${item.reference}</td>
                <td>${item.note}</td>
            </tr>
        `).join(''))
        .replace('{{/each}}', '');

    // Configurar el contenido de la página
    await page.setContent(filledHtml, { waitUntil: 'networkidle0' });

    // Generar el PDF
    const pdfBuffer = await page.pdf({ format: 'A4' });

    await browser.close();

    return pdfBuffer;
}

// Función para convertir una imagen a base64
function imageToBase64(filePath) {
    const image = fs.readFileSync(filePath);
    return `data:image/png;base64,${image.toString('base64')}`;
}

async function generatePDF(data) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Leer y compilar la plantilla HTML
    const templatePath = path.join(__dirname, 'template.html');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    // Leer la imagen y convertirla a base64
    const imagePath = path.join(__dirname, 'aircargo-white.png'); // Reemplaza con el nombre de tu imagen
    const base64Image = imageToBase64(imagePath);
    // Crear el HTML con los datos
    const filledHtml = template({
        airwaybill: data.airwaybill,
        origin: data.origin,
        destination: data.destination,
        date: data.date,
        hourSelect: data.hourSelect,
        shipper: data.shipper,
        consignee: data.consignee,
        agent: data.agent,
        totalPieces: data.totalPieces,
        totalWeight: data.totalWeight,
        totalVolume: data.totalVolume,
        cargo: data.cargo,
        headerImage: base64Image // Si necesitas una imagen en base64
    });

    // Configurar el contenido de la página
    await page.setContent(filledHtml, { waitUntil: 'networkidle0' });
    
    const htmlContent = await page.content();
    fs.writeFileSync('output.html', htmlContent);
    // Generar el PDF
    const pdfBuffer = await page.pdf({ format: 'A4',printBackground: true });

    await browser.close();

    return pdfBuffer;
}


// Función para enviar el archivo por correo electrónico
async function sendEmail(to,  filenamePDF,fileBufferPDF,filenameXLS,fileBufferXLS ) {
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
                filename: filenamePDF,
                content: fileBufferPDF,
            },
            {
                filename: filenameXLS,
                content: fileBufferXLS,
            },
        ],
    };
    console.log("try send 3");
    await transporter.sendMail(mailOptions);
    console.log("try send 4");
}

async function sendEmailSMTP(to, filenamePDF, fileBufferPDF, filenameXLS, fileBufferXLS) {
    console.log("try send to:", process.env.EMAIL_CONTACT_CENTER);

    // Configura el transporte SMTP
    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, // e.g., 'smtp.your-email-provider.com'
        port: process.env.SMTP_PORT, // e.g., 587 for TLS or 465 for SSL
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER, // Tu dirección de correo o nombre de usuario
            pass: process.env.SMTP_PASS, // La contraseña de tu cuenta
        },
    });

    let mailOptions = {
        from: process.env.SMTP_USER,
        to: to || process.env.EMAIL_CONTACT_CENTER,
        subject: 'Your Booking Details',
        text: 'Please find your booking details attached.',
        attachments: [
            {
                filename: filenamePDF,
                content: fileBufferPDF,
            },
            {
                filename: filenameXLS,
                content: fileBufferXLS,
            },
        ],
    };

    console.log("try send 3");
    try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully");
    } catch (error) {
        console.error("Error sending email:", error);
    }
    console.log("try send 4");
}

function formatDateString(dateString) {
    // Asegúrate de que la cadena esté en formato "aaaa-mm-dd"
    const date = new Date(dateString);
    // Verifica si la fecha es válida
    if (isNaN(date.getTime())) {
        return dateString;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses comienzan en 0
    const year = date.getFullYear();

    // Retorna la fecha en formato "dd/mm/aaaa"
    return `${day}/${month}/${year}`;
}

// Ruta para manejar la solicitud de booking
router.post('/booking', async (req, res) => {
    try {
        // Se validan los datos recibidos
        console.log("data:\n",req.body);
        if(req.body.date != ""){
            req.body.date = formatDateString(req.body.date);
        }
        const { error, value } = bookingSchema.validate(req.body);
        if (error) {
            console.log(error,"\n",error.details[0].message );
            return res.status(400).json({ error: error.details[0].message });
        }
        
        // Generacion del pdf
        let fileBufferPDF = await generatePDF(value);
        let filenamePDF = 'booking.pdf';

        // Generacion del XLS
        let fileBufferXLS = await generateExcel(value);
        let filenameXLS = 'booking.xlsx';
        await sendEmail(process.env.EMAIL_CONTACT_CENTER,filenamePDF, fileBufferPDF,filenameXLS ,fileBufferXLS);
        res.status(200).json({ message: 'Booking received and file sent via email.' });

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
