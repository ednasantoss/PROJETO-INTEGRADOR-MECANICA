document.getElementById('formLoginCliente').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    try {
        const response = await fetch('https://api-mecanica-4rc9.onrender.com/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, senha })
        });

        const dados = await response.json();

        if (response.ok) {
            localStorage.setItem('clienteLogado', JSON.stringify(dados.cliente));
            window.location.href = 'veiculos.html';
        } else {
            alert(dados.erro || 'Erro ao realizar login.');
        }
    } catch (erro) {
        console.error(erro);
        alert('Erro ao conectar com o servidor.');
    }
});