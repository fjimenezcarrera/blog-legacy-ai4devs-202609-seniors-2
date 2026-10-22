import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ComentarioService } from '#services/comentario_service'
import ComentarioTransformer from '#transformers/comentario_transformer'
import {
  crearComentarioValidator,
  credencialesComentarioValidator,
  editarComentarioValidator,
} from '#validators/comentario'

@inject()
export default class ComentariosController {
  constructor(protected servicio: ComentarioService) {}

  /**
   * El post se busca antes de validar la entrada: un slug inexistente da 404 aunque
   * el cuerpo de la petición venga vacío.
   */
  async store({ params, request, response, serialize }: HttpContext) {
    const postId = await this.servicio.buscarPostPublicado(params.slug)
    const datos = await request.validateUsing(crearComentarioValidator)

    const comentario = await this.servicio.crear(postId, datos)

    response.status(201)
    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(comentario) })
  }

  async destroy({ params, request, serialize }: HttpContext) {
    const { autor_email: autorEmail, headers } = await request.validateUsing(
      credencialesComentarioValidator
    )

    const comentario = await this.servicio.borrar(params.id, {
      autorEmail,
      claveModeracion: headers['x-clave-moderacion'],
    })

    return serialize.withoutWrapping(
      ComentarioTransformer.transform(comentario).useVariant('toBorrado')
    )
  }

  /**
   * El permiso se comprueba antes que el cuerpo: sin permiso es 403 aunque falte el cuerpo.
   */
  async update({ params, request, serialize }: HttpContext) {
    const { autor_email: autorEmail } = await request.validateUsing(credencialesComentarioValidator)
    const comentario = await this.servicio.comprobarEdicion(params.id, autorEmail)
    const { cuerpo } = await request.validateUsing(editarComentarioValidator)

    const editado = await this.servicio.editar(comentario, cuerpo)

    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(editado) })
  }
}
