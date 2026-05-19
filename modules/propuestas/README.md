# 📋 Propuestas — frontend (vive en el repo backend)

El código del frontend del módulo **Propuestas** (producto white-label de Alce Alce) **NO está aquí**, vive en el repo `aa-analista/alce-backend` bajo:

```
alce-backend/modules/propuestas/src/
```

Esto es así porque **Propuestas es una app standalone monorepo** (frontend + backend juntos en un solo paquete), no un módulo del frontend principal de Alce.

## 🌐 Instancia actual (cliente piloto)

- Dashboard: `http://5.78.149.23:3005/`
- Vista pública para clientes: `http://5.78.149.23:3005/p/:token`

## 📖 Ver código completo

👉 [`aa-analista/alce-backend/tree/main/modules/propuestas`](https://github.com/aa-analista/alce-backend/tree/main/modules/propuestas)

## 🔮 Integración futura como módulo nativo

Cuando se integre como módulo nativo del frontend de Alce (con branding dinámico, `alce_users` compartidos y multi-tenant), su UI vivirá aquí (`alce-frontend/src/components/Propuestas*.jsx` o `alce-frontend/src/modules/propuestas/`).

Por ahora es app separada — ver README del backend para detalles del producto y plan de evolución.
