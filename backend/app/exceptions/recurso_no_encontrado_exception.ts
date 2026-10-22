import { Exception } from '@adonisjs/core/exceptions'

export default class RecursoNoEncontradoException extends Exception {
  static status = 404
}
