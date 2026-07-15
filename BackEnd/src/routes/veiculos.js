const express = require('express');
const router = express.Router();
const database = require('../config/db');

router.get('/', (req, res) => {
    const { id_cliente } = req.query;

    if (!id_cliente) {
        return res.status(400).json({ erro: 'O ID do cliente é obrigatório para listar os veículos.' });
    }

    const query = 'SELECT * FROM veiculos WHERE id_cliente = ?';
    database.query(query, [id_cliente], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ erro: 'Erro ao buscar veículos no banco.' });
        }
        res.json(results);
    });
});

router.post('/cadastro', (req, res) => {
    const { marca, modelo, ano, placa, id_cliente } = req.body;

    if (!marca || !modelo || !ano || !placa || !id_cliente) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    const query = 'INSERT INTO veiculos (marca, modelo, ano, placa, id_cliente) VALUES (?, ?, ?, ?, ?)';
    database.query(query, [marca, modelo, ano, placa, id_cliente], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ erro: 'Erro ao salvar o veículo no banco.' });
        }
        res.status(201).json({ mensagem: 'Veículo cadastrado com sucesso!', id_veiculos: result.insertId });
    });
});

module.exports = router;