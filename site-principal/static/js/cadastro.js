document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const usuarioInput = document.getElementById('usuario').value;
    const senhaInput = document.getElementById('senha').value;
    const mensagem = document.getElementById('mensagem');

    const usuarioSalvo = JSON.parse(localStorage.getItem('usuarioCadastrado'));

    if (usuarioSalvo && usuarioInput === usuarioSalvo.email && senhaInput === usuarioSalvo.senha) {
        mensagem.style.color = 'green';
        mensagem.textContent = `Bem-vindo de volta, ${usuarioSalvo.nome}!`;
    } else if (usuarioInput === 'admin' && senhaInput === '12345') {

        mensagem.style.color = 'green';
        mensagem.textContent = 'Login master realizado com sucesso!';
    } else {
        mensagem.style.color = 'red';
        mensagem.textContent = 'E-mail ou senha incorretos!';
    }
});
