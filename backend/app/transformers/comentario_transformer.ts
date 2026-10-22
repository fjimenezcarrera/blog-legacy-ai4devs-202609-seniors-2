import { BaseTransformer } from '@adonisjs/core/transformers'
import type Comentario from '#models/comentario'

export default class ComentarioTransformer extends BaseTransformer<Comentario> {
  /**
   * Hoy salen las ocho columnas con sus nombres de base de datos, autor_email y estado
   * incluidos: es el contrato que fija la caracterización. Dejar de exponer el correo
   * (regla 6) es un arreglo aparte con su propio test.
   */
  toObject() {
    return {
      id: this.resource.id,
      post_id: this.resource.postId,
      autor_nombre: this.resource.autorNombre,
      autor_email: this.resource.autorEmail,
      cuerpo: this.resource.cuerpo,
      estado: this.resource.estado,
      creado_en: this.resource.creadoEn,
      padre_id: this.resource.padreId,
    }
  }

  toBorrado() {
    return { borrado: true }
  }
}
