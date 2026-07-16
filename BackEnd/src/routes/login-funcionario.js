const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const database = require('../config/db');

router.post('/cadastro', (req, res) => {
    const { nome, email, senha, cargo, cargoQuemCadastrou } = req.body;

    if (!cargoQuemCadastrou || cargoQuemCadastrou.toLowerCase() !== 'administrador') {
        return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem cadastrar novos funcionários.' });
    }

    if (!nome || !email || !senha || !cargo) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    bcrypt.hash(senha, 10, (err, hash) => {
        if (err) return res.status(500).json({ erro: 'Erro ao processar senha.' });

        const query = 'INSERT INTO funcionario (nome, email, senha, cargo) VALUES (?, ?, ?, ?)';
        database.query(query, [nome, email, hash, cargo], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ erro: 'Erro ao salvar funcionário no banco.' });
            }
            res.status(201).json({ mensagem: 'Funcionário cadastrado com sucesso!' });
        });
    });
});

router.post('/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
    }

    const query = 'SELECT * FROM funcionario WHERE email = ?';
    database.query(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro interno no servidor.' });

        if (results.length === 0) {
            return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
        }

        const funcionario = results[0];

        try {
            const senhaConfere = await bcrypt.compare(senha, funcionario.senha);

            if (!senhaConfere) {
                return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
            }

            delete funcionario.senha;
            res.json({ mensagem: 'Login realizado com sucesso!', funcionario });
        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao validar a senha.' });
        }
    });


});

router.get('/', (req, res) => {
    const query = 'SELECT id_funcionario, nome, cargo FROM funcionario';
    database.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ erro: 'Erro ao buscar funcionários.' });
        }
        res.json(results);
    });
});


module.exports = router;