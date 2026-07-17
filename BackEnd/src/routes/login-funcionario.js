const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const database = require('../config/db');

router.post('/cadastro', (req, res) => {
    const { nome, email, senha, cargo, cargoQuemCadastrou } = req.body;

    if ((req.get('x-cargo') || cargoQuemCadastrou || '').toLowerCase() !== 'administrador') {
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

router.get('/', exigirAdministrador, (req, res) => {
    const query = 'SELECT id_funcionario, nome, email, cargo FROM funcionario ORDER BY nome';
    database.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ erro: 'Erro ao buscar funcionários.' });
        }
        res.json(results);
    });
});

function exigirAdministrador(req, res, next) {
    if ((req.get('x-cargo') || '').toLowerCase() !== 'administrador') {
        return res.status(403).json({ erro: 'Apenas administradores podem gerenciar funcionários.' });
    }
    next();
}

router.put('/:id', exigirAdministrador, (req, res) => {
    const { id } = req.params;
    const { nome, email, cargo, senha } = req.body;
    if (!nome || !email || !cargo) return res.status(400).json({ erro: 'Nome, e-mail e cargo são obrigatórios.' });

    const finalizar = (senhaHash) => {
        const query = senhaHash
            ? 'UPDATE funcionario SET nome = ?, email = ?, cargo = ?, senha = ? WHERE id_funcionario = ?'
            : 'UPDATE funcionario SET nome = ?, email = ?, cargo = ? WHERE id_funcionario = ?';
        const params = senhaHash ? [nome, email, cargo, senhaHash, id] : [nome, email, cargo, id];
        database.query(query, params, (err, result) => {
            if (err) return res.status(500).json({ erro: 'Erro ao atualizar funcionário.' });
            if (!result.affectedRows) return res.status(404).json({ erro: 'Funcionário não encontrado.' });
            res.json({ mensagem: 'Funcionário atualizado com sucesso!' });
        });
    };
    if (senha) return bcrypt.hash(senha, 10, (err, hash) => err ? res.status(500).json({ erro: 'Erro ao processar senha.' }) : finalizar(hash));
    finalizar(null);
});

router.delete('/:id', exigirAdministrador, (req, res) => {
    const { id } = req.params;
    const idLogado = Number(req.get('x-funcionario-id'));
    if (Number(id) === idLogado) return res.status(400).json({ erro: 'Você não pode excluir o próprio acesso.' });

    database.query('UPDATE ordem_servico SET id_funcionario = NULL WHERE id_funcionario = ?', [id], (updateErr) => {
        if (updateErr) return res.status(500).json({ erro: 'Erro ao desvincular os chamados do funcionário.' });
        database.query('DELETE FROM funcionario WHERE id_funcionario = ?', [id], (err, result) => {
            if (err) return res.status(500).json({ erro: 'Erro ao excluir funcionário.' });
            if (!result.affectedRows) return res.status(404).json({ erro: 'Funcionário não encontrado.' });
            res.json({ mensagem: 'Funcionário excluído com sucesso!' });
        });
    });
});


module.exports = router;
