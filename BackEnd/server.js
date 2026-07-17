// Constantes e configurações
require("dotenv").config()
const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

const path = require('path');
app.use(express.static(path.resolve(__dirname, '..', 'FrontEnd')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'API funcionando!', banco: 'Conectado ao Aiven' });
});

app.get('/', (req, res) => {
    res.json({
        mensagem: 'API do Projeto Integrador de Mecânica rodando com sucesso!',
        status: 'Online',
        banco: 'Conectado com sucesso ao Aiven'
    });
});

const cadastroClienteRoutes = require('./src/routes/cadastro-cliente');
app.use('/api/clientes', cadastroClienteRoutes);

const funcionarioRoutes = require('./src/routes/login-funcionario');
app.use('/api/funcionarios', funcionarioRoutes);

const veiculosRoutes = require('./src/routes/veiculos');
app.use('/api/veiculos', veiculosRoutes);

const chamadosRoutes = require('./src/routes/chamados');
app.use('/api/chamados', chamadosRoutes);

const PORT = process.env.PORT || 9090;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor do Node rodando com sucesso em http://localhost:${PORT}`);
});