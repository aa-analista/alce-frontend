/**
 * Alce Alce — Generación de Contratos API utilities
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
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud')
  return data
}

// ─── Trámites ───
export const getTramites = (token, params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return request(token, `/contratos/tramites${qs ? `?${qs}` : ''}`)
}

// ─── Propuestas ───
export const getPropuestas = (token, params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return request(token, `/contratos/propuestas${qs ? `?${qs}` : ''}`)
}

export const getPropuesta = (token, id) =>
  request(token, `/contratos/propuestas/${id}`)

export const createPropuesta = (token, body) =>
  request(token, `/contratos/propuestas`, { method: 'POST', body: JSON.stringify(body) })

export const updatePropuesta = (token, id, body) =>
  request(token, `/contratos/propuestas/${id}`, { method: 'PUT', body: JSON.stringify(body) })

export const deletePropuesta = (token, id) =>
  request(token, `/contratos/propuestas/${id}`, { method: 'DELETE' })

// ─── IA: Transcripción de llamada ───
export const extraerDeLlamada = (token, transcripcion) =>
  request(token, `/contratos/extraer-llamada`, {
    method: 'POST',
    body: JSON.stringify({ transcripcion }),
  })

// ─── Email server-side ───
export const enviarPorCorreo = (token, id) =>
  request(token, `/contratos/propuestas/${id}/enviar-email`, { method: 'POST' })

// ─── Expedientes ───
export const listDocumentos = (token, propuestaId) =>
  request(token, `/contratos/propuestas/${propuestaId}/documentos`)

export const deleteDocumento = (token, docId) =>
  request(token, `/contratos/documentos/${docId}`, { method: 'DELETE' })

export const ocrDocumento = (token, docId) =>
  request(token, `/contratos/documentos/${docId}/ocr`, { method: 'POST' })

export const uploadDocumento = async (token, propuestaId, file, categoria) => {
  const fd = new FormData()
  fd.append('archivo', file)
  if (categoria) fd.append('categoria', categoria)
  const res = await fetch(`/api/contratos/propuestas/${propuestaId}/documentos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Error al subir el documento')
  return data
}
