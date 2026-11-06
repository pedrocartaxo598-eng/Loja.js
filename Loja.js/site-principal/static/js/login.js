document.getElementById('cadastroForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const confirmaSenha = document.getElementById('confirmaSenha').value;
    const mensagem = document.getElementById('mensagem');

    if (senha !== confirmaSenha) {
        mensagem.style.color = 'red';
        mensagem.textContent = 'As senhas não coincidem!';
        return;
    }

    const dadosUsuario = { email: email, senha: senha, nome: nome };
    localStorage.setItem('usuarioCadastrado', JSON.stringify(dadosUsuario));

    mensagem.style.color = 'green';
    mensagem.textContent = 'Cadastro realizado! Redirecionando...';

    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1500);
});
