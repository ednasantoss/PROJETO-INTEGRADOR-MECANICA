const express = require('express');
const router = express.Router();
const database = require('../config/db');

router.post('/', (req, res) => {
    const { id_cliente, id_veiculos, titulo, descricao } = req.body;

    if (!id_cliente || !id_veiculos || !titulo) {
        return res.status(400).json({ erro: 'Cliente, veículo e título do chamado são obrigatórios.' });
    }

    const query = `
        INSERT INTO ordem_servico (id_cliente, id_veiculos, titulo, descricao, status)
        VALUES (?, ?, ?, ?, 'Em Análise')
    `;
    database.query(query, [id_cliente, id_veiculos, titulo, descricao || null], (err, result) => {
        if (err) {
            console.error('Erro ao abrir chamado:', err);
            return res.status(500).json({ erro: 'Erro ao abrir o chamado no banco.' });
        }
        res.status(201).json({ mensagem: 'Chamado aberto com sucesso!', id_os: result.insertId });
    });
});

router.get('/', (req, res) => {
    const query = `
        SELECT
            os.id_os,
            os.titulo,
            os.descricao,
            os.status,
            os.data_de_abertura,
            os.data_de_finalizacao,
            c.nome AS nome_cliente,
            veiculos.marca,
            veiculos.modelo,
            veiculos.placa,
            f.nome AS nome_funcionario
        FROM ordem_servico os
        INNER JOIN cliente c ON os.id_cliente = c.id_cliente
        INNER JOIN veiculos ON os.id_veiculos =  veiculos.id_veiculos
        LEFT JOIN funcionario f ON os.id_funcionario = f.id_funcionario
        ORDER BY os.id_os DESC
    `;

    database.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar chamados:', err);
            return res.status(500).json({ erro: 'Erro interno ao buscar chamados.' });
        }
        res.json(results);
    });
});

router.get('/cliente/:id_cliente', (req, res) => {
    const { id_cliente } = req.params;

    const query = `
        SELECT
            os.id_os,
            os.titulo,
            os.descricao,
            os.status,
            os.data_de_abertura,
            os.data_de_finalizacao,
            veiculos.marca,
            veiculos.modelo,
             veiculos.placa
        FROM ordem_servico os
        INNER JOIN veiculos ON os.id_veiculos =  veiculos.id_veiculos
        WHERE os.id_cliente = ?
        ORDER BY os.id_os DESC
    `;

    database.query(query, [id_cliente], (err, results) => {
        if (err) {
            console.error('Erro ao buscar chamados do cliente:', err);
            return res.status(500).json({ erro: 'Erro interno ao buscar chamados.' });
        }
        res.json(results);
    });
});

router.put('/:id/detalhes', (req, res) => {
    const { id } = req.params;
    const { titulo, descricao, id_cliente } = req.body;
    const ehAdministrador = (req.get('x-cargo') || '').toLowerCase() === 'administrador';
    if (!titulo || (!id_cliente && !ehAdministrador)) return res.status(400).json({ erro: 'Título e cliente são obrigatórios.' });

    const query = ehAdministrador
        ? `UPDATE ordem_servico SET titulo = ?, descricao = ? WHERE id_os = ?`
        : `UPDATE ordem_servico SET titulo = ?, descricao = ? WHERE id_os = ? AND id_cliente = ? AND status <> 'Finalizado'`;
    const params = ehAdministrador ? [titulo, descricao || null, id] : [titulo, descricao || null, id, id_cliente];
    database.query(query, params, (err, result) => {
        if (err) return res.status(500).json({ erro: 'Erro ao atualizar o chamado.' });
        if (!result.affectedRows) return res.status(409).json({ erro: 'Chamado não encontrado ou não pode mais ser editado.' });
        res.json({ mensagem: 'Chamado atualizado com sucesso!' });
    });
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const { id_cliente } = req.body || {};
    const ehAdministrador = (req.get('x-cargo') || '').toLowerCase() === 'administrador';

    if (!id_cliente && !ehAdministrador) return res.status(400).json({ erro: 'Cliente não identificado.' });
    const query = ehAdministrador
        ? `DELETE FROM ordem_servico WHERE id_os = ?`
        : `DELETE FROM ordem_servico WHERE id_os = ? AND id_cliente = ? AND status = 'Em Análise'`;
    const params = ehAdministrador ? [id] : [id, id_cliente];
    database.query(query, params, (err, result) => {
        if (err) return res.status(500).json({ erro: 'Erro ao excluir o chamado.' });
        if (!result.affectedRows) return res.status(409).json({ erro: 'Chamado não encontrado ou não pode ser excluído.' });
        res.json({ mensagem: 'Chamado excluído com sucesso!' });
    });
});

router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const statusValidos = ['Em Análise', 'Em Reparo', 'Finalizado'];
    if (!status || !statusValidos.includes(status)) {
        return res.status(400).json({ erro: `Status inválido. Use um de: ${statusValidos.join(', ')}.` });
    }

    const ehAdministrador = (req.get('x-cargo') || '').toLowerCase() === 'administrador';
    const idFuncionario = Number(req.get('x-funcionario-id'));
    if (!ehAdministrador && !idFuncionario) return res.status(403).json({ erro: 'Funcionário não identificado.' });

    const query = status === 'Finalizado'
        ? 'UPDATE ordem_servico SET status = ?, data_de_finalizacao = NOW() WHERE id_os = ?'
        : 'UPDATE ordem_servico SET status = ? WHERE id_os = ?';
    const queryComPermissao = ehAdministrador ? query : query.replace('WHERE id_os = ?', 'WHERE id_os = ? AND id_funcionario = ?');
    const params = ehAdministrador ? [status, id] : [status, id, idFuncionario];
    database.query(queryComPermissao, params, (err, result) => {
        if (err) {
            console.error('Erro ao atualizar chamado:', err);
            return res.status(500).json({ erro: 'Erro interno ao atualizar o status.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Chamado não encontrado.' });
        }
        res.json({ mensagem: 'Status atualizado com sucesso!' });
    });
});

router.put('/:id/funcionario', (req, res) => {

    if ((req.get('x-cargo') || '').toLowerCase() !== 'administrador') {
        return res.status(403).json({ erro: 'Apenas administradores podem atribuir chamados.' });
    }
    const { id } = req.params;
    const { idFuncionario } = req.body;

    const sql = `
        UPDATE ordem_servico
        SET id_funcionario = ?
        WHERE id_os = ?
    `;

    database.query(sql, [idFuncionario, id], (erro, resultado) => {

        if (erro) {
            console.error(erro);
            return res.status(500).json({
                erro: 'Erro ao atribuir funcionário.'
            });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Ordem de Serviço não encontrada.'
            });
        }

        res.json({
            mensagem: 'Funcionário atribuído com sucesso!'
        });

    });

});

module.exports = router;
