import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import AccionNoPermitidaException from '#exceptions/accion_no_permitida_exception'
import RecursoNoEncontradoException from '#exceptions/recurso_no_encontrado_exception'
import { errors as erroresDeVine } from '@vinejs/vine'

/**
 * Respuesta que daba cada regla de app/validators/comentario.ts antes del refactor.
 * BUG caracterizado (#11): cuatro formatos distintos y uno de ellos con estado 200.
 * Unificarlos cambia el contrato y es una tarea aparte.
 */
const RESPUESTAS_DE_COMENTARIO: Record<string, (mensaje: string) => [number, object]> = {
  'comentario.nombre_obligatorio': (mensaje) => [400, { error: mensaje }],
  'comentario.email_obligatorio': (mensaje) => [422, { message: mensaje }],
  'comentario.email_sin_arroba': (mensaje) => [400, { errores: [mensaje] }],
  'comentario.cuerpo_corto': (mensaje) => [200, { ok: false, motivo: mensaje }],
  'comentario.cuerpo_obligatorio': (mensaje) => [400, { error: mensaje }],
}

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (
      error instanceof RecursoNoEncontradoException ||
      error instanceof AccionNoPermitidaException
    ) {
      return ctx.response.status(error.status).send({ error: error.message })
    }

    if (error instanceof erroresDeVine.E_VALIDATION_ERROR) {
      // Los campos se validan en orden: el primer error es el que antes cortaba la petición.
      const [primero] = error.messages
      const respuesta = primero && RESPUESTAS_DE_COMENTARIO[primero.rule]
      if (respuesta) {
        const [estado, cuerpo] = respuesta(primero.message)
        return ctx.response.status(estado).send(cuerpo)
      }
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    // Son respuestas previstas del contrato, no fallos: antes no se registraban.
    if (
      error instanceof RecursoNoEncontradoException ||
      error instanceof AccionNoPermitidaException
    ) {
      return
    }

    return super.report(error, ctx)
  }
}
