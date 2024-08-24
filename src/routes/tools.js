const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');


// Función para generar el archivo Excel
async function generateExcel(data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Booking Data');

    worksheet.columns = [
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Date', key: 'date', width: 20 },
    ];

    worksheet.addRow(data);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

// Función para generar el archivo PDF
async function generatePDF(data) {
    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    doc.text(`Booking Details`);
    doc.text(`Name: ${data.name}`);
    doc.text(`Email: ${data.email}`);
    doc.text(`Phone: ${data.phone}`);
    doc.text(`Date: ${data.date}`);

    doc.end();

    const pdfBuffer = Buffer.concat(buffers);
    return pdfBuffer;
}

// Función para enviar el archivo por correo electrónico
async function sendEmail(to, fileBuffer, filename) {
    let transporter = nodemailer.createTransport({
        service: 'gmail', // O cualquier otro servicio de correo que utilices
        auth: {
            user: process.env.EMAIL_USER, // Configurado en .env
            pass: process.env.EMAIL_PASS, // Configurado en .env
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

    await transporter.sendMail(mailOptions);
}
module.exports = {

    generatePDF,
    generateExcel,
    sendEmail
}