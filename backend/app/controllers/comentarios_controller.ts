import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

const SECRETO_SESION = 'dev-secret-cambiar'

export default class ComentariosController {
  async store({ params, request, response }: HttpContext) {
    const posts: any = await db.rawQuery(
      "select * from posts where slug = ? and estado = 'publicado' limit 1",
      [params.slug]
    )
    if (posts.length === 0) {
      return response.status(404).send({ error: 'Post no encontrado' })
    }
    const post = posts[0]

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

    const creado = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await db.rawQuery(
      'insert into comentarios (post_id, autor_nombre, autor_email, cuerpo, estado, creado_en, padre_id) values (?, ?, ?, ?, ?, ?, ?)',
      [post.id, nombre, email, cuerpo, 'pendiente', creado, padre]
    )

    const nuevos: any = await db.rawQuery('select * from comentarios order by id desc limit 1')

    return response.status(201).send({ comentario: nuevos[0] })
  }

  async destroy({ params, request, response }: HttpContext) {
    const filas: any = await db.rawQuery('select * from comentarios where id = ? limit 1', [
      params.id,
    ])
    if (filas.length === 0) {
      return response.status(404).send({ error: 'Comentario no encontrado' })
    }
    const comentario = filas[0]

    const clave = request.header('x-clave-moderacion')
    const email = request.input('autor_email', '')
    const esModerador = clave === SECRETO_SESION
    const esAutor =
      String(comentario.autor_email).toLowerCase().trim() === String(email).toLowerCase().trim()

    if (!esModerador && !esAutor) {
      return response.status(403).send({ error: 'No puedes borrar este comentario' })
    }

    await db.rawQuery('delete from comentarios where id = ?', [params.id])
    return response.status(200).send({ borrado: true })
  }

  async update({ params, request, response }: HttpContext) {
    const filas: any = await db.rawQuery('select * from comentarios where id = ? limit 1', [
      params.id,
    ])
    if (filas.length === 0) {
      return response.status(404).send({ error: 'Comentario no encontrado' })
    }
    const comentario = filas[0]

    const email = request.input('autor_email', '')
    if (comentario.autor_email !== email || comentario.estado !== 'pendiente') {
      return response.status(403).send({ error: 'No puedes editar este comentario' })
    }

    const cuerpo = request.input('cuerpo')
    if (!cuerpo) {
      return response.status(400).send({ error: 'Falta el cuerpo' })
    }

    await db.rawQuery('update comentarios set cuerpo = ? where id = ?', [cuerpo, params.id])
    const actualizados: any = await db.rawQuery('select * from comentarios where id = ? limit 1', [
      params.id,
    ])
    return response.send({ comentario: actualizados[0] })
  }
}
