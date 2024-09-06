const Joi = require('joi');

const bookingSchema = Joi.object({
    airwaybill: Joi.string().required(),
    origin: Joi.string().required(),
    destination: Joi.string().required(),
    date: Joi.string().required(),
    hourSelect: Joi.string().required(),
    flight: Joi.string(),//.required(),
    rateClass: Joi.string(), //.required(),
    priority: Joi.string(),//.required(),
    shipper: Joi.string().required(),
    consignee: Joi.string().required(),
    agent: Joi.string(),//.required(),
    
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

    // Validación de los totales
    totalPieces: Joi.number().min(0).required(),
    totalWeight: Joi.number().min(0).required(),
    totalVolume: Joi.number().min(0).required(),
    // Campo de confirmacion para enviar o no correo
    sendEmail: Joi.boolean().truthy('on').falsy(null).default(false)
});
module.exports = { bookingSchema };