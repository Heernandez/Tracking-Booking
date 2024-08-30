const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

// Variable de almacenamiento para tokens válidos
const validTokens = {};

// Función para generar un nuevo token
function generateAccessToken(user) {
    console.log('ACCESS_TOKEN_SECRET:', process.env.ACCESS_TOKEN_SECRET);
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
    // Se puede almacenar el tkn en BD indicando el TTL
    return token;
}

function saveGenerateToken(token){
    validTokens[token] = true;
}
// Middleware para autenticar el token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);
    console.log("assss");
    console.log(validTokens);
    // Verificar si el token es válido y no ha sido usado antes
    if (!validTokens[token]) return res.sendStatus(403); // Token ya fue usado o no es válido

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        // Si el token es valido, es decir se genero 
        // con el access secret token se puede validar
        // si no ha cadudado, de ser asi se puede cerrar la sesión
        // o generar un nuevo token para operar
        next();
    });
}
module.exports = {
    authenticateToken,
    generateAccessToken,
    saveGenerateToken
};
