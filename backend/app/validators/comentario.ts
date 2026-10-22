import vine from '@vinejs/vine'

/**
 * Reglas de entrada de los comentarios. Reproducen la validación anterior al refactor:
 * comprueban que el valor exista (no su tipo) y se evalúan en el orden de los campos.
 * Cada regla lleva un nombre «comentario.*» que app/exceptions/handler.ts traduce a la
 * respuesta que el endpoint daba hasta ahora.
 */
const nombreObligatorio = vine.createRule(
  (valor, _opciones, campo) => {
    if (!valor) {
      campo.report('El nombre es obligatorio', 'comentario.nombre_obligatorio', campo)
    }
  },
  { implicit: true }
)

const emailConArroba = vine.createRule(
  (valor, _opciones, campo) => {
    if (!valor) {
      campo.report('Falta el email', 'comentario.email_obligatorio', campo)
    } else if (String(valor).indexOf('@') === -1) {
      campo.report('email no válido', 'comentario.email_sin_arroba', campo)
    }
  },
  { implicit: true }
)

const cuerpoMinimo = vine.createRule(
  (valor, _opciones, campo) => {
    if (!valor || String(valor).length < 5) {
      campo.report('comentario demasiado corto', 'comentario.cuerpo_corto', campo)
    }
  },
  { implicit: true }
)

const cuerpoObligatorio = vine.createRule(
  (valor, _opciones, campo) => {
    if (!valor) {
      campo.report('Falta el cuerpo', 'comentario.cuerpo_obligatorio', campo)
    }
  },
  { implicit: true }
)

/**
 * Alta de un comentario. padre_id pasa sin comprobar (BUG caracterizado #7).
 */
export const crearComentarioValidator = vine.create({
  autor_nombre: vine.any().optional().use(nombreObligatorio()),
  autor_email: vine.any().optional().use(emailConArroba()),
  cuerpo: vine.any().optional().use(cuerpoMinimo()),
  padre_id: vine.any().optional(),
})

/**
 * Lo que identifica a quien borra o edita: su correo (cuerpo o query string) y,
 * para borrar, la cabecera de moderación.
 */
export const credencialesComentarioValidator = vine.create({
  autor_email: vine.any().optional(),
  headers: vine.object({
    'x-clave-moderacion': vine.any().optional(),
  }),
})

/**
 * Edición del cuerpo. Sin longitud mínima (BUG caracterizado #9).
 */
export const editarComentarioValidator = vine.create({
  cuerpo: vine.any().optional().use(cuerpoObligatorio()),
})
