const mysql = require('mysql2');
const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../.env')
});

const database = mysql.createConnection({
    host: process.env.DB_HOST,      
    port: process.env.DB_PORT,      
    user: process.env.DB_USER,      
    password: process.env.DB_PASS,  
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
});

database.connect((erro) => {
    if (erro) {
        console.error('Erro ao conectar ao MySQL:', erro);
        return;
    }
    console.log('Node.js conectado ao MySQL com sucesso!');
});

module.exports = database;