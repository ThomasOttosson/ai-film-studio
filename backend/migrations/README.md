# Alembic migrations

Create a migration after changing a SQLAlchemy model:

```bash
alembic revision --autogenerate -m "describe the change"
```

Apply all pending migrations:

```bash
alembic upgrade head
```

Roll back one migration:

```bash
alembic downgrade -1
```