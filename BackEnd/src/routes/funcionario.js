const express = require('express');
const router = express.Router();
const database = require('../config/db');

router.get('/', (req, res) => {

    const query = `
        SELECT
            id_funcionario,
            nome
        FROM funcionario
        ORDER BY nome
    `;

    database.query(query, (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                erro: 'Erro ao buscar funcionários.'
            });
        }

        res.json(results);

    });

});

module.exports = router;