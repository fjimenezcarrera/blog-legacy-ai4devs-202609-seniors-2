/**
 * Filas de prueba para los tests funcionales. Usan ids altos para no chocar con la
 * semilla, que vive en la misma base y se respeta gracias a la transacción global.
 */

export function unPostPublicado(cambios: Record<string, unknown> = {}) {
  return {
    id: 9001,
    titulo: 'Post de prueba',
    slug: 'post-de-prueba',
    resumen: 'Resumen de prueba',
    cuerpo: '## Cuerpo de prueba',
    imagen_portada: null,
    estado: 'publicado',
    publicado_en: '2026-01-01 10:00:00',
    autor_id: 1,
    categoria_id: 1,
    autor_nombre: 'Marta Ruiz Calvo',
    autor_email: 'marta.ruiz@corriente.es',
    categoria_nombre: 'Noticias',
    etiquetas: 'Artículos',
    created_at: '2026-01-01 10:00:00',
    updated_at: '2026-01-01 10:00:00',
    ...cambios,
  }
}

export function unComentario(cambios: Record<string, unknown> = {}) {
  return {
    id: 9101,
    post_id: 9001,
    autor_nombre: 'Ana Cortés',
    autor_email: 'ana.cortes@ejemplo.es',
    cuerpo: 'Un comentario de prueba.',
    estado: 'pendiente',
    creado_en: '2026-03-15 10:12:00',
    padre_id: null,
    ...cambios,
  }
}

/**
 * Las ocho columnas de `comentarios`, que hoy salen todas en la respuesta.
 */
export const CAMPOS_COMENTARIO = [
  'id',
  'post_id',
  'autor_nombre',
  'autor_email',
  'cuerpo',
  'estado',
  'creado_en',
  'padre_id',
]
