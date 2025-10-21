# 🚀 INICIO RÁPIDO - Sistema Tributario Paraguay

## ⚡ 3 Pasos para Iniciar (5 minutos)

### 1️⃣ Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env

# Generar secrets seguros
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiar el resultado como JWT_SECRET

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiar el resultado como ENCRYPTION_KEY
```

Edita `.env` con los valores generados:
```env
DB_PASSWORD=tu_password_seguro
JWT_SECRET=<pegar_aqui>
ENCRYPTION_KEY=<pegar_aqui>
```

### 2️⃣ Iniciar Sistema con Docker

```bash
# Construir e iniciar (PostgreSQL + Backend + Frontend)
docker-compose up -d

# Ver logs (opcional)
docker-compose logs -f
```

### 3️⃣ Acceder al Sistema

**URL**: http://localhost:3000

**Credenciales Demo**:
- Email: `demo@taxsystem.py`
- Password: `demo123456`

---

## ✅ Sistema Funcionando

El sistema ya está corriendo con:
- ✅ PostgreSQL en puerto 5432
- ✅ Backend API en puerto 3001
- ✅ Frontend en puerto 3000

**¡Ya puedes empezar a usar el sistema!** 🎉
