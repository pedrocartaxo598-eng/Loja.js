from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import *
from sqlalchemy.orm import Mapped, mapped_column
from flask_login import UserMixin

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///projectData.db"
app.config['SECRET_KEY'] = "t_0q8/B\11_4G0]D9D?N"

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
db.init_app(app)

class Usuario(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    nomeCompleto: Mapped[str]
    email: Mapped[str] = mapped_column(unique=True)
    senha: Mapped[str]

class Produto(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    nomeProduto: Mapped[str]
    quantidade: Mapped[int]
    dataValidade: Mapped[str]

with app.app_context():
    db.create_all()