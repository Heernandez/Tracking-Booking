const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

// Variable de almacenamiento para tokens válidos
const validTokens = {};

// Función para generar un nuevo token
function generateAccessToken(user) {
    console.log("try generate");
    console.log('ACCESS_TOKEN_SECRET:', process.env.ACCESS_TOKEN_SECRET);
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
     // Almacenar el token generado en validTokens
    console.log("generado : ",token);
    return token;
}

function saveGenerateToken(token){
    console.log("try save");
    validTokens[token] = true;
    console.log(validTokens);

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

        //req.user = user;

        // Invalidate the current token
        //delete validTokens[token];

        // Generate a new token
        //const newToken = generateAccessToken({ username: user.username });
        //validTokens[newToken] = true;

        // Attach the new token to the response headers
        //res.setHeader('Authorization', `Bearer ${newToken}`);

        next();
    });
}

module.exports = {
    authenticateToken,
    generateAccessToken,
    saveGenerateToken
};
