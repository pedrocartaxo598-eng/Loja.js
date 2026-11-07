from datetime import date
from pathlib import Path
from flask import jsonify, render_template, url_for, redirect, request, send_file
from flask_login import LoginManager, login_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from db import app, db, Usuario, Produto, ProdutoMigrado
# from datetime import date

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"


@login_manager.unauthorized_handler
def unauthorized():
    if request.path.startswith("/api/"):
        return jsonify(error="Faça login para acessar os produtos."), 401
    return redirect(url_for("login"))


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(Usuario, int(user_id))


@app.get("/assets/js/script.js")
def assets_script():
    script_path = Path(app.root_path) / "assets" / "js" / "script.js"
    return send_file(script_path, mimetype="text/javascript")


@app.route("/", methods=["GET", "POST"])
def cadastro():
    if request.method == "POST":
        usuario = Usuario(
            nomeCompleto=request.form["nomeCompleto"],
            email=request.form["email"],
            senha=generate_password_hash(request.form["senha"]),  # nunca salve a senha pura
        )
        db.session.add(usuario)
        try:
            db.session.commit()
        except IntegrityError:  # e-mail já cadastrado (campo unique)
            db.session.rollback()
            return render_template("cadastro.html", erro="Este e-mail já está cadastrado.")

        login_user(usuario)
        return redirect(url_for("validade_produtos"))

    return render_template("cadastro.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        usuario = db.session.execute(
            db.select(Usuario).filter_by(email=request.form["email"])
        ).scalar_one_or_none()

        if usuario and check_password_hash(usuario.senha, request.form["senha"]):
            login_user(usuario)
            return redirect(url_for("validade_produtos"))

        return render_template("login.html", erro="E-mail ou senha inválidos.")

    return render_template("login.html")


@app.route("/validade_produtos", methods=["GET", "POST"])
@login_required
def validade_produtos():
    if request.method == "POST":
        try:
            data_validade = date.fromisoformat(request.form["expiration"])
        except ValueError:
            return render_template("index.html", produtos=[], erro="Informe uma data de validade válida.")

        produto = Produto(
            nomeProduto=request.form["product-name"],
            quantidade=int(request.form["product-quantity"]),
            dataValidade=data_validade,
        )
        db.session.add(produto)
        db.session.commit()
        return redirect(url_for("validade_produtos"))

    produtos = db.session.execute(
        db.select(Produto).order_by(Produto.dataValidade)
    ).scalars().all()
    return render_template("index.html", produtos=produtos)


@app.route("/api/products", methods=["GET", "POST"])
@login_required
def api_products():
    if request.method == "GET":
        produtos = db.session.execute(
            db.select(Produto).order_by(Produto.dataValidade)
        ).scalars().all()
        return jsonify([
            {
                "id": produto.id,
                "name": produto.nomeProduto,
                "quantity": produto.quantidade,
                "expiration": produto.dataValidade.isoformat(),
            }
            for produto in produtos
        ])

    if not request.is_json:
        return jsonify(error="Envie os dados como application/json."), 415

    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify(error="Os dados do produto são inválidos."), 400

    nome = dados.get("name")
    quantidade = dados.get("quantity")
    validade = dados.get("expiration")
    if (
        not isinstance(nome, str)
        or not nome.strip()
        or len(nome.strip()) > 80
        or type(quantidade) is not int
        or quantidade < 1
        or not isinstance(validade, str)
    ):
        return jsonify(error="Informe nome, quantidade positiva e validade válida."), 400

    try:
        data_validade = date.fromisoformat(validade)
    except ValueError:
        return jsonify(error="A validade deve ser uma data válida no formato AAAA-MM-DD."), 400
    if data_validade.isoformat() != validade:
        return jsonify(error="A validade deve ser uma data válida no formato AAAA-MM-DD."), 400

    produto = Produto(
        nomeProduto=nome.strip(),
        quantidade=quantidade,
        dataValidade=data_validade,
    )
    db.session.add(produto)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        app.logger.exception("Não foi possível salvar o produto no banco de dados.")
        return jsonify(error="Não foi possível salvar o produto no banco de dados."), 500

    return jsonify({
        "id": produto.id,
        "name": produto.nomeProduto,
        "quantity": produto.quantidade,
        "expiration": produto.dataValidade.isoformat(),
    }), 201


