import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import AccionNoPermitidaException from '#exceptions/accion_no_permitida_exception'
import RecursoNoEncontradoException from '#exceptions/recurso_no_encontrado_exception'

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
    if (error instanceof RecursoNoEncontradoException || error instanceof AccionNoPermitidaException) {
      return ctx.response.status(error.status).send({ error: error.message })
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
    if (error instanceof RecursoNoEncontradoException || error instanceof AccionNoPermitidaException) {
      return
    }

    return super.report(error, ctx)
  }
}
