/**
 * Alce Alce — Gestión de Equipo API utilities
 * All functions accept a `token` (string) from useAuth() context.
 */

async function request(token, path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud')
  return data
}

// ─── Recordatorios ────────────────────────────────────────────────────────────

export const getRecordatorios = (token, params = {}) => {
  const q = new URLSearchParams(params).toString()
  return request(token, `/recordatorios${q ? '?' + q : ''}`)
}

export const createRecordatorio = (token, data) =>
  request(token, '/recordatorios', { method: 'POST', body: JSON.stringify(data) })

export const updateRecordatorio = (token, id, data) =>
  request(token, `/recordatorios/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteRecordatorio = (token, id) =>
  request(token, `/recordatorios/${id}`, { method: 'DELETE' })

// ─── Personal ─────────────────────────────────────────────────────────────────

export const getPersonal = (token, params = {}) => {
  const q = new URLSearchParams(params).toString()
  return request(token, `/personal${q ? '?' + q : ''}`)
}

export const createPersonal = (token, data) =>
  request(token, '/personal', { method: 'POST', body: JSON.stringify(data) })

export const updatePersonal = (token, id, data) =>
  request(token, `/personal/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

// ─── Plantillas ───────────────────────────────────────────────────────────────

export const getPlantillas = (token) =>
  request(token, '/seguimiento/plantillas')

export const createPlantilla = (token, data) =>
  request(token, '/seguimiento/plantillas', { method: 'POST', body: JSON.stringify(data) })

export const updatePlantilla = (token, id, data) =>
  request(token, `/seguimiento/plantillas/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deletePlantilla = (token, id) =>
  request(token, `/seguimiento/plantillas/${id}`, { method: 'DELETE' })

// ─── Seguimiento / pasos ──────────────────────────────────────────────────────

export const getSeguimientoTarea = (token, tareaId) =>
  request(token, `/seguimiento/tarea/${tareaId}`)

export const getResumenSeguimiento = (token, tareaIds) =>
  request(token, `/seguimiento/resumen?tarea_ids=${tareaIds.join(',')}`)

export const createPaso = (token, data) =>
  request(token, '/seguimiento', { method: 'POST', body: JSON.stringify(data) })

export const cargarDesdePlantilla = (token, tareaId, plantillaId, personalId = null) =>
  request(token, '/seguimiento/desde-plantilla', {
    method: 'POST',
    body: JSON.stringify({ tarea_id: tareaId, plantilla_id: plantillaId, personal_id: personalId }),
  })

export const updatePaso = (token, id, data) =>
  request(token, `/seguimiento/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deletePaso = (token, id) =>
  request(token, `/seguimiento/${id}`, { method: 'DELETE' })