@app.post("/api/products/import")
@login_required
def api_import_products():
    if not request.is_json:
        return jsonify(error="Envie os dados como application/json."), 415

    dados = request.get_json(silent=True)
    if not isinstance(dados, list):
        return jsonify(error="A lista de produtos antigos é inválida."), 400

    produtos_legados = []
    ids_legados = set()
    for item in dados:
        if not isinstance(item, dict):
            return jsonify(error="Os dados de um produto antigo são inválidos."), 400

        id_legado = item.get("id")
        nome = item.get("name")
        quantidade = item.get("quantity")
        validade = item.get("expiration")
        if (
            not isinstance(id_legado, str)
            or not id_legado.strip()
            or len(id_legado) > 120
            or id_legado in ids_legados
            or not isinstance(nome, str)
            or not nome.strip()
            or len(nome.strip()) > 80
            or type(quantidade) is not int
            or quantidade < 1
            or not isinstance(validade, str)
        ):
            return jsonify(error="Informe IDs, nomes, quantidades e validades válidos."), 400

        try:
            data_validade = date.fromisoformat(validade)
        except ValueError:
            return jsonify(error="A validade deve ser uma data válida no formato AAAA-MM-DD."), 400
        if data_validade.isoformat() != validade:
            return jsonify(error="A validade deve ser uma data válida no formato AAAA-MM-DD."), 400

        ids_legados.add(id_legado)
        produtos_legados.append((id_legado, nome.strip(), quantidade, data_validade))

    produtos_importados = []
    try:
        for id_legado, nome, quantidade, data_validade in produtos_legados:
            registro_migracao = db.session.get(ProdutoMigrado, id_legado)
            if registro_migracao is None:
                produto = Produto(
                    nomeProduto=nome,
                    quantidade=quantidade,
                    dataValidade=data_validade,
                )
                db.session.add(produto)
                db.session.flush()
                registro_migracao = ProdutoMigrado(
                    idLegado=id_legado,
                    produto_id=produto.id,
                )
                db.session.add(registro_migracao)
            else:
                produto = db.session.get(Produto, registro_migracao.produto_id)

            if produto is None:
                raise SQLAlchemyError("O registro migrado não possui um produto correspondente.")

            produtos_importados.append({
                "id": produto.id,
                "name": produto.nomeProduto,
                "quantity": produto.quantidade,
                "expiration": produto.dataValidade.isoformat(),
            })

        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        app.logger.exception("Não foi possível importar os produtos antigos.")
        return jsonify(error="Não foi possível importar os produtos antigos para o banco de dados."), 500

    return jsonify(products=produtos_importados), 200


@app.delete("/api/products/<int:product_id>")
@login_required
def api_delete_product(product_id):
    produto = db.session.get(Produto, product_id)
    if produto is None:
        return jsonify(error="Produto não encontrado."), 404

    db.session.delete(produto)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        app.logger.exception("Não foi possível remover o produto do banco de dados.")
        return jsonify(error="Não foi possível remover o produto do banco de dados."), 500

    return "", 204


@app.route("/validade_produtos/<int:produto_id>", methods=["DELETE"])
@login_required
def deletar_produto(produto_id):
    produto = db.session.get(Produto, produto_id)
    if produto is None:
        return "", 404
    db.session.delete(produto)
    db.session.commit()
    return "", 204

@app.route("/validade_produtos/<int:produto_id>", methods=["PUT"])
@login_required
def editar_produto(produto_id):
    produto = db.session.get(Produto, produto_id)
    if produto is None:
        return "", 404
    produto.nomeProduto = request.form["product-name"]
    produto.quantidade = int(request.form["product-quantity"])
    produto.dataValidade = date.fromisoformat(request.form["expiration"])
    db.session.commit()
    return redirect(url_for("validade_produtos"))

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5152)