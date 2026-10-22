from flask import Flask, render_template, url_for, redirect, request
from flask_login import LoginManager
from db import *

# app = Flask(__name__)
# app.config["SQLALCHEMY_DATABASE_FASTLANCHES"] = "sqlite:///project.db"
# db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

@login_manager.user_loader
def load_user(user_id):
    return Usuario.query.get(int(user_id))

@login_manager.user_loader
@app.route("/", methods=['GET', "POST"])
def cadastro():
    if (request.method == "POST"):
        usuario = Usuario(
            nomeCompleto = request.form['nomeCompleto'],
            email = request.form['email'],
            senha = request.form['senha']
        )
        db.session.add(usuario)
        db.session.commit()
        
        return redirect(url_for("/validade_produtos"))
    
    return render_template("cadastro.html")

@login_manager.user_loader
@app.route("/login", methods=['GET', "POST"])
def login():
    if (request.method == "POST"):
        usuario = Usuario(
            #nomeCompleto = request.form['nomeCompleto'],
            email = request.form['email'],
            senha = request.form['senha']
        )
        db.session.add(usuario)
        db.session.commit()
        return redirect(url_for("/validade_produtos"))
    
    return render_template("login.html")

@app.route("/validade_produtos", methods=["GET", "POST"])
def home():
    if (request.method == "POST"):
        produto = Produto(
            nomeProduto = request.form['product-name'],
            quantidade = request.form["product-quantity"],
            dataValidade = request.form["date-of-expiration"]
        )
        db.session.add(produto)
        db.session.commit()
        return redirect(url_for("/", id=produto.id))
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)