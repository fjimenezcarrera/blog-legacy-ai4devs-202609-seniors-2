import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ComentarioService } from '#services/comentario_service'
import ComentarioTransformer from '#transformers/comentario_transformer'

@inject()
export default class ComentariosController {
  constructor(protected servicio: ComentarioService) {}

  async store({ params, request, response, serialize }: HttpContext) {
    const postId = await this.servicio.buscarPostPublicado(params.slug)

    const nombre = request.input('autor_nombre')
    const email = request.input('autor_email')
    const cuerpo = request.input('cuerpo')
    const padre = request.input('padre_id', null)

    if (!nombre) {
      return response.status(400).send({ error: 'El nombre es obligatorio' })
    }
    if (!email) {
      return response.status(422).send({ message: 'Falta el email' })
    }
    if (String(email).indexOf('@') === -1) {
      return response.status(400).send({ errores: ['email no válido'] })
    }
    if (!cuerpo || String(cuerpo).length < 5) {
      return response.send({ ok: false, motivo: 'comentario demasiado corto' })
    }

    const comentario = await this.servicio.crear(postId, {
      autor_nombre: nombre,
      autor_email: email,
      cuerpo,
      padre_id: padre,
    })

    response.status(201)
    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(comentario) })
  }

  async destroy({ params, request, serialize }: HttpContext) {
    const comentario = await this.servicio.borrar(params.id, {
      autorEmail: request.input('autor_email', ''),
      claveModeracion: request.header('x-clave-moderacion'),
    })

    return serialize.withoutWrapping(
      ComentarioTransformer.transform(comentario).useVariant('toBorrado')
    )
  }

  async update({ params, request, response, serialize }: HttpContext) {
    const comentario = await this.servicio.comprobarEdicion(
      params.id,
      request.input('autor_email', '')
    )

    const cuerpo = request.input('cuerpo')
    if (!cuerpo) {
      return response.status(400).send({ error: 'Falta el cuerpo' })
    }

    const editado = await this.servicio.editar(comentario, cuerpo)
    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(editado) })
  }
}
