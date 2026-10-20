from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import *
from sqlalchemy.orm import Mapped, mapped_column

app = Flask(__name__)

class Base(DeclarativeBase):
    pass

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
db = SQLAlchemy(model_class=Base)
db.init_app(app)

# class Usuario(db.Model):
#     id: Mapped[int] = mapped_column(primary_key=true)
#     nomeUsuario

class Produto(db.Model):
    id: Mapped[int] = mapped_column(primary_key=true)
    nomeProduto: Mapped[str]
    quantidade: Mapped[int]
    dataValidade: Mapped[str]

with app.app_context():
    db.create_all()