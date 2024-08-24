const Joi = require('joi');

// Esquema de validación usando Joi
/*
const bookingSchema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(10).required(),
    date: Joi.date().required(),
    // Agrega más campos según tus necesidades
});

*/
const bookingSchema = Joi.object({
    airwaybill: Joi.string().required(),
    origin: Joi.string().required(),
    destination: Joi.string().required(),
    date: Joi.date().iso().required(), // Asegúrate de que el formato de la fecha sea ISO
    flight: Joi.string().required(),
    rateClass: Joi.string().required(),
    priority: Joi.string().required(),
    shipper: Joi.string().required(),
    consignee: Joi.string().required(),
    agent: Joi.string().required(),
    
    // Validación para la tabla de cargo
    cargo: Joi.array().items(Joi.object({
        pieces: Joi.number().min(1).required(),
        packing: Joi.string().required(),
        weight: Joi.number().min(0).required(),
        length: Joi.number().min(0).required(),
        width: Joi.number().min(0).required(),
        height: Joi.number().min(0).required(),
        volume: Joi.number().min(0).required(),
        reference: Joi.string().required(),
        note: Joi.string().required(),
    })).required(),

    // Validación de los totales (opcionales, pero útiles para evitar errores)
    totalPieces: Joi.number().min(0).required(),
    totalWeight: Joi.number().min(0).required(),
    totalVolume: Joi.number().min(0).required(),
});
module.exports = { bookingSchema };