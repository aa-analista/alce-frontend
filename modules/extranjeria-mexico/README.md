# 🇲🇽 Extranjería México — frontend (vive en el repo backend)

El código del frontend de EXM **NO está aquí**, vive en el repo `aa-analista/alce-backend` bajo:

```
alce-backend/modules/extranjeria-mexico/src/
```

Esto es así porque EXM es una **app standalone monorepo** (frontend + backend juntos en un solo paquete), no un módulo del frontend principal de Alce.

## 🌐 URLs en producción

- Dashboard EXM: `http://5.78.149.23:3005/`
- Vista pública cliente: `http://5.78.149.23:3005/p/:token`

## 📖 Ver código completo

👉 [`aa-analista/alce-backend/tree/main/modules/extranjeria-mexico`](https://github.com/aa-analista/alce-backend/tree/main/modules/extranjeria-mexico)

## 🔮 Integración futura

Cuando EXM se integre como módulo nativo del frontend de Alce (usando `alce_users` en lugar de `em_users`, scope por org, etc.), su UI vivirá aquí: `alce-frontend/src/components/EXM*.jsx` o `alce-frontend/src/modules/exm/`.

Por ahora es app separada — ver README del backend para detalles.
