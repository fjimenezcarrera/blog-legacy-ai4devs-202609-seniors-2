import db from '@adonisjs/lucid/services/db'
import Comentario from '#models/comentario'

export type DatosDeComentario = {
  postId: number
  autorNombre: string
  autorEmail: string
  cuerpo: string
  estado: string
  creadoEn: string
  padreId: number | null
}

/**
 * Todo el acceso a datos de los comentarios. Nadie más toca la tabla.
 */
export class ComentarioRepository {
  async buscarIdDePostPublicado(slug: string): Promise<number | null> {
    const post = await db
      .from('posts')
      .select('id')
      .where('slug', slug)
      .where('estado', 'publicado')
      .first()
    return post ? post.id : null
  }

  buscarPorId(id: number | string) {
    return Comentario.find(id)
  }

  async crear(datos: DatosDeComentario) {
    await Comentario.create(datos)
  }

  /**
   * BUG caracterizado (#3): se lee «el último comentario por id», no el que se acaba de
   * insertar. Si dos altas se cruzan, una recibe la fila de la otra. Se conserva tal cual
   * en el refactor; corregirlo es una tarea aparte.
   */
  ultimoCreado() {
    return Comentario.query().orderBy('id', 'desc').firstOrFail()
  }

  async borrar(comentario: Comentario) {
    await comentario.delete()
  }

  async cambiarCuerpo(comentario: Comentario, cuerpo: string) {
    comentario.cuerpo = cuerpo
    await comentario.save()
  }
}
