from flask import Flask, render_template, url_for, redirect, request
from flask_login import LoginManager
from db import *

# app = Flask(__name__)
# app.config["SQLALCHEMY_DATABASE_FASTLANCHES"] = "sqlite:///project.db"
# db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
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
    app.run(debug=true)