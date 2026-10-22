from flask import render_template, url_for, redirect, request
from flask_login import LoginManager, login_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import IntegrityError
from db import app, db, Usuario, Produto

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(Usuario, int(user_id))


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
        produto = Produto(
            nomeProduto=request.form["product-name"],
            quantidade=int(request.form["product-quantity"]),
            dataValidade=request.form["date-of-expiration"],
        )
        db.session.add(produto)
        db.session.commit()
        return redirect(url_for("validade_produtos"))

    produtos = db.session.execute(
        db.select(Produto).order_by(Produto.dataValidade)
    ).scalars().all()
    return render_template("index.html", produtos=produtos)


if __name__ == "__main__":
    app.run(debug=True)