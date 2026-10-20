<div align="center">

# 🥪 Fast Lanches — Controle de Validade

**Sistema simples para monitorar a validade dos produtos da cantina e evitar desperdícios.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Flask](https://img.shields.io/badge/Flask-em%20breve-000000?style=for-the-badge&logo=flask&logoColor=white)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-orange?style=for-the-badge)

</div>

---

## 📖 Sobre o projeto

O **Fast Lanches – Controle de Validade** é um sistema web criado para ajudar a cantina a acompanhar a data de vencimento dos seus produtos de forma rápida e visual permitindo ter conhecimento sobre o que está dentro do prazo, o que está perto de vencer e o que já venceu.

O front-end foi desenvolvido com **HTML, CSS e JavaScript**, e a próxima etapa é integrar um back-end em **Flask** com um banco de dados simples para guardar as informações de forma permanente.

## ✨ Funcionalidades

- 👤 Login
- ➕ Cadastro de produtos com nome, categoria, quantidade e data de validade
- 🚦 Indicadores por cores:
  - 🟢 **Dentro do prazo**
  - 🟡 **Próximo do vencimento**
  - 🔴 **Vencido**
- 🔍 Busca e filtro por nome ou status
- ✏️ Edição e remoção de produtos
- 📱 Layout responsivo

## 🛠️ Tecnologias

| Camada          | Tecnologia                      |
| --------------- | ------------------------------- |
| Front-end       | HTML5, CSS3, JavaScript         |
| Back-end        | Flask (Python) — *planejado*    |
| Banco de dados  | SQLite — *planejado*            |

## 📂 Estrutura do projeto

```
site-principal/
├── templates
├── └── index.html
├── assets/
├── └── css
├────── └── style.css
├── └──js/
│       └── script.js
├── app.py           
└── README.md
```

## 🚀 Como executar

**Versão atual (somente front-end):**

Clone o repositório:
```bash
   git clone https://github.com/pedrocartaxo598-eng/Loja.js.git
   
   // ou, caso você possua uma chave SSH

   git clone git@github.com:pedrocartaxo598-eng/Loja.js.git
```
<!-- 2. Entre na pasta do projeto:
```bash
   cd fast-lanches
```
3. Abra o arquivo `index.html` no navegador.

**Versão futura (com Flask):**

```bash
pip install flask
python app.py
```

Depois, acesse `http://localhost:5000`. -->

## 🗺️ Roadmap

- [x] Interface em HTML, CSS e JavaScript
- [x] Lógica de verificação de validade no front-end
- [ ] Criar servidor com Flask
- [ ] Integrar banco de dados (SQLite)
- [ ] Criar rotas de API (cadastrar, listar, editar e excluir)
- [ ] Alertas automáticos de produtos próximos do vencimento
- [ ] Sistema de login para funcionários

## 👥 Colaboradores

<div align="center">

| 👤 Nome | GitHub |
| :------------------ |:------------------ |
| **Pedro Cartaxo**   | @pedrocartaxo598-eng   |
| **José Miguel**     | @Rodrigo-4951     |
| **Rodrigo Cardoso** | @jmiguelsena156     |
| **Dom Henrique**    | @Dom-Henrique     |

</div>

## 📄 Licença

Pojeto foi desenvolvido para fins educacionais.