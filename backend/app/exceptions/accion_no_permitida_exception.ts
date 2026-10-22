import { Exception } from '@adonisjs/core/exceptions'

export default class AccionNoPermitidaException extends Exception {
  static status = 403
}
